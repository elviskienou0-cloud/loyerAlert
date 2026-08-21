import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LifeBuoy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SUPPORT_EMAIL = "kienoucoucou5@gmail.com";

export const Route = createFileRoute("/assistance")({
  head: () => ({
    meta: [
      { title: "Assistance — LoyerAlert" },
      {
        name: "description",
        content:
          "Besoin d'aide sur LoyerAlert ? Contactez l'équipe support pour vos abonnements, paiements ou questions techniques.",
      },
      { property: "og:title", content: "Assistance — LoyerAlert" },
      { property: "og:description", content: "Contactez le support LoyerAlert : abonnements, paiements, questions techniques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistance,
});

function Assistance() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject || "Assistance LoyerAlert",
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour à l'accueil
      </Link>
      <div className="surface mt-4 p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Assistance LoyerAlert</h1>
            <p className="text-sm text-muted-foreground">
              Une question sur votre abonnement, un paiement ou un bug ? Écrivez-nous.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-medium" htmlFor="subject">
              Sujet
            </label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Demande de paiement non validée"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="message">
              Message
            </label>
            <Textarea
              id="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre problème (logement, locataire, capture d'écran de paiement…)"
            />
          </div>
          <Button asChild className="w-full">
            <a href={mailto}>
              <Mail className="mr-2 size-4" />
              Envoyer à l'assistance
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Ou écrivez directement à{" "}
            <a className="font-medium text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
