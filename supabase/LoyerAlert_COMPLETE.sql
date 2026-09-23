
CREATE TYPE public.app_role AS ENUM ('user','admin');
CREATE TYPE public.sub_status AS ENUM ('trial','active','expired','suspended');
CREATE TYPE public.sub_plan AS ENUM ('free','starter','pro','business');
CREATE TYPE public.pay_request_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin profile update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.sub_plan NOT NULL DEFAULT 'free',
  status public.sub_status NOT NULL DEFAULT 'trial',
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  started_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub read own" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, plan, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'free', 'trial', now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.effective_status(_user_id uuid)
RETURNS public.sub_status LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.subscriptions%ROWTYPE; susp boolean;
BEGIN
  SELECT suspended INTO susp FROM public.profiles WHERE id = _user_id;
  IF COALESCE(susp,false) THEN RETURN 'suspended'; END IF;
  SELECT * INTO s FROM public.subscriptions WHERE user_id = _user_id;
  IF s.user_id IS NULL THEN RETURN 'expired'; END IF;
  IF s.status = 'suspended' THEN RETURN 'suspended'; END IF;
  IF s.status = 'active' AND s.ends_at IS NOT NULL AND s.ends_at > now() THEN RETURN 'active'; END IF;
  IF s.trial_ends_at > now() AND s.status IN ('trial','expired') THEN RETURN 'trial'; END IF;
  RETURN 'expired';
END; $$;

CREATE OR REPLACE FUNCTION public.has_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.effective_status(_user_id) IN ('trial','active');
$$;

CREATE OR REPLACE FUNCTION public.plan_limit(_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.sub_status; pl public.sub_plan;
BEGIN
  st := public.effective_status(_user_id);
  SELECT plan INTO pl FROM public.subscriptions WHERE user_id = _user_id;
  IF st = 'trial' THEN RETURN 30; END IF;
  IF st <> 'active' THEN RETURN 3; END IF;
  RETURN CASE pl WHEN 'starter' THEN 10 WHEN 'pro' THEN 30 WHEN 'business' THEN 100 ELSE 3 END;
END; $$;

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  rent_amount numeric(12,0) NOT NULL DEFAULT 0,
  due_day smallint NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 28),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties own" ON public.properties FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_property_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer; lim integer;
BEGIN
  IF NOT public.has_access(NEW.user_id) THEN
    RAISE EXCEPTION 'Abonnement expirÃ© : impossible d''ajouter un logement.';
  END IF;
  SELECT count(*) INTO c FROM public.properties WHERE user_id = NEW.user_id;
  lim := public.plan_limit(NEW.user_id);
  IF c >= lim THEN
    RAISE EXCEPTION 'Limite de % logements atteinte pour votre formule.', lim;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER properties_limit BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.enforce_property_limit();

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  move_in_date date,
  rent_amount numeric(12,0) NOT NULL DEFAULT 0,
  due_day smallint NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 28),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants own" ON public.tenants FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.rent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  period date NOT NULL,
  amount_due numeric(12,0) NOT NULL,
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_records TO authenticated;
GRANT ALL ON public.rent_records TO service_role;
ALTER TABLE public.rent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rent own" ON public.rent_records FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rent_record_id uuid NOT NULL REFERENCES public.rent_records(id) ON DELETE CASCADE,
  amount numeric(12,0) NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT current_date,
  method text,
  note text,
  reference text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_payments TO authenticated;
GRANT ALL ON public.rent_payments TO service_role;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rent payments own" ON public.rent_payments FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE VIEW public.rent_status_view WITH (security_invoker = true) AS
SELECT r.id, r.user_id, r.tenant_id, r.property_id, r.period, r.amount_due, r.due_date,
  t.full_name AS tenant_name, t.phone AS tenant_phone, p.name AS property_name,
  COALESCE(sum(pay.amount), 0)::numeric AS paid_amount,
  (r.amount_due - COALESCE(sum(pay.amount), 0))::numeric AS balance,
  CASE
    WHEN COALESCE(sum(pay.amount),0) >= r.amount_due THEN 'paid'
    WHEN current_date > r.due_date THEN 'overdue'
    WHEN COALESCE(sum(pay.amount),0) > 0 THEN 'partially_paid'
    WHEN current_date = r.due_date THEN 'due'
    ELSE 'upcoming'
  END AS status
