import api from "./client";
import {
  ChatbotAnalysis,
  ChatbotApiAnalysis,
  ChatbotApiResponse,
  ChatbotRequest,
  ChatbotResponse,
} from "../types/chatbot";
import { resolveChatLanguage } from "../components/chatbot/chatbotLanguage";

const DEFAULT_UNAVAILABLE_MESSAGE =
  "Assistant temporairement indisponible. Reessayez dans quelques instants.";

const PARTIAL_RESPONSE_MESSAGE =
  "Analyse partielle disponible. Certains composants IA sont temporairement indisponibles.";

const TECHNICAL_BACKEND_MARKERS: string[] = [
  "connection refused",
  "connectexception",
  "socketexception",
  "timed out",
  "timeout",
  "read timed out",
  "http 5",
  "internal server error",
  "service unavailable",
  "gateway fallback",
  "fallback backend",
  "ai-chatbot",
  "java.net",
  "traceback",
  "stacktrace",
  "exception",
  "assistant temporairement indisponible",
  "chatbot ia est indisponible",
  "le chatbot ia est indisponible",
  "analyse partielle disponible",
  "partial analysis is available",
];

const normalizeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const isTechnicalBackendText = (value?: string): boolean => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return TECHNICAL_BACKEND_MARKERS.some((marker) => normalized.includes(marker));
};

const hasUsefulPayload = (response: ChatbotResponse): boolean => {
  const hasBusinessAnswer = Boolean(response.answer && !isTechnicalBackendText(response.answer));
  const hasAnalysis = Boolean(
    response.analysis?.summary || response.analysis?.impact || response.analysis?.nextAction,
  );
  const hasService = Boolean(response.serviceDetected && response.serviceDetected !== "N/A");
  const hasResults = Array.isArray(response.results) && response.results.length > 0;
  const hasActions =
    Array.isArray(response.recommendedActions) &&
    response.recommendedActions.some((item) => item && !isTechnicalBackendText(item));

  return hasBusinessAnswer || hasAnalysis || hasService || hasResults || hasActions;
};

const normalizeAnalysis = (analysis?: ChatbotApiAnalysis | null): ChatbotAnalysis | null => {
  if (!analysis) {
    return null;
  }

  const summary = normalizeString(analysis.summary);
  const impact = normalizeString(analysis.impact);
  const nextAction = normalizeString(analysis.next_action);
  const missingInformation = normalizeStringArray(analysis.missing_information);

  if (!summary && !impact && !nextAction && missingInformation.length === 0) {
    return null;
  }

  const safeSummary = summary || impact || nextAction || "Analyse partielle disponible.";

  return {
    summary: safeSummary,
    probableCause: normalizeString(analysis.probable_cause) || undefined,
    knownResolution: normalizeString(analysis.known_resolution) || undefined,
    workaround: normalizeString(analysis.workaround) || undefined,
    impact: impact || "Impact a confirmer.",
    nextAction: nextAction || "Completer les informations manquantes.",
    clarificationNeeded: Boolean(analysis.clarification_needed),
    missingInformation,
    caution: normalizeString(analysis.caution) || undefined,
    draftTicketTitle: normalizeString(analysis.draft_ticket_title) || undefined,
  };
};

