import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge, Panel, statusLabel, statusTone } from "@/components/admin/AdminBits";
import { fcfa, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/paiements")({
  component: AdminPayments,
});

const METHOD: Record<string, string> = {
  orange_money: "Orange Money",
  moov_money: "Moov Money",
  saspay: "SasPay",
};

function AdminPayments() {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<{ id: string; approve: boolean } | null>(null);
  const [reason, setReason] = useState("");

  const requests = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const users = useQuery({
    queryKey: ["admin-users", ""],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users", { p_search: "" });
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async (v: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase.rpc("review_payment_request", {
        p_request_id: v.id,
        p_approve: v.approve,
        ...(v.reason ? { p_reason: v.reason } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande traitée.");
      setConfirm(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-logs", 8] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openProof(path: string) {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 120);
    if (error || !data) {
      toast.error("Preuve de paiement indisponible.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Demandes de paiement</h1>
      <Panel title="Toutes les demandes">
        {requests.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (requests.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune demande pour le moment.</p>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Formule</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Méthode</th>
                <th className="px-4 py-2">Référence</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(requests.data ?? []).map((r) => {
                const u = (users.data ?? []).find((x) => x.id === r.user_id);
                return (
                  <tr key={r.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">{u?.full_name ?? u?.email ?? r.user_id}</td>
                    <td className="px-4 py-3">{r.plan}</td>
                    <td className="px-4 py-3">{fcfa(r.amount)}</td>
                    <td className="px-4 py-3">{METHOD[r.payment_method] ?? r.payment_method}</td>
                    <td className="px-4 py-3">{r.transaction_reference ?? "—"}</td>
                    <td className="px-4 py-3">{shortDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                      {r.status === "rejected" && r.rejection_reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">{r.rejection_reason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void openProof(r.screenshot_path)}>
                          Preuve
                        </Button>
                        {r.status === "pending" ? (
                          <>
                            <Button size="sm" onClick={() => setConfirm({ id: r.id, approve: true })}>
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirm({ id: r.id, approve: false })}
                            >
                              Rejeter
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.approve ? "Approuver ce paiement ?" : "Rejeter ce paiement ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.approve
                ? "L'abonnement de l'utilisateur sera activé pour 30 jours. Cette action est enregistrée dans le journal."
                : "Indiquez la raison du refus. Elle sera visible par l'utilisateur."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm && !confirm.approve ? (
            <Input placeholder="Raison du refus" value={reason} onChange={(e) => setReason(e.target.value)} />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!confirm) return;
                if (!confirm.approve && !reason.trim()) {
                  toast.error("Une raison est obligatoire.");
                  return;
                }
                review.mutate({
                  id: confirm.id,
                  approve: confirm.approve,
                  ...(confirm.approve ? {} : { reason: reason.trim() }),
                });
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
