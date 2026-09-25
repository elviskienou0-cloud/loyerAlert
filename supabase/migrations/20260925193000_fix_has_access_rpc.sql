-- Fix subscription access RPC for the authenticated application.
-- The deployed database exposes public.has_access(uuid) with argument p_user_id.
-- Parameter names do not affect the PostgreSQL function identity, so only the
-- execute privilege is restored here; the client uses p_user_id to match PostgREST.
GRANT EXECUTE ON FUNCTION public.has_access(uuid) TO authenticated;
