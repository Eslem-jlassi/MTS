// =============================================================================
// MTS TELECOM - Chatbot answer localization (display layer only)
// =============================================================================

/**
 * Lightweight, frontend-only normalization so assistant answers are consistently
 * displayed in French without modifying backend payloads.
 */

import { ChatLanguage } from "./chatbotLanguage";

const EN_TO_FR_LABEL_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /Final\s+Resolution\s*:\s*/gi, replacement: "Resolution connue : " },
  { pattern: /Root\s+Cause\s*:\s*/gi, replacement: "Cause probable : " },
  { pattern: /Resolution\s*:\s*/gi, replacement: "Action recommandee : " },
  { pattern: /Workaround\s*:\s*/gi, replacement: "Contournement possible : " },
];

const EN_TO_FR_TERM_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\brestart the service\b/gi, replacement: "redemarrer le service" },
  { pattern: /\bafter restart\b/gi, replacement: "apres redemarrage" },
  { pattern: /\bnetwork outage\b/gi, replacement: "panne reseau" },
  { pattern: /\bservice unavailable\b/gi, replacement: "service indisponible" },
  { pattern: /\bpacket loss\b/gi, replacement: "perte de paquets" },
  { pattern: /\bincrease timeout\b/gi, replacement: "augmenter le delai d'attente" },
  { pattern: /\bhigh latency\b/gi, replacement: "latence elevee" },
  { pattern: /\bhigh cpu usage\b/gi, replacement: "utilisation CPU elevee" },
  { pattern: /\bmemory leak\b/gi, replacement: "fuite memoire" },
  { pattern: /\brestart(ed)?\b/gi, replacement: "redemarrage" },
  { pattern: /\bresolved\b/gi, replacement: "resolu" },
  { pattern: /\bfailure\b/gi, replacement: "echec" },
  { pattern: /\bfailed\b/gi, replacement: "a echoue" },
  { pattern: /\bissue\b/gi, replacement: "incident" },
  { pattern: /\broot cause\b/gi, replacement: "cause racine" },
  { pattern: /\bworkaround\b/gi, replacement: "contournement" },
  { pattern: /\btimeout\b/gi, replacement: "delai depasse" },
];

const FR_TO_EN_LABEL_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /Resolution\s+connue\s*:\s*/gi, replacement: "Known Resolution: " },
  { pattern: /Action\s+recommandee\s*:\s*/gi, replacement: "Recommended Action: " },
  { pattern: /Cause\s+probable\s*:\s*/gi, replacement: "Probable Cause: " },
  { pattern: /Contournement\s+possible\s*:\s*/gi, replacement: "Possible Workaround: " },
];

const FR_TO_EN_TERM_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bpanne reseau\b/gi, replacement: "network outage" },
  { pattern: /\bservice indisponible\b/gi, replacement: "service unavailable" },
  { pattern: /\bperte de paquets\b/gi, replacement: "packet loss" },
  { pattern: /\blatence elevee\b/gi, replacement: "high latency" },
  { pattern: /\butilisation CPU elevee\b/gi, replacement: "high CPU usage" },
  { pattern: /\bfuite memoire\b/gi, replacement: "memory leak" },
  { pattern: /\bcontournement\b/gi, replacement: "workaround" },
  { pattern: /\bresolu\b/gi, replacement: "resolved" },
  { pattern: /\bechec\b/gi, replacement: "failure" },
  { pattern: /\bincident\b/gi, replacement: "incident" },
  { pattern: /\bredemarrer\b/gi, replacement: "restart" },
  { pattern: /\bdelai depasse\b/gi, replacement: "timeout" },
];

const cleanSpacing = (text: string, targetLanguage: ChatLanguage): string =>
  text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s*:\s*/g, targetLanguage === "en" ? ": " : " : ")
    .trim();

const applyReplacements = (
  text: string,
  replacements: Array<{ pattern: RegExp; replacement: string }>,
): string =>
  replacements.reduce((current, entry) => current.replace(entry.pattern, entry.replacement), text);

export const normalizeAssistantAnswerToFrench = (answer: string): string => {
  if (!answer || typeof answer !== "string") {
    return answer;
  }

  const withFrenchLabels = applyReplacements(answer, EN_TO_FR_LABEL_REPLACEMENTS);
  const withFrenchTerms = applyReplacements(withFrenchLabels, EN_TO_FR_TERM_REPLACEMENTS);

  return cleanSpacing(withFrenchTerms, "fr");
};

export const normalizeAssistantAnswerToEnglish = (answer: string): string => {
  if (!answer || typeof answer !== "string") {
    return answer;
  }

  const withEnglishLabels = applyReplacements(answer, FR_TO_EN_LABEL_REPLACEMENTS);
  const withEnglishTerms = applyReplacements(withEnglishLabels, FR_TO_EN_TERM_REPLACEMENTS);

  return cleanSpacing(withEnglishTerms, "en");
};

export const normalizeAssistantAnswer = (answer: string, targetLanguage: ChatLanguage): string => {
  if (targetLanguage === "en") {
    return normalizeAssistantAnswerToEnglish(answer);
  }

  return normalizeAssistantAnswerToFrench(answer);
};
