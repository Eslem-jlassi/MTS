// =============================================================================
// MTS TELECOM - Service d'authentification (API)
// =============================================================================
/**
 * ============================================================================
 * authService.ts - Service pour les appels API d'authentification
 * ============================================================================
 * 
 * RÔLE DE CE FICHIER:
 * Ce service encapsule tous les appels API liés à l'authentification.
 * Il fait le lien entre l'application React et le backend Spring Boot.
 * 
 * RESPONSABILITÉS:
 * - Appels HTTP vers /api/auth/*
 * - Stockage/récupération du token JWT dans localStorage
 * - Stockage/récupération des infos utilisateur
 * 
 * FLUX D'AUTHENTIFICATION:
 * 1. Utilisateur saisit email/password
 * 2. login() appelle POST /api/auth/login
 * 3. Backend vérifie et retourne { token, user }
 * 4. On stocke token et user dans localStorage
 * 5. Les prochaines requêtes incluent le token (via interceptor)
 * 
 * STOCKAGE LOCAL:
 * - localStorage.setItem("token", "..."): Stocke le JWT
 * - localStorage.setItem("user", JSON.stringify(user)): Stocke l'utilisateur
 * - Ces données persistent après refresh de la page
 * 
 * ============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Client Axios pré-configuré.
 * Inclut automatiquement:
 * - L'URL de base (/api)
 * - Le token JWT dans les headers
 * - La gestion des erreurs
 */
import api from "./client";

/**
 * Types TypeScript pour typer les requêtes et réponses.
 * Garantit la cohérence des données entre frontend et backend.
 */
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse, UserRole } from "../types";

// =============================================================================
// NORMALISATION UTILISATEUR
// =============================================================================
/**
 * Normalise l'objet utilisateur reçu de l'API (login, /me) pour garantir:
 * - fullName calculé à partir de firstName + lastName
 * - role valide (string backend → UserRole)
 * L'API auth retourne parfois uniquement id, email, firstName, lastName, role, profilePhotoUrl.
 */
function normalizeUser(u: unknown): UserResponse {
  const raw = (u && typeof u === "object" ? u : {}) as Record<string, unknown>;
  const firstName = (raw.firstName as string) || "";
  const lastName = (raw.lastName as string) || "";
  const fullName =
    (raw.fullName as string) || [firstName, lastName].filter(Boolean).join(" ").trim() || "Utilisateur";
  const roleRaw = raw.role as string | undefined;
  const roleStr = typeof roleRaw === "string" ? roleRaw.toUpperCase() : "";
  const role: UserRole =
    roleStr && Object.values(UserRole).includes(roleStr as UserRole)
      ? (roleStr as UserRole)
      : UserRole.CLIENT;
  return {
    ...(raw as unknown as UserResponse),
    firstName,
    lastName,
    fullName,
    role,
  } as UserResponse;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Préfixe pour tous les endpoints d'authentification.
 * Les URLs complètes seront: /api/auth/login, /api/auth/register, etc.
 */
const AUTH_PREFIX = "/auth";

// =============================================================================
// SERVICE D'AUTHENTIFICATION
// =============================================================================

/**
 * Objet contenant toutes les méthodes d'authentification.
 * 
 * Pattern "Service": Regroupe la logique métier dans un objet.
 * Facilite les tests et la réutilisation.
 */
export const authService = {
  
  // ===========================================================================
  // MÉTHODES D'AUTHENTIFICATION
  // ===========================================================================
  
  /**
   * Connecte un utilisateur avec email et mot de passe.
   * 
   * FLUX:
   * 1. Envoie POST /api/auth/login avec { email, password }
   * 2. Reçoit { token, user } du backend
   * 3. Stocke le token dans localStorage
   * 4. Stocke l'utilisateur dans localStorage
   * 5. Retourne la réponse
   * 
   * @param request Contient email et password
   * @returns AuthResponse avec token et infos utilisateur
   * @throws Error si credentials invalides
   */
  login: async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/login`, request);
    const user = normalizeUser(response.data.user);

    localStorage.setItem("token", response.data.accessToken);
    if (response.data.refreshToken) {
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(user));

    return { ...response.data, user };
  },

  /**
   * Inscrit un nouvel utilisateur (rôle CLIENT par défaut).
   * 
   * Après inscription réussie, l'utilisateur est automatiquement connecté.
   * 
   * @param request Données d'inscription (email, password, nom, etc.)
   * @returns AuthResponse avec token et infos du nouveau compte
   * @throws Error si email déjà utilisé ou données invalides
   */
  register: async (request: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/register`, request);
    const user = normalizeUser(response.data.user);

    localStorage.setItem("token", response.data.accessToken);
    if (response.data.refreshToken) {
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(user));

    return { ...response.data, user };
  },

  /**
   * Déconnecte l'utilisateur.
   * 
   * Supprime les données locales. Le token reste valide côté serveur
   * (JWT stateless) mais ne sera plus envoyé.
   * 
   * En production, on pourrait aussi appeler le backend pour
   * invalider le token (blacklist).
   */
  logout: async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await api.post(`${AUTH_PREFIX}/logout`, { refreshToken });
      }
    } catch {
      // Ignore error — we're logging out anyway
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  /**
   * Récupère les infos de l'utilisateur actuellement connecté.
   * 
   * Appelle GET /api/auth/me avec le token JWT.
   * Utile pour rafraîchir les données après modification.
   * 
   * @returns UserResponse avec les données à jour
   * @throws Error si non authentifié ou token expiré
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`${AUTH_PREFIX}/me`);
    const user = normalizeUser(response.data);
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  // ===========================================================================
  // MÉTHODES DE VÉRIFICATION D'ÉTAT
  // ===========================================================================

  /**
   * Vérifie si un utilisateur est connecté.
   * 
   * Simple vérification de présence du token.
   * Note: Ne vérifie pas si le token est encore valide!
   * 
   * @returns true si un token existe dans localStorage
   */
  isLoggedIn: (): boolean => {
    const token = localStorage.getItem("token");
    return !!token;  // Convertit en boolean ("" -> false, "abc" -> true)
  },

  /**
   * Récupère l'utilisateur stocké dans localStorage.
   * 
   * Utile au démarrage de l'app pour restaurer la session.
   * 
   * @returns UserResponse ou null si pas de user stocké
   */
  getStoredUser: (): UserResponse | null => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr) as unknown;
        return normalizeUser(parsed);
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Récupère le token JWT stocké.
   * 
   * @returns Le token ou null si pas de token
   */
  getToken: (): string | null => {
    return localStorage.getItem("token");
  },

  // ===========================================================================
  // AUTHENTIFICATION GOOGLE (OAuth)
  // ===========================================================================

  /**
   * Authentification via Google OAuth.
   * 
   * FLUX:
   * 1. L'utilisateur clique sur "Se connecter avec Google"
   * 2. Google affiche sa fenêtre de connexion
   * 3. Après succès, Google retourne un token
   * 4. On envoie ce token à notre backend
   * 5. Le backend vérifie avec Google et crée/connecte l'utilisateur
   * 
   * @param googleToken Token fourni par Google après authentification
   * @returns AuthResponse avec notre token JWT et infos user
   */
  googleLogin: async (googleToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/google`, {
      token: googleToken,
    });
    const user = normalizeUser(response.data.user);

    localStorage.setItem("token", response.data.accessToken);
    if (response.data.refreshToken) {
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(user));

    return { ...response.data, user };
  },
};

// Export par défaut pour import simple
export default authService;
