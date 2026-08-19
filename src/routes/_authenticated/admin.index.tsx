import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, StatCard } from "@/components/admin/AdminBits";
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

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as Stats;
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
