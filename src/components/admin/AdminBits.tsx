import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="surface p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  slate: "bg-muted text-muted-foreground",
};

export function Badge({ tone = "slate", children }: { tone?: keyof typeof TONES | string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone] ?? TONES['slate'])}>
      {children}
    </span>
  );
}

export function statusTone(status: string): string {
  if (status === "approved" || status === "active") return "green";
  if (status === "pending" || status === "trial") return "amber";
  if (status === "rejected" || status === "suspended") return "red";
  return "slate";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Refusé",
    active: "Actif",
    trial: "Essai",
    expired: "Expiré",
    suspended: "Suspendu",
  };
  return map[status] ?? status;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
