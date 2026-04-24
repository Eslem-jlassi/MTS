import React, { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useToast } from "../context/ToastContext";
import { authFlowService } from "../api/authFlowService";
import { getErrorMessage } from "../api/client";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "../utils/passwordValidation";

type PageState = "form" | "loading" | "success" | "error";

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageState, setPageState] = useState<PageState>(token ? "form" : "error");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      errors.password = passwordError;
    }

    const confirmationError = getPasswordConfirmationError(password, confirmPassword);
    if (confirmationError) {
      errors.confirmPassword = confirmationError;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [confirmPassword, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token || !validate()) return;

      setPageState("loading");
      try {
        await authFlowService.resetPassword(token, password);
        setPageState("success");
        toast.success("Votre mot de passe a ete reinitialise avec succes.");
      } catch (error) {
        setPageState("error");
        toast.error(getErrorMessage(error));
      }
    },
    [password, token, toast, validate],
  );

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggleShow: () => void,
    name: string,
  ) => (
    <div className="group">
      <label className="auth-field-label">{label}</label>
      <div className="relative">
        <Lock
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-muted group-focus-within:text-accent-500 transition-colors duration-200"
        />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (validationErrors[name]) {
              setValidationErrors((prev) => ({ ...prev, [name]: "" }));
            }
          }}
          autoComplete="new-password"
          className="auth-input pr-12"
          placeholder="********"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ds-muted hover:text-ds-secondary transition-colors"
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {validationErrors[name] && <p className="auth-field-error">{validationErrors[name]}</p>}
    </div>
  );

  return (
    <AuthLayout>
      <motion.div
        className="auth-panel auth-panel-wide"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-7">
          <span className="auth-kicker">
            <ShieldCheck size={14} />
            Réinitialisation protégée
          </span>
        </div>

        <h2 className="auth-title">Réinitialiser le mot de passe</h2>
        <p className="auth-subtitle mt-2">
          Definissez un nouveau mot de passe pour votre compte.
        </p>

        {pageState === "success" && (
          <motion.div
            className="auth-alert auth-alert-success auth-state-card mt-7 flex-col text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle size={40} className="mx-auto mb-3 text-success-500" />
            <p className="text-sm font-semibold">Mot de passe modifie avec succes.</p>
            <p className="text-xs text-ds-muted">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 transition-colors hover:text-accent-600"
            >
              <ArrowLeft size={16} />
              Retour a la connexion
            </Link>
          </motion.div>
        )}

        {pageState === "error" && (
          <motion.div
            className="auth-alert auth-alert-error auth-state-card mt-7 flex-col text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <AlertCircle size={40} className="mx-auto mb-3 text-error-500" />
            <p className="text-sm font-semibold">Lien invalide ou expire</p>
            <p className="text-xs text-ds-muted">
              Demandez un nouveau lien depuis la page de reinitialisation ou utilisez un lien plus
              recent.
            </p>
            <Link
              to="/forgot-password"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 transition-colors hover:text-accent-600"
            >
              Aide a la reinitialisation
            </Link>
          </motion.div>
        )}

        {(pageState === "form" || pageState === "loading") && (
          <form
            onSubmit={handleSubmit}
            className="auth-form-stack"
            aria-busy={pageState === "loading"}
          >
            {renderPasswordField(
              "Nouveau mot de passe",
              password,
              setPassword,
              showPassword,
              () => setShowPassword((prev) => !prev),
              "password",
            )}
            <p className="auth-help-text">
              Minimum 8 caracteres, avec une majuscule, une minuscule et un chiffre
            </p>

            {renderPasswordField(
              "Confirmer le mot de passe",
              confirmPassword,
              setConfirmPassword,
              showConfirmPassword,
              () => setShowConfirmPassword((prev) => !prev),
              "confirmPassword",
            )}

            <button type="submit" disabled={pageState === "loading"} className="auth-btn-primary">
              {pageState === "loading" ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Reinitialisation...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Reinitialiser le mot de passe
                </>
              )}
            </button>

            <p className="text-center text-sm text-ds-muted">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 font-semibold text-accent-500 transition-colors hover:text-accent-600"
              >
                <ArrowLeft size={16} />
                Retour a la connexion
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
