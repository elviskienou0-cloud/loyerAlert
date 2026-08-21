import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Home, LifeBuoy, LogOut, Receipt, Shield, User, Users, CreditCard } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/logements", label: "Logements", icon: Building2 },
  { to: "/locataires", label: "Locataires", icon: Users },
  { to: "/paiements", label: "Paiements", icon: Receipt },
  { to: "/abonnement", label: "Abonnement", icon: CreditCard },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: account } = useAccount();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="font-display text-lg font-bold tracking-wide text-primary">
            LOYERALERT
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary",
                  path.startsWith(item.to) && "bg-secondary text-secondary-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            {account?.is_admin ? (
              <Link
                to="/admin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-secondary"
              >
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/assistance">
              <Button variant="ghost" size="icon" aria-label="Assistance">
                <LifeBuoy className="size-5" />
              </Button>
            </Link>
            {account?.is_admin ? (
              <Link to="/admin" className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Espace admin">
                  <Shield className="size-5" />
                </Button>
              </Link>
            ) : null}
            <Button variant="ghost" size="icon" aria-label="Se déconnecter" onClick={signOut}>
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
