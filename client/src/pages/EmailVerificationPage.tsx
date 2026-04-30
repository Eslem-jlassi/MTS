import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle, MailCheck, RefreshCw } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useToast } from "../context/ToastContext";
import { authFlowService } from "../api/authFlowService";
import { getErrorMessage } from "../api/client";

type PageState = "loading" | "verified" | "pending" | "invalid" | "expired" | "error";

function classifyVerificationError(
  message: string,
): Exclude<PageState, "loading" | "verified" | "pending"> {
  const normalized = message.toLowerCase();
  if (normalized.includes("expire")) {
    return "expired";
  }
  if (
    normalized.includes("invalide") ||
    normalized.includes("invalid") ||
    normalized.includes("introuvable")
  ) {
    return "invalid";
  }
  return "error";
}

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const pendingEmail = searchParams.get("email");
  const toast = useToast();

  const normalizedEmail = useMemo(() => pendingEmail?.trim() ?? "", [pendingEmail]);
  const normalizedStatus = useMemo(() => status?.trim().toLowerCase() ?? "", [status]);
  const normalizedSource = useMemo(() => source?.trim().toLowerCase() ?? "", [source]);
  const pendingRequested = normalizedStatus === "pending";

  const [pageState, setPageState] = useState<PageState>(
    token ? "loading" : pendingRequested || normalizedEmail ? "pending" : "invalid",
  );
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageState(pendingRequested || normalizedEmail ? "pending" : "invalid");
      return;
    }

    let active = true;

    const verify = async () => {
      try {
        await authFlowService.verifyEmail(token, normalizedEmail || undefined);
        if (!active) return;
        setPageState("verified");
        toast.success("Votre adresse email a été vérifiée.");
      } catch (error) {
        if (!active) return;
        const message = getErrorMessage(error);
        setPageState(classifyVerificationError(message));
        toast.error(message);
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [normalizedEmail, pendingRequested, token, toast]);

  const handleResend = async () => {
    if (!normalizedEmail) {
      toast.addToast("warning", "Renseignez un email valide pour recevoir un nouveau lien.");
      return;
    }

    setResendLoading(true);
    try {
      await authFlowService.resendVerificationEmail(normalizedEmail);
      setPageState("pending");
      toast.success("Un nouvel email de vérification a été envoyé.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setResendLoading(false);
    }
  };

  const isSignupPending = pageState === "pending" && normalizedSource === "signup";

  const title =
    pageState === "verified"
      ? "Email vérifié"
      : pageState === "pending"
        ? isSignupPending
          ? "Compte créé, vérifiez votre boîte mail."
          : "Vérification en attente"
        : pageState === "loading"
          ? "Vérification en cours"
          : pageState === "expired"
            ? "Lien expiré"
            : pageState === "invalid"
              ? "Lien invalide"
              : "Vérification de l'email";

  const description =
    pageState === "loading"
      ? "Vérification du lien en cours..."
      : pageState === "verified"
        ? "Votre compte est maintenant confirmé. Vous pouvez vous connecter à la plateforme."
        : pageState === "pending"
          ? isSignupPending
            ? normalizedEmail
              ? `Votre compte a bien été créé. Un email de vérification a été envoyé à ${normalizedEmail}. Ouvrez votre boîte mail puis cliquez sur le lien reçu.`
              : "Votre compte a bien été créé. Un email de vérification a été envoyé. Consultez votre boîte mail pour activer le compte."
            : normalizedEmail
              ? `Un email de vérification a été envoyé à ${normalizedEmail}. Consultez votre boîte mail puis cliquez sur le lien reçu.`
              : "Un email de vérification a été envoyé. Consultez votre boîte mail."
          : pageState === "expired"
            ? normalizedEmail
              ? `Le lien de vérification pour ${normalizedEmail} a expiré. Vous pouvez demander un nouveau lien ci-dessous.`
              : "Ce lien de vérification a expiré. Demandez un nouvel email depuis l'écran de connexion."
            : pageState === "invalid"
              ? normalizedEmail
                ? `Le lien de vérification transmis pour ${normalizedEmail} n'est plus valide. Vous pouvez demander un nouveau lien ci-dessous.`
                : "Ce lien de vérification n'est pas valide ou a déjà été utilisé."
              : pageState === "error"
                ? "La vérification n'a pas pu aboutir. Vous pouvez réessayer ou demander un nouveau lien."
                : "Ce lien ne peut pas être utilisé sans jeton de vérification ou adresse email.";

  return (
    <AuthLayout>
      <motion.div
        className="auth-panel auth-panel-wide"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="auth-kicker">
            <MailCheck size={14} />
            Vérification du compte
          </span>
        </motion.div>

        <motion.div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30"
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

        <h2 className="auth-title text-center">{title}</h2>
        <p className="auth-subtitle mx-auto mt-3 max-w-2xl text-center">{description}</p>

        <motion.div
          className="auth-meta-strip mt-7 space-y-4 p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-start gap-3">
            <MailCheck size={18} className="mt-0.5 flex-shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-ds-primary">Lien de vérification</p>
              <p className="mt-0.5 text-xs text-ds-muted">
                Le lien d'activation est limité dans le temps pour protéger le compte.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-ds-muted" />
            <div>
              <p className="text-sm font-medium text-ds-primary">Besoin d'assistance</p>
              <p className="mt-0.5 text-xs text-ds-muted">
                Vérifiez également le dossier spam. Si le lien a expiré, vous pouvez en demander un
                nouveau.
              </p>
            </div>
          </div>

          {(pageState === "pending" ||
            pageState === "expired" ||
            pageState === "invalid" ||
            pageState === "error") &&
            normalizedEmail && (
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
                    Renvoyer l'email de vérification
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
            <Link to="/login" className="auth-link inline-flex items-center gap-1 font-semibold">
              Retour à la connexion
              <ArrowRight size={14} />
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
};

export default EmailVerificationPage;
