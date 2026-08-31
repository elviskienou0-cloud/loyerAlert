/**
 * Configuration centralisée des liens de paiement SasPay.
 *
 * ⚠️ Aucun appel API, aucune clé, aucun webhook : uniquement des liens de
 * paiement ouverts dans un nouvel onglet. Pour changer un lien, il suffit de
 * modifier ce fichier — aucun autre fichier ne contient d'URL SasPay.
 *
 * Chaque lien correspond à 1 mois d'abonnement.
 */
export const SASPAY_LINKS = {
  /** Offre 1 — formule Starter */
  starter: "https://link.saspay.me/sqotet4qbwg",
  /** Offre 2 — formule Pro */
  pro: "https://link.saspay.me/bz6rsahl3a0",
  /** Offre 3 — formule Business */
  business: "https://link.saspay.me/w2zwhoi_xvu",
} as const;

export type SaspayPlan = keyof typeof SASPAY_LINKS;

/** Durée couverte par un paiement SasPay (informative, appliquée en base). */
export const SASPAY_PERIOD_MONTHS = 1;

/** Retourne le lien SasPay d'une formule, ou null si la formule est gratuite. */
export function saspayLink(plan: string): string | null {
  return (SASPAY_LINKS as Record<string, string | undefined>)[plan] ?? null;
}

/**
 * Ouvre le lien de paiement SasPay dans un nouvel onglet.
 * N'active JAMAIS l'abonnement : l'activation dépend uniquement de la
 * validation manuelle de la preuve de paiement par un administrateur.
 *
 * Point d'extension : une future intégration API/webhook SasPay pourra
 * remplacer cette fonction (création de session côté serveur) sans toucher
 * au reste du système d'abonnement.
 */
export function openSaspayCheckout(plan: string): boolean {
  const url = saspayLink(plan);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
