import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Download, MessageCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const SITE_URL = "https://loyer-alert-bf.lovable.app";
const WA_SHARE = `https://wa.me/?text=${encodeURIComponent(
  "Je gère mes loyers avec LoyerAlert : je vois qui a payé, qui est en retard, et je relance par WhatsApp en un clic. Essai gratuit 30 jours : " +
    SITE_URL,
)}`;

const FAQ = [
  {
    q: "Qu'est-ce qu'une quittance de loyer ?",
    a: "Une quittance de loyer est un document remis par le propriétaire au locataire pour attester qu'il a bien payé son loyer. Elle mentionne le montant, la période concernée, le logement et les coordonnées des deux parties.",
  },
  {
    q: "Comment remplir une quittance de loyer ?",
    a: "Indiquez le nom du propriétaire et du locataire, l'adresse du logement, la période de location payée, le montant en chiffres et en lettres, le mode de paiement (espèces, Orange Money, Moov Money, virement…), la date et la signature du propriétaire.",
  },
  {
    q: "Combien de temps garder les quittances de loyer ?",
    a: "Il est conseillé de conserver les quittances au moins 3 ans. Elles servent de preuve en cas de litige entre le propriétaire et le locataire.",
  },
  {
    q: "La quittance de loyer est-elle obligatoire ?",
    a: "Dans la plupart des pays d'Afrique de l'Ouest, le propriétaire doit remettre un reçu au locataire qui en fait la demande. C'est en tout cas une bonne pratique qui protège les deux parties.",
  },
];

export const Route = createFileRoute("/quittance-de-loyer")({
  head: () => ({
    meta: [
      { title: "Quittance de loyer gratuite — Modèle et générateur | LoyerAlert" },
      {
        name: "description",
        content:
          "Modèle de quittance de loyer gratuit pour l'Afrique de l'Ouest : comment la remplir, exemple prêt à l'emploi, et générateur de reçus PDF avec LoyerAlert.",
      },
      { property: "og:title", content: "Quittance de loyer gratuite — Modèle et générateur" },
      {
        property: "og:description",
        content:
          "Modèle de quittance de loyer prêt à l'emploi et générateur de reçus PDF. Simple, en FCFA, pensé pour l'Afrique de l'Ouest.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: QuittancePage,
});

function QuittancePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-lg font-bold tracking-wide text-primary">
          LOYERALERT
        </Link>
        <Link to="/auth">
          <Button size="sm">Essai gratuit</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16">
        <section className="py-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Modèle gratuit · Afrique de l'Ouest
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Quittance de loyer gratuite : modèle et générateur
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Une quittance (ou reçu) de loyer protège le propriétaire comme le locataire. Voici un
            modèle clair, les règles pour bien le remplir, et un outil gratuit pour générer vos
            reçus en PDF à chaque paiement.
          </p>
        </section>

        {/* Modèle exemple */}
        <section aria-labelledby="modele" className="surface p-6">
          <h2 id="modele" className="text-2xl font-bold">
            Modèle de quittance de loyer
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recopiez ce modèle ou générez-le automatiquement avec LoyerAlert.
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-5 text-sm leading-relaxed">
            <p className="text-center font-display text-base font-bold">QUITTANCE DE LOYER</p>
            <p className="mt-4">
              Je soussigné(e), <span className="text-muted-foreground">[nom du propriétaire]</span>,
              propriétaire du logement situé à{" "}
              <span className="text-muted-foreground">[adresse du logement]</span>, déclare avoir
              reçu de <span className="text-muted-foreground">[nom du locataire]</span> la somme de{" "}
              <span className="text-muted-foreground">[montant en chiffres] FCFA</span> (
              <span className="text-muted-foreground">[montant en lettres]</span>) au titre du loyer
              de la période du <span className="text-muted-foreground">[date début]</span> au{" "}
              <span className="text-muted-foreground">[date fin]</span>.
            </p>
            <p className="mt-3">
              Mode de paiement :{" "}
              <span className="text-muted-foreground">
                [espèces / Orange Money / Moov Money / virement]
              </span>
            </p>
            <p className="mt-3">
              Fait à <span className="text-muted-foreground">[ville]</span>, le{" "}
              <span className="text-muted-foreground">[date]</span>
            </p>
            <p className="mt-3 text-muted-foreground">Signature du propriétaire</p>
          </div>
        </section>

        {/* Générateur CTA */}
        <section aria-labelledby="generateur" className="mt-8 surface p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10">
              <Receipt className="size-5 text-primary" />
            </span>
            <div>
              <h2 id="generateur" className="text-2xl font-bold">
                Générez vos quittances automatiquement
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Avec LoyerAlert, chaque paiement enregistré produit un reçu PDF prêt à envoyer par
                WhatsApp à votre locataire. Plus besoin de remplir le modèle à la main : les noms,
                montants en FCFA et périodes sont pré-remplis.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  "Reçu PDF généré en un clic à chaque paiement",
                  "Montants en FCFA, paiements partiels pris en compte",
                  "Envoi direct par WhatsApp au locataire",
                  "Historique conservé : qui a payé, quand, combien",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button>
                    <Download className="mr-2 size-4" />
                    Créer mes reçus gratuitement
                  </Button>
                </Link>
                <a href={WA_SHARE} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <MessageCircle className="mr-2 size-4" />
                    Partager sur WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mt-10">
          <h2 id="faq" className="text-2xl font-bold">
            Questions fréquentes sur la quittance de loyer
          </h2>
          <div className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="surface p-5">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-bold">Suivez tous vos loyers au même endroit</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Logements, locataires, paiements, relances WhatsApp et reçus PDF — LoyerAlert est pensé
            pour les propriétaires d'Afrique de l'Ouest. Essai gratuit de 30 jours.
          </p>
          <Link to="/auth" className="mt-4 inline-block">
            <Button size="lg">Essayer gratuitement 30 jours</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>LoyerAlert — Afrique de l'Ouest</p>
        <nav className="mt-2 flex justify-center gap-4">
          <Link to="/" className="underline">
            Accueil
          </Link>
          <Link to="/confidentialite" className="underline">
            Confidentialité
          </Link>
          <Link to="/assistance" className="underline">
            Assistance
          </Link>
        </nav>
      </footer>
    </div>
  );
}
