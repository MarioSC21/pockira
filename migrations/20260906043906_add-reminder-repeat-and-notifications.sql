-- Recurrence for reminders (daily/weekly/monthly repeat).
ALTER TABLE public.reminders
  ADD COLUMN repeat_interval TEXT NOT NULL DEFAULT 'none'
    CHECK (repeat_interval IN ('none', 'daily', 'weekly', 'monthly'));

-- Efficient scan for the reminders dispatcher (all users, not scoped to one).
CREATE INDEX reminders_scheduled_remind_at_idx
  ON public.reminders (remind_at)
  WHERE status = 'scheduled';

-- In-app notification center (reminders today; other event types later).
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_at_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Only the reminders dispatcher (running as the admin/service role) creates
-- notifications; regular users only read their own and mark them as read.
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- Finds reminders due right now, records their in-app notification, and
-- advances (repeat_interval <> 'none') or completes (repeat_interval = 'none')
-- each one. Returns the rows the caller still needs to email. Runs as the
-- function owner so it can see every user's reminders; only the admin/service
-- role may call it (see REVOKE below) — it is not exposed to end users.
CREATE OR REPLACE FUNCTION public.dispatch_due_reminders()
RETURNS TABLE (
  reminder_id UUID,
  note_id UUID,
  user_id UUID,
  email TEXT,
  note_title TEXT,
  remind_at TIMESTAMPTZ,
  repeat_interval TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  due_reminder RECORD;
  next_remind_at TIMESTAMPTZ;
BEGIN
  FOR due_reminder IN
    SELECT r.id, r.note_id, r.user_id, r.remind_at, r.repeat_interval,
           n.title AS note_title, u.email
    FROM public.reminders AS r
    JOIN public.notes AS n ON n.id = r.note_id
    JOIN auth.users AS u ON u.id = r.user_id
    WHERE r.status = 'scheduled'
      AND r.remind_at <= now()
    FOR UPDATE OF r SKIP LOCKED
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, note_id)
    VALUES (
      due_reminder.user_id,
      'reminder',
      'Recordatorio: ' || due_reminder.note_title,
      'Tu recordatorio para "' || due_reminder.note_title || '" vence ahora.',
      due_reminder.note_id
    );

    IF due_reminder.repeat_interval = 'none' THEN
      UPDATE public.reminders
        SET status = 'completed'
        WHERE id = due_reminder.id;
    ELSE
      next_remind_at := due_reminder.remind_at + (
        CASE due_reminder.repeat_interval
          WHEN 'daily' THEN INTERVAL '1 day'
          WHEN 'weekly' THEN INTERVAL '1 week'
          WHEN 'monthly' THEN INTERVAL '1 month'
        END
      );

      UPDATE public.reminders
        SET remind_at = next_remind_at
        WHERE id = due_reminder.id;
    END IF;

    reminder_id := due_reminder.id;
    note_id := due_reminder.note_id;
    user_id := due_reminder.user_id;
    email := due_reminder.email;
    note_title := due_reminder.note_title;
    remind_at := due_reminder.remind_at;
    repeat_interval := due_reminder.repeat_interval;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_due_reminders() FROM PUBLIC, anon, authenticated;
