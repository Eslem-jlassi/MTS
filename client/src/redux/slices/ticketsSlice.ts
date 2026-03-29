// =============================================================================
// MTS TELECOM - Redux Slice pour les Tickets
// =============================================================================
/**
 * ============================================================================
 * ticketsSlice.ts - Gestion de l'état des tickets avec Redux Toolkit
 * ============================================================================
 *
 * QU'EST-CE QU'UN REDUX SLICE?
 * ----------------------------
 * Un "slice" est une portion du state Redux qui gère un domaine spécifique.
 * Ici, on gère tout ce qui concerne les tickets:
 * - Liste des tickets
 * - Ticket sélectionné
 * - Commentaires et historique
 * - Pagination et filtres
 * - État de chargement et erreurs
 *
 * ARCHITECTURE REDUX:
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │                         REDUX STORE                                    │
 * │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐                │
 * │  │  authSlice   │  │ ticketsSlice │  │ dashboardSlice│                │
 * │  │ (auth state) │  │(tickets state)│ │(dashboard state)│               │
 * │  └──────────────┘  └──────────────┘  └───────────────┘                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ASYNC THUNKS:
 * Les opérations asynchrones (appels API) sont gérées par createAsyncThunk.
 * Chaque thunk génère 3 actions automatiquement:
 * - pending: Début de l'appel (isLoading = true)
 * - fulfilled: Succès (données reçues)
 * - rejected: Échec (erreur)
 *
 * ============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
// - createSlice: Crée un slice avec reducers et actions
// - createAsyncThunk: Crée des actions asynchrones (pour les appels API)
// - PayloadAction: Type pour les actions avec payload

// Service API pour les tickets
import { ticketService } from "../../api";

// Types TypeScript
import {
  Ticket, // Entité ticket
  CreateTicketRequest, // Données pour créer un ticket
  TicketStatusChangeRequest, // Données pour changer le statut
  TicketAssignRequest, // Données pour assigner
  TicketFilterParams, // Filtres de recherche
  PageRequest, // Paramètres de pagination
  PageResponse, // Réponse paginée
  TicketComment, // Commentaire sur un ticket
  CreateCommentRequest, // Données pour créer un commentaire
  TicketHistory, // Historique des modifications
} from "../../types";

// =============================================================================
// INTERFACE DE L'ÉTAT
// =============================================================================

/**
 * Interface définissant la structure de l'état des tickets.
 *
 * Ceci est le "shape" (forme) de state.tickets dans le store Redux.
 */
interface TicketsState {
  // Liste des tickets affichés
  tickets: Ticket[];

  // Ticket actuellement sélectionné (pour la vue détail)
  selectedTicket: Ticket | null;

  // Commentaires du ticket sélectionné
  comments: TicketComment[];

  // Historique du ticket sélectionné
  history: TicketHistory[];

  // Pagination - Nombre total d'éléments
  totalElements: number;

  // Pagination - Nombre total de pages
  totalPages: number;

  // Pagination - Page courante (0-indexed)
  currentPage: number;

  // Pagination - Nombre d'éléments par page
  pageSize: number;

  // Indicateur de chargement (pour la liste)
  isLoading: boolean;

  // Indicateur de chargement (pour les détails)
  isLoadingDetails: boolean;

  // Message d'erreur (null si pas d'erreur)
  error: string | null;

  // Filtres de recherche actifs
  filters: TicketFilterParams;
}

// =============================================================================
// ÉTAT INITIAL
// =============================================================================

/**
 * État initial du slice.
 * C'est l'état au démarrage de l'application, avant tout chargement.
 */
const initialState: TicketsState = {
  tickets: [],
  selectedTicket: null,
  comments: [],
  history: [],
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  pageSize: 10,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  filters: {},
};

// =============================================================================
// ASYNC THUNKS - Actions asynchrones (appels API)
// =============================================================================

/**
 * Récupère la liste des tickets avec filtres et pagination.
 *
 * SYNTAXE createAsyncThunk:
 * createAsyncThunk<ReturnType, ArgType, ThunkConfig>(actionName, asyncFunction)
 *
 * - ReturnType: Ce que retourne la fonction (PageResponse<Ticket>)
 * - ArgType: Les arguments passés ({ filters, page })
 * - ThunkConfig: Configuration (ici, rejectValue pour typer l'erreur)
 */