FROM public.rent_records r
JOIN public.tenants t ON t.id = r.tenant_id
LEFT JOIN public.properties p ON p.id = r.property_id
LEFT JOIN public.rent_payments pay ON pay.rent_record_id = r.id
GROUP BY r.id, t.full_name, t.phone, p.name;
GRANT SELECT ON public.rent_status_view TO authenticated;
GRANT ALL ON public.rent_status_view TO service_role;

CREATE OR REPLACE FUNCTION public.generate_rent_records(p_period date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n integer := 0; m date := date_trunc('month', p_period)::date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifiÃ©'; END IF;
  IF NOT public.has_access(uid) THEN RAISE EXCEPTION 'Abonnement expirÃ©'; END IF;
  INSERT INTO public.rent_records (user_id, tenant_id, property_id, period, amount_due, due_date)
  SELECT uid, t.id, t.property_id, m, t.rent_amount, (m + (t.due_day - 1) * interval '1 day')::date
  FROM public.tenants t
  WHERE t.user_id = uid AND t.active AND t.rent_amount > 0
    AND (t.move_in_date IS NULL OR t.move_in_date <= (m + interval '1 month' - interval '1 day')::date)
  ON CONFLICT (tenant_id, period) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_rent_records(date) TO authenticated;

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.sub_plan NOT NULL,
  amount numeric(12,0) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('orange_money','moov_money')),
  sender_phone text NOT NULL,
  transaction_reference text,
  screenshot_path text NOT NULL,
  status public.pay_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text
);
GRANT SELECT, INSERT ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr read own" ON public.payment_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "pr insert own" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE UNIQUE INDEX one_pending_request ON public.payment_requests (user_id) WHERE status = 'pending';

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs read own" ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "logs insert own" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.review_payment_request(p_request_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.payment_requests%ROWTYPE; admin_id uuid := auth.uid();
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  SELECT * INTO req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Demande dÃ©jÃ  traitÃ©e'; END IF;
  IF p_approve THEN
    UPDATE public.payment_requests SET status = 'approved', reviewed_at = now(), reviewed_by = admin_id WHERE id = p_request_id;
    UPDATE public.subscriptions
      SET plan = req.plan, status = 'active', started_at = now(),
          ends_at = GREATEST(COALESCE(ends_at, now()), now()) + interval '30 days', updated_at = now()
      WHERE user_id = req.user_id;
    INSERT INTO public.activity_logs (user_id, action, details)
      VALUES (req.user_id, 'payment_approved', jsonb_build_object('request_id', p_request_id, 'plan', req.plan, 'admin', admin_id));
  ELSE
    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Une raison est obligatoire'; END IF;
    UPDATE public.payment_requests
      SET status = 'rejected', reviewed_at = now(), reviewed_by = admin_id, rejection_reason = p_reason WHERE id = p_request_id;
    INSERT INTO public.activity_logs (user_id, action, details)
      VALUES (req.user_id, 'payment_rejected', jsonb_build_object('request_id', p_request_id, 'reason', p_reason, 'admin', admin_id));
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_suspended(p_user_id uuid, p_suspended boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  UPDATE public.profiles SET suspended = p_suspended, updated_at = now() WHERE id = p_user_id;
  UPDATE public.subscriptions SET status = CASE WHEN p_suspended THEN 'suspended' ELSE 'expired' END, updated_at = now()
    WHERE user_id = p_user_id AND (p_suspended OR status = 'suspended');
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (p_user_id, CASE WHEN p_suspended THEN 'suspended' ELSE 'reactivated' END, jsonb_build_object('admin', auth.uid()));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;

CREATE POLICY "proofs upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proofs read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.effective_status(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.plan_limit(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_rent_records(date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.review_payment_request(uuid, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_property_limit() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_rent_records(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.effective_status(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_access(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.plan_limit(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s public.subscriptions%ROWTYPE; st public.sub_status;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifiÃ©'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
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

-- Compte courant de l'utilisateur (Ã©tat d'abonnement calculÃ© en base)
CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); s public.subscriptions%ROWTYPE; st public.sub_status; pr record; rej text; cnt int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifiÃ©'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
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

