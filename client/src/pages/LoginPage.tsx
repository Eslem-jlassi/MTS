import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CredentialResponse } from "@react-oauth/google";
import { AlertCircle, Bot, ChevronRight, Eye, EyeOff, Lock, Mail, RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "../redux/store";
import { clearError, googleLogin, login } from "../redux/slices/authSlice";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleAuthSection from "../components/auth/GoogleAuthSection";
import { authFlowService } from "../api/authFlowService";
import { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const toast = useToast();

  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("admin@mts-telecom.ma");
  const [password, setPassword] = useState("Password1!");
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(login({ email, password }));
    },
    [dispatch, email, password],
  );

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      try {
        setGoogleError(null);
        if (credentialResponse.credential) {
          await dispatch(googleLogin(credentialResponse.credential)).unwrap();
        }
      } catch (err: unknown) {
        setGoogleError(typeof err === "string" ? err : "Erreur de connexion Google");
      }
    },
    [dispatch],
  );

  const handleGoogleError = useCallback(() => {
    setGoogleError("Échec de la connexion Google");
  }, []);

  const handleResendVerification = useCallback(async () => {
    if (!email.trim()) {
      toast.addToast("warning", "Saisissez d'abord votre adresse email.");
      return;
    }

    setResendLoading(true);
    try {
      await authFlowService.resendVerificationEmail(email.trim());
      toast.success("Un nouvel email de vérification a été envoyé.");
      navigate(
        `/verify-email?email=${encodeURIComponent(email.trim())}&status=pending&source=login`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  }, [email, navigate, toast]);

  const displayError = error || googleError;
  const isVerificationError = useMemo(
    () => Boolean(displayError && /verifi/i.test(displayError)),
    [displayError],
  );

  return (
    <AuthLayout>
      <div className="mb-6 flex flex-col items-center lg:hidden">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-amber-300/10 shadow-lg shadow-orange-500/10">
          <Bot size={28} className="text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">MTS Telecom</h1>
      </div>
      <motion.div
        className="auth-panel auth-panel-wide"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-6 space-y-3.5">
          <span className="auth-kicker">
            <Bot size={14} />
            Espace sécurisé
          </span>
          <div>
            <h2 className="auth-title">Connexion</h2>
            <p className="auth-subtitle mt-2">
              Accédez à votre cockpit de supervision et reprenez vos opérations sans friction.
            </p>
          </div>
          <div className="auth-meta-strip grid gap-2 p-2.5 text-xs text-ds-secondary sm:grid-cols-3">
            <div className="rounded-xl bg-ds-card/70 px-3 py-2">Cookies sécurisés</div>
            <div className="rounded-xl bg-ds-card/70 px-3 py-2">RBAC contrôlé</div>
            <div className="rounded-xl bg-ds-card/70 px-3 py-2">Support IA disponible</div>
          </div>
        </div>

        {displayError && (
          <motion.div
            className="auth-alert auth-alert-error mb-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">{displayError}</p>
          </motion.div>
        )}

        {isVerificationError && (
          <motion.div
            className="auth-alert auth-alert-warning mb-6 flex-col"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-semibold">Compte non vérifié</p>
            <p className="text-sm leading-relaxed text-amber-700/90 dark:text-amber-100/90">
              Vous pouvez renvoyer un nouveau lien de vérification à cette adresse.
            </p>
            <div className="mt-1 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Renvoi...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Renvoyer l'email
                  </>
                )}
              </button>
              <Link
                to={
                  email.trim()
                    ? `/verify-email?email=${encodeURIComponent(email.trim())}&status=pending&source=login`
                    : "/verify-email"
                }
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-2xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 dark:border-amber-500/30 dark:text-amber-200 dark:hover:bg-amber-500/10"
              >
                Voir la page de vérification
              </Link>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-stack" aria-busy={isLoading}>
          <div className="group">
            <label className="auth-field-label">Adresse email</label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-muted transition-colors duration-200 group-focus-within:text-primary"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="auth-input"
                placeholder="vous@entreprise.com"
              />
            </div>
          </div>

          <div className="group">
            <label className="auth-field-label">Mot de passe</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-muted transition-colors duration-200 group-focus-within:text-primary"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="auth-input pr-12"
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ds-muted transition-colors hover:text-ds-secondary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-ds-border bg-ds-elevated text-primary focus:ring-primary/30"
              />
              <span className="ml-2 text-sm text-ds-secondary">Se souvenir de moi</span>
            </label>
            <Link to="/forgot-password" className="auth-link text-sm font-medium">
              Mot de passe oublié ?
            </Link>
          </div>

          <button type="submit" disabled={isLoading} className="auth-btn-primary">
            {isLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Connexion en cours...
              </>
            ) : (
              <>
                Se connecter
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>

        <GoogleAuthSection
          mode="signin"
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        <p className="mt-8 text-center text-sm text-ds-secondary">
          Pas encore de compte ?{" "}
          <Link to="/register" className="auth-link font-semibold">
            Créer un compte
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
};

export default LoginPage;
