// =============================================================================
// MTS TELECOM - Configuration du Store Redux
// =============================================================================
/**
 * ============================================================================
 * store.ts - Configuration centrale de Redux
 * ============================================================================
 * 
 * QU'EST-CE QUE REDUX?
 * --------------------
 * Redux est une bibliothèque de gestion d'état (state management).
 * Elle permet de stocker les données de l'application dans un "store" central
 * accessible depuis n'importe quel composant.
 * 
 * POURQUOI UTILISER REDUX?
 * - Évite le "prop drilling" (passer des props de parent en enfant en enfant...)
 * - État prévisible et débuggable (Redux DevTools)
 * - Séparation des préoccupations (logique métier dans les slices)
 * - Persistance facile (redux-persist)
 * 
 * CONCEPTS CLÉS:
 * 1. STORE: L'objet qui contient tout l'état de l'application
 * 2. SLICE: Une portion du state avec ses reducers et actions
 * 3. ACTION: Un événement qui décrit ce qui s'est passé
 * 4. REDUCER: Fonction qui calcule le nouvel état basé sur l'action
 * 5. DISPATCH: Méthode pour envoyer une action au store
 * 
 * FLUX REDUX:
 * Composant → dispatch(action) → Reducer → Nouveau State → Composant re-render
 * 
 * REDUX TOOLKIT:
 * Redux Toolkit est la méthode officielle recommandée pour écrire du Redux.
 * Elle simplifie la configuration et réduit le boilerplate.
 * 
 * ============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * configureStore: Fonction de Redux Toolkit pour créer le store.
 * Elle combine automatiquement:
 * - Les reducers
 * - Le middleware Redux Thunk (pour les actions asynchrones)
 * - Les Redux DevTools (extension navigateur pour debug)
 */
import { configureStore } from "@reduxjs/toolkit";

/**
 * Import des reducers depuis chaque slice.
 * Chaque slice gère une partie spécifique de l'état:
 * - authReducer: Gestion de l'authentification (user, token, isAuthenticated)
 * - ticketsReducer: Gestion des tickets (liste, filtrés, pagination)
 * - dashboardReducer: Statistiques du tableau de bord
 */
import authReducer from "./slices/authSlice";
import ticketsReducer from "./slices/ticketsSlice";
import dashboardReducer from "./slices/dashboardSlice";
import notificationsReducer from "./slices/notificationsSlice";

// =============================================================================
// CRÉATION DU STORE
// =============================================================================

/**
 * Création du store Redux avec configureStore.
 * 
 * STRUCTURE DU STATE:
 * {
 *   auth: {
 *     user: { id, email, firstName, lastName, role },
 *     token: "eyJhbGciOiJIUzI1NiJ9...",
 *     isAuthenticated: true,
 *     isLoading: false,
 *     error: null
 *   },
 *   tickets: {
 *     tickets: [...],
 *     selectedTicket: {...},
 *     isLoading: false,
 *     error: null
 *   },
 *   dashboard: {
 *     stats: { totalTickets: 42, activeTickets: 10, ... },
 *     isLoading: false
 *   }
 * }
 * 
 * ACCÈS AU STATE:
 * Dans un composant: const { user } = useSelector(state => state.auth)
 */
const store = configureStore({
  // ==========================================================================
  // REDUCERS
  // ==========================================================================
  // Chaque clé devient un "slice" du state global
  // auth, tickets, dashboard sont les noms des slices
  reducer: {
    auth: authReducer,             // state.auth
    tickets: ticketsReducer,       // state.tickets
    dashboard: dashboardReducer,   // state.dashboard
    notifications: notificationsReducer, // state.notifications
  },
  
  // ==========================================================================
  // MIDDLEWARE
  // ==========================================================================
  // Les middlewares interceptent les actions avant qu'elles n'atteignent le reducer
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Ignore les chemins contenant des objets non-sérialisables (ex: dates)
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/googleLogin/fulfilled', 'auth/refreshToken/fulfilled'],
        ignoredPaths: ['auth.user.createdAt', 'auth.user.lastLoginAt', 'tickets.items'],
      },
    }),
});

// =============================================================================
// EXPORT DU STORE
// =============================================================================

/**
 * Export par défaut du store.
 * Utilisé dans index.tsx pour envelopper l'app avec <Provider store={store}>
 */
export default store;

// =============================================================================
// TYPES TYPESCRIPT
// =============================================================================

/**
 * RootState: Type représentant la structure complète du state.
 * 
 * ReturnType<typeof store.getState>: Infère le type automatiquement
 * à partir de la structure du store.
 * 
 * UTILISATION:
 * const { user } = useSelector((state: RootState) => state.auth);
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * AppDispatch: Type pour la fonction dispatch.
 * 
 * Utilisé pour avoir le bon typage avec useDispatch.
 * Permet de dispatcher des actions normales ET des thunks (async).
 * 
 * UTILISATION:
 * const dispatch = useDispatch<AppDispatch>();
 * dispatch(loginUser({ email, password })); // thunk async
 */
export type AppDispatch = typeof store.dispatch;
