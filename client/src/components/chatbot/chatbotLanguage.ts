export type ChatLanguage = "fr" | "en";

const FRENCH_MARKERS = [
  "bonjour",
  "salut",
  "incident",
  "service",
  "panne",
  "risque",
  "ticket",
  "analyse",
  "aide",
  "merci",
  "probleme",
  "symptome",
  "cause",
  "resolution",
  "contournement",
  "s il",
  "quel",
  "quelle",
  "pourquoi",
  "comment",
  "depuis",
  "impact",
  "utilisateur",
];

const ENGLISH_MARKERS = [
  "hello",
  "hi",
  "issue",
  "incident",
  "service",
  "risk",
  "ticket",
  "analyze",
  "analysis",
  "help",
  "thanks",
  "problem",
  "symptom",
  "cause",
  "resolution",
  "workaround",
  "please",
  "what",
  "why",
  "how",
  "could",
  "would",
  "since",
  "impact",
  "user",
];

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[!?.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ");

const countMarkers = (text: string, markers: string[]): number =>
  markers.reduce((count, marker) => {
    const regex = new RegExp(`(^|\\s)${marker}(\\s|$)`, "i");
    return regex.test(text) ? count + 1 : count;
  }, 0);

export const resolveChatLanguage = (
  value: string | null | undefined,
  fallback: ChatLanguage = "fr",
): ChatLanguage => (value === "en" ? "en" : value === "fr" ? "fr" : fallback);

export const detectPreferredChatLanguage = (
  text: string,
  fallback: ChatLanguage = "fr",
): ChatLanguage => {
  const normalized = normalize(text);
  if (!normalized) {
    return fallback;
  }

  const frenchScore = countMarkers(normalized, FRENCH_MARKERS);
  const englishScore = countMarkers(normalized, ENGLISH_MARKERS);

  if (englishScore > frenchScore) {
    return "en";
  }

  if (frenchScore > englishScore) {
    return "fr";
  }

  if (/\b(the|this|that|please|with|from|since)\b/i.test(normalized)) {
    return "en";
  }

  if (/\b(le|la|les|des|avec|depuis|pour)\b/i.test(normalized)) {
    return "fr";
  }

  return fallback;
};
