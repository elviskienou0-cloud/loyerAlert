import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type AuthMode = "login" | "register";

function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("login");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const redirectingRef = useRef(false);

  /*
   * ============================================================
   * REDIRECTION APRÈS AUTHENTIFICATION
   * ============================================================
   *
   * IMPORTANT :
   * On ne vérifie plus les rôles ici.
   *
   * Le rôle et l'abonnement sont gérés par :
   *
   * src/routes/_authenticated/route.tsx
   *
   * Cela évite d'avoir deux systèmes de contrôle différents.
   */
  const redirectAfterLogin = useCallback(async () => {
    if (redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;

    try {
      await navigate({
        to: "/dashboard",
        replace: true,
      });
    } catch (err) {
      console.error("[Auth] Erreur de redirection :", err);

      redirectingRef.current = false;

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'accéder à votre espace.",
      );
    }
  }, [navigate]);

  /*
   * ============================================================
   * SESSION EXISTANTE
   * ============================================================
   *
   * Si l'utilisateur est déjà connecté et revient sur /auth,
   * on laisse le routeur authentifié déterminer son espace.
   */
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          console.error("[Auth] Erreur session :", sessionError);
          return;
        }

        if (!data.session?.user) {
          return;
        }

        if (redirectingRef.current) {
          return;
        }

        await redirectAfterLogin();
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error("[Auth] Erreur vérification session :", err);

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de vérifier votre session.",
        );
      }
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [redirectAfterLogin]);

  /*
   * ============================================================
   * CONNEXION
   * ============================================================
   */
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading || redirectingRef.current) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.session || !data.user) {
        setError(
          "Connexion impossible. Aucune session utilisateur n'a été créée.",
        );
        return;
      }

      /*
       * La connexion Supabase est réussie.
       *
       * On redirige immédiatement vers /dashboard.
       * Le parent _authenticated décide ensuite :
       *
       * - admin       → /admin
       * - utilisateur → dashboard
       * - sans accès  → /abonnement
       */
      await redirectAfterLogin();
    } catch (err) {
      console.error("[Auth] Erreur de connexion :", err);

      redirectingRef.current = false;

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant la connexion.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * INSCRIPTION
   * ============================================================
   */
  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Veuillez renseigner votre nom complet.");
      return;
    }

    if (!phone.trim()) {
      setError("Veuillez renseigner votre numéro de téléphone.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (loading || redirectingRef.current) {
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      /*
       * Si Supabase exige une confirmation email,
       * aucune session n'est encore disponible.
       */
      if (!data.session) {
        setSuccess(
          "Votre compte a été créé. Vérifiez votre adresse email pour confirmer votre compte.",
        );

        setMode("login");
        setPassword("");
        setConfirmPassword("");

        return;
      }

      /*
       * Session créée directement.
       *
       * Même logique que pour la connexion :
       * le routeur authentifié décide de l'espace.
       */
      if (data.user) {
        await redirectAfterLogin();
      }
    } catch (err) {
      console.error("[Auth] Erreur inscription :", err);

      redirectingRef.current = false;

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant l'inscription.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * CHANGEMENT LOGIN / INSCRIPTION
   * ============================================================
   */
  const switchMode = (nextMode: AuthMode) => {
    if (loading || redirectingRef.current) {
      return;
    }

    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  const isLogin = mode === "login";

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="surface overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              LoyerAlert
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin
                ? "Connectez-vous à votre espace"
                : "Créez votre compte LoyerAlert"}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={loading}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                isLogin
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Se connecter
            </button>

            <button
              type="button"
              onClick={() => switchMode("register")}
              disabled={loading}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                !isLogin
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              S'inscrire
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <form
            onSubmit={isLogin ? handleLogin : handleRegister}
            className="space-y-4"
          >
            {!isLogin ? (
              <>
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Nom complet
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Ex. Dan Kienou"
                    required
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Téléphone
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Ex. +226 XX XX XX XX"
                    required
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Adresse email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@example.com"
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium"
              >
                Mot de passe
              </label>

              <input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
              />
            </div>

            {!isLogin ? (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Confirmer le mot de passe
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? isLogin
                  ? "Connexion..."
                  : "Création du compte..."
                : isLogin
                  ? "Se connecter"
                  : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Vous n'avez pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  disabled={loading}
                  className="font-semibold text-primary hover:underline"
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                Vous avez déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  disabled={loading}
                  className="font-semibold text-primary hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}