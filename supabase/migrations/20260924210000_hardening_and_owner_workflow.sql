-- LoyerAlert V1 hardening / owner-only workflow
-- Covers: ownership isolation, archive instead of destructive delete,
-- payment integrity/idempotency, relationship integrity and audit helpers.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS properties_user_id_active_idx
  ON public.properties (user_id, archived_at);
CREATE INDEX IF NOT EXISTS tenants_user_id_active_idx
  ON public.tenants (user_id, active);
CREATE INDEX IF NOT EXISTS rent_records_user_id_period_idx
  ON public.rent_records (user_id, period);
CREATE INDEX IF NOT EXISTS rent_payments_user_id_idx
  ON public.rent_payments (user_id);

-- A payment reference is the idempotency key for owner-recorded payments.
CREATE UNIQUE INDEX IF NOT EXISTS rent_payments_user_reference_uidx
  ON public.rent_payments (user_id, reference);

-- Prevent a user from linking one of their records to another owner's data.
CREATE OR REPLACE FUNCTION public.validate_owner_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'tenants' THEN
    IF NEW.property_id IS NOT NULL THEN
      SELECT p.user_id INTO owner_id
      FROM public.properties p
      WHERE p.id = NEW.property_id;
      IF owner_id IS NULL OR owner_id <> NEW.user_id THEN
        RAISE EXCEPTION 'Logement invalide pour ce propriétaire';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'rent_records' THEN
    SELECT t.user_id INTO owner_id FROM public.tenants t WHERE t.id = NEW.tenant_id;
    IF owner_id IS NULL OR owner_id <> NEW.user_id THEN
      RAISE EXCEPTION 'Locataire invalide pour ce propriétaire';
    END IF;
    IF NEW.property_id IS NOT NULL THEN
      SELECT p.user_id INTO owner_id FROM public.properties p WHERE p.id = NEW.property_id;
      IF owner_id IS NULL OR owner_id <> NEW.user_id THEN
        RAISE EXCEPTION 'Logement invalide pour ce propriétaire';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'rent_payments' THEN
    SELECT r.user_id INTO owner_id FROM public.rent_records r WHERE r.id = NEW.rent_record_id;
    IF owner_id IS NULL OR owner_id <> NEW.user_id THEN
      RAISE EXCEPTION 'Loyer invalide pour ce propriétaire';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_owner_relationships ON public.tenants;
CREATE TRIGGER tenants_owner_relationships
BEFORE INSERT OR UPDATE OF user_id, property_id ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.validate_owner_relationships();

DROP TRIGGER IF EXISTS rent_records_owner_relationships ON public.rent_records;
CREATE TRIGGER rent_records_owner_relationships
BEFORE INSERT OR UPDATE OF user_id, tenant_id, property_id ON public.rent_records
FOR EACH ROW EXECUTE FUNCTION public.validate_owner_relationships();

DROP TRIGGER IF EXISTS rent_payments_owner_relationships ON public.rent_payments;
CREATE TRIGGER rent_payments_owner_relationships
BEFORE INSERT OR UPDATE OF user_id, rent_record_id ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_owner_relationships();

-- Payment integrity: lock one rent while checking the remaining balance.
CREATE OR REPLACE FUNCTION public.validate_rent_payment_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  due numeric;
  already_paid numeric;
  remaining numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.rent_record_id::text, 0));

  SELECT amount_due INTO due
  FROM public.rent_records
  WHERE id = NEW.rent_record_id AND user_id = NEW.user_id;

  IF due IS NULL THEN
    RAISE EXCEPTION 'Loyer introuvable';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO already_paid
  FROM public.rent_payments
  WHERE rent_record_id = NEW.rent_record_id
    AND id IS DISTINCT FROM NEW.id;

  remaining := due - already_paid;
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à 0';
  END IF;
  IF NEW.amount > remaining THEN
    RAISE EXCEPTION 'Le paiement dépasse le solde restant (% FCFA)', remaining;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rent_payment_amount_guard ON public.rent_payments;
CREATE TRIGGER rent_payment_amount_guard
BEFORE INSERT OR UPDATE OF amount, rent_record_id, user_id ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_rent_payment_amount();

