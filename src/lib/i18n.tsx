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
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
const STORAGE_KEY = "loyeralert.lang";

type Dict = Record<string, string>;

const fr: Dict = {
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
};

const pt: Dict = {
  "brand.tagline": "África Ocidental · FCFA",
  "nav.home": "Início",
  "nav.properties": "Imóveis",
  "nav.tenants": "Inquilinos",
  "nav.payments": "Pagamentos",
  "nav.subscription": "Assinatura",
  "nav.profile": "Perfil",
  "nav.admin": "Admin",
  "nav.support": "Suporte",
  "nav.signout": "Sair",
  "nav.myspace": "Minha área",
  "nav.signin": "Entrar",
  "lang.label": "Idioma",

  "landing.h1": "Quem pagou o aluguel? Quem está atrasado?",
  "landing.sub":
    "O LoyerAlert acompanha os seus imóveis, inquilinos e aluguéis. Registe pagamentos, veja atrasos e cobre pelo WhatsApp num clique.",
  "landing.cta": "Testar grátis por 30 dias",
  "landing.f1.t": "Imóveis e inquilinos",
  "landing.f1.d": "Quartos, estúdios, vilas: tudo organizado de forma simples.",
  "landing.f2.t": "Pagamentos parciais",
  "landing.f2.d": "Registe um sinal e o saldo é calculado automaticamente.",
  "landing.f3.t": "Cobrança por WhatsApp",
  "landing.f3.d": "Uma mensagem pronta a enviar e editável.",
  "landing.f4.t": "Os seus dados protegidos",
  "landing.f4.d": "Cada proprietário vê apenas os seus próprios dados.",
  "landing.pricing": "Planos adaptados",
  "landing.perMonth": "/mês",
  "landing.upTo": "Até {n} imóveis",
  "landing.payNote":
    "Pagamento por Orange Money ou Moov Money, validado manualmente pela nossa equipa.",
  "footer.region": "LoyerAlert — África Ocidental",
  "footer.privacy": "Política de privacidade",
  "footer.cookies": "Cookies",

  "auth.signin": "Entrar",
  "auth.signup": "Criar conta",
  "auth.email": "E-mail",
  "auth.password": "Palavra-passe",
  "auth.fullName": "Nome completo",
  "auth.signingIn": "A entrar…",
  "auth.creating": "A criar…",
  "auth.createAccount": "Criar a minha conta",
  "auth.forgot": "Esqueceu a palavra-passe?",
  "auth.consent":
    "Aceito que as minhas informações sejam guardadas para gerir a minha conta, de acordo com a",
  "auth.and": "e a",
  "auth.privacy": "política de privacidade",
  "auth.cookies": "política de cookies",
  "auth.trialNote": "30 dias grátis, sem cartão de crédito.",
  "auth.or": "ou",
  "auth.google": "Continuar com Google",
  "auth.checkEmail":
    "Enviámos um e-mail de confirmação. Clique no link recebido e volte para entrar.",
  "auth.err.credentials": "Não foi possível entrar: e-mail ou palavra-passe incorretos.",
  "auth.err.consent": "Aceite a política de privacidade para criar a sua conta.",
  "auth.ok.verify": "Verifique o seu e-mail para confirmar a conta.",
  "auth.err.google": "Falha ao entrar com o Google. Tente novamente.",
  "auth.err.emailFirst": "Introduza primeiro o seu e-mail.",
  "auth.ok.reset": "Enviámos um link de redefinição.",

  "cookies.title": "Consentimento de cookies",
  "cookies.text":
    "Utilizamos apenas cookies necessários ao funcionamento do LoyerAlert (login, preferências). As suas informações só são recolhidas com o seu consentimento.",
  "cookies.policy": "Política de cookies",
  "cookies.privacy": "Privacidade",
  "cookies.essential": "Apenas essenciais",
  "cookies.accept": "Aceito",

  "sub.pending.t": "🟡 Pagamento em verificação",
  "sub.pending.d": "O seu pagamento será ativado após verificação manual pela nossa equipa.",
  "sub.active.t": "🟢 Assinatura ativa",
  "sub.active.d": "A sua assinatura está ativa até {date}.",
  "sub.trial.t": "🎁 Período grátis",
  "sub.trial.soon": "O seu período grátis expira em {n} dia(s).",
  "sub.trial.left": "Faltam {n} dias.",
  "sub.suspended.t": "🔒 Conta suspensa",
  "sub.suspended.d": "Contacte o administrador para reativar a sua conta.",
  "sub.expired.t": "🔒 Assinatura expirada",
  "sub.expired.d":
    "O seu período grátis de 30 dias terminou. Para continuar a usar o LoyerAlert, escolha um plano.",
  "sub.choose": "Escolher um plano",

  "support.title": "Suporte LoyerAlert",
  "support.sub": "Dúvidas sobre a assinatura, um pagamento ou um erro? Escreva-nos.",
  "support.subject": "Assunto",
  "support.subjectPh": "Ex.: Pedido de pagamento não validado",
  "support.message": "Mensagem",
  "support.messagePh": "Descreva o seu problema (imóvel, inquilino, captura do pagamento…)",
  "support.send": "Enviar ao suporte",
  "support.direct": "Ou escreva diretamente para",
  "support.back": "← Voltar ao início",
};

