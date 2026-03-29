// =============================================================================
// MTS TELECOM - Demo Mode Configuration
// =============================================================================
//
// OBJECTIF:
// Centraliser le flag REACT_APP_DEMO_MODE et les constantes du mode demo.
// Ce mode permet de montrer l'application avec des donnees telecom
// demonstratives, sans masquer les erreurs d'API hors des routes
// explicitement simulees.
//
// ACTIVATION:
// - .env : REACT_APP_DEMO_MODE=true
//
// DESACTIVATION EN PROD:
// - Ne pas definir REACT_APP_DEMO_MODE dans .env.production
// - Le mode demo reste strictement opt-in
//
// =============================================================================

const isDevelopmentBuild = process.env.NODE_ENV === "development";

/**
 * Verifie si le mode demo est active.
 *
 * Activation stricte : REACT_APP_DEMO_MODE=true ET build de developpement.
 * Aucun query param navigateur ne peut activer le mode demo a lui seul.
 */
export const isDemoMode = (): boolean => {
  if (!isDevelopmentBuild) {
    return false;
  }

  return process.env.REACT_APP_DEMO_MODE === "true";
};

/**
 * Shortcut : valeur evaluee une seule fois au chargement.
 */
export const DEMO_MODE_ACTIVE = isDemoMode();

/**
 * Permet d'indiquer clairement d'ou vient l'activation du mode demo.
 */
export const DEMO_MODE_SOURCE = DEMO_MODE_ACTIVE ? "env" : "disabled";

/**
 * Latence simulee (ms) pour les reponses API en demo.
 */
export const DEMO_LATENCY_MS = 300;

/**
 * Utilisateur demo pre-authentifie.
 */
export const DEMO_USER = {
  id: 1,
  email: "admin@mts-telecom.ma",
  firstName: "Mohammed",
  lastName: "Benali",
  fullName: "Mohammed Benali",
  role: "ADMIN" as const,
  phone: "+212 6 12 34 56 78",
  isActive: true,
  createdAt: "2025-06-15T09:00:00",
  lastLoginAt: new Date().toISOString(),
  supportSignature: "Mohammed Benali - Admin MTS Telecom",
  preferredLanguage: "fr",
};

/**
 * Token JWT factice, reserve au mode demo.
 */
export const DEMO_TOKEN = "demo.jwt.token.mts-telecom-2026";
export const DEMO_REFRESH_TOKEN = "demo-refresh-token";

/**
 * Seed localStorage avec la session demo.
 *
 * DOIT etre appele avant l'initialisation du store Redux, car authSlice lit
 * localStorage au moment de son bootstrap.
 */
export function seedDemoAuth(): void {
  if (!DEMO_MODE_ACTIVE) return;

  localStorage.setItem("token", DEMO_TOKEN);
  localStorage.setItem("refreshToken", DEMO_REFRESH_TOKEN);
  localStorage.setItem("user", JSON.stringify(DEMO_USER));

  document.body.classList.add("demo-mode");
  document.body.setAttribute("data-demo-mode", "true");

  console.info(
    "%cMTS Demo Mode - session demonstrative chargee (ADMIN: admin@mts-telecom.ma)",
    "color: #f59e0b; font-weight: bold;",
  );
}
