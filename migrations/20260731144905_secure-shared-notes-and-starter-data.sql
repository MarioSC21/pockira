REVOKE EXECUTE ON FUNCTION public.get_shared_note(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_shared_note(UUID, TEXT, TEXT, TEXT)
  FROM anon;

CREATE OR REPLACE FUNCTION public.ensure_note_samples()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  call_note_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notes AS existing_note
    WHERE existing_note.user_id = current_user_id
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.notes (user_id, title, body, tone)
  VALUES
    (
      current_user_id,
      'Ideas to explore',
      'Textures, references, and a small question.',
      'paper'
    ),
    (
      current_user_id,
      'Make space',
      'A softer plan for tomorrow.',
      'mint'
    );

  INSERT INTO public.notes (user_id, title, body, tone)
  VALUES (
    current_user_id,
    'Call Mom',
    'Tomorrow at 9:00 AM.',
    'yellow'
  )
  RETURNING id INTO call_note_id;

  INSERT INTO public.note_reminders (note_id, user_id, remind_at)
  VALUES (
    call_note_id,
    current_user_id,
    date_trunc('day', NOW() + INTERVAL '1 day') + INTERVAL '14 hours'
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_note_samples() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_note_samples() TO authenticated;
