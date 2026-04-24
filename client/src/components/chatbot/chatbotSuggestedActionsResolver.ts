import { ChatMessageModel } from "../../types/chatbot";
import { ChatLanguage, resolveChatLanguage } from "./chatbotLanguage";

export interface ChatbotSuggestedAction {
  id: string;
  label: string;
  message: string;
}

const normalizeConfidence = (confidence?: string): string =>
  (confidence || "").trim().toLowerCase();

const resolveServiceLabel = (message: ChatMessageModel): string | null => {
  const service = (message.serviceDetected || "").trim();
  if (!service || service.toUpperCase() === "N/A") {
    return null;
  }
  return service;
};

const lowConfidenceActions = (
  service: string | null,
  language: ChatLanguage,
): ChatbotSuggestedAction[] => {
  const serviceHint = service ? ` (${service})` : "";

  if (language === "en") {
    return [
      {
        id: "rephrase-request",
        label: "Add more context",
        message: `I am adding more context${serviceHint}: impacted service, observed symptoms, start time and user impact.`,
      },
      {
        id: "create-ticket",
        label: "Prepare a ticket draft",
        message: service
          ? `Prepare a ticket draft for service ${service}.`
          : "Prepare a ticket draft for this incident.",
      },
    ];
  }

  return [
    {
      id: "rephrase-request",
      label: "Compl\u00E9ter le contexte",
      message: `Je pr\u00E9cise le contexte${serviceHint} : service impact\u00E9, sympt\u00F4mes observ\u00E9s, heure de d\u00E9but et impact utilisateur.`,
    },
    {
      id: "create-ticket",
      label: "Pr\u00E9parer un brouillon de ticket",
      message: service
        ? `Pr\u00E9pare un brouillon de ticket pour le service ${service}.`
        : "Pr\u00E9pare un brouillon de ticket pour cet incident.",
    },
  ];
};

const mediumHighConfidenceActions = (
  service: string | null,
  language: ChatLanguage,
): ChatbotSuggestedAction[] => {
  const serviceSuffix = service ? ` pour le service ${service}` : " pour le service concerne";

  if (language === "en") {
    const englishServiceSuffix = service ? ` for service ${service}` : " for the relevant service";

    const actions: ChatbotSuggestedAction[] = [
      {
        id: "check-similar-incidents",
        label: "Review similar incidents",
        message: `Review similar incidents${englishServiceSuffix}.`,
      },
      {
        id: "create-ticket",
        label: "Prepare a ticket draft",
        message: service
          ? `Prepare a ticket draft for service ${service}.`
          : "Prepare a ticket draft for this incident.",
      },
      {
        id: "check-sla",
        label: "Review SLA risk",
        message: `Review SLA risk${englishServiceSuffix}.`,
      },
      {
        id: "rephrase-request",
        label: "Rephrase the diagnosis",
        message: "Rephrase the latest diagnosis in clear English with operational next steps.",
      },
    ];

    if (service) {
      actions.splice(2, 0, {
        id: "consult-detected-service",
        label: "Review detected service",
        message: `Give me the detailed status for service ${service}.`,
      });
    }

    return actions;
  }

  const actions: ChatbotSuggestedAction[] = [
    {
      id: "check-similar-incidents",
      label: "V\u00E9rifier les incidents similaires",
      message: `V\u00E9rifie les incidents similaires${serviceSuffix}.`,
    },
    {
      id: "create-ticket",
      label: "Pr\u00E9parer un brouillon de ticket",
      message: service
        ? `Pr\u00E9pare un brouillon de ticket pour le service ${service}.`
        : "Pr\u00E9pare un brouillon de ticket pour cet incident.",
    },
    {
      id: "check-sla",
      label: "V\u00E9rifier le SLA",
      message: `V\u00E9rifie le risque SLA${serviceSuffix}.`,
    },
    {
      id: "rephrase-request",
      label: "Reformuler le diagnostic",
      message:
        "Reformule le dernier diagnostic en fran\u00E7ais clair avec des \u00E9tapes op\u00E9rationnelles.",
    },
  ];

  if (service) {
    actions.splice(2, 0, {
      id: "consult-detected-service",
      label: "Consulter le service d\u00E9tect\u00E9",
      message: `Donne-moi l'\u00E9tat d\u00E9taill\u00E9 du service ${service}.`,
    });
  }

  return actions;
};

const massiveIncidentActions = (language: ChatLanguage): ChatbotSuggestedAction[] =>
  language === "en"
    ? [
        {
          id: "prepare-global-ticket",
          label: "Prepare a global ticket",
          message: "Prepare a global ticket for the detected widespread incident.",
        },
      ]
    : [
        {
          id: "prepare-global-ticket",
          label: "Pr\u00E9parer un ticket global",
          message: "Pr\u00E9pare un ticket global pour l'incident massif d\u00E9tect\u00E9.",
        },
      ];

const aiRecommendedActions = (
  message: ChatMessageModel,
  language: ChatLanguage,
): ChatbotSuggestedAction[] => {
  const actions = Array.isArray(message.recommendedActions)
    ? message.recommendedActions.filter(
        (item) => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return actions.slice(0, 3).map((item, index) => ({
    id: `ai-recommended-${index + 1}`,
    label: language === "en" ? `AI recommendation ${index + 1}` : `Recommendation IA ${index + 1}`,
    message: item,
  }));
};

const deduplicateActions = (actions: ChatbotSuggestedAction[]): ChatbotSuggestedAction[] => {
  const deduplicated: ChatbotSuggestedAction[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const fingerprint = `${action.label}::${action.message}`.trim().toLowerCase();
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);
    deduplicated.push(action);
  }

  return deduplicated;
};

export const resolveSuggestedActions = (message: ChatMessageModel): ChatbotSuggestedAction[] => {
  if (
    message.role !== "assistant" ||
    message.isLoading ||
    message.isError ||
    message.id === "welcome"
  ) {
    return [];
  }

  const normalizedConfidence = normalizeConfidence(message.confidence);
  const service = resolveServiceLabel(message);
  const language = resolveChatLanguage(message.responseLanguage, "fr");
  const recommendedByAi = aiRecommendedActions(message, language);

  if (!normalizedConfidence && !service) {
    return [];
  }

  if (normalizedConfidence === "low") {
    return deduplicateActions([...recommendedByAi, ...lowConfidenceActions(service, language)]);
  }

  const actions = deduplicateActions([
    ...recommendedByAi,
    ...mediumHighConfidenceActions(service, language),
  ]);

  if (message.massiveIncidentCandidate) {
    return [...massiveIncidentActions(language), ...actions];
  }

  return actions;
};