export const fetchTickets = createAsyncThunk<
  PageResponse<Ticket>, // Type de retour
  { filters?: TicketFilterParams; page?: PageRequest }, // Arguments
  { rejectValue: string } // Config (type de l'erreur)
>("tickets/fetchTickets", async ({ filters, page }, { rejectWithValue }) => {
  try {
    // Appelle l'API
    return await ticketService.getTickets(filters, page);
  } catch (error: any) {
    // En cas d'erreur, retourne un message
    return rejectWithValue(error.response?.data?.message || "Erreur de chargement des tickets");
  }
});

/**
 * Récupère un ticket par son ID.
 */
export const fetchTicketById = createAsyncThunk<Ticket, number, { rejectValue: string }>(
  "tickets/fetchTicketById",
  async (id, { rejectWithValue }) => {
    try {
      return await ticketService.getTicketById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Ticket non trouvé");
    }
  },
);

/**
 * Crée un nouveau ticket.
 */
export const createTicket = createAsyncThunk<Ticket, CreateTicketRequest, { rejectValue: string }>(
  "tickets/createTicket",
  async (request, { rejectWithValue }) => {
    try {
      return await ticketService.createTicket(request);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur de création du ticket");
    }
  },
);

/**
 * Change le statut d'un ticket.
 */
export const changeTicketStatus = createAsyncThunk<
  Ticket,
  { id: number; request: TicketStatusChangeRequest },
  { rejectValue: string }
>("tickets/changeStatus", async ({ id, request }, { rejectWithValue }) => {
  try {
    return await ticketService.changeStatus(id, request);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Erreur de changement de statut");
  }
});

/**
 * Assigne un ticket à un agent.
 */
export const assignTicket = createAsyncThunk<
  Ticket,
  { id: number; request: TicketAssignRequest },
  { rejectValue: string }
>("tickets/assignTicket", async ({ id, request }, { rejectWithValue }) => {
  try {
    return await ticketService.assignTicket(id, request);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Erreur d'assignation");
  }
});

/**
 * Récupère les commentaires d'un ticket.
 */
export const fetchComments = createAsyncThunk<TicketComment[], number, { rejectValue: string }>(
  "tickets/fetchComments",
  async (ticketId, { rejectWithValue }) => {
    try {
      return await ticketService.getComments(ticketId);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur de chargement des commentaires",
      );
    }
  },
);

/**
 * Ajoute un commentaire à un ticket.
 */
export const addComment = createAsyncThunk<
  TicketComment,
  { ticketId: number; request: CreateCommentRequest },
  { rejectValue: string }
>("tickets/addComment", async ({ ticketId, request }, { rejectWithValue }) => {
  try {
    return await ticketService.addComment(ticketId, request);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Erreur d'ajout du commentaire");
  }
});

/**
 * Récupère l'historique des modifications d'un ticket.
 */
export const fetchHistory = createAsyncThunk<TicketHistory[], number, { rejectValue: string }>(
  "tickets/fetchHistory",
  async (ticketId, { rejectWithValue }) => {
    try {
      return await ticketService.getHistory(ticketId);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur de chargement de l'historique",
      );
    }
  },
);

// =============================================================================
// CRÉATION DU SLICE
// =============================================================================

/**
 * Le slice combine:
 * - name: Nom unique du slice
 * - initialState: État initial
 * - reducers: Actions synchrones
 * - extraReducers: Gestion des actions asynchrones
 */
