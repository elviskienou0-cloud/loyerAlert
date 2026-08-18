
REVOKE EXECUTE ON FUNCTION public.effective_status(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_access(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.plan_limit(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s public.subscriptions%ROWTYPE; st public.sub_status;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT * INTO s FROM public.subscriptions WHERE user_id = uid;
  st := public.effective_status(uid);
  RETURN jsonb_build_object(
    'user_id', uid,
    'status', st,
    'plan', s.plan,
    'trial_started_at', s.trial_started_at,
    'trial_ends_at', s.trial_ends_at,
    'started_at', s.started_at,
    'ends_at', s.ends_at,
    'property_limit', public.plan_limit(uid),
    'property_count', (SELECT count(*) FROM public.properties WHERE user_id = uid),
    'is_admin', public.has_role(uid, 'admin'),
    'has_access', public.has_access(uid),
    'pending_request', (SELECT to_jsonb(pr) FROM public.payment_requests pr WHERE pr.user_id = uid AND pr.status = 'pending' LIMIT 1),
    'last_rejection', (SELECT pr.rejection_reason FROM public.payment_requests pr WHERE pr.user_id = uid AND pr.status = 'rejected' ORDER BY pr.reviewed_at DESC LIMIT 1)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.my_account() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_account() FROM anon, public;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'properties', (SELECT count(*) FROM public.properties),
    'active_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'active' AND ends_at > now()),
    'pending_payments', (SELECT count(*) FROM public.payment_requests WHERE status = 'pending'),
    'revenue', (SELECT COALESCE(sum(amount),0) FROM public.payment_requests WHERE status = 'approved')
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM anon, public;

CREATE OR REPLACE FUNCTION public.admin_users(p_search text DEFAULT NULL)
RETURNS TABLE (id uuid, full_name text, email text, phone text, suspended boolean, created_at timestamptz,
               plan public.sub_plan, status public.sub_status, trial_ends_at timestamptz, ends_at timestamptz, properties bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone, p.suspended, p.created_at,
         s.plan, public.effective_status(p.id), s.trial_ends_at, s.ends_at,
         (SELECT count(*) FROM public.properties pr WHERE pr.user_id = p.id)
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE p_search IS NULL OR p_search = '' OR p.email ILIKE '%'||p_search||'%' OR p.full_name ILIKE '%'||p_search||'%'
  ORDER BY p.created_at DESC LIMIT 200;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_users(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_users(text) FROM anon, public;