-- Verrouillage des fonctions SECURITY DEFINER : aucun accÃ¨s anonyme, accÃ¨s signÃ©-in limitÃ© au strict nÃ©cessaire
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- Appelables par un utilisateur connectÃ© (chacune vÃ©rifie elle-mÃªme les droits)
GRANT EXECUTE ON FUNCTION public.my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_rent_records(date) TO authenticated;
-- Requis par les politiques RLS Ã©valuÃ©es cÃ´tÃ© utilisateur
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'chocolocks9@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
-- 1. Log activity when a payment request is created or reviewed status changes
CREATE OR REPLACE FUNCTION public.log_payment_request_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (NEW.user_id, 'payment_requested',
      jsonb_build_object('request_id', NEW.id, 'plan', NEW.plan, 'amount', NEW.amount, 'method', NEW.payment_method));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (NEW.user_id, 'payment_status_changed',
      jsonb_build_object('request_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS payment_requests_log ON public.payment_requests;
CREATE TRIGGER payment_requests_log
AFTER INSERT OR UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.log_payment_request_event();

REVOKE EXECUTE ON FUNCTION public.log_payment_request_event() FROM PUBLIC, anon, authenticated;

-- 2. Realtime on payment requests (RLS still applies: only owner + admins receive rows)
ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3. Chart data for the admin dashboard
CREATE OR REPLACE FUNCTION public.admin_charts(p_months integer DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer := LEAST(GREATEST(COALESCE(p_months, 6), 3), 24);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN jsonb_build_object(
    'revenue', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x->>'month'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'month', to_char(m.month, 'YYYY-MM'),
          'revenue', COALESCE((SELECT sum(pr.amount) FROM public.payment_requests pr
             WHERE pr.status = 'approved' AND date_trunc('month', COALESCE(pr.reviewed_at, pr.created_at)) = m.month), 0),
          'requests', (SELECT count(*) FROM public.payment_requests pr
             WHERE date_trunc('month', pr.created_at) = m.month)
        ) AS x
        FROM generate_series(date_trunc('month', now()) - ((n - 1) || ' months')::interval,
                             date_trunc('month', now()), interval '1 month') AS m(month)
      ) s
    ),
    'subscriptions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('status', st, 'count', c)), '[]'::jsonb)
      FROM (SELECT public.effective_status(s.user_id)::text AS st, count(*) AS c
            FROM public.subscriptions s GROUP BY 1) t
    ),
    'plans', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('plan', pl, 'count', c)), '[]'::jsonb)
      FROM (SELECT s.plan::text AS pl, count(*) AS c FROM public.subscriptions s
            WHERE public.effective_status(s.user_id) = 'active' GROUP BY 1) t
    ),
    'approval', (
      SELECT jsonb_build_object(
        'approved', count(*) FILTER (WHERE status = 'approved'),
        'rejected', count(*) FILTER (WHERE status = 'rejected'),
        'pending',  count(*) FILTER (WHERE status = 'pending'),
        'rate', CASE WHEN count(*) FILTER (WHERE status <> 'pending') = 0 THEN NULL
                ELSE round(100.0 * count(*) FILTER (WHERE status = 'approved')
                     / count(*) FILTER (WHERE status <> 'pending'), 1) END)
      FROM public.payment_requests
    )
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_charts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_charts(integer) TO authenticated;
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'bokessbo@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS paid_at date,
  ADD COLUMN IF NOT EXISTS payment_channel text NOT NULL DEFAULT 'manual';

