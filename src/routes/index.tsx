import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
ArrowRight,
Building2,
Check,
ChevronDown,
Crown,
Globe2,
Leaf,
MessageCircle,
Receipt,
Rocket,
ShieldCheck,
Smartphone,
WalletCards,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, PLANS } from "@/lib/format";

export const Route = createFileRoute("/")({
head: () => ({
meta: [
{ title: "LoyerAlert — Suivi des loyers en Afrique de l'Ouest" },
{
name: "description",
content:
"Sachez qui a payé son loyer, qui est en retard et relancez vos locataires par WhatsApp. Simple, en FCFA, pensé pour l'Afrique de l'Ouest.",
},
{
property: "og:title",
content: "LoyerAlert — Suivi des loyers en Afrique de l'Ouest",
},
{
property: "og:description",
content:
"Loyers payés, retards et relances WhatsApp en un coup d'œil. Essai gratuit 30 jours.",
},
{ property: "og:type", content: "website" },
{ name: "twitter:card", content: "summary_large_image" },
],
}),
component: Landing,
});

const FEATURES = [
{
icon: Building2,
title: "Logements & locataires",
description:
"Chambres, studios, appartements et villas : tout est organisé simplement.",
},
{
icon: Receipt,
title: "Paiements partiels",
description:
"Enregistrez un acompte et laissez LoyerAlert calculer automatiquement le solde.",
},
{
icon: MessageCircle,
title: "Relance WhatsApp",
description:
"Un message prêt à envoyer à votre locataire, modifiable selon vos besoins.",
},
{
icon: ShieldCheck,
title: "Vos données protégées",
description:
"Chaque propriétaire ne voit que les données de son propre patrimoine.",
},
];

const PLAN_FEATURES: Record<"free" | "starter" | "pro" | "business", string[]> = {
free: [
"Suivi des loyers",
"Gestion des locataires",
"Relances WhatsApp",
"Support par email",
],
starter: [
"Suivi des loyers",
"Gestion des locataires",
"Relances WhatsApp",
"Support par email",
"Rapports mensuels",
],
pro: [
"Tout le Starter +",
"Factures et quittances",
"Statistiques avancées",
"Support prioritaire",
],
business: [
"Tout le Pro +",
"Multi-utilisateurs",
"Accès API",
"Conseil personnalisé",
],
};

const PLAN_ICONS: Record<string, typeof Leaf> = {
free: Leaf,
starter: Rocket,
pro: Crown,
business: Building2,
};

// Plans affichés sur la page : l’offre Gratuit est masquée.
const DISPLAY_PLANS = PLANS.filter((plan) => {
  const id = String(plan.id).toLowerCase();
  const name = String(plan.name).toLowerCase();

  return id !== "free" && !id.includes("gratuit") && !name.includes("gratuit") && !name.includes("free");
});

function getPlanFeatures(id: string, name: string) {
const normalizedId = id.toLowerCase();

if (normalizedId === "free" || normalizedId === "starter" || normalizedId === "pro" || normalizedId === "business") {
return PLAN_FEATURES[normalizedId];
}

const normalizedName = name.toLowerCase();

if (normalizedName.includes("starter")) return PLAN_FEATURES.starter;
if (normalizedName.includes("pro")) return PLAN_FEATURES.pro;
if (normalizedName.includes("business")) return PLAN_FEATURES.business;

return PLAN_FEATURES.starter;
}

function isProPlan(id: string, name: string) {
  return (
    id.toLowerCase() === "pro" ||
    name.toLowerCase().includes("pro")
  );
}

function Landing() {
const [signedIn, setSignedIn] = useState(false);
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
let mounted = true;

void supabase.auth.getSession().then(async ({ data }) => {
  if (!mounted) return;

  setSignedIn(Boolean(data.session));

  if (data.session?.user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);

    if (mounted) {
      setIsAdmin(
        roles?.some(
          (row) => row.role === "admin" || row.role === "super_admin",
        ) ?? false,
      );
    }
  }
});

