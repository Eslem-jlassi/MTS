// =============================================================================
// MTS TELECOM - Email Verification Page (mock)
// Shown after registration — "Vérifiez votre email" screen
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useCallback, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, RefreshCw, CheckCircle, ArrowRight, Inbox } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useToast } from "../context/ToastContext";
import { authFlowService } from "../api/authFlowService";

// =============================================================================
// TYPES
// =============================================================================
type PageState = "pending" | "resending" | "resent" | "verified";

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================
const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const toast = useToast();

  const [pageState, setPageState] = useState<PageState>("pending");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer for "Renvoyer" button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ---------------------------------------------------------------------------
  // Resend verification email (mock)
  // ---------------------------------------------------------------------------
  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setPageState("resending");
    try {
      // TODO: Remplacer par l'appel API réel POST /api/auth/resend-verification
      await authFlowService.resendVerificationEmail(email);
      setPageState("resent");
      setCooldown(60); // 60 secondes avant de pouvoir renvoyer
      toast.success("Un nouvel email de vérification a été envoyé.");
    } catch {
      setPageState("pending");
      toast.error("Impossible d'envoyer l'email. Réessayez plus tard.");
    }
  }, [email, cooldown, toast]);

  // ---------------------------------------------------------------------------
  // Mask email for display
  // ---------------------------------------------------------------------------
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "votre adresse";

  return (
    <AuthLayout>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {/* ---- Animated inbox icon ---- */}
        <motion.div
          className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/30"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        >
          <Inbox size={36} className="text-primary-500" />
        </motion.div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-ds-primary tracking-tight">
          Vérifiez votre email
        </h2>
        <p className="text-ds-muted mt-3 text-sm max-w-xs mx-auto">
          Nous avons envoyé un lien de vérification à{" "}
          <span className="font-semibold text-ds-secondary">{maskedEmail}</span>.
        </p>
      </motion.div>

      {/* ---- Instructions card ---- */}
      <motion.div
        className="mt-8 p-5 rounded-2xl bg-ds-elevated/50 border border-ds-border space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-start gap-3">
          <Mail size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-ds-primary">Consultez votre boîte de réception</p>
            <p className="text-xs text-ds-muted mt-0.5">
              Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <RefreshCw size={18} className="text-ds-muted mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-ds-primary">Pas reçu ?</p>
            <p className="text-xs text-ds-muted mt-0.5">
              Vérifiez vos spams ou renvoyez l'email ci-dessous.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ---- Resend button ---- */}
      <motion.div
        className="mt-6 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button
          type="button"
          onClick={handleResend}
          disabled={pageState === "resending" || cooldown > 0}
          className="auth-btn-primary"
        >
          {pageState === "resending" ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Envoi en cours…
            </>
          ) : cooldown > 0 ? (
            <>
              <RefreshCw size={18} />
              Renvoyer dans {cooldown}s
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              Renvoyer l'email de vérification
            </>
          )}
        </button>

        {/* Success feedback after resend */}
        {pageState === "resent" && cooldown > 0 && (
          <motion.div
            className="flex items-center gap-2 justify-center text-sm text-success-600 dark:text-success-400"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle size={16} />
            Email renvoyé avec succès
          </motion.div>
        )}

        {/* Link to login */}
        <p className="text-center text-sm text-ds-muted">
          Déjà vérifié ?{" "}
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-semibold text-accent-500 hover:text-accent-600 transition-colors"
          >
            Se connecter
            <ArrowRight size={14} />
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
};

export default EmailVerificationPage;
