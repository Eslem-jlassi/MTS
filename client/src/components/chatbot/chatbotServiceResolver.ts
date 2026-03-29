interface ServiceCandidate {
  id: number;
  name: string;
}

const UNRESOLVED_CHATBOT_SERVICE_ID = -1;

const SERVICE_NAME_ALIASES: Record<string, string[]> = {
  "bscs billing system": ["bscs billing", "billing system"],
  "crm ericsson": ["crm platform"],
  "core network oss": ["core network", "network operations"],
};

const normalizeServiceName = (value?: string | null): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

const resolveAliasMatch = (
  normalizedDetectedService: string,
  services: ServiceCandidate[],
  normalizedNames: Map<number, string>,
): ServiceCandidate | null => {
  if (!normalizedDetectedService) {
    return null;
  }

  return (
    services.find((service) => {
      const normalizedServiceName = normalizedNames.get(service.id);
      if (!normalizedServiceName) {
        return false;
      }

      const aliases = SERVICE_NAME_ALIASES[normalizedServiceName] || [];
      return aliases.includes(normalizedDetectedService);
    }) || null
  );
};

export const resolveChatbotServiceMatch = (
  detectedService: string | null | undefined,
  services: ServiceCandidate[],
): ServiceCandidate | null => {
  const rawDetectedService = (detectedService || "").trim();
  const normalizedDetectedService = normalizeServiceName(detectedService);
  if (!normalizedDetectedService) {
    return null;
  }

  const normalizedNames = new Map(
    services.map((service) => [service.id, normalizeServiceName(service.name)]),
  );

  const exactMatch =
    services.find((service) => normalizedNames.get(service.id) === normalizedDetectedService) ||
    null;
  if (exactMatch) {
    return exactMatch;
  }

  const aliasMatch = resolveAliasMatch(normalizedDetectedService, services, normalizedNames);
  if (aliasMatch) {
    return aliasMatch;
  }

  const partialMatches = services.filter((service) => {
    const normalizedServiceName = normalizedNames.get(service.id);
    if (!normalizedServiceName) {
      return false;
    }

    return (
      normalizedServiceName.includes(normalizedDetectedService) ||
      normalizedDetectedService.includes(normalizedServiceName)
    );
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return {
    id: UNRESOLVED_CHATBOT_SERVICE_ID,
    name: rawDetectedService,
  };
};

export type { ServiceCandidate };
