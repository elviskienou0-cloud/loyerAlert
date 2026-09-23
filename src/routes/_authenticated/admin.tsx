import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { BarChart3, CreditCard, FileClock, LifeBuoy, Receipt, Users } from "lucide-react";
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
      { name: "description", content: "Espace administrateur privé : utilisateurs, abonnements, paiements et journal." },
      { property: "og:title", content: "Administration — LoyerAlert" },
      { property: "og:description", content: "Espace administrateur privé LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/paiements", label: "Demandes de paiement", icon: Receipt, exact: false },
  { to: "/admin/abonnements", label: "Abonnements", icon: CreditCard, exact: false },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, exact: false },
  { to: "/admin/journal", label: "Journal admin", icon: FileClock, exact: false },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = true;

  useAdminNotifications(isAdmin);
  const pending = usePendingRequestsCount(isAdmin);

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <aside className="rounded-2xl bg-neutral-900 p-3 text-neutral-200 shadow-lg md:w-60 md:shrink-0">
        <p className="px-3 pb-3 pt-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
          Administration
        </p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const active = l.exact ? path === l.to || path === `${l.to}/` : path.startsWith(l.to);
            const count = l.to === "/admin/paiements" ? (pending.data ?? 0) : 0;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-neutral-300 transition-all duration-200 hover:bg-white/10 hover:text-white",
                  active && "bg-white/15 text-white shadow-inner",
                )}
              >
                <Icon className="size-4" />
                <span className="whitespace-nowrap">{l.label}</span>
                {count > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-neutral-950">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <a
          href="mailto:kienoucoucou5@gmail.com?subject=Assistance%20LoyerAlert%20(admin)"
          className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LifeBuoy className="size-4" />
          <span className="whitespace-nowrap">Assistance</span>
        </a>
      </aside>
      <section className="min-w-0 flex-1 animate-in fade-in duration-300">
        <Outlet />
      </section>
    </div>
  );
}

