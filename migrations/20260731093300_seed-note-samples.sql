DO $$
DECLARE
  seed_user_id UUID;
  ideas_note_id UUID;
  call_note_id UUID;
BEGIN
  SELECT app_user.id
  INTO seed_user_id
  FROM auth.users AS app_user
  ORDER BY app_user.created_at, app_user.id
  LIMIT 1;

  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'Skipping note samples because auth.users has no app users';
    RETURN;
  END IF;

  INSERT INTO public.notes (user_id, title, body, tone)
  VALUES (
    seed_user_id,
    'Ideas to explore',
    'Textures, references, and a small question.',
    'paper'
  )
  RETURNING id INTO ideas_note_id;

  INSERT INTO public.notes (user_id, title, body, tone)
  VALUES (
    seed_user_id,
    'Call Mom',
    'Tomorrow at 9:00 AM.',
    'yellow'
  )
  RETURNING id INTO call_note_id;

  INSERT INTO public.notes (user_id, title, body, tone, is_pinned)
  VALUES (
    seed_user_id,
    'Make space',
    'A softer plan for tomorrow.',
    'mint',
    TRUE
  );

  INSERT INTO public.note_reminders (note_id, user_id, remind_at)
  VALUES (
    call_note_id,
    seed_user_id,
    date_trunc('day', NOW() + INTERVAL '1 day') + INTERVAL '14 hours'
  );

  INSERT INTO public.note_share_links (
    note_id,
    owner_user_id,
    permission
  )
  VALUES (ideas_note_id, seed_user_id, 'view');
END;
$$;
