import { createFileRoute, Outlet, redirect, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { authQueryKeys, fetchAccount, fetchUserRoles, getSessionUser } from "@/lib/auth-data";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location, context }) => {
    // ============================================================
    // 1. Vérifier la session
    // ============================================================

    const user = await getSessionUser(supabase);

    if (!user) {
      throw redirect({
        to: "/auth",
        replace: true,
      });
    }

    // ============================================================
    // 2. Récupérer les rôles
    // ============================================================

    const roles = await context.queryClient.fetchQuery<string[]>({
      queryKey: authQueryKeys.roles(user.id),
      queryFn: () => fetchUserRoles(supabase, user.id),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    });

    const isAdmin = roles.includes("admin");
    const isSuperAdmin = roles.includes("super_admin");
    const isUser = roles.includes("user");

    const hasAdminRole = isAdmin || isSuperAdmin;


    // ============================================================
    // 3. Déterminer la zone demandée
    // ============================================================

    const pathname = location.pathname;

    const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

    const isSubscriptionPage = pathname === "/abonnement";

    // ============================================================
    // 4. ADMIN / SUPER ADMIN
    // ============================================================

    if (hasAdminRole) {
      if (!isAdminArea) {

        throw redirect({
          to: "/admin",
          replace: true,
        });
      }

      return {
        user,
        isAdmin: true,
        isSuperAdmin,
        roles,
      };
    }

    // ============================================================
    // 5. UTILISATEUR NORMAL
    // ============================================================

    if (!isUser) {
      console.error("[Auth] Aucun rôle utilisateur valide pour :", user.id, roles);

      throw redirect({
        to: "/auth",
        replace: true,
      });
    }

    // ============================================================
    // 6. UTILISATEUR NORMAL → /admin INTERDIT
    // ============================================================

    if (isAdminArea) {

      throw redirect({
        to: "/dashboard",
        replace: true,
      });
    }

    // ============================================================
    // 7. PAGE ABONNEMENT
    // ============================================================
    //
    // /abonnement reste toujours accessible afin de permettre
    // le renouvellement même lorsque l'abonnement est expiré.
    //
    // ============================================================

    if (isSubscriptionPage) {
      return {
        user,
        isAdmin: false,
        isSuperAdmin: false,
        roles,
      };
    }

    // ============================================================
    // 8. Vérifier l'accès à l'application
    // ============================================================

    // Une seule vérification de l'abonnement est effectuée puis mise en cache
    // jusqu'à son expiration. La base reste la source de vérité pour les
    // opérations protégées : ce cache sert uniquement à accélérer la navigation.
    const account = await context.queryClient.fetchQuery({
      queryKey: authQueryKeys.account(user.id),
      queryFn: () => fetchAccount(supabase),
      staleTime: (query) => {
        const account = query.state.data as Account | undefined;
        const end = account?.ends_at ?? account?.trial_ends_at;
        if (!end) return 60_000;
        return Math.max(0, new Date(end).getTime() - Date.now());
      },
      gcTime: 30 * 60 * 1000,
    });

    if (account.has_access !== true) {

      throw redirect({
        to: "/abonnement",
        replace: true,
      });
    }

    return {
      user,
      isAdmin: false,
      isSuperAdmin: false,
      roles,
      subscription: account,
    };
  },

  // ============================================================
  // LAYOUT AUTHENTIFIÉ
  // ============================================================

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();

  const isAdminArea = location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  // Admin : interface indépendante, sans AppShell client.
  if (isAdminArea) {
    return <Outlet />;
  }

  // Utilisateur normal : sidebar + topbar persistantes.
  return (
    <AppShell>
      <SubscriptionExpiryWatcher />
      <Outlet />
    </AppShell>
  );
}

function SubscriptionExpiryWatcher() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();
  const subscription = loaderData?.subscription;

  useEffect(() => {
    const end = subscription?.ends_at ?? subscription?.trial_ends_at;
    if (!end) return;

    const remaining = new Date(end).getTime() - Date.now();
    if (remaining <= 0) {
      void router.invalidate();
      return;
    }

    // Revalide automatiquement juste après l'expiration, sans ralentir les clics.
    const timer = window.setTimeout(() => {
      void router.invalidate();
    }, remaining + 250);

    return () => window.clearTimeout(timer);
  }, [router, subscription?.ends_at, subscription?.trial_ends_at]);

  return null;
}