-- Atomic payment entry point used by the application. The reference makes
-- repeated submissions idempotent while the advisory lock prevents races.
CREATE OR REPLACE FUNCTION public.record_rent_payment(
  p_rent_record_id uuid,
  p_amount numeric,
  p_paid_at date DEFAULT current_date,
  p_method text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS TABLE(id uuid, reference text, amount numeric, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.rent_payments%ROWTYPE;
  new_id uuid;
  new_reference text;
  due numeric;
  paid numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.has_access(uid) THEN RAISE EXCEPTION 'Abonnement expiré'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  IF p_reference IS NOT NULL THEN
    SELECT * INTO existing
    FROM public.rent_payments
    WHERE user_id = uid AND reference = p_reference
    LIMIT 1;
    IF existing.id IS NOT NULL THEN
      SELECT r.amount_due, COALESCE(SUM(pay.amount),0)
      INTO due, paid
      FROM public.rent_records r
      LEFT JOIN public.rent_payments pay ON pay.rent_record_id = r.id
      WHERE r.id = existing.rent_record_id
      GROUP BY r.amount_due;
      RETURN QUERY SELECT existing.id, existing.reference, existing.amount, GREATEST(0, due - paid);
      RETURN;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_rent_record_id::text, 0));

  SELECT r.amount_due INTO due
  FROM public.rent_records r
  WHERE r.id = p_rent_record_id AND r.user_id = uid
  FOR UPDATE;
  IF due IS NULL THEN RAISE EXCEPTION 'Loyer introuvable'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO paid
  FROM public.rent_payments
  WHERE rent_record_id = p_rent_record_id;

  IF p_amount > due - paid THEN
    RAISE EXCEPTION 'Le paiement dépasse le solde restant (% FCFA)', GREATEST(0, due - paid);
  END IF;

  new_reference := COALESCE(NULLIF(trim(p_reference), ''), upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));
  INSERT INTO public.rent_payments (user_id, rent_record_id, amount, paid_at, method, note, reference)
  VALUES (uid, p_rent_record_id, p_amount, COALESCE(p_paid_at, current_date), NULLIF(trim(p_method), ''), NULLIF(trim(p_note), ''), new_reference)
  RETURNING rent_payments.id INTO new_id;

  SELECT COALESCE(SUM(amount),0) INTO paid FROM public.rent_payments WHERE rent_record_id = p_rent_record_id;
  RETURN QUERY SELECT new_id, new_reference, p_amount, GREATEST(0, due - paid);
END;
$$;

REVOKE ALL ON FUNCTION public.record_rent_payment(uuid,numeric,date,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_rent_payment(uuid,numeric,date,text,text,text) TO authenticated;

-- Owner-safe archive helpers. Financial history is never hard-deleted by the
-- owner workflow.
CREATE OR REPLACE FUNCTION public.archive_property(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  UPDATE public.properties
  SET archived_at = COALESCE(archived_at, now())
  WHERE id = p_property_id AND user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Logement introuvable'; END IF;
  INSERT INTO public.activity_logs(user_id, action, details)
  VALUES(uid, 'property_archived', jsonb_build_object('property_id', p_property_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  UPDATE public.tenants SET active = false
  WHERE id = p_tenant_id AND user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Locataire introuvable'; END IF;
  INSERT INTO public.activity_logs(user_id, action, details)
  VALUES(uid, 'tenant_deactivated', jsonb_build_object('tenant_id', p_tenant_id));
END;
$$;

REVOKE ALL ON FUNCTION public.archive_property(uuid), public.deactivate_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_property(uuid), public.deactivate_tenant(uuid) TO authenticated;

-- Rent generation ignores archived properties but keeps tenants without a
-- property supported for owners who manage a tenant record before assignment.
CREATE OR REPLACE FUNCTION public.generate_rent_records(p_period date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n integer := 0; m date := date_trunc('month', p_period)::date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.has_access(uid) THEN RAISE EXCEPTION 'Abonnement expiré'; END IF;
  INSERT INTO public.rent_records (user_id, tenant_id, property_id, period, amount_due, due_date)
  SELECT uid, t.id, t.property_id, m, t.rent_amount, (m + (t.due_day - 1) * interval '1 day')::date
  FROM public.tenants t
  LEFT JOIN public.properties p ON p.id = t.property_id
  WHERE t.user_id = uid AND t.active AND t.rent_amount > 0
    AND (t.property_id IS NULL OR p.archived_at IS NULL)
    AND (t.move_in_date IS NULL OR t.move_in_date <= (m + interval '1 month' - interval '1 day')::date)
  ON CONFLICT (tenant_id, period) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Keep the generated status view safe after archiving.
CREATE OR REPLACE VIEW public.rent_status_view WITH (security_invoker = true) AS
SELECT r.id, r.user_id, r.tenant_id, r.property_id, r.period, r.amount_due, r.due_date,
  t.full_name AS tenant_name, t.phone AS tenant_phone, p.name AS property_name,
  COALESCE(sum(pay.amount), 0)::numeric AS paid_amount,
  GREATEST(0, (r.amount_due - COALESCE(sum(pay.amount), 0)))::numeric AS balance,
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

-- RLS policies are intentionally explicit about the owner. Supabase recommends
-- separate USING / WITH CHECK rules for reliable UPDATE isolation.
DROP POLICY IF EXISTS "properties own" ON public.properties;
CREATE POLICY "properties own" ON public.properties FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "properties insert own" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "properties update own" ON public.properties FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "properties delete own" ON public.properties FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "tenants own" ON public.tenants;
CREATE POLICY "tenants own" ON public.tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "tenants insert own" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "tenants update own" ON public.tenants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "tenants delete own" ON public.tenants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "rent own" ON public.rent_records;
CREATE POLICY "rent own" ON public.rent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "rent insert own" ON public.rent_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "rent update own" ON public.rent_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "rent delete own" ON public.rent_records FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "rent payments own" ON public.rent_payments;
CREATE POLICY "rent payments own" ON public.rent_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "rent payments insert own" ON public.rent_payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "rent payments update own" ON public.rent_payments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "rent payments delete own" ON public.rent_payments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Regression tests for the high-risk database rules. Run with `supabase test db`
-- in an environment connected to the project/local database.
