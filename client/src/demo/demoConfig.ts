// =============================================================================
// MTS TELECOM - Demo Mode Configuration
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================
//
// OBJECTIF:
// Centralise le flag REACT_APP_DEMO_MODE et les constantes du mode démo.
// Ce mode permet de montrer l'application avec des données réalistes
// lors de la soutenance, sans dépendre d'un backend fonctionnel.
//
// ACTIVATION:
// - .env : REACT_APP_DEMO_MODE=true
// - ou via l'URL : ?demo=true (pour tests rapides)
//
// DÉSACTIVATION EN PROD:
// - Ne pas définir REACT_APP_DEMO_MODE dans .env.production
// - Le mode est strictement opt-in
//
// =============================================================================

/**
 * Vérifie si le Demo Mode est activé.
 *
 * Activation stricte : REACT_APP_DEMO_MODE=true ET NODE_ENV=development.
 * Le query param ?demo=true est aussi limité au mode développement.
 */
export const isDemoMode = (): boolean => {
  // Bloque le mode démo en production
  if (process.env.NODE_ENV === "production") return false;

  // Variable d'environnement (définie au build time)
  if (process.env.REACT_APP_DEMO_MODE === "true") return true;

  // Query param (uniquement en dev, utile pour les tests)
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") return true;
  }

  return false;
};

/**
 * Shortcut: valeur évaluée une seule fois au chargement.
 * Utilisé dans les hot paths (interceptor Axios, renders).
 */
export const DEMO_MODE_ACTIVE = isDemoMode();

/**
 * Latence simulée (ms) pour les réponses API en démo.
 * Donne un retour visuel réaliste (spinner visible brièvement).
 */
export const DEMO_LATENCY_MS = 300;

/**
 * Utilisateur démo pré-authentifié (ADMIN pour montrer toutes les features).
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
  supportSignature: "Mohammed Benali – Admin MTS Telecom",
  preferredLanguage: "fr",
};

/**
 * Token JWT factice (ne sera jamais envoyé à un vrai backend).
 */
export const DEMO_TOKEN = "demo.jwt.token.mts-telecom-2026";

/**
 * Seed localStorage avec l'utilisateur et le token démo.
 *
 * DOIT être appelé AVANT l'import du Redux store,
 * car authSlice lit localStorage au moment de son initialisation.
 *
 * Idempotent : ne fait rien si déjà seed ou si DEMO_MODE_ACTIVE === false.
 */
export function seedDemoAuth(): void {
  if (!DEMO_MODE_ACTIVE) return;

  localStorage.setItem("token", DEMO_TOKEN);
  localStorage.setItem("user", JSON.stringify(DEMO_USER));

  // Ajoute classe CSS pour adapter l'espacement du bandeau
  document.body.classList.add("demo-mode");

  console.info(
    "%c🎭 MTS Demo Mode — Auth pré-chargée (ADMIN: admin@mts-telecom.ma)",
    "color: #f59e0b; font-weight: bold;"
  );
}
