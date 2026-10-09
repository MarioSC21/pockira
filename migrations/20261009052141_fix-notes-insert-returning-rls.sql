-- notes_select_accessible used can_read_note(id), which looks the note up in
-- public.notes. On INSERT ... RETURNING (every insert().select() from the SDK)
-- Postgres checks the SELECT policy against the new row *before* it is
-- written, so that lookup finds nothing and the insert fails with
-- "new row violates row-level security policy for table notes".
-- The policy now reads the row's own columns and only looks up
-- note_accesses for shared notes.

CREATE OR REPLACE FUNCTION public.has_accepted_note_access(p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.note_accesses AS note_access
    WHERE note_access.note_id = p_note_id
      AND note_access.user_id = (SELECT auth.uid())
      AND note_access.status = 'accepted'
  );
$$;

REVOKE ALL ON FUNCTION public.has_accepted_note_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_accepted_note_access(UUID)
  TO authenticated;

DROP POLICY IF EXISTS notes_select_accessible ON public.notes;

CREATE POLICY notes_select_accessible
ON public.notes
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    owner_id = (SELECT auth.uid())
    OR public.has_accepted_note_access(id)
  )
);
