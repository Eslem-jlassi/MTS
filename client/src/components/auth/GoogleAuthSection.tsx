import React from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { AlertCircle } from "lucide-react";
import { googleOAuthConfig } from "../../config/googleOAuthConfig";

interface GoogleAuthSectionProps {
  mode: "signin" | "signup";
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
}

export default function GoogleAuthSection({ mode, onSuccess, onError }: GoogleAuthSectionProps) {
  const separatorText = mode === "signin" ? "ou continuer avec" : "Ou continuer avec";
  const unavailableTitle =
    mode === "signin" ? "Connexion Google indisponible" : "Inscription Google indisponible";
  const showTechnicalHint =
    process.env.NODE_ENV !== "production" && Boolean(googleOAuthConfig.technicalHint);

  if (googleOAuthConfig.isEnabled) {
    return (
      <>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span>{separatorText}</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onSuccess}
            onError={onError}
            text={mode === "signin" ? "signin_with" : "signup_with"}
            shape="rectangular"
            theme="outline"
            size="large"
          />
        </div>
      </>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">{unavailableTitle}</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-100/90">
            {googleOAuthConfig.message}
          </p>
          {showTechnicalHint && (
            <p className="mt-2 text-xs text-amber-700/90 dark:text-amber-100/80">
              {googleOAuthConfig.technicalHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