const ticketsSlice = createSlice({
  name: "tickets",
  initialState,

  // =========================================================================
  // REDUCERS - Actions synchrones
  // =========================================================================
  /**
   * Les reducers sont des fonctions qui modifient l'état.
   * Grâce à Immer (intégré dans Redux Toolkit), on peut écrire
   * du code qui semble muter l'état, mais qui est en fait immutable.
   *
   * Exemple: state.selectedTicket = null;
   * Semble muter, mais crée un nouvel objet en coulisse.
   */
  reducers: {
    /**
     * Réinitialise le ticket sélectionné et ses données associées.
     * Appelé quand on quitte la vue détail.
     */
    clearSelectedTicket: (state) => {
      state.selectedTicket = null;
      state.comments = [];
      state.history = [];
    },

    /**
     * Met à jour les filtres de recherche.
     * PayloadAction<T> type l'action avec son payload.
     */
    setFilters: (state, action: PayloadAction<TicketFilterParams>) => {
      state.filters = action.payload;
    },

    /**
     * Réinitialise les filtres.
     */
    clearFilters: (state) => {
      state.filters = {};
    },

    /**
     * Efface le message d'erreur.
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Change la page courante.
     */
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
  },

  // =========================================================================
  // EXTRA REDUCERS - Gestion des actions asynchrones
  // =========================================================================
  /**
   * extraReducers gère les actions des createAsyncThunk.
   *
   * Chaque thunk génère 3 actions:
   * - .pending: L'appel API a commencé
   * - .fulfilled: L'appel a réussi
   * - .rejected: L'appel a échoué
   *
   * builder.addCase() associe une action à un handler.
   */
  extraReducers: (builder) => {
    // =========================================================================
    // FETCH TICKETS (Liste)
    // =========================================================================

    // Début du chargement
    builder.addCase(fetchTickets.pending, (state) => {
      state.isLoading = true; // Active le spinner
      state.error = null; // Reset l'erreur
    });

    // Succès - on reçoit la page de tickets
    builder.addCase(fetchTickets.fulfilled, (state, action) => {
      state.isLoading = false;
      state.tickets = action.payload.content; // Les tickets
      state.totalElements = action.payload.totalElements; // Nombre total
      state.totalPages = action.payload.totalPages; // Nombre de pages
      state.currentPage = action.payload.number; // Page courante
      state.pageSize = action.payload.size; // Taille de page
    });

    // Échec - on stocke l'erreur
    builder.addCase(fetchTickets.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur";
    });

    // =========================================================================
    // FETCH TICKET BY ID (Détail)
    // =========================================================================

    builder.addCase(fetchTicketById.pending, (state) => {
      state.isLoadingDetails = true; // Spinner pour les détails
      state.error = null;
    });

    builder.addCase(fetchTicketById.fulfilled, (state, action) => {
      state.isLoadingDetails = false;
      state.selectedTicket = action.payload; // Stocke le ticket
    });

    builder.addCase(fetchTicketById.rejected, (state, action) => {
      state.isLoadingDetails = false;
      state.error = action.payload || "Erreur";
    });

    // =========================================================================
    // CREATE TICKET
    // =========================================================================

    builder.addCase(createTicket.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });

    builder.addCase(createTicket.fulfilled, (state, action) => {
      state.isLoading = false;
      // Ajoute le nouveau ticket au début de la liste
      state.tickets.unshift(action.payload);
      state.totalElements += 1;
    });

    builder.addCase(createTicket.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur";
    });

    // =========================================================================
    // CHANGE STATUS
    // =========================================================================

    builder.addCase(changeTicketStatus.fulfilled, (state, action) => {
      const index = state.tickets.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tickets[index] = action.payload;
      }
      if (state.selectedTicket?.id === action.payload.id) {
        state.selectedTicket = action.payload;
      }
    });

    // =========================================================================
    // ASSIGN TICKET
    // =========================================================================

    builder.addCase(assignTicket.fulfilled, (state, action) => {
      const index = state.tickets.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tickets[index] = action.payload;
      }
      if (state.selectedTicket?.id === action.payload.id) {
        state.selectedTicket = action.payload;
      }
    });

    // =========================================================================
    // COMMENTAIRES
    // =========================================================================

    // Récupération des commentaires
    builder.addCase(fetchComments.fulfilled, (state, action) => {
      state.comments = action.payload;
    });

    // Ajout d'un commentaire
    builder.addCase(addComment.fulfilled, (state, action) => {
      state.comments.push(action.payload); // Ajoute à la fin
    });

    // =========================================================================
    // HISTORIQUE
    // =========================================================================

    builder.addCase(fetchHistory.fulfilled, (state, action) => {
      state.history = action.payload;
    });
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

// Export des actions synchrones (pour les dispatch)
export const { clearSelectedTicket, setFilters, clearFilters, clearError, setPage } =
  ticketsSlice.actions;

// Export du reducer (pour le store)
export default ticketsSlice.reducer;
// =============================================================================
// FIN DU SLICE TICKETS
// =============================================================================
