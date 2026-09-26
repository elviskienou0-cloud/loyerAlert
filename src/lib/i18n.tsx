import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
const STORAGE_KEY = "loyeralert.lang";

type Dict = Record<string, string>;

const fr: Dict = {
  "nav.home": "Accueil",
  "nav.properties": "Logements",
  "nav.tenants": "Locataires",
  "nav.payments": "Paiements",
  "nav.subscription": "Abonnement",
  "nav.profile": "Profil",
  "nav.support": "Assistance",
  "nav.signout": "Se déconnecter",
  "app.hello": "Bonjour",
  "app.search": "Rechercher…",
  "app.more": "Plus",
  "app.moreRequests": "Mes demandes",
  "app.myAccount": "Mon compte",

  "brand.tagline": "Afrique de l'Ouest · FCFA",
  "nav.home": "Accueil",
  "nav.properties": "Logements",
  "nav.tenants": "Locataires",
  "nav.payments": "Paiements",
  "nav.subscription": "Abonnement",
  "nav.profile": "Profil",
  "nav.admin": "Admin",
  "nav.support": "Assistance",
  "nav.signout": "Se déconnecter",
  "nav.myspace": "Mon espace",
  "nav.signin": "Se connecter",
  "lang.label": "Langue",

  "landing.h1": "Qui a payé son loyer ? Qui est en retard ?",
  "landing.sub":
    "LoyerAlert suit vos logements, vos locataires et vos loyers. Enregistrez les paiements, repérez les retards et relancez en un clic par WhatsApp.",
  "landing.cta": "Essayer gratuitement 30 jours",
  "landing.f1.t": "Logements & locataires",
  "landing.f1.d": "Chambres, studios, villas : tout est organisé simplement.",
  "landing.f2.t": "Paiements partiels",
  "landing.f2.d": "Enregistrez un acompte, le solde est calculé automatiquement.",
  "landing.f3.t": "Relance WhatsApp",
  "landing.f3.d": "Un message prêt à envoyer, modifiable à votre goût.",
  "landing.f4.t": "Vos données protégées",
  "landing.f4.d": "Chaque propriétaire ne voit que ses propres données.",
  "landing.pricing": "Des tarifs adaptés",
  "landing.perMonth": "/mois",
  "landing.upTo": "Jusqu'à {n} logements",
  "landing.payNote":
    "Paiement par Orange Money ou Moov Money, validé manuellement par notre équipe.",
  "footer.region": "LoyerAlert — Afrique de l'Ouest",
  "footer.privacy": "Politique de confidentialité",
  "footer.cookies": "Cookies",

  "auth.signin": "Connexion",
  "auth.signup": "Créer un compte",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.fullName": "Nom complet",
  "auth.signingIn": "Connexion…",
  "auth.creating": "Création…",
  "auth.createAccount": "Créer mon compte",
  "auth.forgot": "Mot de passe oublié ?",
  "auth.consent":
    "J'accepte que mes informations soient enregistrées pour gérer mon compte, conformément à la",
  "auth.and": "et à la",
  "auth.privacy": "politique de confidentialité",
  "auth.cookies": "politique de cookies",
  "auth.trialNote": "30 jours d'essai gratuit, sans carte bancaire.",
  "auth.or": "ou",
  "auth.google": "Continuer avec Google",
  "auth.checkEmail":
    "Un e-mail de confirmation vous a été envoyé. Cliquez sur le lien reçu puis revenez vous connecter.",
  "auth.err.credentials": "Connexion impossible : e-mail ou mot de passe incorrect.",
  "auth.err.consent": "Merci d'accepter la politique de confidentialité pour créer votre compte.",
  "auth.ok.verify": "Vérifiez votre e-mail pour confirmer votre compte.",
  "auth.err.google": "Connexion Google impossible. Réessayez.",
  "auth.err.emailFirst": "Saisissez d'abord votre e-mail.",
  "auth.ok.reset": "Un lien de réinitialisation vous a été envoyé.",

  "cookies.title": "Consentement aux cookies",
  "cookies.text":
    "Nous utilisons uniquement des cookies nécessaires au fonctionnement de LoyerAlert (connexion, préférences). Vos informations ne sont collectées qu'avec votre accord.",
  "cookies.policy": "Politique de cookies",
  "cookies.privacy": "Confidentialité",
  "cookies.essential": "Essentiels uniquement",
  "cookies.accept": "J'accepte",

  "sub.pending.t": "🟡 Paiement en cours de vérification",
  "sub.pending.d": "Votre paiement sera activé après vérification manuelle par notre équipe.",
  "sub.active.t": "🟢 Abonnement actif",
  "sub.active.d": "Votre abonnement est actif jusqu'au {date}.",
  "sub.trial.t": "🎁 Essai gratuit",
  "sub.trial.soon": "Votre essai expire dans {n} jour(s).",
  "sub.trial.left": "Il vous reste {n} jours.",
  "sub.suspended.t": "🔒 Compte suspendu",
  "sub.suspended.d": "Contactez l'administrateur pour réactiver votre compte.",
  "sub.expired.t": "🔒 Abonnement expiré",
  "sub.expired.d":
    "Votre période gratuite de 30 jours est terminée. Pour continuer à utiliser LoyerAlert, choisissez un abonnement.",
  "sub.choose": "Choisir un abonnement",

  "support.title": "Assistance LoyerAlert",
  "support.sub": "Une question sur votre abonnement, un paiement ou un bug ? Écrivez-nous.",
  "support.subject": "Sujet",
  "support.subjectPh": "Ex : Demande de paiement non validée",
  "support.message": "Message",
  "support.messagePh":
    "Décrivez votre problème (logement, locataire, capture d'écran de paiement…)",
  "support.send": "Envoyer à l'assistance",
  "support.direct": "Ou écrivez directement à",
  "support.back": "← Retour à l'accueil",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.properties": "Properties",
  "nav.tenants": "Tenants",
  "nav.payments": "Payments",
  "nav.subscription": "Subscription",
  "nav.profile": "Profile",
  "nav.support": "Support",
  "nav.signout": "Sign out",
  "app.hello": "Hello",
  "app.search": "Search…",
  "app.more": "More",
  "app.moreRequests": "My requests",
  "app.myAccount": "My account",

  "brand.tagline": "West Africa · FCFA",
  "nav.home": "Home",
  "nav.properties": "Properties",
  "nav.tenants": "Tenants",
  "nav.payments": "Payments",
  "nav.subscription": "Subscription",
  "nav.profile": "Profile",
  "nav.admin": "Admin",
  "nav.support": "Support",
  "nav.signout": "Sign out",
  "nav.myspace": "My dashboard",
  "nav.signin": "Sign in",
  "lang.label": "Language",

  "landing.h1": "Who paid their rent? Who is late?",
  "landing.sub":
    "LoyerAlert tracks your properties, tenants and rents. Record payments, spot late payers and follow up on WhatsApp in one click.",
  "landing.cta": "Try free for 30 days",
  "landing.f1.t": "Properties & tenants",
  "landing.f1.d": "Rooms, studios, villas: everything neatly organised.",
  "landing.f2.t": "Partial payments",
  "landing.f2.d": "Record a deposit, the balance is computed automatically.",
  "landing.f3.t": "WhatsApp reminders",
  "landing.f3.d": "A ready-to-send message you can edit as you like.",
  "landing.f4.t": "Your data protected",
  "landing.f4.d": "Every landlord only sees their own data.",
  "landing.pricing": "Pricing that fits",
  "landing.perMonth": "/month",
  "landing.upTo": "Up to {n} properties",
  "landing.payNote": "Pay with Orange Money or Moov Money, manually validated by our team.",
  "footer.region": "LoyerAlert — West Africa",
  "footer.privacy": "Privacy policy",
  "footer.cookies": "Cookies",

  "auth.signin": "Sign in",
  "auth.signup": "Create account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.fullName": "Full name",
  "auth.signingIn": "Signing in…",
  "auth.creating": "Creating…",
  "auth.createAccount": "Create my account",
  "auth.forgot": "Forgot your password?",
  "auth.consent":
    "I agree that my information is stored to manage my account, in accordance with the",
  "auth.and": "and the",
  "auth.privacy": "privacy policy",
  "auth.cookies": "cookie policy",
  "auth.trialNote": "30-day free trial, no credit card.",
  "auth.or": "or",
  "auth.google": "Continue with Google",
  "auth.checkEmail":
    "A confirmation email has been sent. Click the link you received, then come back to sign in.",
  "auth.err.credentials": "Sign-in failed: wrong email or password.",
  "auth.err.consent": "Please accept the privacy policy to create your account.",
  "auth.ok.verify": "Check your email to confirm your account.",
  "auth.err.google": "Google sign-in failed. Please try again.",
  "auth.err.emailFirst": "Enter your email first.",
  "auth.ok.reset": "A reset link has been sent to you.",

  "cookies.title": "Cookie consent",
  "cookies.text":
    "We only use cookies required for LoyerAlert to work (sign-in, preferences). Your information is collected only with your consent.",
  "cookies.policy": "Cookie policy",
  "cookies.privacy": "Privacy",
  "cookies.essential": "Essential only",
  "cookies.accept": "I accept",

  "sub.pending.t": "🟡 Payment under review",
  "sub.pending.d": "Your payment will be activated after manual review by our team.",
  "sub.active.t": "🟢 Subscription active",
  "sub.active.d": "Your subscription is active until {date}.",
  "sub.trial.t": "🎁 Free trial",
  "sub.trial.soon": "Your trial expires in {n} day(s).",
  "sub.trial.left": "You have {n} days left.",
  "sub.suspended.t": "🔒 Account suspended",
  "sub.suspended.d": "Contact the administrator to reactivate your account.",
  "sub.expired.t": "🔒 Subscription expired",
  "sub.expired.d":
    "Your 30-day free period has ended. To keep using LoyerAlert, choose a subscription.",
  "sub.choose": "Choose a plan",

  "support.title": "LoyerAlert support",
  "support.sub": "A question about your subscription, a payment or a bug? Write to us.",
  "support.subject": "Subject",
  "support.subjectPh": "E.g. Payment request not validated",
  "support.message": "Message",
  "support.messagePh": "Describe your issue (property, tenant, payment screenshot…)",
  "support.send": "Send to support",
  "support.direct": "Or write directly to",
  "support.back": "← Back to home",
  "app.home": "Home",
  "app.properties": "Properties",
  "app.tenants": "Tenants",
  "app.payments": "Payments",
  "app.subscription": "Subscription",
  "app.profile": "Profile",
  "app.settings": "Settings",
  "app.support": "Support",
  "app.signout": "Sign out",
  "app.more": "More",
  "app.notifications": "Notifications",
};


const DICTS: Record<Lang, Dict> = { fr, en };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<Ctx | null>(null);

function isLang(v: string | null): v is Lang {
  return !!v && LANGS.some((l) => l.code === v);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLang(stored)) {
        setLangState(stored);
        return;
      }
      const nav = window.navigator.language?.slice(0, 2);
      if (isLang(nav ?? null)) setLangState(nav as Lang);
    } catch {
      /* ignore */
    }
  }, []);

  const dir: "ltr" = "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = DICTS[lang][key] ?? DICTS["fr"][key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, setLang, t, dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
