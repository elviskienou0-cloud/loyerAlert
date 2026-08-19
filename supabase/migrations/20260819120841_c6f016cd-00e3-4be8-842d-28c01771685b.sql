
-- Verrouillage des fonctions SECURITY DEFINER : aucun accès anonyme, accès signé-in limité au strict nécessaire
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

-- Appelables par un utilisateur connecté (chacune vérifie elle-même les droits)
GRANT EXECUTE ON FUNCTION public.my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_rent_records(date) TO authenticated;
-- Requis par les politiques RLS évaluées côté utilisateur
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
