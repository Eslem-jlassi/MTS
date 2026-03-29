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
      <label className="block text-sm font-medium text-ds-muted mb-2">{label}</label>
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
          className="w-full bg-ds-elevated text-ds-primary placeholder:text-ds-muted border border-transparent focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 rounded-xl py-3 pl-11 pr-12 text-sm outline-none transition-all duration-200"
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
      {validationErrors[name] && (
        <p className="text-xs text-error-500 mt-1">{validationErrors[name]}</p>
      )}
    </div>
  );

  return (
    <AuthLayout>
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-3xl font-extrabold text-ds-primary tracking-tight">
          Reinitialiser le mot de passe
        </h2>
        <p className="text-ds-muted mt-2 text-sm">
          Definissez un nouveau mot de passe pour votre compte.
        </p>
      </motion.div>

      {pageState === "success" && (
        <motion.div
          className="p-6 rounded-2xl text-center bg-success-50 dark:bg-success/10 border border-success-200 dark:border-success/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle size={40} className="mx-auto text-success-500 mb-3" />
          <p className="text-sm text-success-700 dark:text-success-200 font-medium">
            Mot de passe modifie avec succes.
          </p>
          <p className="text-xs text-ds-muted mt-2">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour a la connexion
          </Link>
        </motion.div>
      )}

      {pageState === "error" && (
        <motion.div
          className="p-6 rounded-2xl text-center bg-error-50 dark:bg-error/10 border border-error-200 dark:border-error/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertCircle size={40} className="mx-auto text-error-500 mb-3" />
          <p className="text-sm text-error-700 dark:text-error-200 font-medium">
            Lien invalide ou expire
          </p>
          <p className="text-xs text-ds-muted mt-2">
            Demandez un nouveau lien depuis la page de reinitialisation ou utilisez un lien plus recent.
          </p>
          <Link
            to="/forgot-password"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors"
          >
            Aide a la reinitialisation
          </Link>
        </motion.div>
      )}

      {(pageState === "form" || pageState === "loading") && (
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pageState === "loading"}>
          {renderPasswordField(
            "Nouveau mot de passe",
            password,
            setPassword,
            showPassword,
            () => setShowPassword((prev) => !prev),
            "password",
          )}
          <p className="text-xs text-ds-muted -mt-3">
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
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
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
              className="inline-flex items-center gap-1.5 font-semibold text-accent-500 hover:text-accent-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Retour a la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
