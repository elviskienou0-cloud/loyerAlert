import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Flag,
  Home,
  MessageSquare,
  Settings,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { Badge, Panel, StatCard, statusLabel, statusTone } from "@/components/admin/AdminBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fcfa, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function useAdminUser() {
  return useQuery({
    queryKey: ["admin-current-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function AdminDashboard() {
  const section = new URLSearchParams(
    useRouterState({ select: (s) => s.location.searchStr }),
  ).get("section");
  const { data: user } = useAdminUser();
  const presence = useOnlinePresence(user, undefined, false);
  
  if (section === "annonces") return <AnnoncesSection />;
  if (section === "signalements") return <UnavailableSection title="Signalements" icon={Flag} message="Le schéma Supabase actuel ne contient pas encore de table de signalements. Aucune donnée fictive n'est affichée." />;
  if (section === "proprietaires") return <ProprietairesSection />;
  if (section === "demandes") return <DemandesSection />;
  if (section === "avis") return <UnavailableSection title="Avis" icon={MessageSquare} message="Le schéma Supabase actuel ne contient pas encore de table d'avis. La page est prête à être reliée dès que le module d'avis sera ajouté." />;
  if (section === "notifications") return <NotificationsSection />;
  if (section === "parametres") return <ParametresSection />;
  
  return <DashboardHome onlineCount={presence.onlineCount} onlineIds={presence.onlineIds} />;
}

function DashboardHome({ onlineCount, onlineIds }: { onlineCount: number; onlineIds: string[] }) {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as { users: number; properties: number; active_subs: number; pending_payments: number; revenue: number };
    },
  });

  const charts = useQuery({
    queryKey: ["admin-charts", 6],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_charts", { p_months: 6 });
      if (error) throw error;
      return data as any;
    },
  });

  const logs = useQuery({
    queryKey: ["admin-logs", 8],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_logs", { p_limit: 8 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const onlineProfiles = useQuery({
    queryKey: ["admin-online-profiles", onlineIds],
    enabled: onlineIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone")
        .in("id", onlineIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const s = stats.data;
  const revenueData = charts.data?.revenue ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Vue d'ensemble</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Surveillez LoyerAlert et ses activités en temps réel.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500" />
          Données connectées à Supabase
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Utilisateurs" value={s?.users ?? 0} />
        <StatCard label="En ligne maintenant" value={onlineCount} />
        <StatCard label="Annonces / logements" value={s?.properties ?? 0} />
        <StatCard label="Abonnements actifs" value={s?.active_subs ?? 0} />
        <StatCard label="Paiements en attente" value={s?.pending_payments ?? 0} />
        <StatCard label="Revenus" value={fcfa(s?.revenue ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Utilisateurs actuellement en ligne" className="xl:col-span-2">
          {onlineIds.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-slate-500">
              <Wifi className="size-5 text-slate-300" />
              Aucun utilisateur connecté pour le moment.
            </div>
          ) : onlineProfiles.isLoading ? (
            <Skeleton className="m-4 h-24" />
          ) : (
            <div className="divide-y divide-border">
              {(onlineProfiles.data ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                      {(u.full_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{u.full_name ?? "Utilisateur"}</p>
                      <p className="truncate text-xs text-slate-500">{u.email ?? u.phone ?? "—"}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="size-2 rounded-full bg-emerald-500" /> En ligne
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Dernières activités">
          {logs.isLoading ? <Skeleton className="m-4 h-24" /> : (logs.data ?? []).length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aucune activité enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(logs.data ?? []).slice(0, 6).map((l: any) => (
                <li key={l.id} className="px-4 py-3">
                  <p className="font-medium text-slate-800">{l.action}</p>
                  <p className="mt-1 text-xs text-slate-500">{l.user_email ?? l.user_id ?? "—"} · {shortDate(l.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Revenus des derniers mois">
        {charts.isLoading ? <Skeleton className="m-4 h-56" /> : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
            {revenueData.map((r: any) => (
              <div key={r.month} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{r.month}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{fcfa(Number(r.revenue ?? 0))}</p>
                <p className="mt-1 text-[11px] text-slate-500">{Number(r.requests ?? 0)} demande(s)</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function AnnoncesSection() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-properties", search],
    queryFn: async () => {
      let query = supabase.from("properties").select("id,name,address,rent_amount,due_day,user_id,created_at").order("created_at", { ascending: false }).limit(200);
      if (search.trim()) query = query.or(`name.ilike.%${search.trim()}%,address.ilike.%${search.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <SectionPage title="Annonces" subtitle="Les annonces sont alimentées par les logements présents dans la base actuelle." icon={Home}>
      <form className="mb-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une annonce ou une adresse…" />
      </form>
      <Panel title={`${q.data?.length ?? 0} annonce(s)`}>
        {q.isLoading ? <Skeleton className="m-4 h-32" /> : <DataTable headers={["Annonce","Adresse","Loyer","Propriétaire","Créée le"]}>
          {(q.data ?? []).map((p) => <tr key={p.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3 text-slate-500">{p.address ?? "—"}</td><td className="px-4 py-3">{fcfa(p.rent_amount)}</td><td className="px-4 py-3 font-mono text-xs">{p.user_id.slice(0, 8)}…</td><td className="px-4 py-3 text-slate-500">{shortDate(p.created_at)}</td></tr>)}
        </DataTable>}
      </Panel>
    </SectionPage>
  );
}

function ProprietairesSection() {
  const q = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users", { p_search: "" });
      if (error) throw error;
      return (data ?? []).filter((u: any) => Number(u.properties) > 0);
    },
  });
  return (
    <SectionPage title="Propriétaires" subtitle="Vue des comptes ayant au moins un logement enregistré." icon={Building2}>
      <Panel title={`${q.data?.length ?? 0} propriétaire(s)`}>
        {q.isLoading ? <Skeleton className="m-4 h-32" /> : <DataTable headers={["Propriétaire","Formule","Logements","Statut","Inscrit le"]}>
          {(q.data ?? []).map((u: any) => <tr key={u.id} className="border-t border-border"><td className="px-4 py-3"><p className="font-medium">{u.full_name ?? "—"}</p><p className="text-xs text-slate-500">{u.email ?? "—"}</p></td><td className="px-4 py-3 capitalize">{u.plan}</td><td className="px-4 py-3">{u.properties}</td><td className="px-4 py-3"><Badge tone={statusTone(u.status)}>{statusLabel(u.status)}</Badge></td><td className="px-4 py-3 text-slate-500">{shortDate(u.created_at)}</td></tr>)}
        </DataTable>}
      </Panel>
    </SectionPage>
  );
}

function DemandesSection() {
  const q = useQuery({
    queryKey: ["admin-demandes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_payment_requests");
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <SectionPage title="Demandes" subtitle="Demandes d'abonnement et de paiement reçues par la plateforme." icon={Activity}>
      <Panel title={`${q.data?.length ?? 0} demande(s)`}>
        {q.isLoading ? <Skeleton className="m-4 h-32" /> : <DataTable headers={["Utilisateur","Formule","Montant","Méthode","Statut","Date"]}>
          {(q.data ?? []).map((r: any) => <tr key={r.id} className="border-t border-border"><td className="px-4 py-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td><td className="px-4 py-3 capitalize">{r.plan}</td><td className="px-4 py-3 font-semibold">{fcfa(r.amount)}</td><td className="px-4 py-3">{r.payment_method}</td><td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge></td><td className="px-4 py-3 text-slate-500">{shortDate(r.created_at)}</td></tr>)}
        </DataTable>}
      </Panel>
    </SectionPage>
  );
}

function NotificationsSection() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const q = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_announcements").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Le titre et le message sont obligatoires.");
      const { data: me } = await supabase.auth.getUser();
      const { error } = await supabase.rpc("admin_send_announcement", {
        p_title: title.trim(),
        p_body: body.trim(),
        p_audience: "all",
        p_kind: "info",
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setBody(""); toast.success("Notification publiée."); void qc.invalidateQueries({ queryKey: ["admin-announcements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <SectionPage title="Notifications" subtitle="Publiez les annonces administrateur déjà prévues par le schéma LoyerAlert." icon={Bell}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Nouvelle notification">
          <div className="space-y-3 p-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" className="min-h-28 w-full rounded-md border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            <Button disabled={create.isPending} onClick={() => create.mutate()}>Publier</Button>
          </div>
        </Panel>
        <Panel title="Historique" className="lg:col-span-2">
          {q.isLoading ? <Skeleton className="m-4 h-32" /> : <div className="divide-y divide-border">{(q.data ?? []).map((n) => <div key={n.id} className="px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{n.title}</p><Badge tone={n.active ? "green" : "slate"}>{n.active ? "Active" : "Inactive"}</Badge></div><p className="mt-1 text-sm text-slate-500">{n.body}</p><p className="mt-1 text-xs text-slate-400">{shortDate(n.created_at)}</p></div>)}</div>}
        </Panel>
      </div>
    </SectionPage>
  );
}

function ParametresSection() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("id,brand_name,contact_email,contact_phone,whatsapp_number,maintenance_mode,maintenance_message").eq("id", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const update = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase.from("platform_settings").update(v).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Paramètres enregistrés."); void qc.invalidateQueries({ queryKey: ["admin-platform-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const settings = q.data;
  return (
    <SectionPage title="Paramètres" subtitle="Paramètres de plateforme déjà stockés dans Supabase." icon={Settings}>
      {q.isLoading ? <Skeleton className="h-40" /> : !settings ? <Panel title="Paramètres"><p className="p-4 text-sm text-slate-500">Aucune ligne de configuration n'est disponible.</p></Panel> : (
        <Panel title="Plateforme">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div><p className="text-xs font-semibold text-slate-500">Nom de marque</p><p className="mt-1 font-semibold">{settings.brand_name}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">E-mail de contact</p><p className="mt-1">{settings.contact_email}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Téléphone</p><p className="mt-1">{settings.contact_phone ?? "—"}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">WhatsApp</p><p className="mt-1">{settings.whatsapp_number ?? "—"}</p></div>
            <div className="md:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div><p className="font-semibold">Mode maintenance</p><p className="text-xs text-slate-500">Active ou désactive le mode maintenance de la plateforme.</p></div>
              <Switch checked={settings.maintenance_mode} onCheckedChange={(checked) => update.mutate({ maintenance_mode: checked })} />
            </div>
            <div className="md:col-span-2"><p className="text-xs font-semibold text-slate-500">Message de maintenance</p><textarea value={maintenanceMessage || settings.maintenance_message || ""} onChange={(e) => setMaintenanceMessage(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border p-3 text-sm" /><Button className="mt-2" disabled={update.isPending} onClick={() => update.mutate({ maintenance_message: maintenanceMessage })}>Enregistrer</Button></div>
          </div>
        </Panel>
      )}
    </SectionPage>
  );
}

function UnavailableSection({ title, message, icon: Icon }: { title: string; message: string; icon: typeof Flag }) {
  return <SectionPage title={title} subtitle="Module préparé, mais aucune source de données correspondante n'existe encore dans la base actuelle." icon={Icon}><Panel title={title}><div className="flex items-start gap-3 p-5 text-sm text-slate-600"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />{message}</div></Panel></SectionPage>;
}

function SectionPage({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof Home; children: ReactNode }) {
  return <div className="space-y-5"><header><div className="flex items-center gap-2 text-emerald-600"><Icon className="size-5" /><span className="text-sm font-semibold">Administration</span></div><h1 className="mt-1 font-display text-3xl font-bold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></header>{children}</div>;
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
