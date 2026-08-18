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

export function buildMessage(
  kind: ReminderKind,
  data: { nom: string; montant: number; date: string },
): string {
  return loadTemplates()[kind]
    .replaceAll("{nom}", data.nom)
    .replaceAll("{montant}", fcfa(data.montant))
    .replaceAll("{date}", shortDate(data.date));
}

export function whatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("226") ? digits : `226${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
