import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, MessageCircle, Receipt, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, PLANS } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LoyerAlert — Suivi des loyers en Afrique de l'Ouest" },
      {
        name: "description",
        content:
          "Sachez qui a payé son loyer, qui est en retard et relancez vos locataires par WhatsApp. Simple, en FCFA, pensé pour l'Afrique de l'Ouest.",
      },
      { property: "og:title", content: "LoyerAlert — Suivi des loyers en Afrique de l'Ouest" },
      {
        property: "og:description",
        content: "Loyers payés, retards et relances WhatsApp en un coup d'œil. Essai gratuit 30 jours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="font-display text-lg font-bold tracking-wide text-primary">LOYERALERT</span>
        <Link to={signedIn ? "/dashboard" : "/auth"}>
          <Button size="sm">{signedIn ? "Mon espace" : "Se connecter"}</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="py-10 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Afrique de l'Ouest · FCFA</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Qui a payé son loyer&nbsp;? Qui est en retard&nbsp;?
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            LoyerAlert suit vos logements, vos locataires et vos loyers. Enregistrez les paiements,
            repérez les retards et relancez en un clic par WhatsApp.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">Essayer gratuitement 30 jours</Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Building2, t: "Logements & locataires", d: "Chambres, studios, villas : tout est organisé simplement." },
            { icon: Receipt, t: "Paiements partiels", d: "Enregistrez un acompte, le solde est calculé automatiquement." },
            { icon: MessageCircle, t: "Relance WhatsApp", d: "Un message prêt à envoyer, modifiable à votre goût." },
            { icon: ShieldCheck, t: "Vos données protégées", d: "Chaque propriétaire ne voit que ses propres données." },
          ].map((f) => (
            <div key={f.t} className="surface p-5">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="pb-16">
          <h2 className="text-2xl font-bold">Des tarifs adaptés</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.id} className="surface p-5">
                <p className="font-display text-lg font-semibold">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {p.price === 0 ? "0 FCFA" : `${fcfa(p.price)}`}
                  <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Jusqu'à {p.limit} logements</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Paiement par Orange Money ou Moov Money, validé manuellement par notre équipe.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>LoyerAlert — Afrique de l'Ouest</p>
        <nav className="mt-2 flex justify-center gap-4">
          <Link to="/confidentialite" className="underline">
            Politique de confidentialité
          </Link>
          <Link to="/cookies" className="underline">
            Cookies
          </Link>
        </nav>
      </footer>
      <CookieConsent />
    </div>

  );
}
