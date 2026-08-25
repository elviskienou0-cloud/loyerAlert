import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  Home,
  LifeBuoy,
  LogOut,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useProfile } from "@/hooks/useProfile";

const SIDE_NAV = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/logements", label: "Logements", icon: Building2 },
  { to: "/locataires", label: "Locataires", icon: Users },
  { to: "/paiements", label: "Paiements", icon: Receipt },
  { to: "/abonnement", label: "Abonnement", icon: CreditCard },
  { to: "/profil", label: "Profil", icon: User },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

const TAB_NAV = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/logements", label: "Logements", icon: Building2 },
  { to: "/locataires", label: "Locataires", icon: Users },
  { to: "/paiements", label: "Paiements", icon: Receipt },
] as const;

const MORE_NAV = [
  { to: "/abonnement", label: "Mes demandes", icon: Receipt },
  { to: "/abonnement", label: "Abonnement", icon: CreditCard },
  { to: "/profil", label: "Profil", icon: User },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: account } = useAccount();
  const { data: profile } = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  const [moreOpen, setMoreOpen] = useState(false);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "";
  const initials =
    (profile?.full_name ?? profile?.email ?? "?")
      .split(" ")
      .map((p) => p.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const notifications = account?.pending_request ? 1 : 0;

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-5 py-5 font-display text-base font-bold tracking-tight text-primary"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10">
            <Building2 className="size-4" />
          </span>
          ALERTE LOYERALERT
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {SIDE_NAV.map((item) => {
            const Icon = item.icon;
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground",
                  active && "bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {profile?.full_name ?? "Mon compte"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{profile?.email}</span>
                </span>
                <MoreHorizontal className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="/profil">
                  <User className="mr-2 size-4" /> Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/parametres">
                  <Settings className="mr-2 size-4" /> Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/assistance">
                  <LifeBuoy className="mr-2 size-4" /> Assistance
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="mr-2 size-4" /> Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold">
                Bonjour{firstName ? ` ${firstName}` : ""} 👋
              </p>
              <p className="truncate text-xs text-muted-foreground">{today}</p>
            </div>

            <div className="relative hidden lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher…" className="w-64 pl-9" aria-label="Rechercher" />
            </div>

            <LanguageSwitcher compact />

            <Link to="/abonnement" className="relative">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="size-5" />
              </Button>
              {notifications > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 pulse-soft rounded-full bg-destructive" />
              ) : null}
            </Link>

            <Link to="/assistance" className="hidden sm:block">
              <Button variant="ghost" size="icon" aria-label="Assistance">
                <LifeBuoy className="size-5" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              onClick={() => void signOut()}
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>

        <main
          key={path}
          className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-1 px-4 py-5 pb-28 duration-200 md:px-6 md:pb-10"
        >
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {TAB_NAV.map((item) => {
            const Icon = item.icon;
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors active:scale-95",
                  active && "text-primary",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors active:scale-95">
                <MoreHorizontal className="size-5" />
                Plus
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Plus</SheetTitle>
              </SheetHeader>
              <div className="mt-2 space-y-1 pb-6">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Icon className="size-[18px] text-primary" />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  to="/assistance"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <LifeBuoy className="size-[18px] text-primary" />
                  Assistance
                </Link>
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    void signOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-[18px]" />
                  Déconnexion
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
