import { ChatAttachment, ChatbotResponse, ChatMessageModel } from "../../types/chatbot";
import { getChatbotCopy } from "./chatbotCopy";
import { normalizeAssistantAnswer } from "./chatbotAnswerLocalization";
import { buildLowConfidenceMessage } from "./chatbotConversation";
import { ChatLanguage, resolveChatLanguage } from "./chatbotLanguage";
import { reduceNoisyRelatedResults } from "./chatbotResultsQuality";

const createMessageId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ASSISTANT_UNAVAILABLE_MESSAGE =
  "Assistant temporairement indisponible. Reessayez dans quelques instants.";

const PARTIAL_RESPONSE_SUMMARY_MESSAGE =
  "Analyse partielle disponible. Consultez les sections detaillees ci-dessous.";

const TECHNICAL_RESPONSE_MARKERS = [
  "connection refused",
  "connectexception",
  "socketexception",
  "timed out",
  "timeout",
  "internal server error",
  "service unavailable",
  "gateway fallback",
  "fallback backend",
  "java.net",
  "traceback",
  "stacktrace",
  "assistant temporairement indisponible",
  "chatbot ia est indisponible",
  "le chatbot ia est indisponible",
  "analyse partielle disponible",
  "partial analysis is available",
  "ai-chatbot",
];

const isTechnicalResponseText = (value?: string): boolean => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return TECHNICAL_RESPONSE_MARKERS.some((marker) => normalized.includes(marker));
};

const sanitizeActionList = (actions?: string[]): string[] => {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .filter((item) => !isTechnicalResponseText(item));
};

const sanitizeReasoningSteps = (steps?: string[]): string[] => {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .filter((item) => !isTechnicalResponseText(item));
};

const hasAnalysisPayload = (response: ChatbotResponse): boolean =>
  Boolean(
    response.analysis?.summary ||
      response.analysis?.impact ||
      response.analysis?.nextAction ||
      response.analysis?.knownResolution ||
      response.analysis?.workaround ||
      response.analysis?.probableCause,
  );

export const hasExploitableBusinessPayload = (response: ChatbotResponse): boolean => {
  const hasSafeAnswer = Boolean(response.answer && !isTechnicalResponseText(response.answer));
  const hasService = Boolean(response.serviceDetected && response.serviceDetected !== "N/A");
  const hasResults = Array.isArray(response.results) && response.results.length > 0;
  const hasActions = sanitizeActionList(response.recommendedActions).length > 0;
  const hasMassiveIncidentCandidate = Boolean(response.massiveIncidentCandidate);

  return (
    hasAnalysisPayload(response) ||
    hasService ||
    hasResults ||
    hasActions ||
    hasSafeAnswer ||
    hasMassiveIncidentCandidate
  );
};

export const resolveAssistantUnavailableMessage = (
  _responseLanguage: ChatLanguage = "fr",
): string => ASSISTANT_UNAVAILABLE_MESSAGE;

export const createWelcomeMessage = (responseLanguage: ChatLanguage = "fr"): ChatMessageModel => ({
  id: "welcome",
  role: "assistant",
  content: getChatbotCopy(responseLanguage).welcomeMessage,
  timestamp: new Date().toISOString(),
  responseLanguage,
});

export const createLoadingMessage = (responseLanguage: ChatLanguage = "fr"): ChatMessageModel => ({
  id: "assistant-loading",
  role: "assistant",
  content: "",
  timestamp: new Date().toISOString(),
  responseLanguage,
  isLoading: true,
});

export const createUserMessage = (
  content: string,
  attachments: ChatAttachment[] = [],
  responseLanguage: ChatLanguage = "fr",
): ChatMessageModel => ({
  id: createMessageId("user"),
  role: "user",
  content,
  timestamp: new Date().toISOString(),
  attachments,
  responseLanguage,
});

export const createAttachmentOnlyUserMessage = (
  attachments: ChatAttachment[],
  responseLanguage: ChatLanguage = "fr",
): ChatMessageModel =>
  createUserMessage(
    getChatbotCopy(responseLanguage).imageContextUserMessage,
    attachments,
    responseLanguage,
  );

export const createAssistantMessage = (
  content: string,
  responseLanguage: ChatLanguage = "fr",
): ChatMessageModel => ({
  id: createMessageId("assistant-local"),
  role: "assistant",
  content,
  timestamp: new Date().toISOString(),
  responseLanguage,
});

export const createAssistantAttachmentContextMessage = (): ChatMessageModel =>
  createAssistantMessage(getChatbotCopy("fr").imageContextAssistantMessage, "fr");

export const createAssistantAttachmentContextMessageForLanguage = (
  responseLanguage: ChatLanguage = "fr",
): ChatMessageModel =>
  createAssistantMessage(
    getChatbotCopy(responseLanguage).imageContextAssistantMessage,
    responseLanguage,
  );

export const createAssistantMessageFromResponse = (
  response: ChatbotResponse,
  fallbackLanguage: ChatLanguage = "fr",
): ChatMessageModel => {
  const responseLanguage = resolveChatLanguage(response.responseLanguage, fallbackLanguage);
  const lowConfidence = (response.confidence || "low").toLowerCase() === "low";
  const normalizedAnswer = normalizeAssistantAnswer(response.answer, responseLanguage);
  const safeRecommendedActions = sanitizeActionList(response.recommendedActions);
  const safeReasoningSteps = sanitizeReasoningSteps(response.reasoningSteps);
  const filteredResults = reduceNoisyRelatedResults(response.results, response.confidence);
  const hasStructuredPayload = hasExploitableBusinessPayload({
    ...response,
    recommendedActions: safeRecommendedActions,
    results: filteredResults,
  });

  const hasTechnicalAnswer = isTechnicalResponseText(normalizedAnswer);
  const safeBusinessAnswer = hasTechnicalAnswer
    ? response.analysis?.summary || PARTIAL_RESPONSE_SUMMARY_MESSAGE
    : normalizedAnswer;

  if (response.available === false && !hasStructuredPayload) {
    return {
      id: createMessageId("assistant-unavailable"),
      role: "assistant",
      content: resolveAssistantUnavailableMessage(responseLanguage),
      timestamp: new Date().toISOString(),
      responseLanguage,
      isError: true,
    };
  }

  return {
    id: createMessageId("assistant"),
    role: "assistant",
    content:
      lowConfidence && !response.analysis
        ? buildLowConfidenceMessage({
            serviceDetected: response.serviceDetected,
            backendAnswer: safeBusinessAnswer,
            results: filteredResults,
            language: responseLanguage,
          })
        : safeBusinessAnswer,
    timestamp: new Date().toISOString(),
    responseLanguage,
    confidence: response.confidence,
    serviceDetected: response.serviceDetected,
    serviceDetectionConfidence: response.serviceDetectionConfidence,
    analysis: response.analysis,
    results: filteredResults,
    massiveIncidentCandidate: response.massiveIncidentCandidate,
    modelVersion: response.modelVersion,
    fallbackMode: response.fallbackMode,
    reasoningSteps: safeReasoningSteps,
    recommendedActions: safeRecommendedActions,
    riskFlags: response.riskFlags,
    missingInformation: response.missingInformation,
    sources: response.sources,
    latencyMs: response.latencyMs,
  };
};

export const createAssistantErrorMessage = (
  responseLanguage: ChatLanguage = "fr",
  errorMessage?: string,
): ChatMessageModel => ({
  id: createMessageId("assistant-error"),
  role: "assistant",
  content: errorMessage || resolveAssistantUnavailableMessage(responseLanguage),
  timestamp: new Date().toISOString(),
  responseLanguage,
  isError: true,
});
