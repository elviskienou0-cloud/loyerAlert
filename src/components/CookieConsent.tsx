import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const KEY = "loyeralert.cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* stockage indisponible : on n'affiche rien */
    }
  }, []);

  function decide(value: "all" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-xl animate-in slide-in-from-bottom-4"
    >
      <p className="text-sm text-muted-foreground">
        Nous utilisons uniquement des cookies nécessaires au fonctionnement de LoyerAlert (connexion, préférences).
        Vos informations ne sont collectées qu'avec votre accord.{" "}
        <Link to="/cookies" className="underline">
          Politique de cookies
        </Link>{" "}
        ·{" "}
        <Link to="/confidentialite" className="underline">
          Confidentialité
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => decide("essential")}>
          Essentiels uniquement
        </Button>
        <Button size="sm" onClick={() => decide("all")}>
          J'accepte
        </Button>
      </div>
    </div>
  );
}
