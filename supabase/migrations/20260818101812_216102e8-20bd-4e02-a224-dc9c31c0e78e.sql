
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
    RAISE EXCEPTION 'Abonnement expiré : impossible d''ajouter un logement.';
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
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.has_access(uid) THEN RAISE EXCEPTION 'Abonnement expiré'; END IF;
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
  IF NOT public.has_role(admin_id, 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Demande déjà traitée'; END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
