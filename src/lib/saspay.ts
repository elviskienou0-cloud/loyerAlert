/**
 * Configuration centralisée des liens de paiement SasPay.
 *
 * Chaque lien correspond à la bonne formule d'abonnement.
 */

export const SASPAY_LINKS = {
  /** Starter — 1 000 FCFA */
  starter: "https://link.saspay.me/bz6rsahl3a0",

  /** Pro — 2 500 FCFA */
  pro: "https://link.saspay.me/w2zwhoi_xvu",

  /** Business — 5 000 FCFA */
  business: "https://link.saspay.me/sqotet4qbwg",
} as const;

export type SaspayPlan = keyof typeof SASPAY_LINKS;

/** Durée couverte par un paiement SasPay. */
export const SASPAY_PERIOD_MONTHS = 1;

/**
 * Retourne le lien SasPay correspondant à la formule.
 */
export function saspayLink(plan: string): string | null {
  return (
    (SASPAY_LINKS as Record<string, string | undefined>)[plan] ??
    null
  );
}

/**
 * Ouvre le lien de paiement SasPay dans un nouvel onglet.
 *
 * L'abonnement n'est jamais activé automatiquement.
 * L'activation dépend de la validation de la preuve
 * de paiement par l'administrateur.
 */
export function openSaspayCheckout(plan: string): boolean {
  const url = saspayLink(plan);

  if (!url) {
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");

  return true;
}