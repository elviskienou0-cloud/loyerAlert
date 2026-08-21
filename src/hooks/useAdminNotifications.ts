import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Compteur de demandes de paiement en attente (pastille de la barre latérale). */
export function usePendingRequestsCount(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-pending-count"],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("payment_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

/** Notifications temps réel des demandes de paiement (admin uniquement). */
export function useAdminNotifications(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-count"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-charts"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    };

    const channel = supabase
      .channel("admin-payment-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_requests" },
        (payload) => {
          const row = payload.new as { amount?: number; plan?: string };
          toast.info("Nouvelle demande de paiement", {
            description: `Formule ${row.plan ?? "—"} · ${Number(row.amount ?? 0).toLocaleString("fr-FR")} FCFA`,
          });
          refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payment_requests" },
        (payload) => {
          const before = payload.old as { status?: string };
          const after = payload.new as { status?: string };
          if (before?.status !== after?.status) {
            toast.message("Statut modifié", {
              description: `Demande ${after?.status === "approved" ? "approuvée" : after?.status === "rejected" ? "refusée" : "mise à jour"}.`,
            });
          }
          refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
