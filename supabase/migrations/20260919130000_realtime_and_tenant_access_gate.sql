-- Actualisation automatique : autoriser le temps réel Supabase sur les
-- tables consultées par les écrans Logements et Locataires, afin que les
-- listes se mettent à jour toutes seules dès qu'une donnée change (RLS
-- déjà en place sur chaque table : chacun ne reçoit que ses propres lignes).
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

-- Abonnement obligatoire : l'ajout d'un logement était déjà bloqué en base
-- pour un compte sans accès (essai expiré / abonnement inactif) via
-- enforce_property_limit(). On applique la même règle à l'ajout d'un
-- locataire, qui n'était pas encore protégé.
CREATE OR REPLACE FUNCTION public.enforce_tenant_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_access(NEW.user_id) THEN
    RAISE EXCEPTION 'Abonnement expiré : impossible d''ajouter un locataire.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tenants_access_gate ON public.tenants;
CREATE TRIGGER tenants_access_gate BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_access();
