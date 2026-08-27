import { fcfa, shortDate } from "./format";

export type ReminderKind = "before" | "onday" | "after";

const KEY = "loyeralert.reminder.templates";

export const DEFAULT_TEMPLATES: Record<ReminderKind, string> = {
  before:
    "Bonjour {nom}, votre loyer de {montant} arrive à échéance le {date}. Merci d'avance.",
  onday: "Bonjour {nom}, votre loyer arrive à échéance aujourd'hui.",
  after:
    "Bonjour {nom}, votre loyer de {montant} semble toujours impayé. Merci de régulariser.",
};

export function loadTemplates(): Record<ReminderKind, string> {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_TEMPLATES, ...JSON.parse(raw) } : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(t: Record<ReminderKind, string>) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(t));
}

export function kindForStatus(status: string): ReminderKind {
  if (status === "overdue" || status === "partially_paid") return "after";
  if (status === "due") return "onday";
  return "before";
}

/* ------------------------------------------------------------------ */
/* Numéros de téléphone — Afrique de l'Ouest                           */
/* ------------------------------------------------------------------ */

/** Indicatifs internationaux supportés et longueur locale attendue. */
export const COUNTRY_PREFIXES = [
  { code: "226", country: "Burkina Faso", localLength: 8 },
  { code: "225", country: "Côte d'Ivoire", localLength: 10 },
  { code: "223", country: "Mali", localLength: 8 },
  { code: "221", country: "Sénégal", localLength: 9 },
  { code: "229", country: "Bénin", localLength: 8 },
  { code: "228", country: "Togo", localLength: 8 },
  { code: "227", country: "Niger", localLength: 8 },
  { code: "224", country: "Guinée", localLength: 9 },
  { code: "233", country: "Ghana", localLength: 9 },
] as const;

/** Indicatif par défaut (numéro local sans préfixe). */
const DEFAULT_CODE = "226";

export type NormalizedPhone = {
  /** Numéro international, chiffres uniquement (ex. 22670123456). */
  international: string;
  /** Indicatif pays détecté (ex. 226). */
  countryCode: string;
};

/**
 * Nettoie un numéro (espaces, tirets, parenthèses, +, 00) et le normalise
 * en format international. Retourne null si le numéro est invalide.
 */
export function normalizePhone(raw: string | null | undefined): NormalizedPhone | null {
  if (!raw) return null;

  // Ne garder que les chiffres (supprime espaces, tirets, parenthèses, +…).
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Préfixe international "00" → déjà international.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Numéro avec indicatif connu ?
  for (const p of COUNTRY_PREFIXES) {
    if (digits.startsWith(p.code) && digits.length === p.code.length + p.localLength) {
      return { international: digits, countryCode: p.code };
    }
  }

  // Numéro local burkinabè (8 chiffres) → ajouter 226.
  const bf = COUNTRY_PREFIXES[0];
  if (digits.length === bf.localLength) {
    return { international: DEFAULT_CODE + digits, countryCode: DEFAULT_CODE };
  }

  // Autre numéro international plausible (10 à 15 chiffres).
  if (digits.length >= 10 && digits.length <= 15) {
    return { international: digits, countryCode: digits.slice(0, 3) };
  }

  return null;
}

export function isValidPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw) !== null;
}

/* ------------------------------------------------------------------ */
/* Messages préremplis                                                 */
/* ------------------------------------------------------------------ */

export type MessageKind = "reminder" | "late" | "confirmation" | "custom";

export const MESSAGE_KINDS: { id: MessageKind; label: string }[] = [
  { id: "reminder", label: "🔔 Rappel de loyer" },
  { id: "late", label: "⚠️ Loyer en retard" },
  { id: "confirmation", label: "✅ Confirmation de paiement" },
  { id: "custom", label: "💬 Message personnalisé" },
];

export type MessageData = {
  nom: string;
  montant: number;
  date: string;
};

/** Construit le message prérempli selon le type choisi. */
export function buildKindMessage(
  kind: Exclude<MessageKind, "custom">,
  data: MessageData,
): string {
  const montant = fcfa(data.montant);
  const date = shortDate(data.date);
  switch (kind) {
    case "reminder":
      return buildMessage("before", data);
    case "late":
      return buildMessage("after", data);
    case "confirmation":
      return `Bonjour ${data.nom}, nous confirmons la bonne réception de votre paiement de ${montant} pour le loyer de ${date}. Merci beaucoup.`;
  }
}

/* ------------------------------------------------------------------ */
/* Lien wa.me                                                          */
/* ------------------------------------------------------------------ */

/**
 * Génère le lien https://wa.me/NUMERO?text=MESSAGE_ENCODE.
 * Retourne null si le numéro est invalide.
 */
export function buildWhatsAppLink(phone: string, message: string): string | null {
  const p = normalizePhone(phone);
  if (!p) return null;
  return `https://wa.me/${p.international}?text=${encodeURIComponent(message)}`;
}

/**
 * @deprecated Conservé pour compatibilité. Préférer buildWhatsAppLink.
 */
export function whatsappUrl(phone: string, message: string): string {
  return buildWhatsAppLink(phone, message) ?? `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildMessage(
  kind: ReminderKind,
  data: MessageData,
): string {
  return loadTemplates()[kind]
    .replaceAll("{nom}", data.nom)
    .replaceAll("{montant}", fcfa(data.montant))
    .replaceAll("{date}", shortDate(data.date));
}
