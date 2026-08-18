import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — LoyerAlert" },
      { name: "description", content: "Connectez-vous à LoyerAlert pour suivre vos loyers et relancer vos locataires." },
      { property: "og:title", content: "Connexion — LoyerAlert" },
      { property: "og:description", content: "Accédez à votre espace propriétaire LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Connexion impossible : e-mail ou mot de passe incorrect.");
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      setSent(true);
      return toast.success("Vérifiez votre e-mail pour confirmer votre compte.");
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Connexion Google impossible. Réessayez.");
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  async function forgot() {
    if (!email) return toast.error("Saisissez d'abord votre e-mail.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Un lien de réinitialisation vous a été envoyé.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center font-display text-xl font-bold tracking-wide text-primary">
          LOYERALERT
        </Link>
        <div className="surface p-6">
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Un e-mail de confirmation vous a été envoyé. Cliquez sur le lien reçu puis revenez vous
              connecter.
            </p>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Créer un compte</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <Field label="E-mail" value={email} onChange={setEmail} type="email" />
                  <Field label="Mot de passe" value={password} onChange={setPassword} type="password" />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Connexion…" : "Se connecter"}
                  </Button>
                  <button type="button" onClick={forgot} className="w-full text-sm text-muted-foreground underline">
                    Mot de passe oublié ?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <Field label="Nom complet" value={fullName} onChange={setFullName} />
                  <Field label="E-mail" value={email} onChange={setEmail} type="email" />
                  <Field label="Mot de passe" value={password} onChange={setPassword} type="password" />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Création…" : "Créer mon compte"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    30 jours d'essai gratuit, sans carte bancaire.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continuer avec Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} required onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
