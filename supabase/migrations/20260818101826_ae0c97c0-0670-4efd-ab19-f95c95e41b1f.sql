
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
