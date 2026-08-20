import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — LoyerAlert" },
      {
        name: "description",
        content:
          "Comment LoyerAlert collecte, utilise et protège les données des propriétaires et locataires en Afrique de l'Ouest.",
      },
      { property: "og:title", content: "Politique de confidentialité — LoyerAlert" },
      { property: "og:description", content: "Vos données, vos droits : transparence totale sur LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link to="/" className="text-sm text-muted-foreground underline">
        ← Retour à l'accueil
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold">1. Qui sommes-nous</h2>
          <p className="mt-2 text-muted-foreground">
            LoyerAlert est un service de suivi des loyers destiné aux propriétaires en Afrique de l'Ouest. Nous
            traitons vos données uniquement pour faire fonctionner ce service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">2. Données collectées</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Compte : nom complet, e-mail, numéro de téléphone.</li>
            <li>Gestion locative : logements, locataires, montants de loyer, paiements enregistrés.</li>
            <li>Abonnement : formule choisie, justificatif de paiement mobile money, référence de transaction.</li>
            <li>Journal technique : actions importantes (validation de paiement, suspension de compte).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">3. Consentement</h2>
          <p className="mt-2 text-muted-foreground">
            Vos données ne sont collectées qu'après votre consentement explicite, donné à la création du compte et
            via le bandeau de cookies. Vous pouvez retirer ce consentement à tout moment en supprimant votre compte
            ou en nous contactant.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">4. Utilisation des données</h2>
          <p className="mt-2 text-muted-foreground">
            Vos données servent exclusivement à afficher vos loyers, calculer les retards, générer des reçus et
            préparer vos messages de relance. Elles ne sont ni vendues, ni louées, ni utilisées à des fins
            publicitaires.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">5. Données des locataires</h2>
          <p className="mt-2 text-muted-foreground">
            En tant que propriétaire, vous êtes responsable des informations de vos locataires que vous saisissez.
            Vous devez les informer de cet enregistrement et obtenir leur accord avant toute relance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">6. Sécurité et isolation</h2>
          <p className="mt-2 text-muted-foreground">
            Chaque propriétaire ne peut accéder qu'à ses propres données : l'isolation est appliquée directement au
            niveau de la base de données. Les justificatifs de paiement sont stockés dans un espace privé.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">7. Conservation</h2>
          <p className="mt-2 text-muted-foreground">
            Vos données sont conservées tant que votre compte est actif. À la suppression du compte, elles sont
            effacées, hors obligations comptables légales.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">8. Vos droits</h2>
          <p className="mt-2 text-muted-foreground">
            Vous pouvez accéder à vos données, les corriger depuis votre profil, en demander l'export ou la
            suppression. Écrivez-nous depuis l'adresse e-mail de votre compte.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">9. Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            Voir notre{" "}
            <Link to="/cookies" className="underline">
              politique de cookies
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
