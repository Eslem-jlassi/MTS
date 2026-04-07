import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { authFlowService } from "../api/authFlowService";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../api/client";

const ForgotPasswordPage: React.FC = () => {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.addToast("warning", "Veuillez renseigner votre adresse email.");
      return;
    }

    setSubmitting(true);
    try {
      await authFlowService.forgotPassword(email.trim());
      setSuccess(true);
      toast.success("Si un compte existe, un email de reinitialisation a ete emis.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-ds-primary">
          Reinitialisation du mot de passe
        </h2>
        <p className="mt-2 text-sm text-ds-muted">
          Saisissez votre email pour recevoir un lien de reinitialisation.
        </p>
      </motion.div>

      {success ? (
        <motion.div
          className="space-y-5 rounded-2xl border border-success-200 bg-success-50 p-6 text-center dark:border-success/20 dark:bg-success/10"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ShieldCheck className="mx-auto h-10 w-10 text-success-500" />
          <div>
            <p className="text-sm font-medium text-success-700 dark:text-success-200">
              Demande prise en compte
            </p>
            <p className="mt-2 text-sm text-ds-muted">
              Si un compte correspond a cette adresse, un email avec un lien de reinitialisation a
              ete envoye.
            </p>
          </div>
          <p className="text-xs text-ds-muted">Pensez a verifier egalement votre dossier spam.</p>
        </motion.div>
      ) : (
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-ds-border bg-ds-elevated/50 p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="group">
            <label className="mb-2 block text-sm font-medium text-ds-primary">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ds-muted group-focus-within:text-accent-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                autoComplete="email"
                className="w-full rounded-xl border border-ds-border bg-ds-card py-3 pl-11 pr-4 text-sm text-ds-primary outline-none transition-all focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-ds-border/60 bg-ds-card/60 p-4">
            <KeyRound className="mt-0.5 h-5 w-5 text-primary-500" />
            <p className="text-sm text-ds-muted">
              Le lien de reinitialisation sera envoye uniquement si SMTP est configure sur cette
              instance.
            </p>
          </div>

          <button type="submit" disabled={submitting} className="auth-btn-primary">
            {submitting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail size={18} />
                Envoyer le lien de reinitialisation
              </>
            )}
          </button>
        </motion.form>
      )}

      <p className="mt-6 text-center text-sm text-ds-muted">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-accent-500 transition-colors hover:text-accent-600"
        >
          <ArrowLeft size={16} />
          Retour a la connexion
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
