import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle, MailCheck, RefreshCw } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useToast } from "../context/ToastContext";
import { authFlowService } from "../api/authFlowService";
import { getErrorMessage } from "../api/client";

type PageState = "loading" | "verified" | "pending" | "invalid" | "error";

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const pendingEmail = searchParams.get("email");
  const toast = useToast();

  const normalizedEmail = useMemo(() => pendingEmail?.trim() ?? "", [pendingEmail]);
  const [pageState, setPageState] = useState<PageState>(
    token ? "loading" : normalizedEmail ? "pending" : "invalid",
  );
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageState(normalizedEmail ? "pending" : "invalid");
      return;
    }

    let active = true;

    const verify = async () => {
      try {
        await authFlowService.verifyEmail(token);
        if (!active) return;
        setPageState("verified");
        toast.success("Votre adresse email a ete verifiee.");
      } catch (error) {
        if (!active) return;
        setPageState("error");
        toast.error(getErrorMessage(error));
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [normalizedEmail, token, toast]);

  const handleResend = async () => {
    if (!normalizedEmail) {
      toast.addToast("warning", "Renseignez un email valide pour recevoir un nouveau lien.");
      return;
    }

    setResendLoading(true);
    try {
      await authFlowService.resendVerificationEmail(normalizedEmail);
      setPageState("pending");
      toast.success("Un nouvel email de verification a ete envoye.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setResendLoading(false);
    }
  };

  const title =
    pageState === "verified"
      ? "Email verifie"
      : pageState === "pending"
        ? "Verification en attente"
        : pageState === "loading"
          ? "Verification en cours"
          : "Verification de l'email";

  const description =
    pageState === "loading"
      ? "Verification du lien en cours..."
      : pageState === "verified"
        ? "Votre compte est maintenant confirme. Vous pouvez vous connecter a la plateforme."
        : pageState === "pending"
          ? normalizedEmail
            ? `Un email de verification a ete envoye a ${normalizedEmail}. Consultez votre boite mail puis cliquez sur le lien recu.`
            : "Un email de verification a ete envoye. Consultez votre boite mail."
          : pageState === "error"
            ? "Le lien de verification est invalide, expire ou deja utilise."
            : "Ce lien n'est pas exploitable sans jeton de verification ou adresse email.";

  return (
    <AuthLayout>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <motion.div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        >
          {pageState === "verified" ? (
            <CheckCircle size={36} className="text-success-500" />
          ) : pageState === "loading" || pageState === "pending" ? (
            <MailCheck size={36} className="text-primary-500" />
          ) : (
            <AlertCircle size={36} className="text-warning" />
          )}
        </motion.div>

        <h2 className="text-2xl font-extrabold tracking-tight text-ds-primary sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ds-muted">{description}</p>
      </motion.div>

      <motion.div
        className="mt-8 space-y-4 rounded-2xl border border-ds-border bg-ds-elevated/50 p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-start gap-3">
          <MailCheck size={18} className="mt-0.5 flex-shrink-0 text-primary-500" />
          <div>
            <p className="text-sm font-medium text-ds-primary">Lien de verification</p>
            <p className="mt-0.5 text-xs text-ds-muted">
              Le lien d'activation est limite dans le temps pour proteger le compte.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-ds-muted" />
          <div>
            <p className="text-sm font-medium text-ds-primary">Besoin d'assistance</p>
            <p className="mt-0.5 text-xs text-ds-muted">
              Verifiez egalement le dossier spam. Si le lien a expire, vous pouvez en demander un
              nouveau.
            </p>
          </div>
        </div>

        {(pageState === "pending" || pageState === "error") && normalizedEmail && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="auth-btn-secondary inline-flex w-full items-center justify-center gap-2"
          >
            {resendLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Renvoi en cours...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Renvoyer l'email de verification
              </>
            )}
          </button>
        )}
      </motion.div>

      <motion.div
        className="mt-6 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-center text-sm text-ds-muted">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-semibold text-accent-500 transition-colors hover:text-accent-600"
          >
            Retour a la connexion
            <ArrowRight size={14} />
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
};

export default EmailVerificationPage;
