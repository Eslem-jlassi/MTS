// =============================================================================
// MTS TELECOM - Service d'analyse de sentiment via backend Spring Boot
// =============================================================================

import api from "./client";

export interface SentimentRequest {
  title: string;
  description?: string;
}

export interface SentimentResponse {
  available?: boolean;
  message?: string;
  category: string;
  priority: string;
  service: string;
  urgency: string;
  sentiment: string;
  criticality: string;
  confidence: number;
  reasoning: string;
  score?: number;
  label?: string;
  details?: string;
  stars?: number;
  is_angry?: boolean;
  priority_flag?: string;
  model_version?: string;
  fallback_mode?: string;
  reasoning_steps?: string[];
  recommended_actions?: string[];
  risk_flags?: string[];
  missing_information?: string[];
  sources?: string[];
  latency_ms?: number;
}

export interface SentimentHealthResponse {
  available?: boolean;
  message?: string;
  status: string;
  service: string;
  version: string;
  model_loaded: boolean;
  mode: string;
}

export const sentimentService = {
  analyze: async (title: string, description?: string): Promise<SentimentResponse> => {
    const { data } = await api.post<SentimentResponse>("/ai/sentiment/analyze", {
      title,
      description,
    });

    if (data?.available === false) {
      throw new Error(data.message || "L'analyse IA est indisponible.");
    }

    const rawConfidence = typeof data.confidence === "number" ? data.confidence : 0;
    const confidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;

    const rawSentiment = (data.sentiment || "NEUTRE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    const isNegative = rawSentiment === "NEGATIF" || rawSentiment === "NEGATIVE";
    const priority =
      data.priority ||
      (data.is_angry
        ? "HIGH"
        : data.priority_flag === "URGENT_EMOTIONAL"
          ? "CRITICAL"
          : isNegative
            ? "MEDIUM"
            : "LOW");
    const criticality =
      data.criticality ||
      (data.is_angry || data.priority_flag === "URGENT_EMOTIONAL" ? "HIGH" : "NORMAL");

    return {
      ...data,
      sentiment: rawSentiment,
      confidence,
      priority,
      criticality,
      category: data.category || "N/A",
      service: data.service || "N/A",
      urgency: data.urgency || (data.priority_flag === "URGENT_EMOTIONAL" ? "URGENT" : "NORMAL"),
      reasoning:
        data.reasoning ||
        `Sentiment ${data.sentiment} (score: ${data.score ?? "?"}/5, ${data.stars ?? "?"} etoiles)`,
      model_version: data.model_version || "sentiment-hybrid-2.1.0",
      fallback_mode: data.fallback_mode || "gateway_unspecified",
      reasoning_steps: Array.isArray(data.reasoning_steps) ? data.reasoning_steps : [],
      recommended_actions: Array.isArray(data.recommended_actions) ? data.recommended_actions : [],
      risk_flags: Array.isArray(data.risk_flags) ? data.risk_flags : [],
      missing_information: Array.isArray(data.missing_information) ? data.missing_information : [],
      sources: Array.isArray(data.sources) ? data.sources : [],
      latency_ms: typeof data.latency_ms === "number" ? data.latency_ms : undefined,
    };
  },

  healthCheck: async (): Promise<SentimentHealthResponse> => {
    const { data } = await api.get<SentimentHealthResponse>("/ai/sentiment/health");
    return data;
  },
};
