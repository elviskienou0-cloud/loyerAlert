import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  FileClock,
  Flag,
  Home,
  LifeBuoy,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { useAdminNotifications, usePendingRequestsCount } from "@/hooks/useAdminNotifications";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw redirect({ to: "/auth" });
    }

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    if (roleError) {
      throw redirect({ to: "/auth" });
    }

    const isAdmin =
      roleRows?.some(
        (row) => row.role === "admin" || row.role === "super_admin",
      ) ?? false;

    if (!isAdmin) {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Administration — LoyerAlert" },
      {
        name: "description",
        content:
          "Espace administrateur privé : utilisateurs, annonces, signalements, paiements et paramètres.",
      },
      { property: "og:title", content: "Administration — LoyerAlert" },
      {
        property: "og:description",
        content: "Espace administrateur privé LoyerAlert.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, exact: false },
  { to: "/admin?section=annonces", label: "Annonces", icon: Home, exact: false },
  { to: "/admin?section=signalements", label: "Signalements", icon: Flag, exact: false },
  { to: "/admin?section=proprietaires", label: "Propriétaires", icon: Building2, exact: false },
  { to: "/admin?section=demandes", label: "Demandes", icon: ClipboardList, exact: false },
  { to: "/admin?section=avis", label: "Avis", icon: MessageSquare, exact: false },
  { to: "/admin/paiements", label: "Paiements / Abonnements", icon: CreditCard, exact: false },
  { to: "/admin?section=notifications", label: "Notifications", icon: Bell, exact: false },
  { to: "/admin?section=parametres", label: "Paramètres", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const location = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });
  const isAdmin = true;

  useAdminNotifications(isAdmin);
  const pending = usePendingRequestsCount(isAdmin);

  const currentSection = new URLSearchParams(location.searchStr).get("section");

  return (
    <div className="min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:flex-row">
        <aside className="w-full border-b border-emerald-100 bg-white p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white">
              L
            </div>
            <div>
              <p className="font-display text-lg font-bold text-slate-900">LoyerAlert</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Administration
              </p>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const linkUrl = new URL(l.to, window.location.origin);
              const linkSection = linkUrl.searchParams.get("section");
              const active =
                l.exact
                  ? location.pathname === "/admin" && !currentSection
                  : l.to === "/admin/utilisateurs"
                    ? location.pathname.startsWith("/admin/utilisateurs")
                    : l.to === "/admin/paiements"
                      ? location.pathname.startsWith("/admin/paiements") ||
                        location.pathname.startsWith("/admin/abonnements")
                      : location.pathname === "/admin" && currentSection === linkSection;

              const count = l.to === "/admin/paiements" ? (pending.data ?? 0) : 0;

              return (
                <Link
                  key={l.to}
                  to={l.to as never}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700",
                    active && "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600 hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="whitespace-nowrap">{l.label}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        active
                          ? "bg-white text-emerald-700"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <a
            href="mailto:kienoucoucou5@gmail.com?subject=Assistance%20LoyerAlert%20(admin)"
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          >
            <LifeBuoy className="size-4" />
            <span>Assistance</span>
          </a>

          <div className="mt-6 hidden rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 lg:block">
            <p className="font-semibold">Espace sécurisé</p>
            <p className="mt-1 text-emerald-700/80">
              Les outils d'administration sont réservés aux comptes autorisés.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 bg-slate-50/70 p-4 md:p-6 lg:p-7">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
