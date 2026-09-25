import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account } from "@/hooks/useAccount";

/**
 * Clés utilisées par TanStack Query pour mettre en cache
 * les informations d'authentification.
 */
export const authQueryKeys = {
  roles: (userId: string) => ["auth-roles", userId] as const,
  account: (userId: string) => ["subscription-gate", userId] as const,
  profile: (userId: string) => ["profile", userId] as const,
} as const;

/**
 * Récupère l'utilisateur actuellement connecté.
 *
 * getSession() utilise la session déjà présente côté client
 * et évite de faire une requête réseau supplémentaire à chaque
 * navigation.
 */
export async function getSessionUser(
  supabase: SupabaseClient,
) {
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user ?? null;
}

/**
 * Récupère les rôles de l'utilisateur.
 */
export async function fetchUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.role)
    .filter(
      (role): role is string =>
        typeof role === "string" && role.length > 0,
    );
}

/**
 * Récupère le compte et l'état de l'abonnement
 * depuis la fonction sécurisée Supabase.
 */
export async function fetchAccount(
  supabase: SupabaseClient,
): Promise<Account> {
  const {
    data,
    error,
  } = await supabase.rpc("my_account");

  if (error) {
    throw error;
  }

  return data as unknown as Account;
}