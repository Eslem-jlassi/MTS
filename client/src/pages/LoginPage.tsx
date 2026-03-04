// =============================================================================
// MTS TELECOM - Login Page (Enterprise-Grade Split Screen)
// Orange-first charte · Modern inputs · Immersive UX
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronRight,
  Bot,
} from "lucide-react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { RootState, AppDispatch } from "../redux/store";
import { login, googleLogin, clearError } from "../redux/slices/authSlice";
import AuthLayout from "../components/auth/AuthLayout";
import { isGoogleOAuthEnabled } from "../App";

// =============================================================================
// COMPOSANT PRINCIPAL - PAGE DE CONNEXION
// =============================================================================
const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(login({ email, password }));
    },
    [dispatch, email, password]
  );

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      try {
        setGoogleError(null);
        if (credentialResponse.credential) {
          await dispatch(googleLogin(credentialResponse.credential)).unwrap();
        }
      } catch (err: unknown) {
        setGoogleError(
          typeof err === "string" ? err : "Erreur de connexion Google"
        );
      }
    },
    [dispatch]
  );

  const handleGoogleError = useCallback(() => {
    setGoogleError("Échec de la connexion Google");
  }, []);

  const displayError = error || googleError;

  return (
    <AuthLayout>
      {/* ── Mobile-only brand badge ─────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col items-center mb-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-orange-500/10 border border-orange-400/20">
          <Bot size={28} className="text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          MTS Telecom
        </h1>
      </div>

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Connexion
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Accédez à votre espace de supervision
        </p>
      </motion.div>

      {/* ── Error alert ─────────────────────────────────────────────────── */}
      {displayError && (
        <motion.div
          className="mb-6 p-4 rounded-2xl flex items-center text-sm
                     bg-red-50 dark:bg-red-500/10
                     border border-red-200 dark:border-red-500/20
                     text-red-600 dark:text-red-400"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={18} className="mr-3 flex-shrink-0" />
          <span>{displayError}</span>
        </motion.div>
      )}

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
        {/* Email */}
        <div className="group">
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
            Adresse email
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2
                         text-slate-400 group-focus-within:text-orange-500
                         transition-colors duration-200"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-slate-100 dark:bg-slate-700/60
                         text-slate-900 dark:text-white
                         placeholder:text-slate-400 dark:placeholder:text-slate-500
                         border border-transparent
                         focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20
                         rounded-xl py-3 pl-11 pr-4 text-sm outline-none
                         transition-all duration-200"
              placeholder="votre@email.com"
            />
          </div>
        </div>

        {/* Password */}
        <div className="group">
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2
                         text-slate-400 group-focus-within:text-orange-500
                         transition-colors duration-200"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-slate-100 dark:bg-slate-700/60
                         text-slate-900 dark:text-white
                         placeholder:text-slate-400 dark:placeholder:text-slate-500
                         border border-transparent
                         focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20
                         rounded-xl py-3 pl-11 pr-12 text-sm outline-none
                         transition-all duration-200"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2
                         text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                         transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Options row */}
        <div className="flex items-center justify-between">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600
                         bg-slate-100 dark:bg-slate-700
                         text-orange-500 focus:ring-orange-500/30 cursor-pointer"
            />
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
              Se souvenir de moi
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-orange-500 hover:text-orange-600
                       dark:text-orange-400 dark:hover:text-orange-300
                       transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Submit button — orange CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2
                     bg-orange-500 hover:bg-orange-600
                     text-white font-semibold text-[0.9375rem]
                     py-3.5 rounded-2xl
                     shadow-lg shadow-orange-500/20
                     hover:shadow-xl hover:shadow-orange-500/30
                     active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-300"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
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

      {/* ── Google OAuth ────────────────────────────────────────────────── */}
      {isGoogleOAuthEnabled && (
        <>
          <div className="my-7 flex items-center gap-3 text-slate-400 dark:text-slate-500 text-xs">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span>ou continuer avec</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
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

      {/* ── Register link ───────────────────────────────────────────────── */}
      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
        Pas encore de compte ?{" "}
        <Link
          to="/register"
          className="font-semibold text-orange-500 hover:text-orange-600
                     dark:text-orange-400 dark:hover:text-orange-300
                     transition-colors"
        >
          Créer un compte
        </Link>
      </p>


    </AuthLayout>
  );
};

export default LoginPage;
