import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { daysLeft, shortDate } from "@/lib/format";
import type { Account } from "@/hooks/useAccount";

export function SubscriptionBanner({ account }: { account: Account }) {
  if (account.pending_request) {
    return (
      <Box tone="warning" title="🟡 Paiement en cours de vérification">
        Votre paiement sera activé après vérification manuelle par notre équipe.
      </Box>
    );
  }
  if (account.status === "active") {
    return (
      <Box tone="success" title="🟢 Abonnement actif">
        Votre abonnement est actif jusqu'au {shortDate(account.ends_at)}.
      </Box>
    );
  }
  if (account.status === "trial") {
    const d = daysLeft(account.trial_ends_at);
    return (
      <Box tone="primary" title="🎁 Essai gratuit" action>
        {d <= 7 ? `Votre essai expire dans ${d} jour(s).` : `Il vous reste ${d} jours.`}
      </Box>
    );
  }
  if (account.status === "suspended") {
    return (
      <Box tone="danger" title="🔒 Compte suspendu">
        Contactez l'administrateur pour réactiver votre compte.
      </Box>
    );
  }
  return (
    <Box tone="danger" title="🔒 Abonnement expiré" action>
      Votre période gratuite de 30 jours est terminée. Pour continuer à utiliser LoyerAlert,
      choisissez un abonnement.
    </Box>
  );
}

function Box({
  tone,
  title,
  children,
  action,
}: {
  tone: "success" | "warning" | "danger" | "primary";
  title: string;
  children: React.ReactNode;
  action?: boolean;
}) {
  const toneClass = {
    success: "border-success/40 bg-success/10",
    warning: "border-warning/50 bg-warning/15",
    danger: "border-destructive/40 bg-destructive/10",
    primary: "border-primary/30 bg-primary/10",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      {action ? (
        <Link to="/abonnement">
          <Button className="mt-3" size="sm">
            Choisir un abonnement
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
