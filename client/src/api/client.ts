// =============================================================================
// MTS TELECOM - Configuration du Client HTTP (Axios)
// =============================================================================
/**
 * ============================================================================
 * client.ts - Client HTTP Axios pré-configuré
 * ============================================================================
 * 
 * QU'EST-CE QU'AXIOS?
 * -------------------
 * Axios est une bibliothèque JavaScript pour faire des requêtes HTTP.
 * Avantages par rapport à fetch():
 * - Transforme automatiquement les données JSON
 * - Intercepteurs pour modifier les requêtes/réponses
 * - Gestion des erreurs améliorée
 * - Annulation des requêtes
 * - Timeout intégré
 * 
 * QU'EST-CE QU'UN INTERCEPTEUR?
 * -----------------------------
 * Un intercepteur est une fonction qui s'exécute:
 * - AVANT chaque requête (request interceptor)
 * - APRÈS chaque réponse (response interceptor)
 * 
 * Utile pour:
 * - Ajouter automatiquement le token JWT à chaque requête
 * - Gérer les erreurs 401 (token expiré) globalement
 * - Ajouter des logs, des spinners, etc.
 * 
 * FLUX D'UNE REQUÊTE:
 * 1. Code appelle api.get("/tickets")
 * 2. Request interceptor ajoute le token
 * 3. Axios envoie la requête HTTP
 * 4. Backend répond
 * 5. Response interceptor traite la réponse
 * 6. Le code reçoit les données
 * 
 * ============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
// - axios: La bibliothèque principale
// - AxiosError: Type pour les erreurs Axios
// - AxiosResponse: Type pour les réponses
// - InternalAxiosRequestConfig: Type pour la config des requêtes

import { ApiError, ProblemDetail } from "../types";
// Type pour les erreurs API retournées par le backend

// Demo Mode - Intercepteur pour données fictives en soutenance
import { DEMO_MODE_ACTIVE } from "../demo/demoConfig";
import { installDemoInterceptor } from "../demo/demoInterceptor";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * URL de base de l'API.
 * 
 * process.env.REACT_APP_API_URL: Variable d'environnement définie dans .env
 * Fallback: http://localhost:8080/api pour le développement local
 * 
 * En production, définir REACT_APP_API_URL dans le fichier .env.production
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

// =============================================================================
// CRÉATION DE L'INSTANCE AXIOS
// =============================================================================

/**
 * Crée une instance Axios pré-configurée.
 * 
 * Toutes les requêtes faites avec "api" utiliseront cette config.
 * 
 * Configuration:
 * - baseURL: Toutes les URLs seront relatives à cette base
 * - headers: Headers par défaut pour toutes les requêtes
 * - timeout: Temps max d'attente (30 secondes)
 */
const api = axios.create({
  baseURL: API_BASE_URL,                    // Ex: api.get("/tickets") → GET http://localhost:8080/api/tickets
  headers: {
    "Content-Type": "application/json",    // On envoie du JSON
  },
  timeout: 30000,                           // 30 secondes max
});

// =============================================================================
// DEMO MODE — Development/presentation only (disabled in production builds)
// =============================================================================
// When REACT_APP_DEMO_MODE=true (dev only), all requests return local data
// without contacting the backend. Blocked in NODE_ENV=production.
// =============================================================================
if (DEMO_MODE_ACTIVE) {
  installDemoInterceptor(api);
}

// =============================================================================
// INTERCEPTEUR DE REQUÊTE
// =============================================================================

/**
 * Intercepteur exécuté AVANT chaque requête.
 * 
 * RÔLE: Ajouter automatiquement le token JWT dans le header Authorization.
 * 
 * Sans cet intercepteur, il faudrait écrire:
 * api.get("/tickets", { headers: { Authorization: `Bearer ${token}` } })
 * 
 * Avec l'intercepteur, on écrit simplement:
 * api.get("/tickets")
 */
