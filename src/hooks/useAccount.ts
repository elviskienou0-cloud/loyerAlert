import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Account = {
  user_id: string;
  status: "trial" | "active" | "expired" | "suspended";
  plan: "free" | "starter" | "pro" | "business";
  trial_ends_at: string | null;
  started_at: string | null;
  ends_at: string | null;
  property_limit: number;
  property_count: number;
  is_admin: boolean;
  has_access: boolean;
  pending_request: { plan: string; amount: number; created_at: string } | null;
  last_rejection: string | null;
};

/** État réel de l'abonnement, calculé en base de données (jamais côté navigateur). */
export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async (): Promise<Account> => {
      const { data, error } = await supabase.rpc("my_account");
      if (error) throw error;
      return data as unknown as Account;
    },
    staleTime: 60_000,
    retry: 2,
  });
}

export function logActivity(action: string, details: Record<string, unknown> = {}) {
  void supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    void supabase.from("activity_logs").insert({ user_id: data.user.id, action, details: details as never });
  });
}
