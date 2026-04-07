import { ChatAttachment, ChatbotResponse, ChatMessageModel } from "../../types/chatbot";
import { getChatbotCopy } from "./chatbotCopy";
import { normalizeAssistantAnswer } from "./chatbotAnswerLocalization";
import { buildLowConfidenceMessage } from "./chatbotConversation";
import { ChatLanguage, resolveChatLanguage } from "./chatbotLanguage";
import { reduceNoisyRelatedResults } from "./chatbotResultsQuality";

const createMessageId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  const lowConfidence = response.confidence.toLowerCase() === "low";
  const normalizedAnswer = normalizeAssistantAnswer(response.answer, responseLanguage);
  const filteredResults = reduceNoisyRelatedResults(response.results, response.confidence);

  return {
    id: createMessageId("assistant"),
    role: "assistant",
    content:
      lowConfidence && !response.analysis
        ? buildLowConfidenceMessage({
            serviceDetected: response.serviceDetected,
            backendAnswer: normalizedAnswer,
            results: filteredResults,
            language: responseLanguage,
          })
        : normalizedAnswer,
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
    reasoningSteps: response.reasoningSteps,
    recommendedActions: response.recommendedActions,
    riskFlags: response.riskFlags,
    missingInformation: response.missingInformation,
    sources: response.sources,
    latencyMs: response.latencyMs,
  };
};

export const createAssistantErrorMessage = (
  errorMessage: string,
  responseLanguage: ChatLanguage = "fr",
): ChatMessageModel => ({
  id: createMessageId("assistant-error"),
  role: "assistant",
  content:
    responseLanguage === "en"
      ? `I could not reach the AI backend. ${errorMessage}`
      : `Je n'ai pas pu joindre le backend IA. ${errorMessage}`,
  timestamp: new Date().toISOString(),
  responseLanguage,
  isError: true,
});
