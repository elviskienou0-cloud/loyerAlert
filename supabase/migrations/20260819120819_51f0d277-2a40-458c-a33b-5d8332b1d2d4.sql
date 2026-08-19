
-- Compte courant de l'utilisateur (état d'abonnement calculé en base)
CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); s public.subscriptions%ROWTYPE; st public.sub_status; pr record; rej text; cnt int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT * INTO s FROM public.subscriptions WHERE user_id = uid;
  st := public.effective_status(uid);
  SELECT count(*) INTO cnt FROM public.properties WHERE user_id = uid;
  SELECT plan, amount, created_at INTO pr FROM public.payment_requests
    WHERE user_id = uid AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  SELECT rejection_reason INTO rej FROM public.payment_requests
    WHERE user_id = uid AND status = 'rejected' ORDER BY reviewed_at DESC NULLS LAST LIMIT 1;
  RETURN jsonb_build_object(
    'user_id', uid,
    'status', st,
    'plan', COALESCE(s.plan, 'free'),
    'trial_ends_at', s.trial_ends_at,
    'started_at', s.started_at,
    'ends_at', s.ends_at,
    'property_limit', public.plan_limit(uid),
    'property_count', cnt,
    'is_admin', public.has_role(uid, 'admin'),
    'has_access', public.has_access(uid),
    'pending_request', CASE WHEN pr.plan IS NULL THEN NULL ELSE jsonb_build_object('plan', pr.plan, 'amount', pr.amount, 'created_at', pr.created_at) END,
    'last_rejection', rej
  );
END; $$;

-- Statistiques admin
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'properties', (SELECT count(*) FROM public.properties),
    'active_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'active' AND (ends_at IS NULL OR ends_at > now())),
    'pending_payments', (SELECT count(*) FROM public.payment_requests WHERE status = 'pending'),
    'revenue', (SELECT COALESCE(sum(amount),0) FROM public.payment_requests WHERE status = 'approved')
  );
END; $$;

-- Liste des utilisateurs pour l'admin
CREATE OR REPLACE FUNCTION public.admin_users(p_search text DEFAULT '')
RETURNS TABLE (
  id uuid, full_name text, email text, phone text, suspended boolean,
  created_at timestamptz, plan public.sub_plan, status public.sub_status,
  trial_ends_at timestamptz, started_at timestamptz, ends_at timestamptz,
  properties bigint, role public.app_role
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone, p.suspended, p.created_at,
         COALESCE(s.plan, 'free'::public.sub_plan),
         public.effective_status(p.id),
         s.trial_ends_at, s.started_at, s.ends_at,
         (SELECT count(*) FROM public.properties pr WHERE pr.user_id = p.id),
         COALESCE((SELECT r.role FROM public.user_roles r WHERE r.user_id = p.id ORDER BY r.role DESC LIMIT 1), 'user'::public.app_role)
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE COALESCE(p_search,'') = ''
     OR p.full_name ILIKE '%'||p_search||'%'
     OR p.email ILIKE '%'||p_search||'%'
  ORDER BY p.created_at DESC
  LIMIT 200;
END; $$;

-- Abonnements pour l'admin
CREATE OR REPLACE FUNCTION public.admin_subscriptions()
RETURNS TABLE (
  user_id uuid, full_name text, email text, plan public.sub_plan,
  status public.sub_status, trial_ends_at timestamptz, started_at timestamptz,
  ends_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT s.user_id, p.full_name, p.email, s.plan, public.effective_status(s.user_id),
         s.trial_ends_at, s.started_at, s.ends_at, s.updated_at
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY s.updated_at DESC
  LIMIT 300;
END; $$;

-- Journal admin
CREATE OR REPLACE FUNCTION public.admin_logs(p_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid, created_at timestamptz, action text, details jsonb,
  user_id uuid, user_email text, admin_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT l.id, l.created_at, l.action, l.details, l.user_id,
         p.email,
         (SELECT ap.email FROM public.profiles ap WHERE ap.id = (l.details->>'admin')::uuid)
  FROM public.activity_logs l
  LEFT JOIN public.profiles p ON p.id = l.user_id
  ORDER BY l.created_at DESC
  LIMIT LEAST(COALESCE(p_limit,100), 500);
END; $$;

REVOKE ALL ON FUNCTION public.my_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_users(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_subscriptions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_logs(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs(int) TO authenticated;
