import api from "./client";
import {
  ChatbotAnalysis,
  ChatbotApiAnalysis,
  ChatbotApiResponse,
  ChatbotRequest,
  ChatbotResponse,
} from "../types/chatbot";
import { resolveChatLanguage } from "../components/chatbot/chatbotLanguage";

const DEFAULT_UNAVAILABLE_MESSAGE = "Le chatbot IA est indisponible.";

const normalizeAnalysis = (analysis?: ChatbotApiAnalysis | null): ChatbotAnalysis | null => {
  if (!analysis) {
    return null;
  }

  return {
    summary: analysis.summary,
    probableCause: analysis.probable_cause,
    knownResolution: analysis.known_resolution,
    workaround: analysis.workaround,
    impact: analysis.impact,
    nextAction: analysis.next_action,
    clarificationNeeded: Boolean(analysis.clarification_needed),
    missingInformation: Array.isArray(analysis.missing_information)
      ? analysis.missing_information
      : [],
    caution: analysis.caution,
    draftTicketTitle: analysis.draft_ticket_title,
  };
};

const normalizeChatbotResponse = (data: ChatbotApiResponse | undefined): ChatbotResponse => {
  const apiData = data ?? ({} as Partial<ChatbotApiResponse>);
  const results = Array.isArray(apiData.results) ? apiData.results : [];

  return {
    available: apiData.available,
    message: apiData.message,
    answer: apiData.answer ?? "Aucune reponse disponible.",
    confidence: apiData.confidence ?? "low",
    topScore: apiData.top_score,
    serviceDetected: apiData.service_detected ?? "N/A",
    serviceDetectionConfidence: apiData.service_detection_confidence ?? "low",
    responseLanguage: apiData.response_language === "en" ? "en" : "fr",
    analysis: normalizeAnalysis(apiData.analysis),
    results: results.map((result) => ({
      docType: result.doc_type,
      title: result.title,
      serviceName: result.service_name,
      language: result.language,
      score: result.score,
      docId: result.doc_id,
    })),
    massiveIncidentCandidate: apiData.massive_incident_candidate
      ? {
          detectedService: apiData.massive_incident_candidate.detected_service,
          likelyIncidentTitle: apiData.massive_incident_candidate.likely_incident_title,
          clusterSize: apiData.massive_incident_candidate.cluster_size,
          confidenceLevel: apiData.massive_incident_candidate.confidence_level,
          confidenceScore: apiData.massive_incident_candidate.confidence_score,
          clusterStart: apiData.massive_incident_candidate.cluster_start,
          clusterEnd: apiData.massive_incident_candidate.cluster_end,
          ticketIds: apiData.massive_incident_candidate.ticket_ids,
          detectionReason: apiData.massive_incident_candidate.detection_reason,
          recommendation: apiData.massive_incident_candidate.recommendation,
        }
      : null,
  };
};

const chatbotService = {
  async ask(question: string, preferredLanguage?: "fr" | "en"): Promise<ChatbotResponse> {
    const payload: ChatbotRequest = {
      question,
      preferred_language: preferredLanguage ? resolveChatLanguage(preferredLanguage) : undefined,
    };
    const { data } = await api.post<ChatbotApiResponse>("/chatbot/ask", payload);
    const response = normalizeChatbotResponse(data);

    if (response.available === false) {
      throw new Error(response.message || DEFAULT_UNAVAILABLE_MESSAGE);
    }

    return response;
  },
};

export default chatbotService;
export { normalizeChatbotResponse };
