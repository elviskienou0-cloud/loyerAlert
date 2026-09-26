-- ============================================================
-- Module d'alertes / rappels automatiques
-- ============================================================
-- Notifications in-app générées côté base (jamais côté client),
-- une par (locataire, échéance, type) pour éviter le spam.
-- Un job pg_cron quotidien appelle generate_reminders(), puis
-- un second job déclenche l'envoi des emails correspondants via
-- une Edge Function (voir supabase/functions/send-reminder-emails).
-- ============================================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  rent_record_id uuid REFERENCES public.rent_records(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('due_soon','due_today','overdue')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rent_record_id, type)
);

-- Le client peut lire et marquer comme lu, jamais insérer lui-même :
-- seules generate_reminders() (SECURITY DEFINER) et le service_role
-- (Edge Function) peuvent créer des notifications.
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications read own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications mark read own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE read = false;

-- ------------------------------------------------------------
-- Génération des rappels à partir de rent_status_view
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n1 integer := 0;
  n2 integer := 0;
  n3 integer := 0;
BEGIN
  -- Échéance dans 3 jours ou moins
  INSERT INTO public.notifications (user_id, tenant_id, property_id, rent_record_id, type, title, message)
  SELECT v.user_id, v.tenant_id, v.property_id, v.id, 'due_soon',
    'Échéance proche',
    format('Le loyer de %s (%s FCFA) arrive à échéance le %s.',
      v.tenant_name, to_char(v.amount_due, 'FM999G999G999'), to_char(v.due_date, 'DD/MM/YYYY'))
  FROM public.rent_status_view v
  WHERE v.status = 'upcoming' AND v.due_date - current_date <= 3
  ON CONFLICT (user_id, rent_record_id, type) DO NOTHING;
  GET DIAGNOSTICS n1 = ROW_COUNT;

  -- Échéance aujourd'hui
  INSERT INTO public.notifications (user_id, tenant_id, property_id, rent_record_id, type, title, message)
  SELECT v.user_id, v.tenant_id, v.property_id, v.id, 'due_today',
    'Échéance aujourd''hui',
    format('Le loyer de %s (%s FCFA) est dû aujourd''hui.',
      v.tenant_name, to_char(v.amount_due, 'FM999G999G999'))
  FROM public.rent_status_view v
  WHERE v.status = 'due'
  ON CONFLICT (user_id, rent_record_id, type) DO NOTHING;
  GET DIAGNOSTICS n2 = ROW_COUNT;

  -- En retard
  INSERT INTO public.notifications (user_id, tenant_id, property_id, rent_record_id, type, title, message)
  SELECT v.user_id, v.tenant_id, v.property_id, v.id, 'overdue',
    'Loyer en retard',
    format('Le loyer de %s (solde %s FCFA) est en retard depuis le %s.',
      v.tenant_name, to_char(v.balance, 'FM999G999G999'), to_char(v.due_date, 'DD/MM/YYYY'))
  FROM public.rent_status_view v
  WHERE v.status = 'overdue'
  ON CONFLICT (user_id, rent_record_id, type) DO NOTHING;
  GET DIAGNOSTICS n3 = ROW_COUNT;

  RETURN n1 + n2 + n3;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_reminders() TO service_role;

-- ------------------------------------------------------------
-- Planification (heure d'Ouagadougou = UTC+0, pas de DST)
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 07h00 : génère les notifications in-app
SELECT cron.schedule(
  'generate-reminders-daily',
  '0 7 * * *',
  $$SELECT public.generate_reminders();$$
);

-- 07h15 : appelle l'Edge Function qui envoie les emails correspondants.
-- Le secret 'service_role_key' doit être créé une seule fois, à la main,
-- dans l'éditeur SQL du dashboard Supabase (JAMAIS dans un fichier commité) :
--   select vault.create_secret('<TA_CLE_SERVICE_ROLE>', 'service_role_key');
SELECT cron.schedule(
  'send-reminder-emails-daily',
  '15 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vxybvofzijuktfcllxpl.supabase.co/functions/v1/send-reminder-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
