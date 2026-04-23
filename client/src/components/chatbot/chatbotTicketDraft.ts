import { TicketPriority } from "../../types";
import { ChatMessageModel } from "../../types/chatbot";
import { resolveChatLanguage } from "./chatbotLanguage";

export interface ChatbotTicketDraft {
  title: string;
  detectedService: string;
  summary: string;
  impact: string;
  probableCause: string;
  nextAction: string;
  clarificationNeeded: boolean;
  missingInformation: string[];
  caution?: string;
}

const normalize = (value?: string): string => (value || "").trim();
const normalizeSearch = (value?: string): string =>
  normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const extractValue = (messageContent: string, label: RegExp): string => {
  const match = normalize(messageContent).match(label);
  return normalize(match?.[1]);
};

const extractProbableCause = (messageContent: string): string =>
  extractValue(messageContent, /(?:cause\s+probable|probable\s+cause)\s*:\s*([^.\n]+)/i);

const extractImpact = (messageContent: string): string =>
  extractValue(messageContent, /impact\s*:\s*([^.\n]+)/i);

const extractNextAction = (messageContent: string): string =>
  extractValue(messageContent, /(?:action\s+suivante|next\s+action)\s*:\s*([^.\n]+)/i);

const extractSummary = (messageContent: string): string => {
  const content = normalize(messageContent);
  if (!content) {
    return "";
  }

  const firstSentence = content.split(/[\n.]/)[0];
  return normalize(firstSentence);
};

export const isCreateTicketIntent = (message: string): boolean => {
  const normalized = normalizeSearch(message);
  return /(creer|cree|preparer|prepare)\s+(un\s+)?(brouillon\s+de\s+)?ticket/.test(normalized);
};

export const buildDraftFromAssistantMessage = (
  message: ChatMessageModel | null | undefined,
): ChatbotTicketDraft => {
  const language = resolveChatLanguage(message?.responseLanguage, "fr");
  const defaultService = language === "en" ? "Undetected service" : "Service non detecte";
  const analysis = message?.analysis;
  const rawMissingInformation = analysis?.missingInformation;
  const missingInformation = Array.isArray(rawMissingInformation) ? rawMissingInformation : [];
  const detectedService = normalize(message?.serviceDetected) || defaultService;
  const summary = normalize(analysis?.summary) || extractSummary(message?.content || "");
  const impact = normalize(analysis?.impact) || extractImpact(message?.content || "");
  const probableCause =
    normalize(analysis?.probableCause) || extractProbableCause(message?.content || "");
  const nextAction = normalize(analysis?.nextAction) || extractNextAction(message?.content || "");
  const fallbackTitle =
    detectedService === defaultService
      ? language === "en"
        ? "Telecom incident to qualify with AI assistant"
        : "Incident telecom a qualifier via assistant IA"
      : language === "en"
        ? `Potential incident on ${detectedService}`
        : `Incident probable sur ${detectedService}`;

  return {
    title:
      normalize(analysis?.draftTicketTitle) ||
      normalize(message?.results?.[0]?.title) ||
      fallbackTitle,
    detectedService,
    summary,
    impact,
    probableCause,
    nextAction,
    clarificationNeeded: Boolean(analysis?.clarificationNeeded),
    missingInformation,
    caution: analysis?.caution,
  };
};

export const buildDraftFromMassiveIncidentCandidate = (
  message: ChatMessageModel | null | undefined,
): ChatbotTicketDraft | null => {
  const language = resolveChatLanguage(message?.responseLanguage, "fr");
  const candidate = message?.massiveIncidentCandidate;
  if (!candidate) {
    return null;
  }

  const defaultService = language === "en" ? "Undetected service" : "Service non detecte";
  const detectedService = normalize(candidate.detectedService) || defaultService;
  const candidateTitle = normalize(candidate.likelyIncidentTitle);
  const title = candidateTitle
    ? language === "en"
      ? `[POTENTIAL WIDESPREAD INCIDENT] ${candidateTitle}`
      : `[CANDIDAT INCIDENT MASSIF] ${candidateTitle}`
    : language === "en"
      ? `[POTENTIAL WIDESPREAD INCIDENT] ${detectedService}`
      : `[CANDIDAT INCIDENT MASSIF] ${detectedService}`;

  return {
    title,
    detectedService,
    summary:
      language === "en"
        ? [
            `A potential widespread incident pattern has been detected on ${detectedService}.`,
            `${candidate.clusterSize} similar tickets are grouped together.`,
            `Window: ${candidate.clusterStart} -> ${candidate.clusterEnd}.`,
            candidate.detectionReason,
          ].join(" ")
        : [
            `Detection d'un motif incident massif sur ${detectedService}.`,
            `Cluster de ${candidate.clusterSize} tickets similaires.`,
            `Fenetre : ${candidate.clusterStart} -> ${candidate.clusterEnd}.`,
            candidate.detectionReason,
          ].join(" "),
    impact:
      language === "en"
        ? `Potential cross-service impact on ${detectedService}. Manager validation is recommended.`
        : `Impact potentiellement transverse sur le service ${detectedService}. Validation manager recommandee.`,
    probableCause: normalize(message?.analysis?.probableCause) || candidateTitle,
    nextAction:
      normalize(candidate.recommendation) ||
      (language === "en"
        ? "Validate the global ticket before definitive creation."
        : "Valider le ticket global avant creation definitive."),
    clarificationNeeded: false,
    missingInformation: [],
    caution:
      language === "en"
        ? "AI candidate to be validated by a human before any production creation."
        : "Candidat IA a valider humainement avant creation en production.",
  };
};

export const mapConfidenceToPriority = (confidence?: string): TicketPriority => {
  const normalized = normalize(confidence).toLowerCase();
  if (normalized === "high") {
    return TicketPriority.HIGH;
  }
  if (normalized === "medium") {
    return TicketPriority.MEDIUM;
  }
  return TicketPriority.LOW;
};
