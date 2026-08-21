import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, CreditCard, FileClock, LifeBuoy, Receipt, Users } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { useAdminNotifications, usePendingRequestsCount } from "@/hooks/useAdminNotifications";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
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
  const { data: account, isLoading, isError } = useAccount();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const denied = !isLoading && (isError || !account?.is_admin);

  useEffect(() => {
    if (!denied) return;
    const t = setTimeout(() => void navigate({ to: "/dashboard", replace: true }), 2500);
    return () => clearTimeout(t);
  }, [denied, navigate]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (denied) {
    return (
      <div className="surface mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet espace est strictement réservé aux administrateurs. Redirection vers votre espace…
        </p>
        <Button className="mt-5" onClick={() => void navigate({ to: "/dashboard", replace: true })}>
          Retour à mon espace
        </Button>
      </div>
    );
  }

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
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0 flex-1 animate-in fade-in duration-300">
        <Outlet />
      </section>
    </div>
  );
}
