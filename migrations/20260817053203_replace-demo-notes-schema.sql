-- Replace the prototype notes schema with the Pockira MVP domain model.
-- The previous rows are demo data and are intentionally discarded.

DROP FUNCTION IF EXISTS public.ensure_note_samples();
DROP FUNCTION IF EXISTS public.get_shared_note(UUID);
DROP FUNCTION IF EXISTS public.update_shared_note(UUID, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS public.note_share_links CASCADE;
DROP TABLE IF EXISTS public.note_collaborators CASCADE;
DROP TABLE IF EXISTS public.note_reminders CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;

DROP FUNCTION IF EXISTS public.can_access_note(UUID, BOOLEAN);

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT
    '{"type":"doc","content":[{"type":"paragraph"}]}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT notes_id_owner_unique UNIQUE (id, owner_id),
  CONSTRAINT notes_title_size CHECK (char_length(title) <= 500),
  CONSTRAINT notes_content_tiptap_doc CHECK (
    jsonb_typeof(content) = 'object'
    AND content ->> 'type' = 'doc'
  )
);

CREATE TABLE public.note_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT note_accesses_note_owner_fk
    FOREIGN KEY (note_id, invited_by)
    REFERENCES public.notes(id, owner_id) ON DELETE CASCADE,
  CONSTRAINT note_accesses_role_valid
    CHECK (role IN ('editor', 'reader')),
  CONSTRAINT note_accesses_status_valid
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  CONSTRAINT note_accesses_email_format CHECK (
    invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT note_accesses_state_valid CHECK (
    (
      status = 'pending'
      AND user_id IS NULL
      AND accepted_at IS NULL
      AND revoked_at IS NULL
    )
    OR (
      status = 'accepted'
      AND user_id IS NOT NULL
      AND accepted_at IS NOT NULL
      AND revoked_at IS NULL
    )
    OR (
      status = 'revoked'
      AND revoked_at IS NOT NULL
    )
  )
);

CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT reminders_status_valid
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  CONSTRAINT reminders_completion_valid CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  last_opened_note_id UUID
    REFERENCES public.notes(id) ON DELETE SET NULL,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_preferences_timezone_not_blank CHECK (
    timezone IS NULL OR char_length(btrim(timezone)) > 0
  )
);

