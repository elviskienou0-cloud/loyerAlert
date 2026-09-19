import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Abonne l'écran aux changements Supabase (INSERT/UPDATE/DELETE) sur une ou
 * plusieurs tables et invalide automatiquement les requêtes react-query
 * correspondantes. Résultat : les listes (locataires, logements, paiements…)
 * s'actualisent toutes seules dès qu'une donnée change côté Supabase —
 * modification faite depuis un autre appareil, un autre onglet, ou par
 * l'équipe support — sans que l'utilisateur ait besoin de recharger la page.
 *
 * S'appuie sur les policies RLS existantes : chaque utilisateur ne reçoit
 * que les événements des lignes qu'il a le droit de lire.
 */
export function useRealtimeSync(tables: string[], queryKeys: QueryKey[], enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const refresh = () => {
      for (const key of queryKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const channel = supabase.channel(`sync:${tables.join(",")}`);
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tables.join(","), queryClient]);
}
