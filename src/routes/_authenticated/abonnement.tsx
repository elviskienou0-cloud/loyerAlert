import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, useAccount } from "@/hooks/useAccount";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fcfa, PAYMENT_NUMBERS, PLANS, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/abonnement")({
  head: () => ({
    meta: [
      { title: "Abonnement — LoyerAlert" },
      { name: "description", content: "Choisissez votre formule et payez par Orange Money ou Moov Money." },
      { property: "og:title", content: "Abonnement — LoyerAlert" },
      { property: "og:description", content: "Formules Starter, Pro et Business en FCFA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Subscription,
});

const MAX_SIZE = 3 * 1024 * 1024;
const MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function Subscription() {
  const queryClient = useQueryClient();
  const { data: account, isLoading } = useAccount();
  const [plan, setPlan] = useState<string>("starter");
  const [method, setMethod] = useState<"orange_money" | "moov_money" | "saspay">("saspay");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);


  const requests = useQuery({
    queryKey: ["payment-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const chosen = PLANS.find((p) => p.id === plan);
      if (!chosen || chosen.price === 0) throw new Error("Choisissez une formule payante.");
      if (!file) throw new Error("La capture d'écran est obligatoire.");
      if (!MIME.includes(file.type)) throw new Error("Format accepté : JPG, PNG ou WebP.");
      if (file.size > MAX_SIZE) throw new Error("Image trop lourde (3 Mo maximum).");
      if (method !== "saspay" && senderPhone.replace(/\D/g, "").length < 8)
        throw new Error("Numéro de paiement invalide.");


      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${auth.user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) throw up.error;

      const { error } = await supabase.from("payment_requests").insert({
        plan: chosen.id,
        amount: chosen.price,
        payment_method: method,
        sender_phone: senderPhone.trim(),
        transaction_reference: reference.trim() || null,
        screenshot_path: path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée. Elle sera vérifiée manuellement.");
      logActivity("subscription_requested", { plan });
      setFile(null);
      setReference("");
      setSenderPhone("");
      void queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !account) return <Skeleton className="h-40 w-full" />;

  const chosen = PLANS.find((p) => p.id === plan)!;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Abonnement</h1>
      <SubscriptionBanner account={account} />
      {account.last_rejection && !account.pending_request ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Dernière demande refusée : {account.last_rejection}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.id)}
            className={cn(
              "surface p-4 text-left transition-colors",
              plan === p.id && "border-primary ring-2 ring-primary/30",
            )}
          >
            <p className="font-display font-semibold">{p.name}</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {p.price === 0 ? "0 FCFA" : fcfa(p.price)}
            </p>
            <p className="text-xs text-muted-foreground">Jusqu'à {p.limit} logements</p>
          </button>
        ))}
      </div>

      {account.pending_request ? null : (
        <form
          className="surface space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div>
            <p className="font-semibold">Payer {fcfa(chosen.price)} pour la formule {chosen.name}</p>
            <p className="text-sm text-muted-foreground">
              Effectuez le transfert, puis envoyez la preuve. L'activation est faite manuellement par
              notre équipe.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(PAYMENT_NUMBERS) as (keyof typeof PAYMENT_NUMBERS)[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMethod(k)}
                className={cn(
                  "rounded-xl border border-border p-4 text-left",
                  method === k && "border-primary ring-2 ring-primary/30",
                )}
              >
                <p className="font-semibold">{PAYMENT_NUMBERS[k].label}</p>
                <p className="text-lg font-bold tracking-wider">{PAYMENT_NUMBERS[k].number}</p>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Numéro ayant effectué le paiement</Label>
            <Input required value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Référence de transaction (facultatif)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Capture d'écran du paiement (obligatoire)</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — 3 Mo maximum.</p>
          </div>
          <Button type="submit" className="w-full" disabled={submit.isPending}>
            {submit.isPending ? "Envoi…" : "Envoyer ma preuve de paiement"}
          </Button>
        </form>
      )}

      <div className="surface p-5">
        <p className="font-semibold">Mes demandes</p>
        <ul className="mt-2 divide-y divide-border text-sm">
          {(requests.data ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span>
                {r.plan} · {fcfa(r.amount)} · {shortDate(r.created_at)}
              </span>
              <span className="font-medium">
                {r.status === "pending" ? "🟡 En attente" : r.status === "approved" ? "🟢 Approuvée" : "🔴 Refusée"}
              </span>
            </li>
          ))}
          {(requests.data ?? []).length === 0 ? (
            <li className="py-2 text-muted-foreground">Aucune demande.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
