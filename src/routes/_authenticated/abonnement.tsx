import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { logActivity, useAccount } from "@/hooks/useAccount";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fcfa, PLANS, shortDate } from "@/lib/format";
import { openSaspayCheckout } from "@/lib/saspay";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/abonnement")({
  head: () => ({
    meta: [
      { title: "Abonnement — LoyerAlert" },
      {
        name: "description",
        content:
          "Renouvelez votre abonnement LoyerAlert et continuez à gérer vos biens sereinement.",
      },
      {
        property: "og:title",
        content: "Abonnement — LoyerAlert",
      },
      {
        property: "og:description",
        content: "Renouvelez votre abonnement LoyerAlert.",
      },
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
  const reduceMotion = useReducedMotion();

  const { data: account, isLoading } = useAccount();

  const [plan, setPlan] = useState<string>("starter");
  const method = "saspay" as const;
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [file, setFile] = useState<File | null>(null);

  const paidPlans = PLANS.filter((p) => p.price > 0);

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

      if (!chosen || chosen.price === 0) {
        throw new Error("Choisissez une formule payante.");
      }

      if (!file) {
        throw new Error("La capture d'écran est obligatoire.");
      }

      if (!MIME.includes(file.type)) {
        throw new Error("Format accepté : JPG, PNG ou WebP.");
      }

      if (file.size > MAX_SIZE) {
        throw new Error("Image trop lourde (3 Mo maximum).");
      }

      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        throw new Error("Non connecté");
      }

      const ext =
        (
          file.name
            .split(".")
            .pop()
            ?.toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 5) || "jpg"
        );

      const unique =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const path = `${auth.user.id}/${Date.now()}-${unique}.${ext}`;

      const up = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (up.error) throw up.error;

      const { error } = await supabase.from("payment_requests").insert({
        plan: chosen.id,
        amount: chosen.price,
        payment_method: "saspay",
        payment_channel: "saspay",
        paid_at: paidAt,
        sender_phone: senderPhone.trim(),
        transaction_reference: reference.trim() || null,
        screenshot_path: path,
      });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success(
        "Demande envoyée. Elle sera vérifiée manuellement.",
      );

      logActivity("subscription_requested", { plan });

      setFile(null);
      setReference("");
      setSenderPhone("");

      void queryClient.invalidateQueries({
        queryKey: ["payment-requests"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["account"],
      });
    },

    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !account) {
    return <Skeleton className="h-40 w-full" />;
  }

  const chosen = PLANS.find((p) => p.id === plan)!;

  const isExpired =
    account.status !== "active" &&
    account.status !== "trial" &&
    account.status !== "suspended";

  const isSuspended = account.status === "suspended";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Écran premium pour abonnement expiré */}
        {isExpired ? (
          <ExpiredSubscriptionHero
            reduceMotion={!!reduceMotion}
            onRenew={() => {
              document
                .getElementById("subscription-plans")
                ?.scrollIntoView({
                  behavior: reduceMotion ? "auto" : "smooth",
                  block: "start",
                });
            }}
          />
        ) : null}

        {/* Compte suspendu */}
        {isSuspended ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            className="mb-6"
          >
            <SubscriptionBanner account={account} />
          </motion.div>
        ) : null}

        {/* Compte actif / essai */}
        {!isExpired && !isSuspended ? (
          <div className="mb-6">
            <SubscriptionBanner account={account} />
          </div>
        ) : null}

        {account.last_rejection && !account.pending_request ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
          >
            Dernière demande refusée : {account.last_rejection}
          </motion.p>
        ) : null}

        <motion.div
          id="subscription-plans"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-6"
        >
          <div className="mb-4">
            <p className="text-sm font-medium text-primary">
              LoyerAlert
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {isExpired
                ? "Renouvelez votre abonnement"
                : "Votre abonnement"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Choisissez la formule adaptée à votre portefeuille immobilier.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {paidPlans.map((p, index) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={reduceMotion ? false : { opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: reduceMotion ? 0 : index * 0.05,
                }}
                whileHover={reduceMotion ? {} : { y: -3, scale: 1.01 }}
                whileTap={reduceMotion ? {} : { scale: 0.99 }}
                className={cn(
                  "surface rounded-2xl p-5 text-left transition-shadow",
                  plan === p.id &&
                    "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10",
                )}
              >
                <p className="font-display font-semibold">{p.name}</p>

                <p className="mt-2 text-xl font-bold text-primary">
                  {p.price === 0 ? "0 FCFA" : fcfa(p.price)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Jusqu'à {p.limit} logements
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {account.pending_request ? null : (
          <motion.form
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="surface space-y-5 rounded-2xl p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div>
              <p className="font-semibold">
                Payer {fcfa(chosen.price)} pour la formule{" "}
                {chosen.name}
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Effectuez le paiement, puis confirmez-le avec une preuve.
                L'activation est faite manuellement par notre équipe
                pour une durée d'un mois calendaire.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">
                  💳
                </div>
                <div>
                  <p className="font-semibold">SasPay</p>
                  <p className="text-sm text-muted-foreground">
                    Paiement par lien sécurisé
                  </p>
                </div>
              </div>
            </div>

            {method === "saspay" ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Étape 1 — Ouvrez le lien de paiement SasPay et réglez{" "}
                  {fcfa(chosen.price)}. Revenez ensuite ici pour confirmer
                  votre paiement avec la capture d'écran.
                </p>

                <Button
                  type="button"
                  className="mt-3 w-full rounded-xl"
                  onClick={() => {
                    if (!openSaspayCheckout(chosen.id)) {
                      toast.error(
                        "Aucun lien SasPay pour cette formule.",
                      );
                      return;
                    }

                    logActivity("saspay_checkout_opened", {
                      plan: chosen.id,
                    });

                    toast.info(
                      "Lien SasPay ouvert. Revenez confirmer votre paiement ensuite.",
                    );
                  }}
                >
                  💳 Payer avec SasPay
                </Button>
              </div>
            ) : null}

            <div className="space-y-4 rounded-2xl border border-border p-4">
              <p className="font-semibold">
                {method === "saspay"
                  ? "Étape 2 — Confirmer mon paiement"
                  : "Confirmer mon paiement"}
              </p>

              <div className="space-y-1.5">
                <Label>Date du paiement</Label>

                <Input
                  type="date"
                  required
                  value={paidAt}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Numéro ayant effectué le paiement (facultatif)
                </Label>

                <Input
                  required={method !== "saspay"}
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Référence SasPay (facultatif)
                </Label>

                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Capture d'écran du paiement (obligatoire)
                </Label>

                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) =>
                    setFile(e.target.files?.[0] ?? null)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou WebP — 3 Mo maximum.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={submit.isPending}
              >
                {submit.isPending
                  ? "Envoi…"
                  : "Confirmer mon paiement"}
              </Button>
            </div>
          </motion.form>
        )}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 15 }}
          animate={reduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 surface rounded-2xl p-5"
        >
          <p className="font-semibold">Mes demandes</p>

          <ul className="mt-2 divide-y divide-border text-sm">
            {(requests.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {r.plan} · {fcfa(r.amount)} ·{" "}
                  {shortDate(r.created_at)}
                </span>

                <span className="font-medium">
                  {r.status === "pending"
                    ? "🟡 En attente"
                    : r.status === "approved"
                      ? "🟢 Approuvée"
                      : "🔴 Refusée"}
                </span>
              </li>
            ))}

            {(requests.data ?? []).length === 0 ? (
              <li className="py-3 text-muted-foreground">
                Aucune demande.
              </li>
            ) : null}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

