import { ChatbotResult } from "../../types/chatbot";

const sanitizeTitle = (title: string): string =>
  (title || "").trim().toLowerCase().replace(/\s+/g, " ");

const getThreshold = (confidence?: string): number => {
  const normalized = (confidence || "").trim().toLowerCase();
  if (normalized === "high") {
    return 0.35;
  }
  if (normalized === "medium") {
    return 0.3;
  }
  return 0.25;
};

const getMaxItems = (confidence?: string): number => {
  const normalized = (confidence || "").trim().toLowerCase();
  if (normalized === "high") {
    return 5;
  }
  if (normalized === "medium") {
    return 4;
  }
  return 3;
};

export const reduceNoisyRelatedResults = (
  results: ChatbotResult[] = [],
  confidence?: string,
): ChatbotResult[] => {
  const threshold = getThreshold(confidence);
  const maxItems = getMaxItems(confidence);

  const seen = new Set<string>();

  return results
    .filter((item) => Number(item.score) >= threshold)
    .sort((left, right) => Number(right.score) - Number(left.score))
    .filter((item) => {
      const key = `${sanitizeTitle(item.title)}|${(item.serviceName || "").trim().toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
};
