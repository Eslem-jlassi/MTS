import { ChatbotAnalysis } from "../../types/chatbot";
import { ChatLanguage } from "./chatbotLanguage";

export interface ChatbotAnswerSections {
  summary: string;
  probableCause?: string;
  knownResolution?: string;
  workaround?: string;
  impact?: string;
  nextActions: string[];
  clarificationNeeded: boolean;
  missingInformation: string[];
  caution?: string;
}

interface ExtractedSections {
  probableCause?: string;
  knownResolution?: string;
  workaround?: string;
  impact?: string;
  nextAction?: string;
  caution?: string;
  missingInformation?: string[];
}

const LABELS = {
  fr: {
    cause: ["Cause probable"],
    resolution: ["Action recommandee", "Resolution connue"],
    workaround: ["Contournement possible", "Contournement"],
    impact: ["Impact"],
    nextAction: ["Action suivante"],
    caution: ["Note de prudence"],
    missingInfo: ["Informations a confirmer"],
  },
  en: {
    cause: ["Probable Cause", "Root Cause"],
    resolution: ["Recommended Action", "Known Resolution", "Resolution", "Final Resolution"],
    workaround: ["Possible Workaround", "Workaround"],
    impact: ["Impact"],
    nextAction: ["Next action"],
    caution: ["Caution"],
    missingInfo: ["Information to confirm"],
  },
};

const clean = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1");

const buildLabelRegex = (labels: string[]): RegExp => {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`(?:${escaped})\\s*:\\s*([^\\n.]+)`, "i");
};

const extractByLabels = (answer: string, labels: string[]): string | undefined => {
  const match = answer.match(buildLabelRegex(labels));
  if (!match?.[1]) {
    return undefined;
  }
  return clean(match[1]);
};

const extractSections = (answer: string, language: ChatLanguage): ExtractedSections => ({
  probableCause: extractByLabels(answer, LABELS[language].cause),
  knownResolution: extractByLabels(answer, LABELS[language].resolution),
  workaround: extractByLabels(answer, LABELS[language].workaround),
  impact: extractByLabels(answer, LABELS[language].impact),
  nextAction: extractByLabels(answer, LABELS[language].nextAction),
  caution: extractByLabels(answer, LABELS[language].caution),
  missingInformation: extractByLabels(answer, LABELS[language].missingInfo)
    ?.split(",")
    .map(clean)
    .filter(Boolean),
});

const stripStructuredLabels = (answer: string, language: ChatLanguage): string => {
  const allLabels = [
    ...LABELS[language].cause,
    ...LABELS[language].resolution,
    ...LABELS[language].workaround,
    ...LABELS[language].impact,
    ...LABELS[language].nextAction,
    ...LABELS[language].caution,
    ...LABELS[language].missingInfo,
  ];

  const pattern = allLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  return clean(answer.replace(new RegExp(`(?:${pattern})\\s*:\\s*[^\\n.]+`, "gi"), ""));
};

const buildDefaultNextActions = (language: ChatLanguage): string[] => {
  if (language === "en") {
    return [
      "Validate impact scope and affected services.",
      "Check similar incidents before preparing a global ticket.",
      "Prepare escalation details if SLA risk increases.",
    ];
  }

  return [
    "Valider le perimetre d'impact et les services concernes.",
    "Verifier les incidents similaires avant preparation d'un ticket global.",
    "Preparer l'escalade si le risque SLA augmente.",
  ];
};

export const buildAnswerSections = (
  answer: string,
  language: ChatLanguage,
  analysis?: ChatbotAnalysis | null,
): ChatbotAnswerSections => {
  if (analysis) {
    const missingInformation = Array.isArray(analysis.missingInformation)
      ? analysis.missingInformation.map(clean).filter(Boolean)
      : [];

    return {
      summary: clean(analysis.summary || answer || ""),
      probableCause: analysis.probableCause ? clean(analysis.probableCause) : undefined,
      knownResolution: analysis.knownResolution ? clean(analysis.knownResolution) : undefined,
      workaround: analysis.workaround ? clean(analysis.workaround) : undefined,
      impact: analysis.impact ? clean(analysis.impact) : undefined,
      nextActions: analysis.nextAction ? [clean(analysis.nextAction)] : [],
      clarificationNeeded: Boolean(analysis.clarificationNeeded),
      missingInformation,
      caution: analysis.caution ? clean(analysis.caution) : undefined,
    };
  }

  const cleanedAnswer = clean(answer || "");
  const extracted = extractSections(cleanedAnswer, language);
  const summary = stripStructuredLabels(cleanedAnswer, language) || cleanedAnswer;

  return {
    summary,
    probableCause: extracted.probableCause,
    knownResolution: extracted.knownResolution,
    workaround: extracted.workaround,
    impact: extracted.impact,
    nextActions: extracted.nextAction ? [extracted.nextAction] : buildDefaultNextActions(language),
    clarificationNeeded: Boolean(
      extracted.missingInformation && extracted.missingInformation.length > 0,
    ),
    missingInformation: extracted.missingInformation || [],
    caution: extracted.caution,
  };
};
