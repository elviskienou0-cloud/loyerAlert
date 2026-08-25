import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

/** Profil de l'utilisateur connecté (nom, e-mail, téléphone). */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", data.user.id)
        .maybeSingle();
      if (error) throw error;
      return p as Profile | null;
    },
    staleTime: 60_000,
  });
}
