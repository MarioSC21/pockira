CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'paper',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notes_title_not_blank
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  CONSTRAINT notes_body_size
    CHECK (char_length(body) <= 100000),
  CONSTRAINT notes_tone_valid
    CHECK (tone IN ('paper', 'yellow', 'blue', 'mint', 'rose', 'peach')),
  CONSTRAINT notes_id_user_unique UNIQUE (id, user_id)
);

CREATE TABLE public.note_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  owner_user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT note_collaborators_note_owner_fk
    FOREIGN KEY (note_id, owner_user_id)
    REFERENCES public.notes(id, user_id) ON DELETE CASCADE,
  CONSTRAINT note_collaborators_permission_valid
    CHECK (permission IN ('view', 'edit')),
  CONSTRAINT note_collaborators_not_owner
    CHECK (owner_user_id <> shared_with_user_id),
  CONSTRAINT note_collaborators_note_user_unique
    UNIQUE (note_id, shared_with_user_id)
);

CREATE TABLE public.note_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT note_reminders_status_valid
    CHECK (status IN ('scheduled', 'completed', 'dismissed')),
  CONSTRAINT note_reminders_note_user_unique UNIQUE (note_id, user_id)
);

CREATE TABLE public.note_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  owner_user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  permission TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT note_share_links_note_owner_fk
    FOREIGN KEY (note_id, owner_user_id)
    REFERENCES public.notes(id, user_id) ON DELETE CASCADE,
  CONSTRAINT note_share_links_permission_valid
    CHECK (permission IN ('view', 'edit')),
  CONSTRAINT note_share_links_expiry_valid
    CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT note_share_links_token_unique UNIQUE (token)
);

CREATE INDEX notes_user_id_idx ON public.notes(user_id);

CREATE INDEX notes_user_updated_at_idx
  ON public.notes(user_id, updated_at DESC);

CREATE INDEX note_collaborators_owner_idx
  ON public.note_collaborators(owner_user_id);

CREATE INDEX note_collaborators_recipient_idx
  ON public.note_collaborators(shared_with_user_id);

CREATE INDEX note_reminders_user_remind_at_idx
  ON public.note_reminders(user_id, remind_at)
  WHERE status = 'scheduled';

CREATE INDEX note_share_links_owner_idx
  ON public.note_share_links(owner_user_id);

CREATE INDEX note_share_links_note_idx
  ON public.note_share_links(note_id);

