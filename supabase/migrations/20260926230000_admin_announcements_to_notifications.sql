ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('due_soon','due_today','overdue','announcement'));

CREATE OR REPLACE FUNCTION public.admin_send_announcement(
  p_title text,
  p_body text,
  p_audience text DEFAULT 'all',
  p_kind text DEFAULT 'announcement'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF coalesce(trim(p_title), '') = '' OR coalesce(trim(p_body), '') = '' THEN
    RAISE EXCEPTION 'Titre et message obligatoires';
  END IF;

  INSERT INTO public.admin_announcements (title, body, audience, kind, created_by)
  VALUES (trim(p_title), trim(p_body), coalesce(nullif(trim(p_audience), ''), 'all'), coalesce(nullif(trim(p_kind), ''), 'announcement'), auth.uid())
  RETURNING id INTO new_id;

  IF coalesce(nullif(trim(p_audience), ''), 'all') = 'all' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT id, 'announcement', trim(p_title), trim(p_body)
    FROM auth.users;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, details)
  VALUES (auth.uid(), 'announcement_sent', jsonb_build_object('id', new_id, 'audience', coalesce(nullif(trim(p_audience), ''), 'all'), 'kind', coalesce(nullif(trim(p_kind), ''), 'announcement'), 'admin', auth.uid()));

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_send_announcement(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_announcement(text, text, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