const es: Dict = {
  "brand.tagline": "África Occidental · FCFA",
  "nav.home": "Inicio",
  "nav.properties": "Viviendas",
  "nav.tenants": "Inquilinos",
  "nav.payments": "Pagos",
  "nav.subscription": "Suscripción",
  "nav.profile": "Perfil",
  "nav.admin": "Admin",
  "nav.support": "Soporte",
  "nav.signout": "Cerrar sesión",
  "nav.myspace": "Mi espacio",
  "nav.signin": "Iniciar sesión",
  "lang.label": "Idioma",

  "landing.h1": "¿Quién pagó el alquiler? ¿Quién va atrasado?",
  "landing.sub":
    "LoyerAlert gestiona tus viviendas, inquilinos y alquileres. Registra pagos, detecta retrasos y reclama por WhatsApp con un clic.",
  "landing.cta": "Probar gratis 30 días",
  "landing.f1.t": "Viviendas e inquilinos",
  "landing.f1.d": "Habitaciones, estudios, villas: todo organizado de forma sencilla.",
  "landing.f2.t": "Pagos parciales",
  "landing.f2.d": "Registra un anticipo y el saldo se calcula automáticamente.",
  "landing.f3.t": "Recordatorio por WhatsApp",
  "landing.f3.d": "Un mensaje listo para enviar y editable a tu gusto.",
  "landing.f4.t": "Tus datos protegidos",
  "landing.f4.d": "Cada propietario solo ve sus propios datos.",
  "landing.pricing": "Tarifas a tu medida",
  "landing.perMonth": "/mes",
  "landing.upTo": "Hasta {n} viviendas",
  "landing.payNote": "Pago con Orange Money o Moov Money, validado manualmente por nuestro equipo.",
  "footer.region": "LoyerAlert — África Occidental",
  "footer.privacy": "Política de privacidad",
  "footer.cookies": "Cookies",

  "auth.signin": "Iniciar sesión",
  "auth.signup": "Crear cuenta",
  "auth.email": "Correo electrónico",
  "auth.password": "Contraseña",
  "auth.fullName": "Nombre completo",
  "auth.signingIn": "Conectando…",
  "auth.creating": "Creando…",
  "auth.createAccount": "Crear mi cuenta",
  "auth.forgot": "¿Olvidaste tu contraseña?",
  "auth.consent": "Acepto que mis datos se guarden para gestionar mi cuenta, conforme a la",
  "auth.and": "y a la",
  "auth.privacy": "política de privacidad",
  "auth.cookies": "política de cookies",
  "auth.trialNote": "30 días de prueba gratis, sin tarjeta.",
  "auth.or": "o",
  "auth.google": "Continuar con Google",
  "auth.checkEmail":
    "Te enviamos un correo de confirmación. Haz clic en el enlace y vuelve a iniciar sesión.",
  "auth.err.credentials": "No se pudo iniciar sesión: correo o contraseña incorrectos.",
  "auth.err.consent": "Acepta la política de privacidad para crear tu cuenta.",
  "auth.ok.verify": "Revisa tu correo para confirmar tu cuenta.",
  "auth.err.google": "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
  "auth.err.emailFirst": "Introduce primero tu correo.",
  "auth.ok.reset": "Te enviamos un enlace de restablecimiento.",

  "cookies.title": "Consentimiento de cookies",
  "cookies.text":
    "Solo usamos cookies necesarias para el funcionamiento de LoyerAlert (sesión, preferencias). Tus datos se recogen únicamente con tu consentimiento.",
  "cookies.policy": "Política de cookies",
  "cookies.privacy": "Privacidad",
  "cookies.essential": "Solo esenciales",
  "cookies.accept": "Acepto",

  "sub.pending.t": "🟡 Pago en verificación",
  "sub.pending.d": "Tu pago se activará tras la verificación manual de nuestro equipo.",
  "sub.active.t": "🟢 Suscripción activa",
  "sub.active.d": "Tu suscripción está activa hasta el {date}.",
  "sub.trial.t": "🎁 Prueba gratuita",
  "sub.trial.soon": "Tu prueba expira en {n} día(s).",
  "sub.trial.left": "Te quedan {n} días.",
  "sub.suspended.t": "🔒 Cuenta suspendida",
  "sub.suspended.d": "Contacta con el administrador para reactivar tu cuenta.",
  "sub.expired.t": "🔒 Suscripción expirada",
  "sub.expired.d":
    "Tu periodo gratuito de 30 días terminó. Para seguir usando LoyerAlert, elige una suscripción.",
  "sub.choose": "Elegir un plan",

  "support.title": "Soporte LoyerAlert",
  "support.sub": "¿Dudas sobre tu suscripción, un pago o un error? Escríbenos.",
  "support.subject": "Asunto",
  "support.subjectPh": "Ej.: Solicitud de pago no validada",
  "support.message": "Mensaje",
  "support.messagePh": "Describe tu problema (vivienda, inquilino, captura del pago…)",
  "support.send": "Enviar a soporte",
  "support.direct": "O escribe directamente a",
  "support.back": "← Volver al inicio",
};

