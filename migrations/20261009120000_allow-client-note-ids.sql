-- A new note stays only in the editor until something is written in it, and
-- the first save inserts it. The client picks the id up front so the open
-- tab (and the editor bound to it) keeps the same id once the row exists.
GRANT INSERT (id, title, content) ON public.notes TO authenticated;