CREATE OR REPLACE FUNCTION public.review_payment_request(p_request_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE req public.payment_requests%ROWTYPE; admin_id uuid := auth.uid();
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  SELECT * INTO req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Demande dÃ©jÃ  traitÃ©e'; END IF;
  IF p_approve THEN
    UPDATE public.payment_requests SET status = 'approved', reviewed_at = now(), reviewed_by = admin_id WHERE id = p_request_id;
    UPDATE public.subscriptions
      SET plan = req.plan, status = 'active', started_at = now(),
          ends_at = GREATEST(COALESCE(ends_at, now()), now()) + interval '1 month', updated_at = now()
      WHERE user_id = req.user_id;
    INSERT INTO public.activity_logs (user_id, action, details)
      VALUES (req.user_id, 'payment_approved', jsonb_build_object('request_id', p_request_id, 'plan', req.plan, 'admin', admin_id));
  ELSE
    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Une raison est obligatoire'; END IF;
    UPDATE public.payment_requests
      SET status = 'rejected', reviewed_at = now(), reviewed_by = admin_id, rejection_reason = p_reason WHERE id = p_request_id;
    INSERT INTO public.activity_logs (user_id, action, details)
      VALUES (req.user_id, 'payment_rejected', jsonb_build_object('request_id', p_request_id, 'reason', p_reason, 'admin', admin_id));
  END IF;
END; $function$;
-- 1. Roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

SET LOCAL check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text = 'super_admin');
END; $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text IN ('admin','super_admin'));
END; $$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text IN ('admin','super_admin','moderator'));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_level(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE lv text;
BEGIN
  SELECT CASE
    WHEN bool_or(r.role::text = 'super_admin') THEN 'super_admin'
    WHEN bool_or(r.role::text = 'admin') THEN 'admin'
    WHEN bool_or(r.role::text = 'moderator') THEN 'moderator'
    ELSE 'user' END INTO lv
  FROM public.user_roles r WHERE r.user_id = _user_id;
  RETURN COALESCE(lv, 'user');
END; $$;

-- 2. Platform settings (singleton)
CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  brand_name text NOT NULL DEFAULT 'LoyerAlert',
  logo_url text,
  contact_email text NOT NULL DEFAULT 'kienoucoucou5@gmail.com',
  contact_phone text,
  whatsapp_number text,
  plans jsonb NOT NULL DEFAULT '{"starter":{"price":1000,"months":1,"limit":10},"pro":{"price":2500,"months":1,"limit":30},"business":{"price":5000,"months":1,"limit":100}}'::jsonb,
  saspay jsonb NOT NULL DEFAULT '{"enabled":true,"starter":"https://link.saspay.me/sqotet4qbwg","pro":"https://link.saspay.me/bz6rsahl3a0","business":"https://link.saspay.me/w2zwhoi_xvu"}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{"admin_realtime":true,"reminder_days_before":3}'::jsonb,
  terms text,
  privacy text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id)
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings updatable by super admin" ON public.platform_settings FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 3. Announcements
CREATE TABLE public.admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','owners','tenants')),
  kind text NOT NULL DEFAULT 'announcement' CHECK (kind IN ('announcement','maintenance','info')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_announcements TO authenticated;
GRANT ALL ON public.admin_announcements TO service_role;
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements read" ON public.admin_announcements FOR SELECT TO authenticated USING (active OR public.is_staff());

-- 4. Alert logs
CREATE TABLE public.alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid,
  recipient_name text,
  recipient_phone text,
  channel text NOT NULL DEFAULT 'whatsapp',
  kind text NOT NULL DEFAULT 'reminder',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','scheduled','failed')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.alert_logs TO authenticated;
GRANT ALL ON public.alert_logs TO service_role;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts insert own" ON public.alert_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "alerts read own" ON public.alert_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
CREATE INDEX alert_logs_created_idx ON public.alert_logs (created_at DESC);

-- 5. Dashboard stats
CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'owners', (SELECT count(DISTINCT user_id) FROM public.properties),
    'tenants', (SELECT count(*) FROM public.tenants),
    'properties', (SELECT count(*) FROM public.properties),
    'active_subs', (SELECT count(*) FROM public.subscriptions s WHERE public.effective_status(s.user_id) = 'active'),
    'trial_subs', (SELECT count(*) FROM public.subscriptions s WHERE public.effective_status(s.user_id) = 'trial'),
    'expired_subs', (SELECT count(*) FROM public.subscriptions s WHERE public.effective_status(s.user_id) = 'expired'),
    'pending_payments', (SELECT count(*) FROM public.payment_requests WHERE status = 'pending'),
    'revenue', (SELECT COALESCE(sum(amount),0) FROM public.payment_requests WHERE status = 'approved'),
    'alerts', (SELECT count(*) FROM public.alert_logs),
    'recent_payments', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', pr.id, 'amount', pr.amount, 'plan', pr.plan, 'status', pr.status,
          'created_at', pr.created_at, 'channel', pr.payment_channel,
          'user', COALESCE(p.full_name, p.email)) AS x
        FROM public.payment_requests pr LEFT JOIN public.profiles p ON p.id = pr.user_id
        ORDER BY pr.created_at DESC LIMIT 8) t),
    'recent_users', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', p.id, 'name', p.full_name, 'email', p.email,
          'created_at', p.created_at, 'status', public.effective_status(p.id)) AS x
        FROM public.profiles p ORDER BY p.created_at DESC LIMIT 8) t)
  );
