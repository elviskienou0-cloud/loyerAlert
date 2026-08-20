import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, Panel, statusLabel, statusTone } from "@/components/admin/AdminBits";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", query],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users", { p_search: query });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) => {
      const { error } = await supabase.rpc("admin_set_suspended", { p_user_id: id, p_suspended: suspend });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte mis à jour.");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Utilisateurs</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <Input placeholder="Rechercher par nom ou e-mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit">Rechercher</Button>
      </form>

      <Panel title="Comptes propriétaires">
        {users.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (users.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Formule</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Logements</th>
                <th className="px-4 py-2">Inscrit le</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users.data ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === "admin" ? "green" : "slate"}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{u.plan}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(u.status)}>{statusLabel(u.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">{u.properties}</td>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant={u.suspended ? "outline" : "destructive"}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: u.id, suspend: !u.suspended })}
                    >
                      {u.suspended ? "Réactiver" : "Suspendre"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
