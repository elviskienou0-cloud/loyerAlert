import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, Panel, statusLabel, statusTone } from "@/components/admin/AdminBits";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/abonnements")({
  component: AdminSubscriptions,
});

function AdminSubscriptions() {
  const subs = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_subscriptions");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Abonnements</h1>
      <Panel title="Tous les abonnements">
        {subs.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (subs.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun abonnement.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Propriétaire</th>
                <th className="px-4 py-2">Formule</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Fin d'essai</th>
                <th className="px-4 py-2">Fin d'abonnement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(subs.data ?? []).map((s) => (
                <tr key={s.user_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{s.plan}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(s.trial_ends_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(s.ends_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