const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, session) => {
  if (mounted) {
    setSignedIn(Boolean(session));

    if (!session?.user) {
      setIsAdmin(false);
      return;
    }

    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data: roles }) => {
        if (!mounted) return;
        setIsAdmin(
          roles?.some(
            (row) => row.role === "admin" || row.role === "super_admin",
          ) ?? false,
        );
      });
  }
});

return () => {
  mounted = false;
  subscription.unsubscribe();
};

}, []);

return (
<div className="min-h-screen overflow-x-hidden bg-white text-[#063b2d]">
{/* ================================================================ /}
{/ HEADER /}
{/ ================================================================ */}

  <header className="sticky top-0 z-50 border-b border-[#e6f0eb] bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
      <Link to="/" className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#e5f8ee] text-[#16a765]">
          <Building2 className="size-6" strokeWidth={2.5} />
        </div>

        <span className="font-display text-[19px] font-bold tracking-tight text-[#073e30]">
          LOYER<span className="text-[#17a866]">ALERT</span>
        </span>
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        <Link
          to="/"
          className="relative py-6 text-sm font-semibold text-[#07985b]"
        >
          Accueil
          <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#18ae68]" />
        </Link>

        <Link
          to={signedIn ? (isAdmin ? "/admin" : "/dashboard") : "/auth"}
          className="flex items-center gap-2 py-6 text-sm font-medium text-[#34574e] transition-colors hover:text-[#07985b]"
        >
          <span className="grid size-5 place-items-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-[17px]"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          Mon espace
        </Link>
      </nav>

      <div className="hidden items-center gap-2 text-sm font-medium text-[#34574e] sm:flex">
        <Globe2 className="size-[17px]" />
        <span>Afrique de l'Ouest · FCFA</span>
        <ChevronDown className="size-4" />
      </div>

      <Link
        to={signedIn ? (isAdmin ? "/admin" : "/dashboard") : "/auth"}
        className="rounded-full bg-[#12a866] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0d9559] md:hidden"
      >
        {signedIn ? "Mon espace" : "Se connecter"}
      </Link>
    </div>
  </header>

  <main>
    {/* ================================================================ */}
    {/* HERO                                                             */}
    {/* ================================================================ */}

    <section className="relative overflow-hidden bg-[#f2faf6]">
      {/* Formes décoratives */}
      <div className="pointer-events-none absolute -right-28 top-10 size-[430px] rounded-full bg-[#bdeed5]/60 blur-[1px]" />
      <div className="pointer-events-none absolute right-[12%] top-16 size-[180px] rounded-full bg-[#3fc68a]/40" />
      <div className="pointer-events-none absolute -bottom-24 left-[42%] size-[300px] rounded-full bg-[#d8f5e6]" />

      <div className="relative mx-auto grid min-h-[460px] max-w-[1280px] items-center gap-10 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
        {/* Texte */}
        <div className="relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#14975c] shadow-sm ring-1 ring-[#d9eee3]">
            <ShieldCheck className="size-4" />
            Simple · Rapide · Sécurisé
          </div>

          <h1 className="max-w-[650px] font-display text-[42px] font-bold leading-[1.08] tracking-[-0.03em] text-[#073e30] sm:text-5xl lg:text-[56px]">
            Qui a payé son loyer&nbsp;?
            <br />
            Qui est en retard&nbsp;?
          </h1>

          <p className="mt-6 max-w-[570px] text-[16px] leading-7 text-[#56736b]">
            LoyerAlert suit vos logements, vos locataires et vos loyers.
            Enregistrez les paiements, repérez les retards et relancez en
            un clic par WhatsApp.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="inline-flex h-12 items-center gap-3 rounded-full bg-[#12aa66] px-7 text-sm font-bold text-white shadow-[0_8px_25px_rgba(18,170,102,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#0d9658]"
            >
              Essayer gratuitement 30 jours
              <ArrowRight className="size-5" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#45665c]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#11a765]" />
              Simple
            </span>
            <span className="text-[#aac4ba]">•</span>
            <span>Rapide</span>
            <span className="text-[#aac4ba]">•</span>
            <span>Sécurisé</span>
          </div>
        </div>

        {/* Illustration téléphone */}
        <div className="relative flex min-h-[380px] items-center justify-center lg:min-h-[450px]">
          {/* Maison stylisée */}
          <div className="absolute right-0 top-1/2 hidden w-[430px] -translate-y-1/2 md:block">
            <div className="relative overflow-hidden rounded-[30px] border-[7px] border-white bg-[#dcefe5] shadow-[0_25px_60px_rgba(5,70,45,0.12)]">
              <div className="h-[230px] bg-gradient-to-br from-[#eef9f3] via-[#d9f1e4] to-[#b9dfca]" />

              <div className="absolute bottom-0 left-0 right-0 h-[115px] bg-[#82bd91]/70">
                <div className="absolute -left-8 bottom-0 size-28 rounded-full bg-[#63ad78]" />
                <div className="absolute left-20 bottom-0 size-24 rounded-full bg-[#70b981]" />
                <div className="absolute right-14 bottom-0 size-32 rounded-full bg-[#58a96f]" />
              </div>

              <div className="absolute left-20 top-16 h-[130px] w-[270px] rounded-t-[8px] bg-white shadow-lg">
                <div className="absolute -top-12 left-0 h-12 w-full bg-[#f9fcfa] [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
                <div className="absolute inset-x-5 top-10 grid grid-cols-3 gap-3">
                  <div className="h-14 rounded-sm bg-[#b7d9c5]" />
                  <div className="h-14 rounded-sm bg-[#b7d9c5]" />
                  <div className="h-14 rounded-sm bg-[#b7d9c5]" />
                </div>
              </div>
            </div>
          </div>

          {/* Cercle décoratif */}
          <div className="absolute left-1/2 top-1/2 size-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#54c993]/35 md:size-[320px]" />

          {/* Téléphone */}
          <div className="relative z-10 w-[205px] rounded-[34px] border-[7px] border-[#17362e] bg-[#10251f] p-1 shadow-[0_30px_55px_rgba(3,45,33,0.28)] sm:w-[220px]">
            <div className="overflow-hidden rounded-[27px] bg-[#f5fbf7]">
              {/* Notch */}
              <div className="relative flex h-8 items-center justify-center bg-[#075b45]">
                <div className="absolute top-1.5 h-3.5 w-20 rounded-full bg-[#082b23]" />
                <span className="absolute left-4 top-2 text-[7px] font-bold text-white">
                  9:41
                </span>
              </div>

              {/* App header */}
              <div className="bg-[#075b45] px-4 pb-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-4" />
                    <span className="text-[11px] font-bold">
                      LoyerAlert
                    </span>
                  </div>
                  <span className="text-xs">•••</span>
                </div>
              </div>

              {/* Dashboard mockup */}
              <div className="space-y-2.5 px-3 pb-5 pt-3">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-[9px] font-bold text-[#16483b]">
                    Tableau de bord
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-14 place-items-center rounded-full border-[6px] border-[#35bd7e] border-r-[#d8eee2]">
                      <span className="text-[10px] font-bold text-[#16483b]">
                        78%
                      </span>
                    </div>

                    <div>
                      <p className="text-[8px] text-[#769089]">
                        Collectés
                      </p>
                      <p className="text-[11px] font-bold text-[#16483b]">
                        3 900 000 FCFA
                      </p>
                      <p className="text-[7px] text-[#9aada7]">
                        sur 5 000 000 FCFA
                      </p>
                    </div>
                  </div>
                </div>

                {[
                  {
                    icon: Building2,
                    label: "Logements",
                    value: "12",
                  },
                  {
                    icon: WalletCards,
                    label: "Locataires",
                    value: "12",
                  },
                  {
                    icon: MessageCircle,
                    label: "Retards",
                    value: "2",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-[#e9f8ef] text-[#18a969]">
                        <item.icon className="size-3.5" />
                      </span>
                      <span className="text-[8px] font-medium text-[#547068]">
                        {item.label}
                      </span>
                    </div>

                    <span className="text-[9px] font-bold text-[#16483b]">
                      {item.value}
                    </span>
                  </div>
                ))}

                <div className="grid grid-cols-4 gap-1 border-t border-[#e6eee9] pt-3 text-center">
                  <span className="text-[7px] font-bold text-[#12a866]">
                    Accueil
                  </span>
                  <span className="text-[7px] text-[#8da29a]">
                    Logements
                  </span>
                  <span className="text-[7px] text-[#8da29a]">
                    Paiements
                  </span>
                  <span className="text-[7px] text-[#8da29a]">
                    Plus
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp badge */}
          <div className="absolute bottom-8 right-1 z-20 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-[0_15px_35px_rgba(8,75,51,0.15)] sm:right-8">
            <div className="grid size-11 place-items-center rounded-full bg-[#18b96d] text-white">
              <MessageCircle className="size-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-[#123f33]">
                Relance automatique
              </p>
              <p className="text-[10px] font-bold text-[#123f33]">
                par WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ================================================================ */}
    {/* FEATURES                                                         */}
    {/* ================================================================ */}

    <section className="border-b border-[#edf3ef] bg-white">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-11">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;

          return (
            <article
              key={feature.title}
              className="text-center"
            >
              <div className="mx-auto grid size-[58px] place-items-center rounded-[18px] bg-[#e5f8ee] text-[#12a866]">
                <Icon className="size-7" strokeWidth={2} />
              </div>

              <h2 className="mt-4 text-[15px] font-bold text-[#073e30]">
                {feature.title}
              </h2>

              <p className="mx-auto mt-2 max-w-[235px] text-[13px] leading-6 text-[#6b847d]">
                {feature.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>

    {/* ================================================================ */}
    {/* TARIFS                                                           */}
    {/* ================================================================ */}

    <section className="relative overflow-hidden bg-[#f2faf6] px-5 py-14 lg:py-16">
      <div className="pointer-events-none absolute left-0 top-20 h-64 w-64 rounded-full bg-[#d9f4e5]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#e1f7ea]" />

      <div className="relative mx-auto max-w-[1180px]">
        <div className="text-center">
          <div className="inline-flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16a765]">
            <span className="h-px w-12 bg-[#20ad70]" />
            Nos tarifs
            <span className="h-px w-12 bg-[#20ad70]" />
          </div>

          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#073e30] sm:text-[34px]">
            Des tarifs adaptés
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#658078]">
            Commencez gratuitement puis choisissez la formule adaptée à
            la taille de votre patrimoine.
          </p>
        </div>

        <div className="mt-9 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DISPLAY_PLANS.map((plan) => {
            const PlanIcon =
              PLAN_ICONS[plan.id.toLowerCase()] ?? Building2;

            const popular = isProPlan(plan.id, plan.name);
            const features = getPlanFeatures(plan.id, plan.name) ?? PLAN_FEATURES.starter;

            return (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-[20px] border bg-white p-5 shadow-[0_8px_30px_rgba(6,68,46,0.05)] ${
                  popular
                    ? "border-[#16ac68] ring-1 ring-[#16ac68]"
                    : "border-[#e3eee8]"
                }`}
              >
                {popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#15ad68] px-4 py-1 text-[10px] font-bold text-white">
                    Le plus populaire
                  </div>
                ) : null}

                <div className="grid size-11 place-items-center rounded-2xl bg-[#e8f8ef] text-[#12a866]">
                  <PlanIcon className="size-5" />
                </div>

                <h3 className="mt-4 text-xl font-bold text-[#073e30]">
                  {plan.name}
                </h3>

                <div className="mt-2">
                  <span className="font-display text-[30px] font-bold text-[#073e30]">
                    {plan.price === 0
                      ? "0"
                      : fcfa(plan.price).replace(/\sFCFA/i, "")}
                  </span>

                  <span className="ml-1 text-sm text-[#547068]">
                    FCFA/mois
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#6b847d]">
                  Jusqu'à {plan.limit} logements
                </p>

                <div className="my-5 h-px bg-[#edf3ef]" />

                <ul className="flex flex-1 flex-col gap-3">
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-xs leading-5 text-[#4f6c63]"
                    >
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#dff6e9] text-[#10a763]">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>

                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth"
                  className={`mt-6 flex h-10 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    popular
                      ? "bg-[#12aa66] text-white hover:bg-[#0d9658]"
                      : "border border-[#16aa68] bg-white text-[#07985b] hover:bg-[#effaf4]"
                  }`}
                >
                  {plan.price === 0
                    ? "Commencer gratuitement"
                    : `Choisir ${plan.name}`}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>

    {/* ================================================================ */}
    {/* PAIEMENT                                                         */}
    {/* ================================================================ */}

    <section className="bg-white px-5 py-8">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-5 rounded-[20px] bg-[#e4f7ed] px-6 py-5 sm:flex-row sm:px-8">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[#12a866]">
            <Smartphone className="size-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-[#34574e]">
              Paiement par{" "}
              <strong className="text-[#073e30]">
                Orange Money
              </strong>{" "}
              ou{" "}
              <strong className="text-[#073e30]">
                Moov Money
              </strong>
              ,
            </p>

            <p className="text-xs text-[#6b847d]">
              validé manuellement par notre équipe.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#f36b21]">
            <span className="grid size-8 place-items-center rounded-lg bg-white">
              <WalletCards className="size-5" />
            </span>
            Orange Money
          </div>

          <div className="hidden h-9 w-px bg-[#b8deca] sm:block" />

          <div className="text-sm font-bold text-[#1781c5]">
            Moov Money
          </div>
        </div>
      </div>
    </section>
  </main>

  {/* ================================================================ */}
  {/* FOOTER                                                           */}
  {/* ================================================================ */}

  <footer className="relative overflow-hidden bg-[#034d3b] text-white">
    <div className="pointer-events-none absolute -right-20 -bottom-32 size-72 rounded-full bg-[#0a6950]" />
    <div className="pointer-events-none absolute right-20 -bottom-20 size-52 rounded-full bg-[#0b7558]/50" />

    <div className="relative mx-auto max-w-[1180px] px-5 py-10 lg:px-8">
      <div className="grid gap-8 md:grid-cols-[1fr_auto_auto] md:items-start">
        {/* Brand */}
        <div>
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-white/10">
              <Building2 className="size-6" />
            </div>

            <span className="font-display text-xl font-bold">
              LOYER<span className="text-[#62d99b]">ALERT</span>
            </span>
          </Link>

          <p className="mt-2 text-xs text-white/50">
            Afrique de l'Ouest
          </p>

          <p className="mt-6 text-xs text-white/45">
            © {new Date().getFullYear()} LoyerAlert. Tous droits réservés.
          </p>
        </div>

        {/* Liens */}
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
          <Link
            to="/confidentialite"
            className="transition-colors hover:text-white"
          >
            Politique de confidentialité
          </Link>

          <span className="hidden text-white/20 sm:inline">|</span>

          <Link
            to="/cookies"
            className="transition-colors hover:text-white"
          >
            Cookies
          </Link>

          <span className="hidden text-white/20 sm:inline">|</span>

          <Link
            to="/assistance"
            className="transition-colors hover:text-white"
          >
            Assistance
          </Link>
        </nav>

        {/* Région */}
        <div className="flex items-center gap-2 text-xs text-white/65">
          <Globe2 className="size-4" />
          Afrique de l'Ouest · FCFA
          <ChevronDown className="size-3.5" />
        </div>
      </div>
    </div>
  </footer>
</div>

);
}