CREATE OR REPLACE FUNCTION public.can_access_note(
  p_note_id UUID,
  p_require_edit BOOLEAN DEFAULT FALSE
)
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
      AND (
        note.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.note_collaborators AS collaborator
          WHERE collaborator.note_id = note.id
            AND collaborator.shared_with_user_id = (SELECT auth.uid())
            AND (
              NOT p_require_edit
              OR collaborator.permission = 'edit'
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_shared_note(p_token UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  tone TEXT,
  permission TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    note.id,
    note.title,
    note.body,
    note.tone,
    link.permission,
    note.updated_at
  FROM public.note_share_links AS link
  JOIN public.notes AS note ON note.id = link.note_id
  WHERE link.token = p_token
    AND link.revoked_at IS NULL
    AND (link.expires_at IS NULL OR link.expires_at > NOW())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_shared_note(
  p_token UUID,
  p_title TEXT,
  p_body TEXT,
  p_tone TEXT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  tone TEXT,
  permission TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  target_note_id UUID;
BEGIN
  SELECT link.note_id
  INTO target_note_id
  FROM public.note_share_links AS link
  WHERE link.token = p_token
    AND link.permission = 'edit'
    AND link.revoked_at IS NULL
    AND (link.expires_at IS NULL OR link.expires_at > NOW());

  IF target_note_id IS NULL THEN
    RAISE EXCEPTION 'The share link is invalid, expired, revoked, or read-only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE public.notes AS note
  SET
    title = p_title,
    body = p_body,
    tone = p_tone
  WHERE note.id = target_note_id
  RETURNING
    note.id,
    note.title,
    note.body,
    note.tone,
    'edit'::TEXT,
    note.updated_at;
END;
$$;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER note_collaborators_updated_at
  BEFORE UPDATE ON public.note_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER note_reminders_updated_at
  BEFORE UPDATE ON public.note_reminders
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER note_share_links_updated_at
  BEFORE UPDATE ON public.note_share_links
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.note_collaborators ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.note_reminders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.note_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_insert_own
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notes_select_accessible
ON public.notes
FOR SELECT
TO authenticated
USING (public.can_access_note(id, FALSE));

CREATE POLICY notes_update_accessible
ON public.notes
FOR UPDATE
TO authenticated
USING (public.can_access_note(id, TRUE))
WITH CHECK (public.can_access_note(id, TRUE));

CREATE POLICY notes_delete_own
ON public.notes
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY note_collaborators_select_involved
ON public.note_collaborators
FOR SELECT
TO authenticated
USING (
  owner_user_id = (SELECT auth.uid())
  OR shared_with_user_id = (SELECT auth.uid())
);

CREATE POLICY note_collaborators_insert_own_note
ON public.note_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
  AND public.can_access_note(note_id, TRUE)
);

CREATE POLICY note_collaborators_update_own_note
ON public.note_collaborators
FOR UPDATE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
  AND public.can_access_note(note_id, TRUE)
);

CREATE POLICY note_collaborators_delete_own_note
ON public.note_collaborators
FOR DELETE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY note_reminders_select_own
ON public.note_reminders
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY note_reminders_insert_own
ON public.note_reminders
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.can_access_note(note_id, FALSE)
);

CREATE POLICY note_reminders_update_own
ON public.note_reminders
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.can_access_note(note_id, FALSE)
);

CREATE POLICY note_reminders_delete_own
ON public.note_reminders
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY note_share_links_select_own
ON public.note_share_links
FOR SELECT
TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY note_share_links_insert_own
ON public.note_share_links
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
  AND public.can_access_note(note_id, TRUE)
);

CREATE POLICY note_share_links_update_own
ON public.note_share_links
FOR UPDATE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
  AND public.can_access_note(note_id, TRUE)
);

CREATE POLICY note_share_links_delete_own
ON public.note_share_links
FOR DELETE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

REVOKE ALL ON public.notes FROM anon, authenticated;

REVOKE ALL ON public.note_collaborators FROM anon, authenticated;

REVOKE ALL ON public.note_reminders FROM anon, authenticated;

REVOKE ALL ON public.note_share_links FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.notes TO authenticated;

GRANT INSERT (title, body, tone, is_pinned)
  ON public.notes TO authenticated;

GRANT UPDATE (title, body, tone, is_pinned)
  ON public.notes TO authenticated;

GRANT DELETE ON public.notes TO authenticated;

GRANT SELECT ON public.note_collaborators TO authenticated;

GRANT INSERT (note_id, shared_with_user_id, permission)
  ON public.note_collaborators TO authenticated;

GRANT UPDATE (permission)
  ON public.note_collaborators TO authenticated;

GRANT DELETE ON public.note_collaborators TO authenticated;

GRANT SELECT ON public.note_reminders TO authenticated;

GRANT INSERT (note_id, remind_at, status)
  ON public.note_reminders TO authenticated;

GRANT UPDATE (remind_at, status)
  ON public.note_reminders TO authenticated;

GRANT DELETE ON public.note_reminders TO authenticated;

GRANT SELECT ON public.note_share_links TO authenticated;

GRANT INSERT (note_id, permission, expires_at)
  ON public.note_share_links TO authenticated;

GRANT UPDATE (permission, expires_at, revoked_at)
  ON public.note_share_links TO authenticated;

GRANT DELETE ON public.note_share_links TO authenticated;

REVOKE ALL ON FUNCTION public.can_access_note(UUID, BOOLEAN) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_shared_note(UUID) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.update_shared_note(UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_note(UUID, BOOLEAN)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_shared_note(UUID)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_shared_note(UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;
