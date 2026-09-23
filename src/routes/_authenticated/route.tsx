import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    // ============================================================
    // 1. Vérifier la session
    // ============================================================

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw redirect({
        to: "/auth",
        replace: true,
      });
    }

    const user = userData.user;

    // ============================================================
    // 2. Récupérer les rôles depuis user_roles
    // ============================================================

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error(
        "[Auth] Impossible de récupérer les rôles :",
        roleError,
      );

      throw redirect({
        to: "/auth",
        replace: true,
      });
    }

    const roles = (roleRows ?? [])
      .map((row) => row.role)
      .filter(Boolean);

    const isAdmin = roles.includes("admin");
    const isSuperAdmin = roles.includes("super_admin");
    const isUser = roles.includes("user");

    const hasAdminRole = isAdmin || isSuperAdmin;

    console.log("[Auth] Utilisateur :", user.email);
    console.log("[Auth] Rôles :", roles);
    console.log("[Auth] Admin :", hasAdminRole);
    console.log("[Auth] Super Admin :", isSuperAdmin);

    // ============================================================
    // 3. Déterminer la zone demandée
    // ============================================================

    const pathname = location.pathname;

    const isAdminArea =
      pathname === "/admin" || pathname.startsWith("/admin/");

    const isSubscriptionPage = pathname === "/abonnement";

    // ============================================================
    // 4. ADMIN / SUPER ADMIN
    // ============================================================
    //
    // Les administrateurs :
    // - peuvent accéder à /admin
    // - ne sont jamais bloqués par l'abonnement
    // - ne doivent jamais être envoyés vers /dashboard
    //
    // ============================================================

    if (hasAdminRole) {
      if (!isAdminArea) {
        console.log(
          "[Auth] ADMIN → /admin",
          pathname,
        );

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
      console.error(
        "[Auth] Aucun rôle utilisateur valide pour :",
        user.id,
        roles,
      );

      throw redirect({
        to: "/auth",
        replace: true,
      });
    }

    // ============================================================
    // 6. UTILISATEUR NORMAL QUI ESSAIE D'ACCÉDER À /admin
    // ============================================================

    if (isAdminArea) {
      console.log(
        "[Auth] UTILISATEUR → /dashboard",
        pathname,
      );

      throw redirect({
        to: "/dashboard",
        replace: true,
      });
    }

    // ============================================================
    // 7. PAGE ABONNEMENT
    // ============================================================
    //
    // Cette page reste toujours accessible aux utilisateurs
    // normaux afin qu'ils puissent renouveler leur abonnement.
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
    //
    // IMPORTANT :
    // La fonction PostgreSQL utilise :
    //
    // has_access(p_user_id uuid)
    //
    // ============================================================

    const {
      data: hasAccess,
      error: accessError,
    } = await supabase.rpc("has_access", {
      p_user_id: user.id,
    });

    if (accessError) {
      console.error(
        "[Subscription] Erreur lors de la vérification :",
        accessError,
      );

      throw redirect({
        to: "/abonnement",
        replace: true,
      });
    }

    console.log(
      "[Subscription] Accès :",
      hasAccess,
    );

    // ============================================================
    // 9. ABONNEMENT EXPIRÉ / SUSPENDU
    // ============================================================

    if (hasAccess !== true) {
      console.log(
        "[Subscription] Accès refusé → /abonnement",
      );

      throw redirect({
        to: "/abonnement",
        replace: true,
      });
    }

    // ============================================================
    // 10. UTILISATEUR NORMAL AVEC ACCÈS VALIDE
    // ============================================================

    return {
      user,
      isAdmin: false,
      isSuperAdmin: false,
      roles,
    };
  },

  // ============================================================
  // IMPORTANT :
  // Aucun AppShell ici.
  //
  // Le layout client et le layout administrateur doivent gérer
  // leur propre interface.
  // ============================================================

  component: Outlet,
});