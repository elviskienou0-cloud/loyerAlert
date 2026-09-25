-- LoyerAlert - Database reconciliation / hardening
--
-- This migration does NOT rewrite historical migrations. It reconciles the
-- effective permissions and RLS posture of the current schema so that old
-- GRANT/REVOKE decisions cannot leave the deployed database in an ambiguous
-- state.

-- 1) Subscription RPCs: authenticated users need these functions for the
-- application and for protected server-side operations. Anonymous/public
-- callers must never execute them.
REVOKE EXECUTE ON FUNCTION public.effective_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.plan_limit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_limit(uuid) TO authenticated;

-- 2) Account RPC is the single client-facing source for subscription state.
REVOKE ALL ON FUNCTION public.my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_account() TO authenticated;

-- 3) Role helpers: never expose role-checking functions to anonymous users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- 4) Ensure the owner data tables remain protected by RLS. This is idempotent
-- and deliberately does not change existing policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- 5) Subscription records are never directly writable by normal users.
-- Changes must go through the controlled payment/admin workflow.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- 6) user_roles is read-only for the authenticated application role. Role
-- changes are performed by the protected admin RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 7) Keep privileged RPCs callable by authenticated users while their own
-- function bodies enforce admin/staff/super-admin authorization.
REVOKE EXECUTE ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_analytics(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_properties(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_property(uuid,text,text,numeric,smallint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_property(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_subscriptions_full() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_subscription(uuid,text,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_admins() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_level(text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_alerts(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_send_announcement(text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_announcement(uuid,boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_properties(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_property(uuid,text,text,numeric,smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_subscriptions_full() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_level(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_alerts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_announcement(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_announcement(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_settings(jsonb) TO authenticated;

-- 8) Explicitly keep the public settings surface read-only. RLS still decides
-- which authenticated actor may update it; privileged updates normally use
-- admin_update_settings().
REVOKE INSERT, DELETE ON public.platform_settings FROM anon, authenticated;
GRANT SELECT ON public.platform_settings TO anon, authenticated;

-- 9) Basic indexes used by owner/RLS queries. IF NOT EXISTS makes this safe to
-- apply to databases where earlier migrations already created the index.
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_ends_at_idx ON public.subscriptions(status, ends_at);
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS tenants_user_id_idx ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS rent_records_user_id_idx ON public.rent_records(user_id);
CREATE INDEX IF NOT EXISTS rent_payments_user_id_idx ON public.rent_payments(user_id);
CREATE INDEX IF NOT EXISTS payment_requests_user_id_status_idx ON public.payment_requests(user_id, status);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_created_at_idx ON public.activity_logs(user_id, created_at DESC);

-- 10) Defensive constraint: an owner must not be able to create a tenant
-- pointing at another owner's property. The existing hardening trigger is the
-- source of truth; this comment documents that this invariant is intentional.
