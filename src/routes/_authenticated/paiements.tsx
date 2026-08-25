import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fcfa, monthLabel, shortDate, STATUS_DOT, STATUS_LABEL } from "@/lib/format";
import { buildMessage, kindForStatus, whatsappUrl } from "@/lib/whatsapp";
import { printReceipt } from "@/lib/receipt";

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({
    meta: [
      { title: "Paiements — LoyerAlert" },
      { name: "description", content: "Enregistrez les loyers payés, y compris les paiements partiels, et générez un reçu." },
      { property: "og:title", content: "Paiements — LoyerAlert" },
      { property: "og:description", content: "Loyers du mois, retards et reçus de paiement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Payments,
});

type Rent = {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  property_name: string | null;
  period: string;
  amount_due: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  status: string;
};

function Payments() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Rent | null>(null);
  const [form, setForm] = useState({ amount: "", paid_at: new Date().toISOString().slice(0, 10), method: "", note: "" });

  const rents = useQuery({
    queryKey: ["rents", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_status_view")
        .select("*")
        .order("due_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Rent[];
    },
    retry: 2,
  });

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      return p;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Aucun loyer sélectionné");
      const amount = Number(form.amount);
      if (!amount || amount <= 0) throw new Error("Montant invalide");
      const { data, error } = await supabase
        .from("rent_payments")
        .insert({
          rent_record_id: target.id,
          amount,
          paid_at: form.paid_at,
          method: form.method || null,
          note: form.note || null,
        })
        .select("reference")
        .single();
      if (error) throw error;
      return { amount, reference: data.reference };
    },
    onSuccess: ({ amount, reference }) => {
      logActivity("payment_recorded", { rent_record_id: target?.id, amount });
      const t = target!;
      toast.success("Paiement enregistré.");
      setTarget(null);
      setForm({ amount: "", paid_at: new Date().toISOString().slice(0, 10), method: "", note: "" });
      void queryClient.invalidateQueries({ queryKey: ["rents"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-history"] });
      printReceipt({
        owner: profile.data?.full_name ?? profile.data?.email ?? "Propriétaire",
        tenant: t.tenant_name ?? "",
        property: t.property_name ?? "—",
        amount,
        paidAt: form.paid_at,
        period: t.period,
        reference,
        balance: Math.max(0, Number(t.balance) - amount),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rents.data ?? [];
  const late = rows.filter((r) => r.status === "overdue" || r.status === "partially_paid");
  const others = rows.filter((r) => !late.includes(r));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Paiements</h1>

      {rents.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="surface p-6 text-center text-sm text-muted-foreground">
          Aucun loyer. Générez les loyers du mois depuis le tableau de bord.
        </p>
      ) : (
        <>
          {late.length > 0 ? (
            <Section title="🔴 À relancer" rows={late} onPay={setTarget} />
          ) : null}
          <Section title="Tous les loyers" rows={others} onPay={setTarget} />
        </>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {target ? (
            <form
              className="stagger space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                pay.mutate();
              }}
            >
              <p className="text-sm text-muted-foreground">
                {target.tenant_name} · {monthLabel(target.period)} · reste {fcfa(target.balance)}
              </p>
              <div className="space-y-1.5">
                <Label>Montant (FCFA)</Label>
                <Input
                  type="number"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  required
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Moyen de paiement (facultatif)</Label>
                <Input
                  placeholder="Espèces, Orange Money…"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Note (facultatif)</Label>
                <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={pay.isPending}>
                {pay.isPending ? "Enregistrement…" : "Enregistrer et générer le reçu"}
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  rows,
  onPay,
}: {
  title: string;
  rows: Rent[];
  onPay: (r: Rent) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="surface p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-semibold uppercase">{r.tenant_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.property_name ?? "—"} · {monthLabel(r.period)} · échéance {shortDate(r.due_date)}
              </p>
              <p className="mt-1 text-xs">
                {STATUS_DOT[r.status]} {STATUS_LABEL[r.status]} — payé {fcfa(r.paid_amount)} / {fcfa(r.amount_due)}
              </p>
            </div>
            <div className="flex gap-2">
              {r.tenant_phone ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(
                      whatsappUrl(
                        r.tenant_phone!,
                        buildMessage(kindForStatus(r.status), {
                          nom: r.tenant_name ?? "",
                          montant: Number(r.balance),
                          date: r.due_date,
                        }),
                      ),
                      "_blank",
                      "noopener",
                    )
                  }
                >
                  <MessageCircle className="size-4" />
                </Button>
              ) : null}
              {r.status !== "paid" ? (
                <Button size="sm" onClick={() => onPay(r)}>
                  Encaisser
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
