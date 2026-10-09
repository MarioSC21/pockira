-- Sharing changes:
-- 1. An invitation waits until the invited person accepts it from the app's
--    notifications (it is no longer claimed automatically on sign-in).
-- 2. list_notes and the new get_note say whether the caller may edit, so a
--    "Puede ver" note opens read-only.
-- 3. Someone a note was shared with can remove it from their notes; only
--    their access ends, the owner's note stays.

-- list_notes gains can_edit, so it has to be dropped and created again. Same
-- filters as 20261009150000 (notes filed by the day they were created).
DROP FUNCTION IF EXISTS public.list_notes(
  TEXT, TEXT, INT, INT, INT, TEXT, TIMESTAMPTZ, UUID, INT
);

CREATE FUNCTION public.list_notes(
  p_scope TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL,
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL,
  p_day INT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'UTC',
  p_cursor_updated_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  title TEXT,
  content JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_owner BOOLEAN,
  is_shared BOOLEAN,
  can_edit BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    n.id,
    n.owner_id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    n.owner_id = (SELECT auth.uid()) AS is_owner,
    EXISTS (
      SELECT 1 FROM public.note_accesses AS na
      WHERE na.note_id = n.id AND na.status = 'accepted'
    ) AS is_shared,
    public.can_edit_note(n.id) AS can_edit
  FROM public.notes AS n
  WHERE n.deleted_at IS NULL
    AND (
      p_scope <> 'personal'
      OR (
        n.owner_id = (SELECT auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM public.note_accesses AS na
          WHERE na.note_id = n.id AND na.status = 'accepted'
        )
      )
    )
    AND (
      p_scope <> 'shared'
      OR EXISTS (
        SELECT 1 FROM public.note_accesses AS na
        WHERE na.note_id = n.id AND na.status = 'accepted'
      )
    )
    AND (p_search IS NULL OR n.title ILIKE '%' || p_search || '%')
    AND (
      p_year IS NULL
      OR (
        EXTRACT(YEAR FROM n.created_at AT TIME ZONE p_timezone) = p_year
        AND (
          p_month IS NULL
          OR EXTRACT(MONTH FROM n.created_at AT TIME ZONE p_timezone) = p_month
        )
        AND (
          p_day IS NULL
          OR EXTRACT(DAY FROM n.created_at AT TIME ZONE p_timezone) = p_day
        )
      )
    )
    AND (
      p_cursor_updated_at IS NULL
      OR (n.updated_at, n.id) < (p_cursor_updated_at, p_cursor_id)
    )
  ORDER BY n.updated_at DESC, n.id DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.list_notes(
  TEXT, TEXT, INT, INT, INT, TEXT, TIMESTAMPTZ, UUID, INT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_notes(
  TEXT, TEXT, INT, INT, INT, TEXT, TIMESTAMPTZ, UUID, INT
) TO authenticated;

-- One note with the same computed flags as list_notes; a plain row read
-- lacks them and an open shared tab would look like the caller's own note.
-- SECURITY INVOKER: the notes RLS policy still decides what is readable.
CREATE OR REPLACE FUNCTION public.get_note(p_note_id UUID)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  title TEXT,
  content JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_owner BOOLEAN,
  is_shared BOOLEAN,
  can_edit BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    n.id,
    n.owner_id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    n.owner_id = (SELECT auth.uid()) AS is_owner,
    EXISTS (
      SELECT 1 FROM public.note_accesses AS na
      WHERE na.note_id = n.id AND na.status = 'accepted'
    ) AS is_shared,
    public.can_edit_note(n.id) AS can_edit
  FROM public.notes AS n
  WHERE n.id = p_note_id
    AND n.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_note(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_note(UUID) TO authenticated;

-- Invitations waiting for the signed-in person, with what the notification
-- shows. RLS hides pending rows from the invitee, hence SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.list_note_invitations()
RETURNS TABLE (
  id UUID,
  note_id UUID,
  note_title TEXT,
  role TEXT,
  inviter_name TEXT,
  inviter_email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    note_access.id,
    note_access.note_id,
    note.title,
    note_access.role,
    NULLIF(btrim(inviter.profile ->> 'name'), ''),
    inviter.email,
    note_access.created_at
  FROM public.note_accesses AS note_access
  JOIN public.notes AS note ON note.id = note_access.note_id
  JOIN auth.users AS inviter ON inviter.id = note_access.invited_by
  WHERE note_access.status = 'pending'
    AND note_access.user_id IS NULL
    AND note.deleted_at IS NULL
    AND note_access.invited_email = (
      SELECT lower(btrim(app_user.email))
      FROM auth.users AS app_user
      WHERE app_user.id = (SELECT auth.uid())
    )
  ORDER BY note_access.created_at DESC;
$$;

-- Accepts or declines one invitation sent to the signed-in email. A declined
-- invitation is revoked, so the owner can invite again later.
CREATE OR REPLACE FUNCTION public.respond_note_invitation(
  p_access_id UUID,
  p_accept BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT lower(btrim(app_user.email))
  INTO current_email
  FROM auth.users AS app_user
  WHERE app_user.id = current_user_id;

  IF p_accept THEN
    UPDATE public.note_accesses AS note_access
    SET
      user_id = current_user_id,
      status = 'accepted',
      accepted_at = NOW(),
      revoked_at = NULL
    FROM public.notes AS note
    WHERE note_access.id = p_access_id
      AND note.id = note_access.note_id
      AND note.deleted_at IS NULL
      AND note_access.status = 'pending'
      AND note_access.user_id IS NULL
      AND note_access.invited_email = current_email;
  ELSE
    UPDATE public.note_accesses AS note_access
    SET
      status = 'revoked',
      revoked_at = NOW()
    WHERE note_access.id = p_access_id
      AND note_access.status = 'pending'
      AND note_access.user_id IS NULL
      AND note_access.invited_email = current_email;
  END IF;

  RETURN FOUND;
END;
$$;

-- Removes a note shared with the signed-in person from their notes: their
-- access is revoked and their reminders on it are cancelled. The note itself
-- and everyone else's access stay.
CREATE OR REPLACE FUNCTION public.leave_shared_note(p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.note_accesses
  SET
    status = 'revoked',
    revoked_at = NOW()
  WHERE note_id = p_note_id
    AND user_id = current_user_id
    AND status = 'accepted';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.reminders
  SET status = 'cancelled'
  WHERE note_id = p_note_id
    AND user_id = current_user_id
    AND status = 'scheduled';

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.list_note_invitations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_note_invitation(UUID, BOOLEAN)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_shared_note(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_note_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_note_invitation(UUID, BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_shared_note(UUID) TO authenticated;
