import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send, Loader2 } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useToast } from "../context/ToastContext";
import { authFlowService } from "../api/authFlowService";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { success, error: showError } = useToast();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authFlowService.forgotPassword(email);
      setSubmitted(true);
      success("Un email de réinitialisation a été envoyé");
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, [email, success, showError]);

  return (
    <AuthLayout>
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-3xl font-extrabold text-ds-primary tracking-tight">
          Mot de passe oublié
        </h2>
        <p className="text-ds-muted mt-2 text-sm">
          Saisissez votre adresse email pour recevoir un lien de
          réinitialisation
        </p>
      </motion.div>

      {submitted ? (
        <motion.div
          className="p-6 rounded-2xl text-center
                     bg-success-50 dark:bg-success/10
                     border border-success-200 dark:border-success/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-sm text-success-700 dark:text-success-200 font-medium">
            Si un compte existe avec cette adresse, un email de
            réinitialisation a été envoyé.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold
                       text-accent-500 hover:text-accent-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour à la connexion
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="group">
            <label className="block text-sm font-medium text-ds-muted mb-2">
              Adresse email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2
                           text-ds-muted group-focus-within:text-accent-500
                           transition-colors duration-200"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-ds-elevated text-ds-primary
                           placeholder:text-ds-muted
                           border border-transparent
                           focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20
                           rounded-xl py-3 pl-11 pr-4 text-sm outline-none
                           transition-all duration-200"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={isLoading}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {isLoading ? "Envoi en cours…" : "Envoyer le lien"}
          </button>

          <p className="text-center text-sm text-ds-muted">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold
                         text-accent-500 hover:text-accent-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
