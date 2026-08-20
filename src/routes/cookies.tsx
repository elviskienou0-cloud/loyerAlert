import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politique de cookies — LoyerAlert" },
      {
        name: "description",
        content: "Quels cookies et stockages locaux LoyerAlert utilise, et comment gérer votre consentement.",
      },
      { property: "og:title", content: "Politique de cookies — LoyerAlert" },
      { property: "og:description", content: "Cookies essentiels uniquement, consentement demandé avant tout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link to="/" className="text-sm text-muted-foreground underline">
        ← Retour à l'accueil
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">Politique de cookies</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-lg font-semibold">1. Ce que nous utilisons</h2>
          <p className="mt-2 text-muted-foreground">
            LoyerAlert n'utilise que des cookies et stockages locaux <strong>strictement nécessaires</strong> au
            fonctionnement du service. Aucun cookie publicitaire, aucun traceur tiers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">2. Détail</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong>Session d'authentification</strong> — garde votre connexion active. Indispensable.
            </li>
            <li>
              <strong>Préférence de consentement</strong> — mémorise votre choix afin de ne plus afficher le bandeau.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">3. Gérer votre choix</h2>
          <p className="mt-2 text-muted-foreground">
            Vous pouvez à tout moment effacer les données du site depuis votre navigateur : le bandeau de
            consentement réapparaîtra à votre prochaine visite. Refuser les cookies non essentiels n'empêche pas
            l'utilisation de LoyerAlert.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">4. En savoir plus</h2>
          <p className="mt-2 text-muted-foreground">
            Consultez notre{" "}
            <Link to="/confidentialite" className="underline">
              politique de confidentialité
            </Link>{" "}
            pour le détail des données traitées.
          </p>
        </section>
      </div>
    </main>
  );
}