const normalizeChatbotResponse = (data: ChatbotApiResponse | undefined): ChatbotResponse => {
  const apiData = data ?? ({} as Partial<ChatbotApiResponse>);
  const results = Array.isArray(apiData.results) ? apiData.results : [];
  const normalizedAnalysis = normalizeAnalysis(apiData.analysis);
  const explicitMissingInformation = normalizeStringArray(apiData.missing_information);
  const normalizedMissingInformation =
    explicitMissingInformation.length > 0
      ? explicitMissingInformation
      : normalizedAnalysis?.missingInformation || [];
  const normalizedAnswer = normalizeString(apiData.answer);
  const safeBusinessAnswer =
    normalizedAnswer && !isTechnicalBackendText(normalizedAnswer)
      ? normalizedAnswer
      : normalizedAnalysis?.summary || "Analyse partielle disponible.";

  return {
    available: apiData.available,
    message: normalizeString(apiData.message) || undefined,
    answer: safeBusinessAnswer,
    confidence: normalizeString(apiData.confidence, "low"),
    topScore: apiData.top_score,
    serviceDetected: normalizeString(apiData.service_detected, "N/A"),
    serviceDetectionConfidence: normalizeString(apiData.service_detection_confidence, "low"),
    responseLanguage: apiData.response_language === "en" ? "en" : "fr",
    analysis: normalizedAnalysis,
    results: results
      .map((result, index) => ({
        docType: normalizeString(result.doc_type, "document"),
        title: normalizeString(result.title),
        serviceName: normalizeString(result.service_name, "N/A"),
        language: normalizeString(result.language, "fr"),
        score: typeof result.score === "number" ? result.score : 0,
        docId: normalizeString(result.doc_id, `doc-${index + 1}`),
      }))
      .filter((result) => Boolean(result.title)),
    massiveIncidentCandidate: apiData.massive_incident_candidate
      ? {
          detectedService: normalizeString(apiData.massive_incident_candidate.detected_service, "N/A"),
          likelyIncidentTitle: normalizeString(
            apiData.massive_incident_candidate.likely_incident_title,
            "Candidat incident massif",
          ),
          clusterSize: apiData.massive_incident_candidate.cluster_size,
          confidenceLevel: normalizeString(
            apiData.massive_incident_candidate.confidence_level,
            "medium",
          ),
          confidenceScore: apiData.massive_incident_candidate.confidence_score,
          clusterStart: normalizeString(apiData.massive_incident_candidate.cluster_start, "N/A"),
          clusterEnd: normalizeString(apiData.massive_incident_candidate.cluster_end, "N/A"),
          ticketIds: normalizeStringArray(apiData.massive_incident_candidate.ticket_ids),
          detectionReason: normalizeString(apiData.massive_incident_candidate.detection_reason, "N/A"),
          recommendation: normalizeString(apiData.massive_incident_candidate.recommendation, "N/A"),
        }
      : null,
    modelVersion: apiData.model_version || "rag-chatbot-1.2.0",
    fallbackMode: apiData.fallback_mode || "gateway_unspecified",
    reasoningSteps: normalizeStringArray(apiData.reasoning_steps),
    recommendedActions: normalizeStringArray(apiData.recommended_actions),
    riskFlags: normalizeStringArray(apiData.risk_flags),
    missingInformation: normalizedMissingInformation,
    sources: normalizeStringArray(apiData.sources),
    latencyMs: typeof apiData.latency_ms === "number" ? apiData.latency_ms : undefined,
  };
};

const chatbotService = {
  async ask(question: string, preferredLanguage?: "fr" | "en"): Promise<ChatbotResponse> {
    const payload: ChatbotRequest = {
      question,
      preferred_language: preferredLanguage ? resolveChatLanguage(preferredLanguage) : undefined,
    };
    const { data } = await api.post<ChatbotApiResponse>("/chatbot/ask", payload, {
      timeout: 20000,
    });
    const response = normalizeChatbotResponse(data);

    if (response.available === false) {
      const usefulPayload = hasUsefulPayload(response);
      const preferredResponseLanguage = resolveChatLanguage(
        preferredLanguage || response.responseLanguage || "fr",
      );

      const partialFallbackSummary =
        response.analysis?.summary || "Analyse partielle disponible. Consultez les blocs detailes.";

      return {
        ...response,
        responseLanguage: preferredResponseLanguage,
        message: usefulPayload ? PARTIAL_RESPONSE_MESSAGE : DEFAULT_UNAVAILABLE_MESSAGE,
        answer: usefulPayload ? response.answer || partialFallbackSummary : DEFAULT_UNAVAILABLE_MESSAGE,
      };
    }

    return response;
  },
};

export default chatbotService;
export { normalizeChatbotResponse };