const ar: Dict = {
  "brand.tagline": "غرب أفريقيا · فرنك غرب أفريقي",
  "nav.home": "الرئيسية",
  "nav.properties": "المساكن",
  "nav.tenants": "المستأجرون",
  "nav.payments": "المدفوعات",
  "nav.subscription": "الاشتراك",
  "nav.profile": "الملف الشخصي",
  "nav.admin": "الإدارة",
  "nav.support": "الدعم",
  "nav.signout": "تسجيل الخروج",
  "nav.myspace": "مساحتي",
  "nav.signin": "تسجيل الدخول",
  "lang.label": "اللغة",

  "landing.h1": "من دفع الإيجار؟ ومن تأخّر؟",
  "landing.sub":
    "يتابع LoyerAlert مساكنك ومستأجريك وإيجاراتك. سجّل المدفوعات، اكتشف المتأخرات وأرسل تذكيرًا على واتساب بنقرة واحدة.",
  "landing.cta": "جرّب مجانًا 30 يومًا",
  "landing.f1.t": "المساكن والمستأجرون",
  "landing.f1.d": "غرف، استوديوهات، فيلات: كل شيء منظم ببساطة.",
  "landing.f2.t": "المدفوعات الجزئية",
  "landing.f2.d": "سجّل دفعة مقدمة ويُحسب الرصيد تلقائيًا.",
  "landing.f3.t": "تذكير عبر واتساب",
  "landing.f3.d": "رسالة جاهزة للإرسال وقابلة للتعديل.",
  "landing.f4.t": "بياناتك محمية",
  "landing.f4.d": "كل مالك يرى بياناته الخاصة فقط.",
  "landing.pricing": "أسعار مناسبة",
  "landing.perMonth": "/شهريًا",
  "landing.upTo": "حتى {n} مسكنًا",
  "landing.payNote": "الدفع عبر Orange Money أو Moov Money، بتحقق يدوي من فريقنا.",
  "footer.region": "LoyerAlert — غرب أفريقيا",
  "footer.privacy": "سياسة الخصوصية",
  "footer.cookies": "ملفات تعريف الارتباط",

  "auth.signin": "تسجيل الدخول",
  "auth.signup": "إنشاء حساب",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.fullName": "الاسم الكامل",
  "auth.signingIn": "جارٍ الدخول…",
  "auth.creating": "جارٍ الإنشاء…",
  "auth.createAccount": "إنشاء حسابي",
  "auth.forgot": "هل نسيت كلمة المرور؟",
  "auth.consent": "أوافق على تخزين معلوماتي لإدارة حسابي وفقًا لـ",
  "auth.and": "و",
  "auth.privacy": "سياسة الخصوصية",
  "auth.cookies": "سياسة ملفات تعريف الارتباط",
  "auth.trialNote": "30 يومًا تجربة مجانية، دون بطاقة بنكية.",
  "auth.or": "أو",
  "auth.google": "المتابعة بحساب Google",
  "auth.checkEmail": "أُرسل إليك بريد تأكيد. انقر على الرابط ثم عد لتسجيل الدخول.",
  "auth.err.credentials": "تعذّر الدخول: البريد أو كلمة المرور غير صحيحة.",
  "auth.err.consent": "يرجى قبول سياسة الخصوصية لإنشاء حسابك.",
  "auth.ok.verify": "تحقق من بريدك لتأكيد حسابك.",
  "auth.err.google": "تعذّر الدخول عبر Google. حاول مرة أخرى.",
  "auth.err.emailFirst": "أدخل بريدك الإلكتروني أولًا.",
  "auth.ok.reset": "تم إرسال رابط إعادة التعيين.",

  "cookies.title": "الموافقة على ملفات تعريف الارتباط",
  "cookies.text":
    "نستخدم فقط ملفات تعريف الارتباط اللازمة لعمل LoyerAlert (الدخول، التفضيلات). لا تُجمع معلوماتك إلا بموافقتك.",
  "cookies.policy": "سياسة ملفات تعريف الارتباط",
  "cookies.privacy": "الخصوصية",
  "cookies.essential": "الضرورية فقط",
  "cookies.accept": "أوافق",

  "sub.pending.t": "🟡 الدفع قيد التحقق",
  "sub.pending.d": "سيتم تنشيط دفعتك بعد التحقق اليدوي من فريقنا.",
  "sub.active.t": "🟢 الاشتراك نشط",
  "sub.active.d": "اشتراكك نشط حتى {date}.",
  "sub.trial.t": "🎁 تجربة مجانية",
  "sub.trial.soon": "تنتهي تجربتك بعد {n} يوم/أيام.",
  "sub.trial.left": "بقي لك {n} يومًا.",
  "sub.suspended.t": "🔒 الحساب موقوف",
  "sub.suspended.d": "اتصل بالمسؤول لإعادة تنشيط حسابك.",
  "sub.expired.t": "🔒 انتهى الاشتراك",
  "sub.expired.d": "انتهت فترتك المجانية (30 يومًا). لمتابعة استخدام LoyerAlert اختر اشتراكًا.",
  "sub.choose": "اختيار اشتراك",

  "support.title": "دعم LoyerAlert",
  "support.sub": "سؤال عن اشتراكك أو دفعة أو خلل؟ اكتب إلينا.",
  "support.subject": "الموضوع",
  "support.subjectPh": "مثال: طلب دفع غير مُعتمد",
  "support.message": "الرسالة",
  "support.messagePh": "اشرح مشكلتك (مسكن، مستأجر، صورة الدفع…)",
  "support.send": "إرسال إلى الدعم",
  "support.direct": "أو اكتب مباشرة إلى",
  "support.back": "← العودة إلى الرئيسية",
  "app.home": "الرئيسية",
  "app.properties": "العقارات",
  "app.tenants": "المستأجرون",
  "app.payments": "المدفوعات",
  "app.subscription": "الاشتراك",
  "app.profile": "الملف الشخصي",
  "app.settings": "الإعدادات",
  "app.support": "الدعم",
  "app.signout": "تسجيل الخروج",
  "app.more": "المزيد",
  "app.notifications": "الإشعارات",
};

const DICTS: Record<Lang, Dict> = { fr, en, pt, es, ar };

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

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

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