CREATE INDEX notes_owner_updated_at_idx
  ON public.notes(owner_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX notes_updated_at_idx
  ON public.notes(updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX note_accesses_active_email_unique_idx
  ON public.note_accesses(note_id, invited_email)
  WHERE status <> 'revoked';

CREATE UNIQUE INDEX note_accesses_active_user_unique_idx
  ON public.note_accesses(note_id, user_id)
  WHERE user_id IS NOT NULL AND status <> 'revoked';

CREATE INDEX note_accesses_user_updated_at_idx
  ON public.note_accesses(user_id, updated_at DESC)
  WHERE status = 'accepted';

CREATE INDEX note_accesses_pending_email_created_at_idx
  ON public.note_accesses(invited_email, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX reminders_user_remind_at_idx
  ON public.reminders(user_id, remind_at)
  WHERE status = 'scheduled';

CREATE INDEX reminders_note_user_idx
  ON public.reminders(note_id, user_id);

CREATE INDEX user_preferences_last_opened_note_idx
  ON public.user_preferences(last_opened_note_id)
  WHERE last_opened_note_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_note_owner(p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes AS note
    WHERE note.id = p_note_id
      AND note.owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_note(p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes AS note
    WHERE note.id = p_note_id
      AND note.deleted_at IS NULL
      AND (
        note.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.note_accesses AS note_access
          WHERE note_access.note_id = note.id
            AND note_access.user_id = (SELECT auth.uid())
            AND note_access.status = 'accepted'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_note(p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes AS note
    WHERE note.id = p_note_id
      AND note.deleted_at IS NULL
      AND (
        note.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.note_accesses AS note_access
          WHERE note_access.note_id = note.id
            AND note_access.user_id = (SELECT auth.uid())
            AND note_access.status = 'accepted'
            AND note_access.role = 'editor'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.prepare_note_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  owner_email TEXT;
BEGIN
  NEW.invited_email := lower(btrim(NEW.invited_email));

  SELECT lower(btrim(app_user.email))
  INTO owner_email
  FROM auth.users AS app_user
  WHERE app_user.id = NEW.invited_by;

  IF owner_email = NEW.invited_email THEN
    RAISE EXCEPTION 'The note owner cannot be invited as a collaborator';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_note_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;

  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    AND OLD.owner_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Only the note owner can change deleted_at';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.maintain_reminder_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.note_id IS DISTINCT FROM OLD.note_id THEN
      RAISE EXCEPTION 'note_id cannot be changed';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id cannot be changed';
    END IF;
  END IF;

  IF NEW.status = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_note_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT;
  claimed_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT lower(btrim(app_user.email))
  INTO current_email
  FROM auth.users AS app_user
  WHERE app_user.id = current_user_id;

  UPDATE public.note_accesses AS note_access
  SET
    user_id = current_user_id,
    status = 'accepted',
    accepted_at = NOW(),
    revoked_at = NULL,
    updated_at = NOW()
  FROM public.notes AS note
  WHERE note_access.note_id = note.id
    AND note.deleted_at IS NULL
    AND note_access.status = 'pending'
    AND note_access.user_id IS NULL
    AND note_access.invited_email = current_email;

  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_note_access(p_access_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  target_note_id UUID;
  target_user_id UUID;
BEGIN
  SELECT note_access.note_id, note_access.user_id
  INTO target_note_id, target_user_id
  FROM public.note_accesses AS note_access
  JOIN public.notes AS note ON note.id = note_access.note_id
  WHERE note_access.id = p_access_id
    AND note.owner_id = (SELECT auth.uid())
    AND note_access.status <> 'revoked';

  IF target_note_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.note_accesses
  SET
    status = 'revoked',
    revoked_at = NOW(),
    updated_at = NOW()
  WHERE id = p_access_id;

  IF target_user_id IS NOT NULL THEN
    UPDATE public.reminders
    SET
      status = 'cancelled',
      completed_at = NULL,
      updated_at = NOW()
    WHERE note_id = target_note_id
      AND user_id = target_user_id
      AND status = 'scheduled';
  END IF;

  RETURN TRUE;
END;
$$;

CREATE TRIGGER note_accesses_prepare
  BEFORE INSERT OR UPDATE OF invited_email, invited_by
  ON public.note_accesses
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_note_access();

CREATE TRIGGER notes_protect_fields
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_note_fields();

CREATE TRIGGER reminders_maintain_state
  BEFORE INSERT OR UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_reminder_state();

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER note_accesses_updated_at
  BEFORE UPDATE ON public.note_accesses
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select_accessible
ON public.notes
FOR SELECT
TO authenticated
USING (public.can_read_note(id));

CREATE POLICY notes_insert_own
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND deleted_at IS NULL
);

CREATE POLICY notes_update_editable
ON public.notes
FOR UPDATE
TO authenticated
USING (public.can_edit_note(id))
WITH CHECK (public.can_edit_note(id));

CREATE POLICY notes_delete_own
ON public.notes
FOR DELETE
TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY note_accesses_select_involved
ON public.note_accesses
FOR SELECT
TO authenticated
USING (
  public.is_note_owner(note_id)
  OR (
    user_id = (SELECT auth.uid())
    AND status = 'accepted'
  )
);

CREATE POLICY note_accesses_insert_owner
ON public.note_accesses
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = (SELECT auth.uid())
  AND status = 'pending'
  AND user_id IS NULL
  AND public.is_note_owner(note_id)
);

CREATE POLICY note_accesses_update_owner
ON public.note_accesses
FOR UPDATE
TO authenticated
USING (public.is_note_owner(note_id))
WITH CHECK (public.is_note_owner(note_id));

CREATE POLICY reminders_select_own
ON public.reminders
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.can_read_note(note_id)
);

CREATE POLICY reminders_insert_own
ON public.reminders
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.can_read_note(note_id)
);

CREATE POLICY reminders_update_own
ON public.reminders
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.can_read_note(note_id)
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.can_read_note(note_id)
);

CREATE POLICY reminders_delete_own
ON public.reminders
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.can_read_note(note_id)
);

CREATE POLICY user_preferences_select_own
ON public.user_preferences
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_insert_own
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    last_opened_note_id IS NULL
    OR public.can_read_note(last_opened_note_id)
  )
);

CREATE POLICY user_preferences_update_own
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    last_opened_note_id IS NULL
    OR public.can_read_note(last_opened_note_id)
  )
);

REVOKE ALL ON public.notes FROM anon, authenticated;
REVOKE ALL ON public.note_accesses FROM anon, authenticated;
REVOKE ALL ON public.reminders FROM anon, authenticated;
REVOKE ALL ON public.user_preferences FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.notes TO authenticated;
GRANT INSERT (title, content) ON public.notes TO authenticated;
GRANT UPDATE (title, content, deleted_at) ON public.notes TO authenticated;
GRANT DELETE ON public.notes TO authenticated;

GRANT SELECT ON public.note_accesses TO authenticated;
GRANT INSERT (note_id, invited_email, role)
  ON public.note_accesses TO authenticated;
GRANT UPDATE (role) ON public.note_accesses TO authenticated;

GRANT SELECT ON public.reminders TO authenticated;
GRANT INSERT (note_id, remind_at) ON public.reminders TO authenticated;
GRANT UPDATE (remind_at, status) ON public.reminders TO authenticated;
GRANT DELETE ON public.reminders TO authenticated;

GRANT SELECT ON public.user_preferences TO authenticated;
GRANT INSERT (last_opened_note_id, timezone)
  ON public.user_preferences TO authenticated;
GRANT UPDATE (last_opened_note_id, timezone)
  ON public.user_preferences TO authenticated;

REVOKE ALL ON FUNCTION public.is_note_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_note(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_note(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_note_invitations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_note_access(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_note_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_note(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_note(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_note_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_note_access(UUID) TO authenticated;
