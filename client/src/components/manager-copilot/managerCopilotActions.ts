import { IncidentImpact, Severity, TicketPriority } from "../../types";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
} from "./types";
import { formatManagerCopilotUpdatedAt, getManagerCopilotPrimarySignal } from "./managerCopilotUi";

export type ManagerCopilotSectionKey =
  | "priorityTickets"
  | "probableIncidents"
  | "assignments"
  | "slaAlerts";

export type ManagerCopilotActionKind = "navigate" | "filter" | "detail" | "prefill" | "ui";

export interface ManagerCopilotAction {
  id: string;
  label: string;
  description: string;
  kind: ManagerCopilotActionKind;
  href?: string;
  state?: unknown;
}

export interface ManagerCopilotIncidentPrefillState {
  source: "allie";
  prefill: {
    title: string;
    description: string;
    severity: Severity;
    impact: IncidentImpact;
    serviceId?: number;
    affectedServiceIds?: number[];
    ticketIds?: number[];
    cause?: string;
  };
}

export interface ManagerCopilotSummaryDraft {
  title: string;
  highlights: string[];
  text: string;
}

type DisplaySignal = ManagerCopilotSignal | ManagerCopilotAssignmentSignal;

export function inferManagerCopilotSectionKey(signal: DisplaySignal): ManagerCopilotSectionKey {
  switch (signal.signalKind) {
    case "incident":
      return "probableIncidents";
    case "assignment":
      return "assignments";
    case "sla":
      return "slaAlerts";
    default:
      return "priorityTickets";
  }
}

export function buildCompactContextAction(
  signal: DisplaySignal | null,
): ManagerCopilotAction | null {
  if (!signal) {
    return null;
  }

  if (signal.signalKind === "sla") {
    const slaStatus = signal.tone === "critical" ? "BREACHED" : "AT_RISK";
    return {
      id: "compact-sla",
      label: "Voir les SLA critiques",
      description: "Ouvre la liste des tickets SLA a traiter sans delai.",
      kind: "filter",
      href: buildUrl("/tickets", {
        slaStatus,
        serviceId: signal.serviceId,
      }),
    };
  }

  if (signal.signalKind === "incident") {
    if (signal.serviceId) {
      return {
        id: "compact-health",
        label: "Voir le service impacte",
        description: "Ouvre la supervision directement sur le service concerne.",
        kind: "detail",
        href: buildUrl("/health", { serviceId: signal.serviceId }),
      };
    }

    return {
      id: "compact-incidents",
      label: "Voir les incidents probables",
      description: "Bascule vers la vue incidents pour confirmer le contexte global.",
      kind: "navigate",
      href: signal.incidentId ? `/incidents/${signal.incidentId}` : "/incidents",
    };
  }

  return {
    id: "compact-ticket",
    label: "Ouvrir le ticket cle",
    description: "Accede immediatement au dossier prioritaire remonte par ALLIE.",
    kind: "detail",
    href: buildTicketDrawerHref(
      signal.ticketId,
      signal.signalKind === "assignment" ? { drawerFocus: "assign" } : {},
    ),
  };
}

export function buildSignalActionPack(
  signal: DisplaySignal,
  sectionKey: ManagerCopilotSectionKey,
): { primary: ManagerCopilotAction; secondary?: ManagerCopilotAction } {
  switch (sectionKey) {
    case "priorityTickets":
      return {
        primary: {
          id: `${signal.id}-open-ticket`,
          label: "Ouvrir le ticket",
          description: "Ouvre le detail du ticket pour arbitrer tout de suite.",
          kind: "detail",
          href: buildTicketDrawerHref(signal.ticketId),
        },
        secondary: {
          id: `${signal.id}-similar-tickets`,
          label: "Voir les tickets comparables",
          description: "Filtre la liste sur le meme contexte service / priorite.",
          kind: "filter",
          href: buildComparableTicketsHref(signal),
        },
      };

    case "probableIncidents":
      if (signal.serviceId) {
        return {
          primary: {
            id: `${signal.id}-open-health`,
            label: "Ouvrir la supervision",
            description: "Affiche le service impacte dans la supervision.",
            kind: "detail",
            href: buildUrl("/health", { serviceId: signal.serviceId }),
          },
          secondary: signal.incidentId
            ? {
                id: `${signal.id}-open-incident`,
                label: "Ouvrir l'incident",
                description: "Ouvre le detail de l'incident deja associe.",
                kind: "detail",
                href: `/incidents/${signal.incidentId}`,
              }
            : {
                id: `${signal.id}-prepare-incident`,
                label: "Preparer l'incident",
                description: "Pre-remplit la declaration d'incident avec le contexte detecte.",
                kind: "prefill",
                href: "/incidents/new",
                state: buildIncidentPrefillState(signal),
              },
        };
      }

      return {
        primary: {
          id: `${signal.id}-open-incidents`,
          label: "Voir les incidents",
          description: "Ouvre la vue incidents pour confirmer le contexte global.",
          kind: "navigate",
          href: signal.incidentId ? `/incidents/${signal.incidentId}` : "/incidents",
        },
      };

    case "assignments":
      return {
        primary: {
          id: `${signal.id}-prepare-assignment`,
          label: "Preparer l'affectation",
          description: "Ouvre le ticket dans le contexte d'assignation recommande.",
          kind: "detail",
          href: buildTicketDrawerHref(signal.ticketId, { drawerFocus: "assign" }),
        },
        secondary: {
          id: `${signal.id}-open-assignment-ticket`,
          label: "Ouvrir le ticket",
          description: "Consulte le detail complet avant validation manager.",
          kind: "detail",
          href: buildTicketDrawerHref(signal.ticketId),
        },
      };

    case "slaAlerts": {
      const isCriticalSla = signal.tone === "critical";
      return {
        primary: {
          id: `${signal.id}-open-sla`,
          label: "Ouvrir la vue SLA",
          description: "Ouvre le ticket directement sur l'onglet SLA.",
          kind: "detail",
          href: buildTicketDrawerHref(signal.ticketId, { drawerTab: "sla" }),
        },
        secondary: {
          id: `${signal.id}-open-sla-page`,
          label: isCriticalSla ? "Voir l'escalade SLA" : "Voir la vue SLA",
          description: "Bascule vers la vue SLA et escalade existante.",
          kind: isCriticalSla ? "navigate" : "filter",
          href: isCriticalSla
            ? buildUrl("/sla", { tab: "escalation" })
            : buildUrl("/tickets", {
                slaStatus: isCriticalSla ? "BREACHED" : "AT_RISK",
                serviceId: signal.serviceId,
              }),
        },
      };
    }

    default:
      return {
        primary: {
          id: `${signal.id}-open-default`,
          label: signal.ctaLabel || "Ouvrir",
          description: "Ouvre le contexte principal associe au signal.",
          kind: "navigate",
          href: signal.href,
        },
      };
  }
}

