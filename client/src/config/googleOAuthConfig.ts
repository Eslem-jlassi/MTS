export type GoogleOAuthAvailabilityReason =
  | "enabled"
  | "disabled"
  | "missing-client-id"
  | "invalid-client-id"
  | "origin-not-allowed";

export interface GoogleOAuthAvailability {
  isEnabled: boolean;
  reason: GoogleOAuthAvailabilityReason;
  message: string | null;
  technicalHint: string | null;
  clientId: string;
  allowedOrigins: string[];
  currentOrigin: string | null;
}

interface EvaluateGoogleOAuthAvailabilityInput {
  enabledFlag: boolean;
  clientId: string;
  allowedOrigins: string[];
  currentOrigin: string | null;
}

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
].join(",");

export function parseAllowedOrigins(rawOrigins: string): string[] {
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function evaluateGoogleOAuthAvailability({
  enabledFlag,
  clientId,
  allowedOrigins,
  currentOrigin,
}: EvaluateGoogleOAuthAvailabilityInput): GoogleOAuthAvailability {
  const normalizedClientId = clientId.trim();
  const normalizedOrigin = currentOrigin?.trim() || null;

  if (!enabledFlag) {
    return {
      isEnabled: false,
      reason: "disabled",
      message: "La connexion Google est desactivee pour cet environnement.",
      technicalHint: "Definissez REACT_APP_GOOGLE_OAUTH_ENABLED=true puis redemarrez le frontend.",
      clientId: normalizedClientId,
      allowedOrigins,
      currentOrigin: normalizedOrigin,
    };
  }

  if (!normalizedClientId) {
    return {
      isEnabled: false,
      reason: "missing-client-id",
      message: "La configuration Google du frontend est incomplete.",
      technicalHint:
        "Renseignez REACT_APP_GOOGLE_OAUTH_CLIENT_ID cote frontend et GOOGLE_CLIENT_ID cote backend avec le meme Client ID Google.",
      clientId: normalizedClientId,
      allowedOrigins,
      currentOrigin: normalizedOrigin,
    };
  }

  if (!normalizedClientId.includes(".apps.googleusercontent.com")) {
    return {
      isEnabled: false,
      reason: "invalid-client-id",
      message: "Le Client ID Google configure n'est pas valide.",
      technicalHint:
        "Utilisez un Client ID OAuth 2.0 Web se terminant par .apps.googleusercontent.com.",
      clientId: normalizedClientId,
      allowedOrigins,
      currentOrigin: normalizedOrigin,
    };
  }

  if (normalizedOrigin && allowedOrigins.length > 0 && !allowedOrigins.includes(normalizedOrigin)) {
    return {
      isEnabled: false,
      reason: "origin-not-allowed",
      message: `L'origine ${normalizedOrigin} n'est pas autorisee pour Google OAuth.`,
      technicalHint: `Ajoutez ${normalizedOrigin} a REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS et aux Authorized JavaScript origins dans Google Cloud Console.`,
      clientId: normalizedClientId,
      allowedOrigins,
      currentOrigin: normalizedOrigin,
    };
  }

  return {
    isEnabled: true,
    reason: "enabled",
    message: null,
    technicalHint: null,
    clientId: normalizedClientId,
    allowedOrigins,
    currentOrigin: normalizedOrigin,
  };
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID || "";
const GOOGLE_OAUTH_ENABLED_FLAG = process.env.REACT_APP_GOOGLE_OAUTH_ENABLED === "true";
const GOOGLE_OAUTH_ALLOWED_ORIGINS = parseAllowedOrigins(
  process.env.REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS,
);

const CURRENT_ORIGIN = typeof window === "undefined" ? null : window.location.origin;

export const googleOAuthConfig = evaluateGoogleOAuthAvailability({
  enabledFlag: GOOGLE_OAUTH_ENABLED_FLAG,
  clientId: GOOGLE_CLIENT_ID,
  allowedOrigins: GOOGLE_OAUTH_ALLOWED_ORIGINS,
  currentOrigin: CURRENT_ORIGIN,
});

export const isGoogleOAuthEnabled = googleOAuthConfig.isEnabled;
