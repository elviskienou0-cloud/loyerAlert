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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Réservé au Super Admin'; END IF;
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.admin_announcements SET active = p_active, updated_at = now() WHERE id = p_id;
END; $$;

-- 13. Settings update
CREATE OR REPLACE FUNCTION public.admin_update_settings(p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Réservé au Super Admin'; END IF;
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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