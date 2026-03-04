// =============================================================================
// MTS TELECOM - Auth Redux Slice (Gestion de l'authentification)
// =============================================================================
/**
 * ============================================================================
 * authSlice.ts - Slice Redux pour l'authentification
 * ============================================================================
 * 
 * QU'EST-CE QU'UN SLICE?
 * ----------------------
 * Un "slice" est une portion du state Redux avec:
 * - Son état initial (initialState)
 * - Ses reducers (fonctions qui modifient l'état)
 * - Ses actions (créées automatiquement par createSlice)
 * 
 * CE SLICE GÈRE:
 * - L'utilisateur connecté (user)
 * - Le token JWT (token)
 * - L'état de connexion (isAuthenticated)
 * - Le chargement (isLoading)
 * - Les erreurs (error)
 * 
 * ASYNC THUNKS:
 * Les "thunks" sont des actions asynchrones (appels API).
 * Ils ont 3 états: pending (en cours), fulfilled (réussi), rejected (échoué)
 * 
 * ============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Redux Toolkit - Fonctions utilitaires
 * - createSlice: Crée un slice avec reducers et actions
 * - createAsyncThunk: Crée une action asynchrone (pour les appels API)
 * - PayloadAction: Type pour les actions avec données
 */
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Service d'authentification (appels API)
import { authService } from "../../api";

// Types TypeScript
import { UserResponse, LoginRequest, RegisterRequest, AuthResponse } from "../../types";

// Type du state global (pour les sélecteurs)
import { RootState } from "../store";

// =============================================================================
// INTERFACE DU STATE
// =============================================================================

/**
 * Définit la structure du state d'authentification.
 * 
 * TypeScript nous aide à éviter les erreurs:
 * - user: L'objet utilisateur ou null si non connecté
 * - token: Le JWT ou null
 * - isAuthenticated: Boolean pour savoir si connecté
 * - isLoading: Boolean pendant les appels API
 * - error: Message d'erreur ou null
 */
interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// ÉTAT INITIAL
// =============================================================================

/**
 * État initial du slice auth.
 * 
 * On récupère les données stockées dans localStorage/cookies
 * pour maintenir la session après un refresh de page.
 * 
 * authService.getStoredUser(): Récupère le user du localStorage
 * authService.getToken(): Récupère le token du localStorage
 * authService.isLoggedIn(): Vérifie si le token existe et est valide
 */
const initialState: AuthState = {
  user: authService.getStoredUser(),     // null si pas de user stocké
  token: authService.getToken(),          // null si pas de token
  isAuthenticated: authService.isLoggedIn(), // true si token valide
  isLoading: false,                       // pas de chargement au démarrage
  error: null,                            // pas d'erreur au démarrage
};

// =============================================================================
// ASYNC THUNKS - Actions asynchrones (appels API)
// =============================================================================

/** Extrait un msg d'erreur exploitable depuis une erreur Axios (ProblemDetail ou legacy). */
function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
  const data = axiosError?.response?.data;
  if (data) {
    // RFC 7807 ProblemDetail
    if (typeof data.detail === "string") return data.detail;
    // Legacy ApiError
    if (typeof data.message === "string") return data.message;
  }
  if (typeof axiosError?.message === "string" && axiosError.message !== "Request failed with status code 400")
    return axiosError.message;
  return fallback;
}

/**
 * THUNK: login - Connexion de l'utilisateur
 */
export const login = createAsyncThunk<AuthResponse, LoginRequest, { rejectValue: string }>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec de connexion"));
    }
  }
);

/**
 * THUNK: register - Inscription d'un nouvel utilisateur
 */
export const register = createAsyncThunk<AuthResponse, RegisterRequest, { rejectValue: string }>(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      return await authService.register(userData);
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec d'inscription"));
    }
  }
);

/**
 * THUNK: googleLogin - Connexion via Google OAuth
 */
export const googleLogin = createAsyncThunk<AuthResponse, string, { rejectValue: string }>(
  "auth/googleLogin",
  async (googleToken, { rejectWithValue }) => {
    try {
      return await authService.googleLogin(googleToken);
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec de connexion Google"));
    }
  }
);

/**
 * THUNK: fetchCurrentUser - Récupère les infos de l'utilisateur connecté
 */
export const fetchCurrentUser = createAsyncThunk<UserResponse, void, { rejectValue: string }>(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getCurrentUser();
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec de récupération du profil"));
    }
  }
);

