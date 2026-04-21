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
      toast.success("Si un compte existe, un email de réinitialisation a été émis.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        className="auth-panel auth-panel-wide"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="mb-7">
          <span className="auth-kicker">
            <ShieldCheck size={14} />
            Récupération sécurisée
          </span>
        </div>
        <h2 className="auth-title">Réinitialisation du mot de passe</h2>
        <p className="auth-subtitle mt-2 max-w-2xl">
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>

        {success ? (
          <motion.div
            className="auth-alert auth-alert-success auth-state-card mt-7 flex-col text-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ShieldCheck className="mx-auto h-10 w-10 text-success-500" />
            <div>
              <p className="text-sm font-medium text-success-700 dark:text-success-200">
                Demande prise en compte
              </p>
              <p className="mt-2 text-sm text-ds-muted">
                Si un compte correspond à cette adresse, un email avec un lien de réinitialisation a
                été envoyé.
              </p>
            </div>
            <p className="text-xs text-ds-muted">Pensez à vérifier également votre dossier spam.</p>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            className="auth-form-stack"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="group">
              <label className="auth-field-label">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ds-muted group-focus-within:text-accent-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.com"
                  autoComplete="email"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-meta-strip flex items-start gap-3 p-4">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary-500" />
              <p className="text-sm text-ds-muted">
                Le lien de réinitialisation sera envoyé uniquement si SMTP est configuré sur cette
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
                  Envoyer le lien de réinitialisation
                </>
              )}
            </button>
          </motion.form>
        )}

        <p className="mt-6 text-center text-sm text-ds-muted">
          <Link
            to="/login"
            className="auth-link inline-flex items-center gap-1.5 font-semibold"
          >
            <ArrowLeft size={16} />
            Retour à la connexion
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
