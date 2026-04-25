import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ApiError, ProblemDetail } from "../types";
import { authStorage } from "./authStorage";
import { DEMO_MODE_ACTIVE } from "../demo/demoConfig";
import { installDemoInterceptor } from "../demo/demoInterceptor";

const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000,
});

if (DEMO_MODE_ACTIVE) {
  installDemoInterceptor(api);
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error?: unknown) => {
  failedQueue.forEach((pendingRequest) => {
    if (error) {
      pendingRequest.reject(error);
      return;
    }
    pendingRequest.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: AxiosError<ApiError | ProblemDetail>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register") ||
        originalRequest.url?.includes("/auth/google") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        });

        processQueue();
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        authStorage.clearSession();
        const { default: store } = await import("../redux/store");
        store.dispatch({ type: "auth/sessionExpired" });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
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

    if (status === 429) {
      const retryAfter =
        data && typeof data === "object" && "properties" in data
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
      if ("detail" in data && typeof (data as ProblemDetail).detail === "string") {
        return (data as ProblemDetail).detail;
      }
      if ("message" in data && typeof (data as ApiError).message === "string") {
        return (data as ApiError).message;
      }
    }

    if (status === 400) {
      return "Requete invalide. Verifiez les informations saisies.";
    }
    if (status === 401) {
      return "Authentification invalide ou expiree.";
    }
    if (status === 403) {
      return "Acces refuse pour cette operation.";
    }
    if (status === 404) {
      return "Ressource introuvable.";
    }
    if (status >= 500) {
      return "Une erreur serveur est survenue. Reessayez dans quelques instants.";
    }

    return error.message || "Une erreur est survenue";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inattendue est survenue";
};

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

export const isNetworkError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && !error.response;
};

export const isValidationError = (error: unknown): boolean => {
  return getValidationErrors(error) !== null;
};
