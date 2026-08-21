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
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
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