// =============================================================================
// SLICE PRINCIPAL
// =============================================================================

/**
 * Création du slice auth avec createSlice.
 * 
 * createSlice génère automatiquement:
 * - Les action creators (fonctions pour créer des actions)
 * - Le reducer (fonction qui gère les actions)
 * 
 * STRUCTURE:
 * - name: Nom du slice (préfixe des actions)
 * - initialState: État de départ
 * - reducers: Actions synchrones simples
 * - extraReducers: Gestion des thunks (actions async)
 */
export const authSlice = createSlice({
  name: "auth",
  initialState,
  
  // =========================================================================
  // REDUCERS SYNCHRONES
  // =========================================================================
  // Ces reducers modifient directement le state (grâce à Immer)
  // Immer permet d'écrire du code "mutable" qui reste immutable en coulisses
  
  reducers: {
    /**
     * Action: logout - Déconnexion de l'utilisateur
     * 
     * 1. Appelle authService.logout() pour nettoyer le localStorage
     * 2. Remet tous les champs à leur valeur "déconnecté"
     */
    logout: (state) => {
      authService.logout();          // Async but fire-and-forget for Redux
      state.user = null;
      state.token = null;            // Plus de token
      state.isAuthenticated = false; // Plus connecté
      state.error = null;            // Pas d'erreur
    },
    
    /**
     * Action: clearError - Efface le message d'erreur
     * 
     * Utile quand l'utilisateur ferme une alerte d'erreur.
     */
    clearError: (state) => {
      state.error = null;
    },
    
    /**
     * Action: setUser - Met à jour les infos utilisateur
     * 
     * PayloadAction<T>: L'action contient une "payload" de type T
     * action.payload contient le UserResponse passé en paramètre
     */
    setUser: (state, action: PayloadAction<UserResponse>) => {
      state.user = action.payload;
    },
  },
  
  // =========================================================================
  // EXTRA REDUCERS - Gestion des thunks (actions async)
  // =========================================================================
  // Builder pattern pour ajouter des cases de manière type-safe
  
  extraReducers: (builder) => {
    // ---------------------------------------------------------------------
    // LOGIN THUNK
    // ---------------------------------------------------------------------
    
    // Quand le login commence (appel API en cours)
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;   // Affiche un spinner
      state.error = null;       // Efface les erreurs précédentes
    });
    
    // Quand le login réussit
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;                    // Cache le spinner
      state.user = action.payload.user;           // Stocke l'utilisateur
      state.token = action.payload.accessToken;   // Stocke le token
      state.isAuthenticated = true;               // Marque comme connecté
    });
    
    // Quand le login échoue
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;                           // Cache le spinner
      state.error = action.payload || "Erreur de connexion"; // Affiche l'erreur
    });

    // ---------------------------------------------------------------------
    // REGISTER THUNK
    // ---------------------------------------------------------------------
    
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      // L'utilisateur est automatiquement connecté après inscription
    });
    
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur d'inscription";
    });

    // ---------------------------------------------------------------------
    // FETCH CURRENT USER THUNK
    // ---------------------------------------------------------------------
    
    builder.addCase(fetchCurrentUser.pending, (state) => {
      state.isLoading = true;
    });
    
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;  // Met à jour les infos utilisateur
    });
    
    builder.addCase(fetchCurrentUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur";
    });

    // ---------------------------------------------------------------------
    // GOOGLE LOGIN THUNK
    // ---------------------------------------------------------------------
    
    builder.addCase(googleLogin.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(googleLogin.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
    });
    
    builder.addCase(googleLogin.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur de connexion Google";
    });
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Export des actions synchrones.
 * 
 * Utilisation dans un composant:
 * import { logout, clearError } from './authSlice';
 * dispatch(logout());
 * dispatch(clearError());
 */
export const { logout, clearError, setUser } = authSlice.actions;

// =============================================================================
// SÉLECTEURS
// =============================================================================
/**
 * Les sélecteurs sont des fonctions pour extraire des données du state.
 * 
 * AVANTAGES:
 * - Réutilisables dans plusieurs composants
 * - Facilite le refactoring (si la structure change)
 * - Mémoisation possible avec createSelector (reselect)
 * 
 * UTILISATION:
 * const user = useSelector(selectUser);
 * const isLoading = useSelector(selectIsLoading);
 */

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

/**
 * Export par défaut du reducer.
 * 
 * C'est ce qui est importé dans store.ts:
 * import authReducer from './slices/authSlice';
 */
export default authSlice.reducer;