END; $$;

-- 6. Analytics
CREATE OR REPLACE FUNCTION public.admin_analytics(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer := LEAST(GREATEST(COALESCE(p_days, 30), 7), 365);
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN jsonb_build_object(
    'daily', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'day'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'revenue', COALESCE((SELECT sum(pr.amount) FROM public.payment_requests pr
            WHERE pr.status='approved' AND date_trunc('day', COALESCE(pr.reviewed_at, pr.created_at)) = d.day),0),
        'users', (SELECT count(*) FROM public.profiles p WHERE date_trunc('day', p.created_at) = d.day),
        'alerts', (SELECT count(*) FROM public.alert_logs a WHERE date_trunc('day', a.created_at) = d.day)
      ) AS x
      FROM generate_series(date_trunc('day', now()) - ((n-1)||' days')::interval, date_trunc('day', now()), interval '1 day') AS d(day)) s),
    'weekly', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'week'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('week', to_char(w.week, 'YYYY-"S"IW'),
        'revenue', COALESCE((SELECT sum(pr.amount) FROM public.payment_requests pr
            WHERE pr.status='approved' AND date_trunc('week', COALESCE(pr.reviewed_at, pr.created_at)) = w.week),0),
        'users', (SELECT count(*) FROM public.profiles p WHERE date_trunc('week', p.created_at) = w.week)) AS x
      FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') AS w(week)) s),
    'monthly', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'month'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('month', to_char(m.month, 'YYYY-MM'),
        'revenue', COALESCE((SELECT sum(pr.amount) FROM public.payment_requests pr
            WHERE pr.status='approved' AND date_trunc('month', COALESCE(pr.reviewed_at, pr.created_at)) = m.month),0),
        'users', (SELECT count(*) FROM public.profiles p WHERE date_trunc('month', p.created_at) = m.month)) AS x
      FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') AS m(month)) s),
    'totals', jsonb_build_object(
      'new_users', (SELECT count(*) FROM public.profiles WHERE created_at > now() - (n||' days')::interval),
      'active_users', (SELECT count(*) FROM public.subscriptions s WHERE public.effective_status(s.user_id) IN ('active','trial')),
      'subs_sold', (SELECT count(*) FROM public.payment_requests WHERE status='approved'),
      'renewal_rate', (SELECT CASE WHEN count(DISTINCT user_id) = 0 THEN NULL
          ELSE round(100.0 * count(*) FILTER (WHERE rn > 1) / GREATEST(count(*),1), 1) END
        FROM (SELECT user_id, row_number() OVER (PARTITION BY user_id ORDER BY created_at) rn
              FROM public.payment_requests WHERE status='approved') q),
      'properties', (SELECT count(*) FROM public.properties),
      'alerts', (SELECT count(*) FROM public.alert_logs),
      'revenue', (SELECT COALESCE(sum(amount),0) FROM public.payment_requests WHERE status='approved'))
  );
END; $$;

