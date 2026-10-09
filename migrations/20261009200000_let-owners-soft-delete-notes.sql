-- Deleting a note sets deleted_at (UPDATE ... WHERE id = ...). Because the
-- UPDATE reads the row, Postgres also checks the *new* row against the SELECT
-- policy, and since 20261009052141 that policy requires deleted_at IS NULL on
-- the row itself, so every delete failed with
-- "new row violates row-level security policy for table notes".
-- (The old can_read_note(id) lookup read the row as it was before the update,
-- which hid the problem.)
-- The owner may now read their own deleted rows; list_notes, get_note,
-- can_read_note and can_edit_note still leave deleted notes out, so they do
-- not reappear in the app. Shared notes stay hidden once deleted.

DROP POLICY IF EXISTS notes_select_accessible ON public.notes;

CREATE POLICY notes_select_accessible
ON public.notes
FOR SELECT
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR (deleted_at IS NULL AND public.has_accepted_note_access(id))
);
