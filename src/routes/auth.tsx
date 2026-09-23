import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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

  // Empêche plusieurs redirections simultanées.
  const redirectingRef = useRef(false);

  /*
   * ============================================================
   * REDIRECTION SELON LE RÔLE
   *
   * admin / super_admin → /admin
   * user                 → /dashboard
   *
   * Aucune erreur de rôle ne doit être transformée
   * automatiquement en utilisateur normal.
   * ============================================================
   */
  const redirectAfterLogin = async (userId: string) => {
    if (redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;

    console.log("[Auth] Vérification du rôle :", userId);

    try {
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      console.log("[Auth] Rôles :", roles);
      console.log("[Auth] Erreur rôle :", roleError);

      /*
       * IMPORTANT :
       * Si la requête des rôles échoue, on ne redirige nulle part.
       */
      if (roleError) {
        console.error(
          "[Auth] Impossible de récupérer le rôle :",
          roleError,
        );

        redirectingRef.current = false;

        setError(
          "Impossible de déterminer les droits de votre compte. Veuillez réessayer.",
        );

        return;
      }

      const validRoles = roles ?? [];

      /*
       * ============================================================
       * ADMIN / SUPER ADMIN
       * ============================================================
       */

      const isAdmin = validRoles.some(
        (row) =>
          row.role === "admin" ||
          row.role === "super_admin",
      );

      if (isAdmin) {
        console.log("[Auth] ADMIN → /admin");

        await navigate({
          to: "/admin",
          replace: true,
        });

        return;
      }

      /*
       * ============================================================
       * UTILISATEUR NORMAL
       * ============================================================
       */

      const isUser = validRoles.some(
        (row) => row.role === "user",
      );

      if (!isUser) {
        console.error(
          "[Auth] Rôle inconnu ou non autorisé :",
          validRoles,
        );

        redirectingRef.current = false;

        setError(
          "Votre compte ne possède pas un rôle valide. Contactez l'administrateur.",
        );

        return;
      }

      console.log("[Auth] UTILISATEUR → /dashboard");

      await navigate({
        to: "/dashboard",
        replace: true,
      });
    } catch (err) {
      console.error(
        "[Auth] Erreur pendant la redirection :",
        err,
      );

      redirectingRef.current = false;

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de déterminer l'espace de votre compte.",
      );
    }
  };

  /*
   * ============================================================
   * SESSION EXISTANTE
   * ============================================================
   *
   * Si l'utilisateur arrive déjà connecté sur /auth,
   * on l'envoie directement dans son espace.
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (sessionError) {
        console.error(
          "[Auth] Erreur session :",
          sessionError,
        );

        return;
      }

      if (!data.session?.user) {
        return;
      }

      /*
       * Ne pas lancer une deuxième redirection si une connexion
       * est déjà en cours.
       */
      if (redirectingRef.current) {
        return;
      }

      await redirectAfterLogin(data.session.user.id);
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

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
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError(
          "Connexion impossible. Utilisateur introuvable.",
        );

        return;
      }

      /*
       * Vérification obligatoire du rôle.
       */
      await redirectAfterLogin(data.user.id);
    } catch (err) {
      console.error(
        "[Auth] Erreur de connexion :",
        err,
      );

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

  const handleRegister = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError(
        "Veuillez renseigner votre nom complet.",
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        "Veuillez renseigner votre numéro de téléphone.",
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    if (loading || redirectingRef.current) {
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
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
       * Confirmation email obligatoire.
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
       * Si Supabase connecte directement l'utilisateur,
       * on vérifie immédiatement son rôle.
       */
      if (data.user) {
        await redirectAfterLogin(data.user.id);
      }
    } catch (err) {
      console.error(
        "[Auth] Erreur inscription :",
        err,
      );

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

          {/* Logo / titre */}
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

          {/* Onglets */}
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

          {/* Message erreur */}
          {error ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {/* Message succès */}
          {success ? (
            <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          {/* Formulaire */}
          <form
            onSubmit={
              isLogin
                ? handleLogin
                : handleRegister
            }
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
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
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
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
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
                onChange={(event) =>
                  setEmail(event.target.value)
                }
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
                autoComplete={
                  isLogin
                    ? "current-password"
                    : "new-password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
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

          {/* Bas du formulaire */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Vous n'avez pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() =>
                    switchMode("register")
                  }
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
                  onClick={() =>
                    switchMode("login")
                  }
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
