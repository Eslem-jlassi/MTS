// =============================================================================
// MTS TELECOM - Service de détection de doublons via backend Spring Boot
// =============================================================================

import api from "./client";

export interface NewTicket {
  title: string;
  description?: string;
  service?: string;
  client_id?: number;
  created_at?: string;
}

export interface RecentTicket {
  id: number;
  title: string;
  description?: string;
  service?: string;
  status?: string;
  created_at?: string;
}

export interface DuplicateRequest {
  new_ticket: NewTicket;
  recent_tickets: RecentTicket[];
}

export interface MatchedTicket {
  ticket_id: number;
  title: string;
  similarity_score: number;
  duplicate_level: "HIGH" | "MEDIUM" | "LOW";
}

export interface DuplicateResponse {
  available?: boolean;
  message?: string;
  is_duplicate: boolean;
  possible_mass_incident: boolean;
  duplicate_confidence: number;
  matched_tickets: MatchedTicket[];
  reasoning: string;
  recommendation: string;
}

export interface DuplicateHealthResponse {
  available?: boolean;
  message?: string;
  status: string;
  service: string;
  version: string;
  model_loaded: boolean;
  model_name: string;
  mode: string;
}

export const duplicateService = {
  detectDuplicates: async (
    newTicket: NewTicket,
    recentTickets: RecentTicket[],
  ): Promise<DuplicateResponse> => {
    const { data } = await api.post<DuplicateResponse>("/ai/duplicates/detect", {
      new_ticket: newTicket,
      recent_tickets: recentTickets,
    });

    if (data?.available === false) {
      throw new Error(data.message || "La détection de doublons est indisponible.");
    }

    return data;
  },

  healthCheck: async (): Promise<DuplicateHealthResponse> => {
    const { data } = await api.get<DuplicateHealthResponse>("/ai/duplicates/health");
    return data;
  },
};
