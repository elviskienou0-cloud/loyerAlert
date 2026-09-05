import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — LoyerAlert" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte LoyerAlert." },
      { property: "og:title", content: "Nouveau mot de passe — LoyerAlert" },
      { property: "og:description", content: "Réinitialisation sécurisée de votre mot de passe LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="surface w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Saisissez votre nouveau mot de passe. Ouvrez cette page depuis le lien reçu par e-mail.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Mot de passe</Label>
          <Input
            id="new-password"
            type="password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
