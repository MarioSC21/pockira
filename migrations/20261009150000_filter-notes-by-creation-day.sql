-- The calendar and the "Hoy" filter pick notes by the day they were created,
-- the date each note shows, instead of their last modification. Same
-- function as before; only the date filter changes. The list is still
-- ordered by last modification.

CREATE OR REPLACE FUNCTION public.list_notes(
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
  is_shared BOOLEAN
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
    ) AS is_shared
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
