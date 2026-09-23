import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  Settings,
  User,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/motion";
import { currentPeriod, fcfa, monthLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      {
        title: "Tableau de bord — LoyerAlert",
      },
      {
        name: "description",
        content:
          "Gérez vos logements, locataires et loyers depuis votre tableau de bord LoyerAlert.",
      },
      {
        property: "og:title",
        content: "Tableau de bord — LoyerAlert",
      },
      {
        property: "og:description",
        content:
          "Vos logements, loyers et paiements en un coup d'œil.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
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
        .select(
          "id, amount_due, paid_amount, balance, status, period",
        )
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
        .select("id", {
          count: "exact",
          head: true,
        });

      if (error) throw error;

      return count ?? 0;
    },
  });

  const period = currentPeriod();

  const month = (rents.data ?? []).filter(
    (rent) => rent.period === period,
  );

  const expected = month.reduce(
    (sum, rent) => sum + Number(rent.amount_due),
    0,
  );

  const collected = month.reduce(
    (sum, rent) => sum + Number(rent.paid_amount),
    0,
  );

  const unpaid = Math.max(0, expected - collected);

  const paidCount = month.filter(
    (rent) => rent.status === "paid",
  ).length;

  const lateCount = month.filter(
    (rent) => rent.status === "overdue",
  ).length;

  const pendingCount = month.filter(
    (rent) =>
      rent.status !== "paid" &&
      rent.status !== "overdue",
  ).length;

  const rate =
    expected > 0
      ? Math.min(100, Math.round((collected / expected) * 100))
      : 0;

  /**
   * Préparation du graphique.
   *
   * On trie d'abord par période réelle afin de ne pas dépendre
   * du nom du mois affiché.
   */
  const chart = Object.entries(
    (rents.data ?? []).reduce<
      Record<
        string,
        {
          period: string;
          mois: string;
          attendu: number;
          encaisse: number;
        }
      >
    >((acc, rent) => {
      const key = rent.period;

      if (!acc[key]) {
        acc[key] = {
          period: key,
          mois: monthLabel(key).split(" ")[0] ?? key,
          attendu: 0,
          encaisse: 0,
        };
      }

      acc[key].attendu += Number(rent.amount_due);
      acc[key].encaisse += Number(rent.paid_amount);

      return acc;
    }, {}),
  )
    .map(([, value]) => value)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-6);

  async function generate() {
    const { error } = await supabase.rpc(
      "generate_rent_records",
      {
        p_period: period,
      },
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Loyers du mois générés.");

    void queryClient.invalidateQueries({
      queryKey: ["rents"],
    });
  }

  return (
    <div className="min-w-0 text-[#182421]">
      {/* =========================================================
          CONTENU DU DASHBOARD

          IMPORTANT :
          Le Sidebar et le Topbar ne sont volontairement PAS présents
          ici. Ils sont déjà fournis par AppShell.tsx.

          Cela évite le double AppShell visible sur la page.
      ========================================================= */}

      <div className="mx-auto w-full max-w-[1450px] px-0 py-2 sm:py-4">
        {/* Mobile greeting */}
        <div className="mb-6 sm:hidden">
          <p className="text-2xl font-extrabold">
            Bonjour {getFirstName(account?.full_name ?? account?.name)} 👋
          </p>

          <p className="mt-1 text-sm text-[#7b8985]">
            {formatToday()}
          </p>
        </div>

        {/* Title */}
        <div className="mb-7">
          <h1 className="text-[30px] font-extrabold tracking-[-0.04em] sm:text-[34px]">
            Bonjour 👋
          </h1>

          <p className="mt-1 text-[17px] text-[#7b8985]">
            {monthLabel(period)}
          </p>
        </div>

        {/* Subscription */}
        <div className="mb-7">
          {account ? (
            <SubscriptionBanner account={account} />
          ) : (
            <Skeleton className="h-[158px] w-full rounded-[26px]" />
          )}
        </div>

        {rents.isLoading ? (
          <DashboardSkeleton />
        ) : rents.isError ? (
          <div className="rounded-[24px] border border-[#e4ebe8] bg-white p-7 shadow-[0_4px_20px_rgba(25,50,43,0.04)]">
            <p className="text-sm text-[#687672]">
              Connexion difficile. Vérifiez votre réseau.
            </p>

            <Button
              className="mt-4 rounded-full bg-[#087b61] hover:bg-[#066b54]"
              size="sm"
              onClick={() => void rents.refetch()}
            >
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            {/* Section title */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-[#687672]">
                Loyers du mois
              </p>

              <Link
                to="/paiements"
                className="hidden items-center gap-1 text-sm font-semibold text-[#087b61] sm:flex"
              >
                Voir les paiements
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* STAT CARDS */}
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Attendus"
                value={expected}
              />

              <StatCard
                label="Encaissés"
                value={collected}
                tone="success"
              />

              <StatCard
                label="Impayés"
                value={unpaid}
                tone="danger"
              />
            </div>

            {/* SUMMARY */}
            <div className="mt-5 rounded-[26px] border border-[#e4ebe8] bg-white p-6 shadow-[0_4px_20px_rgba(25,50,43,0.04)] sm:p-7">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-[23px] font-bold tracking-[-0.02em]">
                    <CountUp
                      value={properties.data ?? 0}
                    />{" "}
                    {properties.data === 1
                      ? "logement"
                      : "logements"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#71807b]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full bg-[#55d98b] shadow-[0_0_8px_rgba(85,217,139,0.45)]" />
                      {paidCount} payés
                    </span>

                    <span>·</span>

                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full bg-[#e94463] shadow-[0_0_8px_rgba(233,68,99,0.35)]" />
                      {lateCount} en retard
                    </span>

                    {pendingCount > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {pendingCount} en attente
                        </span>
                      </>
                    )}

                    <span>·</span>

                    <span>
                      taux d'encaissement{" "}
                      <strong className="text-[#35423e]">
                        {rate} %
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#e0ebe7]">
                    <div
                      className="h-full rounded-full bg-[#54d88a] transition-all duration-300"
                      style={{
                        width: `${rate}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link to="/paiements">
                    <Button className="rounded-full bg-[#087b61] px-5 font-semibold shadow-[0_5px_14px_rgba(8,123,97,0.18)] hover:bg-[#066b54]">
                      Voir les retards
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="rounded-full border-[#dfe7e4] bg-white px-5 font-medium hover:bg-[#f5f8f7]"
                    onClick={generate}
                  >
                    Générer les loyers du mois
                  </Button>
                </div>
              </div>
            </div>

            {/* ÉVOLUTION DES LOYERS */}
            <div className="mt-5">
              {chart.length > 0 ? (
                <div className="rounded-[26px] border border-[#e4ebe8] bg-white p-6 shadow-[0_4px_20px_rgba(25,50,43,0.04)]">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold">
                      Évolution des loyers
                    </h2>

                    <p className="mt-1 text-sm text-[#7b8985]">
                      Attendu vs encaissé sur les derniers mois
                    </p>
                  </div>

                  <div className="h-[270px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={chart}
                        barGap={6}
                      >
                        <XAxis
                          dataKey="mois"
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          tick={{ fill: "#788580" }}
                        />

                        <Tooltip
                          cursor={{
                            fill: "rgba(8,123,97,0.04)",
                          }}
                          formatter={(value) =>
                            fcfa(Number(value ?? 0))
                          }
                          contentStyle={{
                            borderRadius: 14,
                            border: "1px solid #e3ebe7",
                            boxShadow:
                              "0 8px 30px rgba(25,50,43,0.08)",
                          }}
                        />

                        <Bar
                          dataKey="attendu"
                          name="Attendu"
                          fill="#b7dcd1"
                          radius={[5, 5, 0, 0]}
                        />

                        <Bar
                          dataKey="encaisse"
                          name="Encaissé"
                          fill="#159a78"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-[26px] border border-[#e4ebe8] bg-white p-6 shadow-[0_4px_20px_rgba(25,50,43,0.04)]">
                  <h2 className="text-lg font-bold">
                    Évolution des loyers
                  </h2>

                  <p className="mt-1 text-sm text-[#7b8985]">
                    Les données apparaîtront ici lorsque plusieurs
                    périodes de loyers seront disponibles.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   STAT CARD
================================================================ */

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-[#159a78]"
      : tone === "danger"
        ? "text-[#cf3b49]"
        : "text-[#182421]";

  return (
    <div className="rounded-[26px] border border-[#e4ebe8] bg-white px-5 py-6 shadow-[0_4px_20px_rgba(25,50,43,0.04)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(25,50,43,0.07)] sm:px-6">
      <p
        className={`font-display text-[25px] font-extrabold tracking-[-0.03em] ${valueClass}`}
      >
        <CountUp
          value={value}
          format={(number) =>
            fcfa(Math.round(number))
          }
        />
      </p>

      <p className="mt-1 text-[15px] text-[#75827e]">
        {label}
      </p>
    </div>
  );
}

/* ================================================================
   USER EMAIL
================================================================ */

function UserEmail() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setEmail(data.user?.email ?? "");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <p className="truncate text-xs text-[#85918d]">
      {email || "Compte LoyerAlert"}
    </p>
  );
}

/* ================================================================
   HELPERS
================================================================ */

function getFirstName(value?: string | null) {
  if (!value) return "vous";

  return value.trim().split(/\s+/)[0] || "vous";
}

function formatToday() {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/* ================================================================
   LOADING
================================================================ */

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[130px] rounded-[26px]" />
        <Skeleton className="h-[130px] rounded-[26px]" />
        <Skeleton className="h-[130px] rounded-[26px]" />
      </div>

      <Skeleton className="h-[220px] rounded-[26px]" />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Skeleton className="h-[350px] rounded-[26px]" />
        <Skeleton className="h-[350px] rounded-[26px]" />
      </div>
    </div>
  );
}