export function buildManagerSummaryDraft(
  snapshot: ManagerCopilotSnapshot,
): ManagerCopilotSummaryDraft {
  const primarySignal = getManagerCopilotPrimarySignal(snapshot);
  const highlights = [
    `${snapshot.priorityTickets.length} arbitrage(s) ticket a valider`,
    `${snapshot.slaAlerts.length} dossier(s) SLA sous tension`,
    `${snapshot.probableIncidents.length} signal(s) d'incident probable`,
    `${snapshot.assignments.length} recommandation(s) de repartition de charge`,
  ];
  const immediateAction =
    primarySignal?.recommendation ||
    snapshot.quickActions[0]?.description ||
    "Confirmer la prochaine action la plus structurante du portefeuille.";
  const executiveText = [
    `Synthese manager preparee par ALLIE (${formatManagerCopilotUpdatedAt(snapshot.generatedAt)}).`,
    "",
    `Situation globale: ${snapshot.summary}`,
    "",
    `Action immediate suggeree: ${immediateAction}`,
    "",
    `Priorites: ${
      snapshot.priorityTickets
        .slice(0, 2)
        .map((item) => item.title)
        .join(" | ") || "Aucun arbitrage critique remonte."
    }`,
    `Risque SLA: ${
      snapshot.slaAlerts
        .slice(0, 2)
        .map((item) => item.title)
        .join(" | ") || "Pas de dossier SLA majeur a signaler."
    }`,
    `Incidents probables: ${
      snapshot.probableIncidents
        .slice(0, 2)
        .map((item) => item.title)
        .join(" | ") || "Pas de correlation transverse dominante."
    }`,
    `Charge equipe: ${
      snapshot.assignments
        .slice(0, 2)
        .map((item) => `${item.recommendedAgent} sur ${item.title}`)
        .join(" | ") || "Pas de reallocation urgente proposee."
    }`,
  ].join("\n");

  return {
    title: "Synthese manager prete a partager",
    highlights,
    text: executiveText,
  };
}

function buildComparableTicketsHref(signal: DisplaySignal): string {
  const priority = normalizePriority(signal.priorityValue, signal.tone);

  return buildUrl("/tickets", {
    serviceId: signal.serviceId,
    priority,
    search: signal.serviceName && !signal.serviceId ? signal.serviceName : undefined,
  });
}

function buildIncidentPrefillState(signal: DisplaySignal): ManagerCopilotIncidentPrefillState {
  const serviceLabel = signal.serviceName || "service a confirmer";
  const severity = signal.tone === "critical" ? Severity.CRITICAL : Severity.MAJOR;
  const impact = signal.tone === "critical" ? IncidentImpact.MAJOR : IncidentImpact.PARTIAL;

  return {
    source: "allie",
    prefill: {
      title: signal.title || `Incident probable sur ${serviceLabel}`,
      description: [signal.description, signal.recommendation, signal.whyMatters]
        .filter(Boolean)
        .join("\n\n"),
      severity,
      impact,
      serviceId: signal.serviceId,
      affectedServiceIds: signal.serviceId ? [signal.serviceId] : undefined,
      ticketIds: signal.ticketId ? [signal.ticketId] : undefined,
      cause: signal.whyMatters,
    },
  };
}

function buildTicketDrawerHref(
  ticketId?: number,
  options?: { drawerTab?: string; drawerFocus?: string },
): string {
  if (!ticketId) {
    return "/tickets";
  }

  return buildUrl(`/tickets/${ticketId}`, {
    drawerTab: options?.drawerTab,
    drawerFocus: options?.drawerFocus,
  });
}

function normalizePriority(
  priorityValue?: string,
  tone?: DisplaySignal["tone"],
): string | undefined {
  if (priorityValue && Object.values(TicketPriority).includes(priorityValue as TicketPriority)) {
    return priorityValue;
  }

  if (tone === "critical") {
    return TicketPriority.CRITICAL;
  }

  if (tone === "warning") {
    return TicketPriority.HIGH;
  }

  return undefined;
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}
