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
      label: "Completer le contexte",
      message: `Je precise le contexte${serviceHint} : service impacte, symptomes observes, heure de debut et impact utilisateur.`,
    },
    {
      id: "create-ticket",
      label: "Preparer un brouillon de ticket",
      message: service
        ? `Prepare un brouillon de ticket pour le service ${service}.`
        : "Prepare un brouillon de ticket pour cet incident.",
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
      label: "Verifier les incidents similaires",
      message: `Verifie les incidents similaires${serviceSuffix}.`,
    },
    {
      id: "create-ticket",
      label: "Preparer un brouillon de ticket",
      message: service
        ? `Prepare un brouillon de ticket pour le service ${service}.`
        : "Prepare un brouillon de ticket pour cet incident.",
    },
    {
      id: "check-sla",
      label: "Verifier le SLA",
      message: `Verifie le risque SLA${serviceSuffix}.`,
    },
    {
      id: "rephrase-request",
      label: "Reformuler le diagnostic",
      message: "Reformule le dernier diagnostic en francais clair avec des etapes operationnelles.",
    },
  ];

  if (service) {
    actions.splice(2, 0, {
      id: "consult-detected-service",
      label: "Consulter le service detecte",
      message: `Donne-moi l'etat detaille du service ${service}.`,
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
          label: "Preparer un ticket global",
          message: "Prepare un ticket global pour l'incident massif detecte.",
        },
      ];

const aiRecommendedActions = (
  message: ChatMessageModel,
  language: ChatLanguage,
): ChatbotSuggestedAction[] => {
  const actions = Array.isArray(message.recommendedActions)
    ? message.recommendedActions.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];

  return actions.slice(0, 3).map((item, index) => ({
    id: `ai-recommended-${index + 1}`,
    label:
      language === "en"
        ? `AI recommendation ${index + 1}`
        : `Recommendation IA ${index + 1}`,
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
