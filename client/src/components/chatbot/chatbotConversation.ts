import { CHATBOT_COPY } from "./chatbotCopy";
import { ChatbotResult } from "../../types/chatbot";
import { ChatLanguage } from "./chatbotLanguage";
import { getChatbotCopy } from "./chatbotCopy";
import { formatNumberValue } from "../../utils/formatters";

const GREETINGS = new Set([
  "hello",
  "hi",
  "bonjour",
  "salut",
  "bonsoir",
  "good morning",
  "good evening",
]);

const HELP_MESSAGES = new Set([
  "help",
  "aide",
  "que peux tu faire",
  "que peux-tu faire",
  "what can you do",
]);

export const GREETING_WELCOME_MESSAGE = CHATBOT_COPY.welcomeMessage;

const normalizeMessage = (message: string): string =>
  message
    .trim()
    .toLowerCase()
    .replace(/[!?.,;:]+$/g, "")
    .replace(/\s+/g, " ");

export function detectGreeting(message: string): boolean {
  const normalized = normalizeMessage(message);
  return normalized.length > 0 && GREETINGS.has(normalized);
}

export function detectHelpIntent(message: string): boolean {
  const normalized = normalizeMessage(message);
  return normalized.length > 0 && HELP_MESSAGES.has(normalized);
}

export function resolveLocalAssistantReply(message: string): string | null {
  return resolveLocalAssistantReplyForLanguage(message, "fr");
}

export function resolveLocalAssistantReplyForLanguage(
  message: string,
  language: ChatLanguage,
): string | null {
  const normalized = normalizeMessage(message);
  if (!normalized) {
    return null;
  }

  if (detectGreeting(normalized) || detectHelpIntent(normalized)) {
    return getChatbotCopy(language).welcomeMessage;
  }

  return null;
}

export function shouldCallApi(message: string): boolean {
  const normalized = normalizeMessage(message);
  return Boolean(normalized) && !resolveLocalAssistantReply(normalized);
}

interface BuildLowConfidenceMessageOptions {
  serviceDetected?: string;
  backendAnswer?: string;
  results?: ChatbotResult[];
  language?: ChatLanguage;
}

const isTechnicalUnavailableBackendAnswer = (answer?: string): boolean => {
  const normalizedAnswer = (answer || "").trim().toLowerCase();
  if (!normalizedAnswer) {
    return false;
  }

  return [
    "chatbot ia est indisponible",
    "assistant temporairement indisponible",
    "assistant ia est temporairement indisponible",
    "the ai assistant is temporarily unavailable",
    "i could not reach the ai assistant",
    "service d'assistance ia est temporairement indisponible",
  ].some((pattern) => normalizedAnswer.includes(pattern));
};

const isGenericPartialBackendAnswer = (answer?: string): boolean => {
  const normalizedAnswer = (answer || "").trim().toLowerCase();
  if (!normalizedAnswer) {
    return false;
  }

  return [
    "analyse partielle disponible",
    "partial analysis is available",
    "consultez les blocs detailes",
    "check the detailed blocks",
    "aucune reponse disponible",
    "no response available",
  ].some((pattern) => normalizedAnswer.includes(pattern));
};

const buildRelatedCasesHint = (
  results: ChatbotResult[] = [],
  language: ChatLanguage = "fr",
): string => {
  const unknownServiceLabel = language === "en" ? "unknown service" : "service inconnu";
  const topCases = results.slice(0, 3).map(
    (item) =>
      `${item.title} (${item.serviceName || unknownServiceLabel}, score ${formatNumberValue(Number(item.score), {
        maximumFractionDigits: 2,
      })})`,
  );

  if (topCases.length === 0) {
    return language === "en"
      ? "No similar incident was found with a sufficient score."
      : "Aucun incident proche n'a ete retrouve avec un score suffisant.";
  }

  return language === "en"
    ? `Potentially related cases: ${topCases.join(" | ")}.`
    : `Cas potentiellement proches : ${topCases.join(" | ")}.`;
};

export function buildLowConfidenceMessage({
  serviceDetected,
  backendAnswer,
  results,
  language = "fr",
}: BuildLowConfidenceMessageOptions): string {
  const copy = getChatbotCopy(language);
  const hasService = serviceDetected && serviceDetected !== "N/A";
  const serviceHint =
    language === "en"
      ? hasService
        ? `Detected service: ${serviceDetected}. `
        : ""
      : hasService
        ? `Service detecte : ${serviceDetected}. `
        : "";
  const backendHint =
    language === "en"
      ? backendAnswer &&
        !isTechnicalUnavailableBackendAnswer(backendAnswer) &&
        !isGenericPartialBackendAnswer(backendAnswer)
        ? `AI feedback: ${backendAnswer} `
        : ""
      : backendAnswer &&
          !isTechnicalUnavailableBackendAnswer(backendAnswer) &&
          !isGenericPartialBackendAnswer(backendAnswer)
        ? `Retour IA : ${backendAnswer} `
        : "";
  const relatedCasesHint = buildRelatedCasesHint(results, language);
  const precisionHint =
    language === "en"
      ? "Please specify the exact service, the observed symptoms, the start time and the user impact so I can refine the diagnosis."
      : "Merci de preciser le service exact, les symptomes, l'heure de debut et l'impact utilisateur pour affiner le diagnostic.";

  return `${serviceHint}${copy.lowConfidenceHint} ${relatedCasesHint} ${backendHint}${precisionHint}`;
}
