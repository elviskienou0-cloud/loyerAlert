import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/admin/AdminBits";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/journal")({
  component: AdminJournal,
});

const ACTION_LABEL: Record<string, string> = {
  payment_approved: "Paiement approuvé",
  payment_rejected: "Paiement refusé",
  suspended: "Compte suspendu",
  reactivated: "Compte réactivé",
};

function AdminJournal() {
  const logs = useQuery({
    queryKey: ["admin-logs", 200],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_logs", { p_limit: 200 });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Journal admin</h1>
      <Panel title="Historique des actions">
        {logs.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (logs.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune action enregistrée.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Utilisateur concerné</th>
                <th className="px-4 py-2">Administrateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(logs.data ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(l.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{ACTION_LABEL[l.action] ?? l.action}</td>
                  <td className="px-4 py-3">{l.user_email ?? l.user_id ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.admin_email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