-- 7. Properties
CREATE OR REPLACE FUNCTION public.admin_properties(p_search text DEFAULT '')
RETURNS TABLE(id uuid, name text, address text, rent_amount numeric, due_day smallint, created_at timestamptz,
  owner_id uuid, owner_name text, owner_email text, tenant_name text, tenant_phone text, next_due date, occupied boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN QUERY
  SELECT pr.id, pr.name, pr.address, pr.rent_amount, pr.due_day, pr.created_at,
    pr.user_id, p.full_name, p.email,
    t.full_name, t.phone,
    (date_trunc('month', now()) + ((pr.due_day - 1) || ' days')::interval)::date,
    (t.id IS NOT NULL)
  FROM public.properties pr
  LEFT JOIN public.profiles p ON p.id = pr.user_id
  LEFT JOIN LATERAL (SELECT * FROM public.tenants tt WHERE tt.property_id = pr.id AND tt.active ORDER BY tt.created_at LIMIT 1) t ON true
  WHERE COALESCE(p_search,'') = '' OR pr.name ILIKE '%'||p_search||'%' OR pr.address ILIKE '%'||p_search||'%'
     OR p.full_name ILIKE '%'||p_search||'%' OR p.email ILIKE '%'||p_search||'%'
  ORDER BY pr.created_at DESC LIMIT 300;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_property(p_id uuid, p_name text, p_address text, p_rent numeric, p_due_day smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owner uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  UPDATE public.properties SET name = p_name, address = p_address, rent_amount = p_rent,
    due_day = LEAST(GREATEST(COALESCE(p_due_day, 5), 1), 28) WHERE id = p_id RETURNING user_id INTO owner;
  IF owner IS NULL THEN RAISE EXCEPTION 'Logement introuvable'; END IF;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (owner, 'property_updated', jsonb_build_object('property', p_id, 'admin', auth.uid()));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_property(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owner uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  SELECT user_id INTO owner FROM public.properties WHERE id = p_id;
  IF owner IS NULL THEN RAISE EXCEPTION 'Logement introuvable'; END IF;
  DELETE FROM public.rent_payments WHERE rent_record_id IN (SELECT id FROM public.rent_records WHERE property_id = p_id);
  DELETE FROM public.rent_records WHERE property_id = p_id;
  UPDATE public.tenants SET property_id = NULL WHERE property_id = p_id;
  DELETE FROM public.properties WHERE id = p_id;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (owner, 'property_deleted', jsonb_build_object('property', p_id, 'admin', auth.uid()));
END; $$;

-- 8. Subscriptions detail + management
CREATE OR REPLACE FUNCTION public.admin_subscriptions_full()
RETURNS TABLE(user_id uuid, full_name text, email text, plan text, status text, price numeric,
  trial_ends_at timestamptz, started_at timestamptz, ends_at timestamptz, days_left integer, properties bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cfg jsonb;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  SELECT plans INTO cfg FROM public.platform_settings WHERE id;
  RETURN QUERY
  SELECT s.user_id, p.full_name, p.email, s.plan::text, public.effective_status(s.user_id)::text,
    COALESCE((cfg->(s.plan::text)->>'price')::numeric, 0),
    s.trial_ends_at, s.started_at, s.ends_at,
    GREATEST(0, EXTRACT(day FROM (COALESCE(s.ends_at, s.trial_ends_at) - now()))::integer),
    (SELECT count(*) FROM public.properties pr WHERE pr.user_id = s.user_id)
  FROM public.subscriptions s LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY s.updated_at DESC LIMIT 500;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_subscription(p_user_id uuid, p_plan text, p_months integer DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m integer := LEAST(GREATEST(COALESCE(p_months,1),1),120);
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  IF p_plan NOT IN ('free','starter','pro','business') THEN RAISE EXCEPTION 'Formule inconnue'; END IF;
  UPDATE public.subscriptions
    SET plan = p_plan::public.sub_plan,
        status = CASE WHEN p_plan = 'free' THEN 'expired'::public.sub_status ELSE 'active'::public.sub_status END,
        started_at = COALESCE(started_at, now()),
        ends_at = CASE WHEN p_plan = 'free' THEN NULL
                  ELSE GREATEST(COALESCE(ends_at, now()), now()) + (m || ' months')::interval END,
        updated_at = now()
    WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement introuvable'; END IF;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (p_user_id, 'subscription_changed', jsonb_build_object('plan', p_plan, 'months', m, 'admin', auth.uid()));
END; $$;

-- 9. Delete user data
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Impossible de supprimer votre propre compte'; END IF;
  DELETE FROM public.rent_payments WHERE user_id = p_user_id;
  DELETE FROM public.rent_records WHERE user_id = p_user_id;
  DELETE FROM public.tenants WHERE user_id = p_user_id;
  DELETE FROM public.properties WHERE user_id = p_user_id;
  DELETE FROM public.alert_logs WHERE user_id = p_user_id;
  DELETE FROM public.subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  UPDATE public.profiles SET suspended = true, full_name = NULL, phone = NULL, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (p_user_id, 'user_deleted', jsonb_build_object('admin', auth.uid()));
END; $$;

-- 10. Admin management
CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE(user_id uuid, full_name text, email text, level text, suspended boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, public.admin_level(p.id), p.suspended, p.created_at
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role::text IN ('admin','super_admin','moderator'))
  ORDER BY p.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_level(p_email text, p_level text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'RÃ©servÃ© au Super Admin'; END IF;
  IF p_level NOT IN ('user','moderator','admin','super_admin') THEN RAISE EXCEPTION 'Niveau inconnu'; END IF;
  SELECT id INTO uid FROM public.profiles WHERE lower(email) = lower(trim(p_email));
  IF uid IS NULL THEN RAISE EXCEPTION 'Aucun compte avec cet e-mail'; END IF;
  IF uid = auth.uid() AND p_level <> 'super_admin' THEN RAISE EXCEPTION 'Impossible de retirer vos propres droits'; END IF;
  DELETE FROM public.user_roles WHERE user_id = uid AND role::text IN ('admin','super_admin','moderator');
  IF p_level = 'user' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'user'::public.app_role) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, p_level::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (uid, 'admin_level_changed', jsonb_build_object('level', p_level, 'admin', auth.uid()));
END; $$;

-- 11. Alerts
CREATE OR REPLACE FUNCTION public.admin_alerts(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN jsonb_build_object(
    'counts', (SELECT jsonb_build_object(
        'total', count(*),
        'sent', count(*) FILTER (WHERE status='sent'),
        'scheduled', count(*) FILTER (WHERE status='scheduled'),
        'failed', count(*) FILTER (WHERE status='failed')) FROM public.alert_logs),
    'items', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('id', a.id, 'created_at', a.created_at, 'recipient', a.recipient_name,
        'phone', a.recipient_phone, 'kind', a.kind, 'channel', a.channel, 'status', a.status,
        'sender', COALESCE(p.full_name, p.email)) AS x
      FROM public.alert_logs a LEFT JOIN public.profiles p ON p.id = a.user_id
      ORDER BY a.created_at DESC LIMIT LEAST(COALESCE(p_limit,100), 500)) t)
  );
END; $$;

-- 12. Announcements
CREATE OR REPLACE FUNCTION public.admin_send_announcement(p_title text, p_body text, p_audience text DEFAULT 'all', p_kind text DEFAULT 'announcement')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  IF coalesce(trim(p_title),'') = '' OR coalesce(trim(p_body),'') = '' THEN RAISE EXCEPTION 'Titre et message obligatoires'; END IF;
  INSERT INTO public.admin_announcements (title, body, audience, kind, created_by)
    VALUES (trim(p_title), trim(p_body), p_audience, p_kind, auth.uid()) RETURNING id INTO new_id;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (auth.uid(), 'announcement_sent', jsonb_build_object('id', new_id, 'audience', p_audience, 'kind', p_kind, 'admin', auth.uid()));
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_announcement(p_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  UPDATE public.admin_announcements SET active = p_active, updated_at = now() WHERE id = p_id;
END; $$;

-- 13. Settings update
CREATE OR REPLACE FUNCTION public.admin_update_settings(p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'RÃ©servÃ© au Super Admin'; END IF;
  UPDATE public.platform_settings SET
    brand_name = COALESCE(p_patch->>'brand_name', brand_name),
    logo_url = COALESCE(p_patch->>'logo_url', logo_url),
    contact_email = COALESCE(p_patch->>'contact_email', contact_email),
    contact_phone = COALESCE(p_patch->>'contact_phone', contact_phone),
    whatsapp_number = COALESCE(p_patch->>'whatsapp_number', whatsapp_number),
    plans = COALESCE(p_patch->'plans', plans),
    saspay = COALESCE(p_patch->'saspay', saspay),
    notifications = COALESCE(p_patch->'notifications', notifications),
    terms = COALESCE(p_patch->>'terms', terms),
    privacy = COALESCE(p_patch->>'privacy', privacy),
    maintenance_mode = COALESCE((p_patch->>'maintenance_mode')::boolean, maintenance_mode),
    maintenance_message = COALESCE(p_patch->>'maintenance_message', maintenance_message),
    updated_at = now()
  WHERE id;
  INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (auth.uid(), 'settings_updated', jsonb_build_object('keys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(p_patch) k), 'admin', auth.uid()));
END; $$;

-- 14. Relax read guards for moderators on existing admin readers
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'AccÃ¨s refusÃ©'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'properties', (SELECT count(*) FROM public.properties),
    'active_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'active' AND (ends_at IS NULL OR ends_at > now())),
    'pending_payments', (SELECT count(*) FROM public.payment_requests WHERE status = 'pending'),
    'revenue', (SELECT COALESCE(sum(amount),0) FROM public.payment_requests WHERE status = 'approved'));
END; $$;

-- 15. Grants
REVOKE EXECUTE ON FUNCTION public.admin_dashboard(), public.admin_analytics(integer), public.admin_properties(text),
  public.admin_update_property(uuid, text, text, numeric, smallint), public.admin_delete_property(uuid),
  public.admin_subscriptions_full(), public.admin_set_subscription(uuid, text, integer), public.admin_delete_user(uuid),
  public.admin_list_admins(), public.admin_set_level(text, text), public.admin_alerts(integer),
  public.admin_send_announcement(text, text, text, text), public.admin_toggle_announcement(uuid, boolean),
  public.admin_update_settings(jsonb), public.is_super_admin(), public.is_staff(), public.admin_level(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_dashboard(), public.admin_analytics(integer), public.admin_properties(text),
  public.admin_update_property(uuid, text, text, numeric, smallint), public.admin_delete_property(uuid),
  public.admin_subscriptions_full(), public.admin_set_subscription(uuid, text, integer), public.admin_delete_user(uuid),
  public.admin_list_admins(), public.admin_set_level(text, text), public.admin_alerts(integer),
  public.admin_send_announcement(text, text, text, text), public.admin_toggle_announcement(uuid, boolean),
  public.admin_update_settings(jsonb), public.is_super_admin(), public.is_staff(), public.admin_level(uuid)
  TO authenticated;
-- Correctif : le formulaire d'abonnement envoie payment_method = 'saspay'
-- (voir src/routes/_authenticated/abonnement.tsx) depuis l'ajout du canal
-- SasPay, mais la contrainte posÃ©e dans la toute premiÃ¨re migration ne
-- listait que 'orange_money' et 'moov_money'. Toute demande SasPay Ã©chouait
-- donc Ã  l'insertion (violation de contrainte CHECK).

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_payment_method_check;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_payment_method_check
  CHECK (payment_method IN ('orange_money', 'moov_money', 'saspay'));
-- Actualisation automatique : autoriser le temps rÃ©el Supabase sur les
-- tables consultÃ©es par les Ã©crans Logements et Locataires, afin que les
-- listes se mettent Ã  jour toutes seules dÃ¨s qu'une donnÃ©e change (RLS
-- dÃ©jÃ  en place sur chaque table : chacun ne reÃ§oit que ses propres lignes).
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.tenants REPLICA IDENTITY FULL;
ALTER TABLE public.rent_records REPLICA IDENTITY FULL;
ALTER TABLE public.rent_payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tenants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rent_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rent_records;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rent_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rent_payments;
  END IF;
END $$;

-- Abonnement obligatoire : l'ajout d'un logement Ã©tait dÃ©jÃ  bloquÃ© en base
-- pour un compte sans accÃ¨s (essai expirÃ© / abonnement inactif) via
-- enforce_property_limit(). On applique la mÃªme rÃ¨gle Ã  l'ajout d'un
-- locataire, qui n'Ã©tait pas encore protÃ©gÃ©.
CREATE OR REPLACE FUNCTION public.enforce_tenant_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_access(NEW.user_id) THEN
    RAISE EXCEPTION 'Abonnement expirÃ© : impossible d''ajouter un locataire.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tenants_access_gate ON public.tenants;
CREATE TRIGGER tenants_access_gate BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_access();
