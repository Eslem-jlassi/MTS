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
  confidence?: number;
  matched_tickets: MatchedTicket[];
  reasoning: string;
  recommendation: string;
  model_version?: string;
  fallback_mode?: string;
  reasoning_steps?: string[];
  recommended_actions?: string[];
  risk_flags?: string[];
  missing_information?: string[];
  sources?: string[];
  latency_ms?: number;
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

    return {
      ...data,
      confidence:
        typeof data.confidence === "number" ? data.confidence : data.duplicate_confidence || 0,
      model_version: data.model_version || "duplicate-detector-1.1.0",
      fallback_mode: data.fallback_mode || "gateway_unspecified",
      reasoning_steps: Array.isArray(data.reasoning_steps) ? data.reasoning_steps : [],
      recommended_actions: Array.isArray(data.recommended_actions) ? data.recommended_actions : [],
      risk_flags: Array.isArray(data.risk_flags) ? data.risk_flags : [],
      missing_information: Array.isArray(data.missing_information) ? data.missing_information : [],
      sources: Array.isArray(data.sources) ? data.sources : [],
      latency_ms: typeof data.latency_ms === "number" ? data.latency_ms : undefined,
    };
  },

  healthCheck: async (): Promise<DuplicateHealthResponse> => {
    const { data } = await api.get<DuplicateHealthResponse>("/ai/duplicates/health");
    return data;
  },
};
