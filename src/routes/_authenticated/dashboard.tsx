import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currentPeriod, fcfa, monthLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — LoyerAlert" },
      { name: "description", content: "Loyers attendus, encaissés et impayés du mois en cours." },
      { property: "og:title", content: "Tableau de bord — LoyerAlert" },
      { property: "og:description", content: "Vos loyers du mois en un coup d'œil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Row = {
  id: string;
  amount_due: number;
  paid_amount: number;
  balance: number;
  status: string;
  period: string;
};

function Dashboard() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();

  const rents = useQuery({
    queryKey: ["rents", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_status_view")
        .select("id, amount_due, paid_amount, balance, status, period")
        .order("period", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    retry: 2,
  });

  const properties = useQuery({
    queryKey: ["properties", "count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const period = currentPeriod();
  const month = (rents.data ?? []).filter((r) => r.period === period);
  const expected = month.reduce((s, r) => s + Number(r.amount_due), 0);
  const collected = month.reduce((s, r) => s + Number(r.paid_amount), 0);
  const unpaid = Math.max(0, expected - collected);
  const paidCount = month.filter((r) => r.status === "paid").length;
  const lateCount = month.filter((r) => r.status === "overdue").length;
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const chart = Object.values(
    (rents.data ?? []).reduce<Record<string, { mois: string; attendu: number; encaisse: number }>>(
      (acc, r) => {
        const key = r.period;
        acc[key] ??= { mois: monthLabel(key).split(" ")[0]!, attendu: 0, encaisse: 0 };
        acc[key].attendu += Number(r.amount_due);
        acc[key].encaisse += Number(r.paid_amount);
        return acc;
      },
      {},
    ),
  ).slice(0, 6).reverse();

  async function generate() {
    const { error } = await supabase.rpc("generate_rent_records", { p_period: period });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Loyers du mois générés.");
    void queryClient.invalidateQueries({ queryKey: ["rents"] });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Bonjour 👋</h1>
        <p className="text-sm text-muted-foreground">{monthLabel(period)}</p>
      </div>

      {account ? <SubscriptionBanner account={account} /> : <Skeleton className="h-24 w-full" />}

      {rents.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : rents.isError ? (
        <div className="surface p-5 text-sm">
          <p>Connexion difficile. Vérifiez votre réseau.</p>
          <Button className="mt-3" size="sm" onClick={() => void rents.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Loyers du mois
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Attendus" value={fcfa(expected)} />
            <Stat label="Encaissés" value={fcfa(collected)} tone="success" />
            <Stat label="Impayés" value={fcfa(unpaid)} tone="danger" />
          </div>

          <div className="surface p-5">
            <p className="text-lg font-semibold">{properties.data ?? 0} logements</p>
            <p className="mt-1 text-sm text-muted-foreground">
              🟢 {paidCount} payés · 🔴 {lateCount} en retard · taux d'encaissement {rate}%
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/paiements">
                <Button size="sm">Voir les retards</Button>
              </Link>
              <Button size="sm" variant="outline" onClick={generate}>
                Générer les loyers du mois
              </Button>
            </div>
          </div>

          {chart.length > 0 ? (
            <div className="surface p-5">
              <p className="mb-3 text-sm font-semibold">Attendu vs encaissé</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip formatter={(v: number) => fcfa(v)} />
                    <Bar dataKey="attendu" fill="var(--color-chart-4)" radius={4} />
                    <Bar dataKey="encaisse" fill="var(--color-chart-1)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const color =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="surface p-4">
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
