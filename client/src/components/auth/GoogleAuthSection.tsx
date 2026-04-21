import React, { useEffect, useState } from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { AlertCircle } from "lucide-react";
import { googleOAuthConfig } from "../../config/googleOAuthConfig";
import api from "../../api/client";

interface GoogleAuthSectionProps {
  mode: "signin" | "signup";
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
}

type BackendGoogleReason =
  | "configured"
  | "missing-client-id"
  | "invalid-client-id"
  | "unreachable";

interface BackendGoogleConfig {
  enabled: boolean;
  reason: BackendGoogleReason;
}

export default function GoogleAuthSection({ mode, onSuccess, onError }: GoogleAuthSectionProps) {
  const [backendGoogleConfig, setBackendGoogleConfig] = useState<BackendGoogleConfig | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!googleOAuthConfig.isEnabled) {
      setBackendGoogleConfig(null);
      return () => {
        mounted = false;
      };
    }

    const loadBackendGoogleConfig = async () => {
      try {
        const { data } = await api.get<{ enabled?: boolean; reason?: BackendGoogleReason }>(
          "/auth/google/config",
          {
            timeout: 5000,
          },
        );
        if (!mounted) return;
        setBackendGoogleConfig({
          enabled: data?.enabled === true,
          reason: data?.reason ?? "unreachable",
        });
      } catch {
        if (!mounted) return;
        setBackendGoogleConfig({ enabled: false, reason: "unreachable" });
      }
    };

    loadBackendGoogleConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const separatorText = mode === "signin" ? "ou continuer avec" : "ou continuer avec";
  const frontendReady = googleOAuthConfig.isEnabled;
  const backendReady = frontendReady && backendGoogleConfig?.enabled === true;
  const isCheckingBackend = frontendReady && backendGoogleConfig === null;
  const showGoogleButton = backendReady;
  const showUnavailableState = !showGoogleButton && !isCheckingBackend;
  const backendReason = backendGoogleConfig?.reason;

  const unavailableMessage = frontendReady
    ? backendReason === "missing-client-id"
      ? "Connexion Google indisponible : configuration serveur manquante."
      : backendReason === "invalid-client-id"
        ? "Connexion Google indisponible : configuration serveur invalide."
        : "Connexion Google temporairement indisponible."
    : googleOAuthConfig.message || "Connexion Google indisponible pour cet environnement.";

  const technicalHint = frontendReady
    ? backendReason === "missing-client-id" || backendReason === "invalid-client-id"
      ? "Renseignez GOOGLE_CLIENT_ID cote backend avec le meme Client ID que le frontend, puis redemarrez le serveur."
      : "Verifiez que le backend est lance et accessible depuis le frontend."
    : googleOAuthConfig.technicalHint ||
      "Verifiez les variables REACT_APP_GOOGLE_OAUTH_CLIENT_ID et REACT_APP_GOOGLE_OAUTH_ENABLED.";

  const showTechnicalHint = process.env.NODE_ENV !== "production" && Boolean(technicalHint);

  return (
    <>
      <div className="auth-separator my-7">
        <span>{separatorText}</span>
      </div>

      {showGoogleButton && (
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
      )}

      {isCheckingBackend && (
        <div className="flex items-center justify-center gap-2 text-xs text-ds-muted">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ds-border border-t-transparent" />
          Preparation de la connexion Google...
        </div>
      )}

      {showUnavailableState && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-ds-border/60 bg-ds-surface/40 px-4 py-3 text-center">
          <div className="flex items-center gap-1.5 text-xs text-ds-muted">
            <AlertCircle size={13} className="flex-shrink-0 opacity-60" />
            <span>{unavailableMessage}</span>
          </div>
          {showTechnicalHint && (
            <p className="text-[11px] leading-relaxed text-ds-muted/70">{technicalHint}</p>
          )}
        </div>
      )}
    </>
  );
}
