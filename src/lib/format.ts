export function fcfa(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthLabel(period: string): string {
  const d = new Date(period);
  const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export const STATUS_LABEL: Record<string, string> = {
  upcoming: "À venir",
  due: "Échéance aujourd'hui",
  paid: "Payé",
  partially_paid: "Partiel",
  overdue: "En retard",
};

export const STATUS_DOT: Record<string, string> = {
  upcoming: "🟡",
  due: "🟠",
  paid: "🟢",
  partially_paid: "🟠",
  overdue: "🔴",
};

export const PLANS = [
  { id: "free", name: "Gratuit", price: 0, limit: 3 },
  { id: "starter", name: "Starter", price: 1000, limit: 10 },
  { id: "pro", name: "Pro", price: 2500, limit: 30 },
  { id: "business", name: "Business", price: 5000, limit: 100 },
] as const;

export const PAYMENT_NUMBERS = {
  orange_money: { label: "Orange Money", number: "04353163" },
  moov_money: { label: "Moov Money", number: "70271810" },
} as const;

export function daysLeft(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}
