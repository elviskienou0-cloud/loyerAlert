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
  IF NOT public.has_role(admin_id, 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Demande déjà traitée'; END IF;
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