api.interceptors.request.use(
  // Fonction de succès: modifie la config avant envoi
  (config: InternalAxiosRequestConfig) => {
    // Récupère le token stocké dans localStorage
    const token = localStorage.getItem("token");
    
    // Si on a un token et que config.headers existe
    if (token && config.headers) {
      // Ajoute le header Authorization avec le format "Bearer <token>"
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Retourne la config modifiée
    return config;
  },
  // Fonction d'erreur: si la préparation de la requête échoue
  (error) => Promise.reject(error)
);

// =============================================================================
// INTERCEPTEUR DE RÉPONSE
// =============================================================================

/**
 * Intercepteur exécuté APRÈS chaque réponse.
 * 
 * GESTION DU TOKEN REFRESH:
 * Sur erreur 401, tente automatiquement un refresh du token.
 * Si le refresh réussit, relance la requête originale.
 * Si le refresh échoue, déconnecte l'utilisateur.
 */

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  
  async (error: AxiosError<ApiError | ProblemDetail>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si 401 et pas déjà une tentative de refresh
    const status = error.response?.status;
    
    if (status === 401 && !originalRequest._retry) {
      
      // Ne pas intercepter les requêtes d'auth elles-mêmes
      if (originalRequest.url?.includes("/auth/login") ||
          originalRequest.url?.includes("/auth/register") ||
          originalRequest.url?.includes("/auth/google") ||
          originalRequest.url?.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Attendre que le refresh en cours se termine
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const { accessToken: newToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem("token", newToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — clear auth state cleanly
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        // Dispatch Redux logout to reset state without hard reload
        const { default: store } = await import('../redux/store');
        store.dispatch({ type: 'auth/logout' });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Export par défaut de l'instance configurée
export default api;

// =============================================================================
// FONCTION UTILITAIRE: Extraction du message d'erreur
// =============================================================================

/**
 * Extrait un message d'erreur lisible à partir d'une erreur.
 * 
 * Les erreurs peuvent venir de différentes sources:
 * - Erreur Axios (réponse du serveur)
 * - Erreur réseau (pas de connexion)
 * - Erreur JavaScript (bug dans le code)
 * 
 * Cette fonction gère tous les cas et retourne un message utilisable.
 * 
 * @param error L'erreur à analyser (type unknown car peut être n'importe quoi)
 * @returns Un message d'erreur lisible en français
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        return "La requête a expiré. Vérifiez votre connexion internet.";
      }
      if (error.code === "ERR_NETWORK") {
        return "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
      }
      return "Erreur réseau. Vérifiez votre connexion internet.";
    }

    const data = error.response?.data;
    const status = error.response?.status;

    // Handle specific HTTP status codes with user-friendly messages
    if (status === 429) {
      const retryAfter = data && typeof data === "object" && "properties" in data
        ? (data as ProblemDetail).properties?.retryAfterSeconds
        : undefined;
      return retryAfter 
        ? `Trop de requêtes. Réessayez dans ${retryAfter} secondes.`
        : "Trop de requêtes. Veuillez patienter avant de réessayer.";
    }

    if (status === 503) {
      return "Le service est temporairement indisponible. Réessayez dans quelques instants.";
    }

    if (data && typeof data === "object") {
      // RFC 7807 Problem Detail
      if ("detail" in data && typeof (data as ProblemDetail).detail === "string") {
        return (data as ProblemDetail).detail;
      }
      // Legacy ApiError
      if ("message" in data && typeof (data as ApiError).message === "string") {
        return (data as ApiError).message;
      }
    }
    return error.message || "Une erreur est survenue";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inattendue est survenue";
};

/**
 * Extrait les erreurs de validation d'une réponse ProblemDetail.
 * 
 * @param error L'erreur à analyser
 * @returns Map de champ → message d'erreur, ou null si pas d'erreurs de validation
 */
export const getValidationErrors = (error: unknown): Record<string, string> | null => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "properties" in data) {
      const problemDetail = data as ProblemDetail;
      if (problemDetail.properties?.validationErrors) {
        return problemDetail.properties.validationErrors;
      }
    }
  }
  return null;
};

/**
 * Extrait le traceId d'une erreur pour le support technique.
 * 
 * @param error L'erreur à analyser
 * @returns Le traceId ou null
 */
export const getErrorTraceId = (error: unknown): string | null => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "properties" in data) {
      const problemDetail = data as ProblemDetail;
      return problemDetail.properties?.traceId || null;
    }
  }
  return null;
};

/**
 * Vérifie si l'erreur est une erreur réseau (pas de réponse du serveur).
 */
export const isNetworkError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && !error.response;
};

/**
 * Vérifie si l'erreur est une erreur de validation (400 avec validationErrors).
 */
export const isValidationError = (error: unknown): boolean => {
  return getValidationErrors(error) !== null;
};
