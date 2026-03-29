import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import {
  AlertCircle,
  Bot,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
} from "lucide-react";
import { RootState, AppDispatch } from "../redux/store";
import { clearError, googleLogin, login } from "../redux/slices/authSlice";
import AuthLayout from "../components/auth/AuthLayout";
import { isGoogleOAuthEnabled } from "../App";
import { authFlowService } from "../api/authFlowService";
import { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const toast = useToast();

  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("admin@mts.com");
  const [password, setPassword] = useState("password");
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
    setGoogleError("Echec de la connexion Google");
  }, []);

  const handleResendVerification = useCallback(async () => {
    if (!email.trim()) {
      toast.addToast("warning", "Saisissez d'abord votre adresse email.");
      return;
    }

    setResendLoading(true);
    try {
      await authFlowService.resendVerificationEmail(email.trim());
      toast.success("Un nouvel email de verification a ete envoye.");
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}&status=pending`);
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
      <div className="mb-8 flex flex-col items-center lg:hidden">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
          <Bot size={28} className="text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">MTS Telecom</h1>
      </div>

      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Connexion
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Accedez a votre espace de supervision
        </p>
      </motion.div>

      {displayError && (
        <motion.div
          className="mb-4 flex items-center rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={18} className="mr-3 flex-shrink-0" />
          <span>{displayError}</span>
        </motion.div>
      )}

      {isVerificationError && (
        <motion.div
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium">Compte non verifie</p>
          <p className="mt-1 text-amber-700/90 dark:text-amber-100/90">
            Vous pouvez renvoyer un nouveau lien de verification a cette adresse.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
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
              to={email.trim() ? `/verify-email?email=${encodeURIComponent(email.trim())}&status=pending` : "/verify-email"}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:text-amber-200 dark:hover:bg-amber-500/10"
            >
              Voir la page de verification
            </Link>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
        <div className="group">
          <label className="mb-2 block text-sm font-medium text-slate-500 dark:text-slate-400">
            Adresse email
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-orange-500"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-transparent bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-700/60 dark:text-white dark:placeholder:text-slate-500"
              placeholder="votre@email.com"
            />
          </div>
        </div>

        <div className="group">
          <label className="mb-2 block text-sm font-medium text-slate-500 dark:text-slate-400">
            Mot de passe
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-orange-500"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-transparent bg-slate-100 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-700/60 dark:text-white dark:placeholder:text-slate-500"
              placeholder="********"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-slate-300 bg-slate-100 text-orange-500 focus:ring-orange-500/30 dark:border-slate-600 dark:bg-slate-700"
            />
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
              Se souvenir de moi
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-orange-500 transition-colors hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300"
          >
            Mot de passe oublie ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-[0.9375rem] font-semibold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
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

      {isGoogleOAuthEnabled && (
        <>
          <div className="my-7 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span>ou continuer avec</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              shape="rectangular"
              theme="outline"
              size="large"
            />
          </div>
        </>
      )}

      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
        Pas encore de compte ?{" "}
        <Link
          to="/register"
          className="font-semibold text-orange-500 transition-colors hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300"
        >
          Creer un compte
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
