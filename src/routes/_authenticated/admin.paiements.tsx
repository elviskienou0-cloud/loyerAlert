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
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/paiements")({
  component: AdminPayments,
});

const METHOD: Record<string, string> = {
  orange_money: "Orange Money",
  moov_money: "Moov Money",
  saspay: "SasPay",
};

function AdminPayments() {
  const { t } = useI18n();
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
      toast.success(t("adminPayments.processed"));
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
      toast.error(t("adminPayments.proofUnavailable"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{t("adminPayments.title")}</h1>
      <Panel title={t("adminPayments.title")}>
        {requests.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (requests.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("adminPayments.none")}</p>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{t("adminPayments.user")}</th>
                <th className="px-4 py-2">{t("adminPayments.plan")}</th>
                <th className="px-4 py-2">{t("adminPayments.amount")}</th>
                <th className="px-4 py-2">{t("adminPayments.method")}</th>
                <th className="px-4 py-2">{t("adminPayments.channel")}</th>
                <th className="px-4 py-2">{t("adminPayments.reference")}</th>
                <th className="px-4 py-2">{t("adminPayments.paidAt")}</th>
                <th className="px-4 py-2">{t("adminPayments.date")}</th>
                <th className="px-4 py-2">{t("adminPayments.status")}</th>
                <th className="px-4 py-2">{t("adminPayments.actions")}</th>
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
                    <td className="px-4 py-3">{r.payment_channel === "saspay" ? "💳 SasPay" : "Manuel"}</td>
                    <td className="px-4 py-3">{r.transaction_reference ?? "—"}</td>
                    <td className="px-4 py-3">{r.paid_at ? shortDate(r.paid_at) : "—"}</td>
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
              {confirm?.approve ? t("adminPayments.approveQuestion") : t("adminPayments.rejectQuestion")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.approve
                ? t("adminPayments.approveDescription")
                : t("adminPayments.rejectDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm && !confirm.approve ? (
            <Input placeholder={t("adminPayments.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adminPayments.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!confirm) return;
                if (!confirm.approve && !reason.trim()) {
                  toast.error(t("adminPayments.requiredReason"));
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
