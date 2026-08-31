import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { fcfa, monthLabel, shortDate, STATUS_DOT, STATUS_LABEL } from "@/lib/format";
import { logActivity } from "@/hooks/useAccount";


export const Route = createFileRoute("/_authenticated/locataires/$tenantId")({
  head: () => ({
    meta: [
      { title: "Fiche locataire — LoyerAlert" },
      { name: "description", content: "Historique des loyers, paiements, soldes et retards du locataire." },
      { property: "og:title", content: "Fiche locataire — LoyerAlert" },
      { property: "og:description", content: "Historique complet et relance WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TenantDetail,
});

function TenantDetail() {
  const { tenantId } = Route.useParams();

  const tenant = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, properties(name)")
        .eq("id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const history = useQuery({
    queryKey: ["tenant-history", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_status_view")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("period", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (tenant.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!tenant.data) return <p className="surface p-6 text-sm">Locataire introuvable.</p>;

  const t = tenant.data;
  const current = history.data?.[0];
  const status = current?.status ?? "upcoming";

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <h1 className="text-xl font-bold uppercase">{t.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {(t.properties as { name: string } | null)?.name ?? "Sans logement"} · {t.phone}
        </p>
        <p className="mt-3 text-2xl font-bold">{fcfa(t.rent_amount)}</p>
        <p className="text-sm text-muted-foreground">
          Échéance : le {t.due_day} du mois · Entrée : {shortDate(t.move_in_date)}
        </p>
        <p className="mt-2 text-sm font-semibold">
          {STATUS_DOT[status]} {STATUS_LABEL[status]}
        </p>
        <div className="mt-4">
          <WhatsAppButton
            phone={t.phone}
            name={t.full_name}
            amount={Number(current?.balance ?? t.rent_amount)}
            date={current?.due_date ?? new Date().toISOString()}
            variant="default"
            label
            onOpen={(kind) => logActivity("whatsapp_opened", { tenant: t.id, kind })}
          />
        </div>

      </div>

      <div className="surface p-5">
        <h2 className="text-base font-semibold">Historique</h2>
        {history.isLoading ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : history.data && history.data.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {history.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold uppercase">{monthLabel(r.period!)}</p>
                  <p className="text-xs text-muted-foreground">
                    Payé {fcfa(r.paid_amount)} · reste {fcfa(r.balance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fcfa(r.amount_due)}</p>
                  <p className="text-xs">
                    {STATUS_DOT[r.status ?? ""]} {STATUS_LABEL[r.status ?? ""]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun loyer enregistré. Générez les loyers du mois depuis le tableau de bord.
          </p>
        )}
      </div>
    </div>
  );
}
