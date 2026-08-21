import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, StatCard } from "@/components/admin/AdminBits";
import { statusLabel } from "@/components/admin/AdminBits";
import { fcfa, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

type Stats = {
  users: number;
  properties: number;
  active_subs: number;
  pending_payments: number;
  revenue: number;
};

type Charts = {
  revenue: { month: string; revenue: number; requests: number }[];
  subscriptions: { status: string; count: number }[];
  plans: { plan: string; count: number }[];
  approval: { approved: number; rejected: number; pending: number; rate: number | null };
};

const PIE_COLORS = ["#16a34a", "#f59e0b", "#94a3b8", "#ef4444", "#0ea5e9"];

function monthShort(ym: string) {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const charts = useQuery({
    queryKey: ["admin-charts", 6],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_charts", { p_months: 6 });
      if (error) throw error;
      return data as unknown as Charts;
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

  const s = stats.data;
  const c = charts.data;
  const revenueData = (c?.revenue ?? []).map((r) => ({ ...r, label: monthShort(r.month) }));
  const subsData = (c?.subscriptions ?? []).map((x) => ({ name: statusLabel(x.status), value: Number(x.count) }));
  const rate = c?.approval?.rate;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Dashboard administrateur</h1>
      {stats.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Utilisateurs" value={s?.users ?? 0} />
          <StatCard label="Abonnements actifs" value={s?.active_subs ?? 0} />
          <StatCard label="Paiements en attente" value={s?.pending_payments ?? 0} />
          <StatCard label="Revenus" value={fcfa(s?.revenue ?? 0)} />
          <StatCard label="Logements suivis" value={s?.properties ?? 0} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Revenus par mois (6 derniers mois)">
            {charts.isLoading ? (
              <Skeleton className="m-4 h-56" />
            ) : (
              <div className="h-64 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} />
                    <Tooltip
                      formatter={(value: number, name) =>
                        name === "revenue" ? [fcfa(value), "Revenus"] : [value, "Demandes"]
                      }
                    />
                    <Bar dataKey="revenue" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Abonnements par statut">
          {charts.isLoading ? (
            <Skeleton className="m-4 h-56" />
          ) : subsData.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun abonnement.</p>
          ) : (
            <div className="h-64 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subsData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {subsData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Taux d'approbation des paiements">
        {charts.isLoading ? (
          <Skeleton className="m-4 h-16" />
        ) : (
          <div className="flex flex-wrap items-center gap-6 p-4">
            <div>
              <p className="font-display text-3xl font-bold">{rate == null ? "—" : `${rate}%`}</p>
              <p className="text-xs text-muted-foreground">demandes approuvées</p>
            </div>
            <div className="min-w-40 flex-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${rate ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {c?.approval?.approved ?? 0} approuvées · {c?.approval?.rejected ?? 0} refusées ·{" "}
                {c?.approval?.pending ?? 0} en attente
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Dernières activités">
        {logs.isLoading ? (
          <Skeleton className="m-4 h-24" />
        ) : (logs.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune activité enregistrée.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(logs.data ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <span className="font-medium">{l.action}</span>
                <span className="text-muted-foreground">
                  {l.user_email ?? l.user_id ?? "—"} · {shortDate(l.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
