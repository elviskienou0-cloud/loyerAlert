import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fcfa, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — LoyerAlert" },
      { name: "description", content: "Espace administrateur : utilisateurs, abonnements et validation des paiements." },
      { property: "og:title", content: "Administration — LoyerAlert" },
      { property: "og:description", content: "Validation manuelle des paiements LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data: account, isLoading } = useAccount();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!account?.is_admin) {
    return (
      <div className="surface p-6">
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet espace est réservé aux administrateurs.
        </p>
      </div>
    );
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as {
        users: number;
        properties: number;
        active_subs: number;
        pending_payments: number;
        revenue: number;
      };
    },
  });

  const users = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users", { p_search: search });
      if (error) throw error;
      return data ?? [];
    },
  });

  const requests = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async (v: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase.rpc("review_payment_request", {
        p_request_id: v.id,
        p_approve: v.approve,
        p_reason: v.reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande traitée.");
      void queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspend = useMutation({
    mutationFn: async (v: { id: string; suspended: boolean }) => {
      const { error } = await supabase.rpc("admin_set_suspended", {
        p_user_id: v.id,
        p_suspended: v.suspended,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte mis à jour.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openProof(path: string) {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 120);
    if (error || !data) {
      toast.error("Capture indisponible.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const s = stats.data;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">LOYERALERT ADMIN</h1>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card label="Utilisateurs" value={s?.users ?? 0} />
        <Card label="Logements suivis" value={s?.properties ?? 0} />
        <Card label="Abonnements actifs" value={s?.active_subs ?? 0} />
        <Card label="Paiements en attente" value={s?.pending_payments ?? 0} />
        <Card label="Revenus" value={fcfa(s?.revenue ?? 0)} />
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-3">
          {requests.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            (requests.data ?? []).map((r) => {
              const p = r.profiles as { full_name: string | null; email: string | null } | null;
              return (
                <div key={r.id} className="surface space-y-2 p-4 text-sm">
                  <p className="font-semibold">
                    {p?.full_name ?? p?.email ?? r.user_id} · {r.plan} · {fcfa(r.amount)}
                  </p>
                  <p className="text-muted-foreground">
                    {r.payment_method === "orange_money" ? "Orange Money" : "Moov Money"} · {r.sender_phone} ·
                    réf. {r.transaction_reference ?? "—"} · {shortDate(r.created_at)}
                  </p>
                  <p>
                    Statut :{" "}
                    {r.status === "pending"
                      ? "🟡 En attente"
                      : r.status === "approved"
                        ? "🟢 Approuvé"
                        : `🔴 Refusé (${r.rejection_reason ?? ""})`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void openProof(r.screenshot_path)}>
                      Voir la capture
                    </Button>
                    {r.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => review.mutate({ id: r.id, approve: true })}>
                          APPROUVER
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const reason = window.prompt("Raison du refus (obligatoire)");
                            if (!reason || !reason.trim()) {
                              toast.error("Une raison est obligatoire.");
                              return;
                            }
                            review.mutate({ id: r.id, approve: false, reason });
                          }}
                        >
                          REFUSER
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-3">
          <Input
            placeholder="Rechercher par nom ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {users.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            (users.data ?? []).map((u) => (
              <div key={u.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-semibold">{u.full_name ?? u.email}</p>
                  <p className="text-muted-foreground">
                    {u.email} · {u.plan} · {u.status} · {u.properties} logements
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={u.suspended ? "outline" : "destructive"}
                  onClick={() => suspend.mutate({ id: u.id, suspended: !u.suspended })}
                >
                  {u.suspended ? "Réactiver" : "Suspendre"}
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-4">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