function ExpiredSubscriptionHero({
  reduceMotion,
  onRenew,
}: {
  reduceMotion: boolean;
  onRenew: () => void;
}) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={reduceMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="relative mb-8 overflow-hidden rounded-[2rem] border border-primary/10 bg-white shadow-[0_24px_80px_-30px_rgba(22,101,52,0.25)]"
    >
      {/* Dégradés subtils */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-green-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-emerald-50/80 blur-3xl" />

        <div className="absolute left-0 top-1/2 h-32 w-full -translate-y-1/2 opacity-30">
          <svg
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <path
              d="M0 100 C240 180 420 15 700 100 C960 180 1170 35 1440 110 L1440 200 L0 200 Z"
              fill="currentColor"
              className="text-green-50"
            />
          </svg>
        </div>
      </div>

      {/* En-tête */}
      <div className="relative flex flex-col gap-4 border-b border-primary/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-sm">
              LA
            </div>

            <div>
              <p className="font-display font-bold leading-none">
                LoyerAlert
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
                Votre patrimoine, notre priorité
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-primary/80">
          Gérez vos biens en toute sérénité
        </p>
      </div>

      {/* Contenu */}
      <div className="relative grid items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-14">
        {/* Illustration */}
        <div className="flex min-h-[280px] items-center justify-center">
          <motion.div
            animate={
              reduceMotion
                ? false
                : {
                    y: [0, -9, 0],
                    rotate: [0, 0.7, 0, -0.5, 0],
                  }
            }
            transition={{
              duration: reduceMotion ? 0 : 5.5,
              repeat: reduceMotion ? 0 : Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <div className="absolute inset-0 scale-75 rounded-full bg-green-300/20 blur-3xl" />

            <div className="relative h-64 w-64 sm:h-72 sm:w-72">
              {/* Calendrier */}
              <div className="absolute left-3 top-10 h-44 w-48 rotate-[-4deg] rounded-3xl border border-green-200 bg-white shadow-[0_20px_50px_-25px_rgba(22,101,52,0.5)]">
                <div className="h-12 rounded-t-3xl bg-primary/10">
                  <div className="flex justify-center gap-8 pt-1">
                    <span className="h-5 w-2 rounded-full bg-primary/40" />
                    <span className="h-5 w-2 rounded-full bg-primary/40" />
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 px-4 py-4">
                  {Array.from({ length: 21 }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "h-3 rounded-full",
                        index === 13
                          ? "bg-primary"
                          : "bg-green-100",
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Horloge */}
              <motion.div
                animate={
                  reduceMotion
                    ? false
                    : {
                        boxShadow: [
                          "0 18px 45px -20px rgba(22,101,52,0.35)",
                          "0 18px 55px -15px rgba(22,101,52,0.55)",
                          "0 18px 45px -20px rgba(22,101,52,0.35)",
                        ],
                      }
                }
                transition={{
                  duration: reduceMotion ? 0 : 3,
                  repeat: reduceMotion ? 0 : Infinity,
                  ease: "easeInOut",
                }}
                className="absolute bottom-0 right-0 flex h-36 w-36 items-center justify-center rounded-full border-8 border-white bg-primary shadow-xl"
              >
                <div className="relative h-24 w-24 rounded-full border border-white/20">
                  <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-full rounded-full bg-white" />
                  <div className="absolute left-1/2 top-1/2 h-1 w-8 -translate-y-1/2 rounded-full bg-white" />
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                </div>
              </motion.div>

              {/* Badge alerte */}
              <motion.div
                animate={
                  reduceMotion
                    ? false
                    : {
                        boxShadow: [
                          "0 0 0 0 rgba(22,101,52,0)",
                          "0 0 0 9px rgba(22,101,52,0.08)",
                          "0 0 0 0 rgba(22,101,52,0)",
                        ],
                      }
                }
                transition={{
                  duration: reduceMotion ? 0 : 2.8,
                  repeat: reduceMotion ? 0 : Infinity,
                  ease: "easeInOut",
                }}
                className="absolute right-0 top-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-200 bg-green-50 text-2xl shadow-lg"
                aria-label="Abonnement expiré"
              >
                !
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Texte */}
        <div className="max-w-xl">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <motion.span
              animate={
                reduceMotion
                  ? false
                  : {
                      boxShadow: [
                        "0 0 0 0 rgba(22,101,52,0)",
                        "0 0 18px 3px rgba(22,101,52,0.12)",
                        "0 0 0 0 rgba(22,101,52,0)",
                      ],
                    }
              }
              transition={{
                duration: reduceMotion ? 0 : 3,
                repeat: reduceMotion ? 0 : Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-primary"
            >
              🔒 Abonnement expiré
            </motion.span>

            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Votre abonnement a atteint son échéance
            </h2>

            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Votre accès aux fonctionnalités de gestion de LoyerAlert est
              actuellement suspendu. Renouvelez votre abonnement pour
              retrouver votre espace de gestion et continuer à suivre vos
              biens, vos locataires et vos paiements.
            </p>

            {/* Sécurité des données */}
            <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/70 p-4">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  ✓
                </div>

                <div>
                  <p className="font-semibold text-foreground">
                    Vos données restent protégées
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    L'expiration de votre abonnement ne supprime pas vos
                    informations. Votre compte, vos biens, vos locataires,
                    vos paiements et vos demandes d'abonnement restent
                    associés à votre compte LoyerAlert. Le renouvellement
                    réactive votre accès selon le traitement de votre
                    demande.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <motion.div
                whileHover={reduceMotion ? {} : { scale: 1.02 }}
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
                className="sm:flex-1"
              >
                <Button
                  type="button"
                  onClick={onRenew}
                  className="h-12 w-full rounded-xl bg-primary px-6 text-sm font-semibold shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/30"
                >
                  Renouveler mon abonnement
                </Button>
              </motion.div>

              <motion.div
                whileHover={reduceMotion ? {} : { scale: 1.02 }}
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
                className="sm:flex-1"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  className="h-12 w-full rounded-xl border-primary/30 bg-white px-6 text-sm font-semibold text-primary hover:bg-green-50"
                >
                  Retour à l'accueil
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function PaymentMethodButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "rounded-2xl border border-border p-4 text-left transition-all",
        selected &&
          "border-primary bg-primary/5 ring-2 ring-primary/20",
      )}
    >
      {children}
    </motion.button>
  );
}