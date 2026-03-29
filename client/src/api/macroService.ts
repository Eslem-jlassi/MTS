import api from "./client";
import { QuickReplyTemplate, QuickReplyTemplateRequest, QuickReplyCategory } from "../types";

const MACROS_PREFIX = "/macros";

// =============================================================================
// TYPES EXISTANTS (backward-compatible)
// =============================================================================

export interface Macro {
  id: number;
  name: string;
  content: string;
  roleAllowed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MacroRequest {
  name: string;
  content: string;
  roleAllowed?: string | null;
}

const QUICK_REPLIES_PREFIX = "/quick-replies";

// =============================================================================
// SERVICE MACROS (Real API)
// =============================================================================

export const macroService = {
  list: async (): Promise<Macro[]> => {
    const response = await api.get<Macro[]>(MACROS_PREFIX);
    return response.data;
  },

  getById: async (id: number): Promise<Macro> => {
    const response = await api.get<Macro>(`${MACROS_PREFIX}/${id}`);
    return response.data;
  },

  create: async (request: MacroRequest): Promise<Macro> => {
    const response = await api.post<Macro>(MACROS_PREFIX, request);
    return response.data;
  },

  update: async (id: number, request: MacroRequest): Promise<Macro> => {
    const response = await api.put<Macro>(`${MACROS_PREFIX}/${id}`, request);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${MACROS_PREFIX}/${id}`);
  },
};

// =============================================================================
// SERVICE QUICK REPLIES (Real API — /api/quick-replies)
// =============================================================================

/** Labels de catégories de templates */
export const QuickReplyCategoryLabels: Record<QuickReplyCategory, string> = {
  accuse: "Accusé de réception",
  info: "Demande d'info",
  resolution: "Résolution",
  cloture: "Clôture",
  escalade: "Escalade",
  custom: "Personnalisé",
};

/**
 * Substitue les variables d'un template par leurs valeurs.
 * Ex: "{client}" → "Acme Corp", "{ticketId}" → "TK-00123"
 */
export function substituteVariables(content: string, context: Record<string, string>): string {
  let result = content;
  Object.entries(context).forEach(([key, value]) => {
    // Supporte à la fois {client} et client comme clés
    const keyWithBraces = key.startsWith("{") ? key : `{${key}}`;
    result = result.replaceAll(keyWithBraces, value);
  });
  return result;
}

/**
 * Service de Quick Replies — appels API réels vers /api/quick-replies.
 */
export const quickReplyService = {
  /** Liste tous les templates accessibles pour le rôle de l'utilisateur courant */
  list: async (_userRole?: string): Promise<QuickReplyTemplate[]> => {
    const response = await api.get<QuickReplyTemplate[]>(QUICK_REPLIES_PREFIX);
    return response.data;
  },

  /** Récupère un template par ID */
  getById: async (id: number): Promise<QuickReplyTemplate | undefined> => {
    const response = await api.get<QuickReplyTemplate>(`${QUICK_REPLIES_PREFIX}/${id}`);
    return response.data;
  },

  /** Crée un nouveau template */
  create: async (request: QuickReplyTemplateRequest): Promise<QuickReplyTemplate> => {
    const response = await api.post<QuickReplyTemplate>(QUICK_REPLIES_PREFIX, request);
    return response.data;
  },

  /** Met à jour un template existant */
  update: async (id: number, request: QuickReplyTemplateRequest): Promise<QuickReplyTemplate> => {
    const response = await api.put<QuickReplyTemplate>(`${QUICK_REPLIES_PREFIX}/${id}`, request);
    return response.data;
  },

  /** Supprime un template */
  delete: async (id: number): Promise<void> => {
    await api.delete(`${QUICK_REPLIES_PREFIX}/${id}`);
  },
};

export default macroService;
