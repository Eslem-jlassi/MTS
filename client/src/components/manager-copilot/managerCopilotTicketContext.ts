import type { DuplicateResponse } from "../../api/duplicateService";
import {
  IncidentImpact,
  IncidentStatus,
  PriorityLabels,
  ServiceStatus,
  ServiceStatusLabels,
  Severity,
  TicketPriority,
  TicketStatus,
  type Incident,
  type TelecomService,
  type Ticket,
} from "../../types";
import type { ManagerCopilotIncidentPrefillState } from "./managerCopilotActions";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotConfidence,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
  ManagerCopilotTone,
} from "./types";

type DisplaySignal = ManagerCopilotSignal | ManagerCopilotAssignmentSignal;

export type ManagerCopilotTicketScenario = "incident" | "sla" | "assignment" | "priority";

export type ManagerCopilotTicketActionId =
  | "assign-recommended"
  | "open-assignment"
  | "open-sla"
  | "open-service-health"
  | "open-incidents"
  | "prepare-incident"
  | "view-similar";

export type ManagerCopilotTicketActionKind =
  | "navigate"
  | "filter"
  | "detail"
  | "prefill"
  | "ui"
  | "mutation";

export interface ManagerCopilotTicketAction {
  id: ManagerCopilotTicketActionId;
  label: string;
  description: string;
  kind: ManagerCopilotTicketActionKind;
}

export interface ManagerCopilotTicketBadge {
  id: string;
  label: string;
  tone: ManagerCopilotTone;
}

export interface ManagerCopilotTicketFact {
  id: string;
  label: string;
  value: string;
  tone?: ManagerCopilotTone;
}

export interface ManagerCopilotTicketContext {
  scenario: ManagerCopilotTicketScenario;
  tone: ManagerCopilotTone;
  confidence: ManagerCopilotConfidence;
  situation: string;
  immediateAction: string;
  avoidedRisk: string;
  justification: string;
  rationalePoints: string[];
  badges: ManagerCopilotTicketBadge[];
  facts: ManagerCopilotTicketFact[];
  primaryAction: ManagerCopilotTicketAction;
  secondaryActions: ManagerCopilotTicketAction[];
  recommendedAgentId?: number;
  recommendedAgentName?: string;
  serviceId?: number;
  serviceName?: string;
  serviceStatus?: ServiceStatus;
  relatedIncidentId?: number;
  incidentDraftState?: ManagerCopilotIncidentPrefillState;
  similarTicketsHref?: string;
  incidentsHref?: string;
  serviceHealthHref?: string;
}

interface ManagerCopilotTicketContextInput {
  ticket: Ticket;
  duplicates?: DuplicateResponse | null;
  service?: TelecomService | null;
  incidents?: Incident[];
  snapshot?: ManagerCopilotSnapshot | null;
  canAssign?: boolean;
  isAssignmentLocked?: boolean;
}

export function buildManagerCopilotTicketContext({
  ticket,
  duplicates,
  service,
  incidents = [],
  snapshot,
  canAssign = false,
  isAssignmentLocked = false,
}: ManagerCopilotTicketContextInput): ManagerCopilotTicketContext | null {
  const incidentSignal = findMatchingSignal(snapshot?.probableIncidents ?? [], ticket);
  const slaSignal = findMatchingSignal(snapshot?.slaAlerts ?? [], ticket);
  const assignmentSignal = findMatchingSignal(snapshot?.assignments ?? [], ticket) as
    | ManagerCopilotAssignmentSignal
    | undefined;
  const relatedIncident = pickRelatedIncident(incidents, ticket);
  const activeRelatedIncident =
    relatedIncident && isIncidentActive(relatedIncident) ? relatedIncident : undefined;
  const serviceStatus = normalizeServiceStatus(service?.status);
  const serviceDegraded =
    serviceStatus === ServiceStatus.DEGRADED || serviceStatus === ServiceStatus.DOWN;
  const incidentProbable = Boolean(
    incidentSignal || duplicates?.possible_mass_incident || activeRelatedIncident,
  );
  const similarCount = duplicates?.matched_tickets?.length ?? 0;
  const hasSlaRisk = Boolean(
    ticket.breachedSla || ticket.overdue || ticket.slaWarning || slaSignal,
  );
  const isHighPriority =
    ticket.priority === TicketPriority.CRITICAL || ticket.priority === TicketPriority.HIGH;
  const isEscalated = ticket.status === TicketStatus.ESCALATED;
  const isUnassigned = !ticket.assignedToId;
  const hasAssignmentRecommendation = Boolean(
    assignmentSignal?.recommendedAgent || assignmentSignal?.recommendedAgentId,
  );
  const shouldRender =
    ![TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(ticket.status) &&
    (isEscalated ||
      hasSlaRisk ||
      isHighPriority ||
      isUnassigned ||
      serviceDegraded ||
      incidentProbable ||
      hasAssignmentRecommendation);

  if (!shouldRender) {
    return null;
  }

  const serviceName = ticket.serviceName || service?.name || "service a confirmer";
  const serviceHealthHref = ticket.serviceId ? `/health?serviceId=${ticket.serviceId}` : undefined;
  const incidentsHref = activeRelatedIncident
    ? `/incidents/${activeRelatedIncident.id}`
    : ticket.serviceId
      ? `/incidents?serviceId=${ticket.serviceId}`
      : "/incidents";
  const similarTicketsHref = buildSimilarTicketsHref(ticket);
  const incidentDraftState = buildIncidentPrefillState({
    ticket,
    serviceName,
    incidentSignal,
    duplicates,
  });

  const badges = buildBadges({
    ticket,
    serviceStatus,
    incidentProbable,
    similarCount,
    hasAssignmentRecommendation,
  });

  if (incidentProbable || serviceDegraded) {
    const tone: ManagerCopilotTone =
      serviceStatus === ServiceStatus.DOWN ||
      incidentSignal?.tone === "critical" ||
      (duplicates?.possible_mass_incident && ticket.priority === TicketPriority.CRITICAL)
        ? "critical"
        : "warning";
    const confidence = pickIncidentConfidence(
      incidentSignal,
      duplicates,
      activeRelatedIncident,
      serviceStatus,
    );
    const situation = activeRelatedIncident
      ? `ALLIE relie ce ticket a un incident deja ouvert sur ${serviceName}.`
      : serviceStatus === ServiceStatus.DOWN
        ? `Le service ${serviceName} est en panne et ce ticket peut relever d'un incident global.`
        : `ALLIE detecte un signal d'incident probable autour de ce ticket.`;
    const immediateAction = activeRelatedIncident
      ? "Ouvrir l'incident et verifier si ce ticket doit etre rattache au pilotage global."
      : "Verifier le contexte sur la supervision puis preparer l'incident si le signal se confirme.";
    const justification =
      incidentSignal?.recommendation ||
      duplicates?.recommendation ||
      buildIncidentFallbackJustification(serviceName, serviceStatus, similarCount);

    return {
      scenario: "incident",
      tone,
      confidence,
      situation,
      immediateAction,
      avoidedRisk:
        "Evite une reponse dispersee, des tickets traites isolement et un retard de communication manager.",
      justification,
      rationalePoints: compactList([
        incidentSignal?.whyMatters,
        activeRelatedIncident
          ? `Incident ${activeRelatedIncident.incidentNumber || `#${activeRelatedIncident.id}`} deja actif sur ce service.`
          : undefined,
        serviceDegraded && serviceStatus
          ? `Service ${serviceName} actuellement ${String(ServiceStatusLabels[serviceStatus]).toLowerCase()}.`
          : undefined,
        duplicates?.possible_mass_incident
          ? "Le detecteur de doublons remonte un incident de masse probable."
          : undefined,
        similarCount > 0
          ? `${similarCount} ticket(s) proche(s) renforcent le signal transverse.`
          : undefined,
      ]),
      badges,
      facts: buildFacts({
        ticket,
        serviceName,
        serviceStatus,
        assignmentSignal,
        relatedIncident,
        similarCount,
      }),
      primaryAction: activeRelatedIncident
        ? buildAction(
            "open-incidents",
            "Ouvrir l'incident",
            "Accede au detail de l'incident deja ouvert.",
            "detail",
          )
        : buildAction(
            "prepare-incident",
            "Preparer l'incident",
            "Pre-remplit une declaration d'incident avec le contexte du ticket.",
            "prefill",
          ),
      secondaryActions: limitActions([
        serviceHealthHref
          ? buildAction(
              "open-service-health",
              "Ouvrir la supervision",
              "Affiche le service impacte dans la supervision.",
              "detail",
            )
          : null,
        !activeRelatedIncident
          ? buildAction(
              "open-incidents",
              "Ouvrir incidents",
              "Bascule vers la vue incidents existante.",
              "filter",
            )
          : null,
        similarCount > 0
          ? buildAction(
              "view-similar",
              "Voir les tickets similaires",
              "Filtre les tickets proches ou comparables.",
              "filter",
            )
          : null,
      ]),
      recommendedAgentId: assignmentSignal?.recommendedAgentId,
      recommendedAgentName: assignmentSignal?.recommendedAgent,
      serviceId: ticket.serviceId,
      serviceName,
      serviceStatus: serviceStatus ?? undefined,
      relatedIncidentId: activeRelatedIncident?.id,
      incidentDraftState,
      similarTicketsHref,
      incidentsHref,
      serviceHealthHref,
    };
  }

  if (hasSlaRisk) {
    const tone: ManagerCopilotTone =
      ticket.breachedSla || ticket.overdue || slaSignal?.tone === "critical"
        ? "critical"
        : "warning";
    const confidence: ManagerCopilotConfidence =
      ticket.breachedSla || ticket.overdue || slaSignal?.confidence === "high" ? "high" : "medium";

    return {
      scenario: "sla",
      tone,
      confidence,
      situation:
        ticket.breachedSla || ticket.overdue
          ? "Le ticket a depasse son SLA et demande un arbitrage manager immediat."
          : "Le ticket entre en zone de risque SLA et doit etre securise avant rupture.",
      immediateAction:
        "Basculer sur l'onglet SLA pour valider l'escalade, la priorisation et le prochain point de controle.",
      avoidedRisk:
        "Evite une rupture SLA, une escalation client non preparee et une perte de priorisation du portefeuille.",
      justification:
        slaSignal?.recommendation ||
        buildSlaFallbackJustification(
          ticket,
          serviceStatus ? ServiceStatusLabels[serviceStatus] : undefined,
        ),
      rationalePoints: compactList([
        slaSignal?.whyMatters,
        ticket.overdue || ticket.breachedSla
          ? "Le delai contractuel est deja depasse."
          : ticket.slaWarning
            ? "Le temps restant devient court au regard du statut courant."
            : undefined,
        isEscalated
          ? "Le ticket est deja escalade, le niveau de vigilance reste eleve."
          : undefined,
        serviceDegraded
          ? `Le service ${serviceName} reste sous tension operationnelle.`
          : undefined,
        isUnassigned ? "Aucun owner n'est pose pour porter la resolution jusqu'au SLA." : undefined,
      ]),
      badges,
      facts: buildFacts({
        ticket,
        serviceName,
        serviceStatus,
        assignmentSignal,
        relatedIncident,
        similarCount,
      }),
      primaryAction: buildAction(
        "open-sla",
        "Ouvrir l'onglet SLA",
        "Affiche directement les indicateurs SLA du ticket.",
        "ui",
      ),
      secondaryActions: limitActions([
        serviceHealthHref && serviceDegraded
          ? buildAction(
              "open-service-health",
              "Ouvrir la supervision",
              "Controle le service associe avant arbitrage.",
              "detail",
            )
          : null,
        incidentProbable
          ? buildAction(
              activeRelatedIncident ? "open-incidents" : "prepare-incident",
              activeRelatedIncident ? "Ouvrir l'incident" : "Preparer l'incident",
              activeRelatedIncident
                ? "Affiche l'incident deja lie au contexte."
                : "Prepare un incident si le risque SLA vient d'un incident global.",
              activeRelatedIncident ? "detail" : "prefill",
            )
          : null,
        buildAction(
          "view-similar",
          "Voir les tickets comparables",
          "Filtre les tickets proches pour qualifier l'escalade.",
          "filter",
        ),
      ]),
      recommendedAgentId: assignmentSignal?.recommendedAgentId,
      recommendedAgentName: assignmentSignal?.recommendedAgent,
      serviceId: ticket.serviceId,
      serviceName,
      serviceStatus: serviceStatus ?? undefined,
      relatedIncidentId: activeRelatedIncident?.id,
      incidentDraftState,
      similarTicketsHref,
      incidentsHref,
      serviceHealthHref,
    };
  }

  if (hasAssignmentRecommendation || isUnassigned) {
    const tone: ManagerCopilotTone =
      ticket.priority === TicketPriority.CRITICAL || isEscalated ? "critical" : "warning";
    const confidence: ManagerCopilotConfidence =
      assignmentSignal?.recommendedAgentId || assignmentSignal?.confidence === "high"
        ? "high"
        : isHighPriority
          ? "medium"
          : "low";
    const canApplyRecommendation = Boolean(
      canAssign &&
      !isAssignmentLocked &&
      assignmentSignal?.recommendedAgentId &&
      ticket.assignedToId !== assignmentSignal.recommendedAgentId,
    );

    return {
      scenario: "assignment",
      tone,
      confidence,
      situation: ticket.assignedToId
        ? "ALLIE recommande de revisiter l'affectation actuelle pour accelerer ce dossier."
        : "Ce ticket reste sans owner clair alors que son niveau de pilotage augmente.",
      immediateAction: canApplyRecommendation
        ? `Affecter a ${assignmentSignal?.recommendedAgent || "l'agent recommande"} pour remettre le ticket en execution.`
        : "Ouvrir l'affectation et confirmer l'owner le plus credible pour ce dossier.",
      avoidedRisk:
        "Evite qu'un ticket prioritaire reste sans prise en charge, change trop tard de main ou se bloque sur la file manager.",
      justification:
        assignmentSignal?.recommendation ||
        buildAssignmentFallbackJustification(ticket, assignmentSignal?.recommendedAgent),
      rationalePoints: compactList([
        assignmentSignal?.whyMatters,
        assignmentSignal?.recommendedAgent
          ? `${assignmentSignal.recommendedAgent} remonte comme agent le plus credible dans ce contexte.`
          : undefined,
        isUnassigned ? "Le ticket n'est pas encore assigne." : undefined,
        hasSlaRisk ? "La pression SLA renforce le besoin d'un owner explicite." : undefined,
        serviceDegraded
          ? `Le service ${serviceName} reste sous surveillance rapprochee.`
          : undefined,
      ]),
      badges,
      facts: buildFacts({
        ticket,
        serviceName,
        serviceStatus,
        assignmentSignal,
        relatedIncident,
        similarCount,
      }),
      primaryAction: canApplyRecommendation
        ? buildAction(
            "assign-recommended",
            `Affecter a ${assignmentSignal?.recommendedAgent || "l'agent recommande"}`,
            "Declenche l'assignation via l'UI existante.",
            "mutation",
          )
        : buildAction(
            "open-assignment",
            "Ouvrir l'affectation",
            "Place le manager au bon endroit pour valider l'owner.",
            "ui",
          ),
      secondaryActions: limitActions([
        hasSlaRisk
          ? buildAction(
              "open-sla",
              "Ouvrir l'onglet SLA",
              "Controle la pression contractuelle avant assignation.",
              "ui",
            )
          : null,
        serviceHealthHref && serviceDegraded
          ? buildAction(
              "open-service-health",
              "Ouvrir la supervision",
              "Valide l'etat du service avant l'affectation.",
              "detail",
            )
          : null,
        buildAction(
          "view-similar",
          "Voir les tickets comparables",
          "Filtre les tickets proches pour confirmer l'affectation.",
          "filter",
        ),
      ]),
      recommendedAgentId: assignmentSignal?.recommendedAgentId,
      recommendedAgentName: assignmentSignal?.recommendedAgent,
      serviceId: ticket.serviceId,
      serviceName,
      serviceStatus: serviceStatus ?? undefined,
      relatedIncidentId: activeRelatedIncident?.id,
      incidentDraftState,
      similarTicketsHref,
      incidentsHref,
      serviceHealthHref,
    };
  }

  const fallbackPrimaryAction = buildPriorityPrimaryAction({
    canAssign,
    isAssignmentLocked,
    ticket,
    serviceDegraded,
    incidentProbable,
    hasSlaRisk,
  });

  return {
    scenario: "priority",
    tone: ticket.priority === TicketPriority.CRITICAL || isEscalated ? "critical" : "warning",
    confidence: ticket.priority === TicketPriority.CRITICAL || isEscalated ? "high" : "medium",
    situation:
      "Le ticket reste suffisamment sensible pour meriter un pilotage manager cible, meme avant escalation formelle.",
    immediateAction: describePriorityImmediateAction(
      fallbackPrimaryAction,
      assignmentSignal?.recommendedAgent,
    ),
    avoidedRisk:
      "Evite qu'un dossier prioritaire perde du temps de coordination, passe sous le radar ou soit arbitre trop tard.",
    justification: buildPriorityFallbackJustification(ticket, similarCount, serviceStatus),
    rationalePoints: compactList([
      isEscalated ? "Le ticket est deja escalade." : undefined,
      `Priorite ${PriorityLabels[ticket.priority].toLowerCase()} sur ${serviceName}.`,
      similarCount > 0
        ? `${similarCount} ticket(s) comparable(s) existent deja sur ce contexte.`
        : undefined,
      serviceDegraded && serviceStatus
        ? `Le service est actuellement ${String(ServiceStatusLabels[serviceStatus]).toLowerCase()}.`
        : undefined,
    ]),
    badges,
    facts: buildFacts({
      ticket,
      serviceName,
      serviceStatus,
      assignmentSignal,
      relatedIncident,
      similarCount,
    }),
    primaryAction: fallbackPrimaryAction,
    secondaryActions: limitActions([
      buildAction(
        "view-similar",
        "Voir les tickets comparables",
        "Filtre les tickets proches pour cadrer la decision manager.",
        "filter",
      ),
      hasSlaRisk
        ? buildAction(
            "open-sla",
            "Ouvrir l'onglet SLA",
            "Controle l'etat contractuel du dossier.",
            "ui",
          )
        : null,
      serviceHealthHref && (serviceDegraded || incidentProbable)
        ? buildAction(
            "open-service-health",
            "Ouvrir la supervision",
            "Vise le service associe pour lire le contexte live.",
            "detail",
          )
        : null,
    ]),
    recommendedAgentId: assignmentSignal?.recommendedAgentId,
    recommendedAgentName: assignmentSignal?.recommendedAgent,
    serviceId: ticket.serviceId,
    serviceName,
    serviceStatus: serviceStatus ?? undefined,
    relatedIncidentId: activeRelatedIncident?.id,
    incidentDraftState,
    similarTicketsHref,
    incidentsHref,
    serviceHealthHref,
  };
}

function findMatchingSignal<T extends DisplaySignal>(signals: T[], ticket: Ticket): T | undefined {
  return signals.find((signal) => {
    if (signal.ticketId === ticket.id) {
      return true;
    }

    if (signal.ticketNumber && signal.ticketNumber === ticket.ticketNumber) {
      return true;
    }

    return (
      signal.signalKind === "incident" &&
      signal.serviceId != null &&
      signal.serviceId === ticket.serviceId
    );
  });
}

function pickRelatedIncident(incidents: Incident[], ticket: Ticket): Incident | undefined {
  const activeIncidents = incidents.filter((incident) =>
    [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS].includes(incident.status),
  );
  const linkedActiveIncident = activeIncidents.find(
    (incident) =>
      incident.ticketId === ticket.id ||
      incident.ticketIds?.includes(ticket.id) ||
      incident.ticketNumber === ticket.ticketNumber ||
      incident.ticketNumbers?.includes(ticket.ticketNumber),
  );

  if (linkedActiveIncident) {
    return linkedActiveIncident;
  }

  const serviceActiveIncident = activeIncidents.find(
    (incident) =>
      incident.serviceId === ticket.serviceId ||
      incident.affectedServiceIds?.includes(ticket.serviceId),
  );

  if (serviceActiveIncident) {
    return serviceActiveIncident;
  }

  return [...incidents].sort(compareByStartedAtDesc)[0];
}

function compareByStartedAtDesc(left: Incident, right: Incident): number {
  return (
    new Date(right.startedAt || right.createdAt).getTime() -
    new Date(left.startedAt || left.createdAt).getTime()
  );
}

function isIncidentActive(incident: Incident): boolean {
  return [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS].includes(incident.status);
}

function normalizeServiceStatus(status?: string): ServiceStatus | undefined {
  if (!status) {
    return undefined;
  }

  return Object.values(ServiceStatus).includes(status as ServiceStatus)
    ? (status as ServiceStatus)
    : undefined;
}

function pickIncidentConfidence(
  signal: DisplaySignal | undefined,
  duplicates: DuplicateResponse | null | undefined,
  incident: Incident | undefined,
  serviceStatus: ServiceStatus | undefined,
): ManagerCopilotConfidence {
  const duplicateConfidence =
    typeof duplicates?.confidence === "number"
      ? duplicates.confidence
      : typeof duplicates?.duplicate_confidence === "number"
        ? duplicates.duplicate_confidence
        : 0;

  if (
    incident ||
    signal?.confidence === "high" ||
    serviceStatus === ServiceStatus.DOWN ||
    duplicateConfidence >= 0.75
  ) {
    return "high";
  }

  if (signal?.confidence === "medium" || duplicates?.possible_mass_incident) {
    return "medium";
  }

  return "low";
}

function buildBadges(input: {
  ticket: Ticket;
  serviceStatus?: ServiceStatus;
  incidentProbable: boolean;
  similarCount: number;
  hasAssignmentRecommendation: boolean;
}): ManagerCopilotTicketBadge[] {
  const badges: Array<ManagerCopilotTicketBadge | null> = [
    input.ticket.status === TicketStatus.ESCALATED
      ? { id: "escalated", label: "Escalade", tone: "critical" }
      : null,
    input.ticket.breachedSla || input.ticket.overdue
      ? { id: "sla-breached", label: "SLA depasse", tone: "critical" }
      : input.ticket.slaWarning
        ? { id: "sla-warning", label: "SLA a risque", tone: "warning" }
        : null,
    input.ticket.priority === TicketPriority.CRITICAL
      ? { id: "priority-critical", label: "Priorite critique", tone: "critical" }
      : input.ticket.priority === TicketPriority.HIGH
        ? { id: "priority-high", label: "Priorite haute", tone: "warning" }
        : null,
    !input.ticket.assignedToId ? { id: "unassigned", label: "Non assigne", tone: "warning" } : null,
    input.serviceStatus === ServiceStatus.DOWN
      ? { id: "service-down", label: "Service en panne", tone: "critical" }
      : input.serviceStatus === ServiceStatus.DEGRADED
        ? { id: "service-degraded", label: "Service degrade", tone: "warning" }
        : null,
    input.incidentProbable
      ? { id: "incident", label: "Incident probable", tone: "critical" }
      : null,
    input.hasAssignmentRecommendation
      ? { id: "assignment", label: "Suggestion d'affectation", tone: "info" }
      : null,
    input.similarCount > 0
      ? {
          id: "similar",
          label: `${input.similarCount} ticket(s) proche(s)`,
          tone: input.similarCount > 1 ? "warning" : "info",
        }
      : null,
  ];

  return badges.filter(Boolean).slice(0, 4) as ManagerCopilotTicketBadge[];
}

function buildFacts(input: {
  ticket: Ticket;
  serviceName: string;
  serviceStatus?: ServiceStatus;
  assignmentSignal?: ManagerCopilotAssignmentSignal;
  relatedIncident?: Incident;
  similarCount: number;
}): ManagerCopilotTicketFact[] {
  return compactFacts([
    {
      id: "service",
      label: "Service impacte",
      value: input.serviceStatus
        ? `${input.serviceName} / ${ServiceStatusLabels[input.serviceStatus]}`
        : input.serviceName,
      tone:
        input.serviceStatus === ServiceStatus.DOWN
          ? "critical"
          : input.serviceStatus === ServiceStatus.DEGRADED
            ? "warning"
            : "info",
    },
    input.assignmentSignal?.recommendedAgent
      ? {
          id: "agent",
          label: "Agent recommande",
          value: input.assignmentSignal.recommendedAgent,
          tone: "info",
        }
      : null,
    input.relatedIncident
      ? {
          id: "incident",
          label: "Lien incident",
          value: input.relatedIncident.incidentNumber || `Incident #${input.relatedIncident.id}`,
          tone: input.relatedIncident.status === IncidentStatus.OPEN ? "critical" : "warning",
        }
      : null,
    input.similarCount > 0
      ? {
          id: "similar",
          label: "Tickets proches",
          value: `${input.similarCount} similaire(s)`,
          tone: input.similarCount > 1 ? "warning" : "info",
        }
      : null,
    {
      id: "priority",
      label: "Priorite",
      value: PriorityLabels[input.ticket.priority],
      tone:
        input.ticket.priority === TicketPriority.CRITICAL
          ? "critical"
          : input.ticket.priority === TicketPriority.HIGH
            ? "warning"
            : "info",
    },
  ]);
}

function buildIncidentFallbackJustification(
  serviceName: string,
  serviceStatus: ServiceStatus | undefined,
  similarCount: number,
): string {
  if (serviceStatus) {
    return `Le service ${serviceName} est ${String(ServiceStatusLabels[serviceStatus]).toLowerCase()} et le ticket porte un signal transverse a confirmer.`;
  }

  if (similarCount > 0) {
    return `${similarCount} ticket(s) proche(s) remontent sur le meme contexte, ce qui justifie une verification incidentee.`;
  }

  return "Le contexte ticket, service et supervision merite une verification manager avant traitement isole.";
}

function buildSlaFallbackJustification(ticket: Ticket, serviceStatusLabel?: string): string {
  const remaining =
    typeof ticket.slaRemainingMinutes === "number"
      ? `${Math.abs(ticket.slaRemainingMinutes)} minute(s)`
      : "un delai court";

  if (ticket.breachedSla || ticket.overdue) {
    return `Le ticket a deja depasse le SLA et doit etre repris sans delai.`;
  }

  if (serviceStatusLabel) {
    return `Le SLA devient sensible dans un contexte service ${serviceStatusLabel.toLowerCase()}.`;
  }

  return `Le ticket approche du seuil SLA avec ${remaining} a surveiller.`;
}

function buildAssignmentFallbackJustification(
  ticket: Ticket,
  recommendedAgentName?: string,
): string {
  if (recommendedAgentName) {
    return `${recommendedAgentName} remonte comme relais credibilisant pour ce ticket prioritaire.`;
  }

  if (!ticket.assignedToId) {
    return "Le ticket est encore sans owner alors que sa priorite et son contexte demandent une prise en charge rapide.";
  }

  return "Le contexte ticket suggere de revisiter l'affectation pour accelerer la resolution.";
}

function buildPriorityFallbackJustification(
  ticket: Ticket,
  similarCount: number,
  serviceStatus?: ServiceStatus,
): string {
  if (serviceStatus) {
    return `Le ticket porte une priorite ${PriorityLabels[ticket.priority].toLowerCase()} sur un service ${String(ServiceStatusLabels[serviceStatus]).toLowerCase()}.`;
  }

  if (similarCount > 0) {
    return `${similarCount} ticket(s) comparable(s) existent deja, ce qui rend l'arbitrage manager plus structurant.`;
  }

  return "Le niveau de priorite et le statut courant justifient une lecture manager plus directive.";
}

function buildPriorityPrimaryAction(input: {
  canAssign: boolean;
  isAssignmentLocked: boolean;
  ticket: Ticket;
  serviceDegraded: boolean;
  incidentProbable: boolean;
  hasSlaRisk: boolean;
}): ManagerCopilotTicketAction {
  if (input.serviceDegraded || input.incidentProbable) {
    return buildAction(
      "open-service-health",
      "Ouvrir la supervision",
      "Consulte le service associe avant arbitrage.",
      "detail",
    );
  }

  if (input.hasSlaRisk) {
    return buildAction(
      "open-sla",
      "Ouvrir l'onglet SLA",
      "Controle la pression contractuelle du ticket.",
      "ui",
    );
  }

  if (input.canAssign && !input.isAssignmentLocked && !input.ticket.assignedToId) {
    return buildAction(
      "open-assignment",
      "Ouvrir l'affectation",
      "Place le manager au bon endroit pour nommer un owner.",
      "ui",
    );
  }

  return buildAction(
    "view-similar",
    "Voir les tickets comparables",
    "Filtre les tickets proches pour accelerer l'arbitrage.",
    "filter",
  );
}

function describePriorityImmediateAction(
  action: ManagerCopilotTicketAction,
  recommendedAgentName?: string,
): string {
  switch (action.id) {
    case "open-service-health":
      return "Lire la supervision du service avant de poursuivre un traitement ticket trop isole.";
    case "open-sla":
      return "Verifier le SLA pour confirmer le niveau d'urgence reel du dossier.";
    case "open-assignment":
      return recommendedAgentName
        ? `Confirmer rapidement l'affectation vers ${recommendedAgentName}.`
        : "Poser un owner explicite pour remettre le ticket en execution.";
    default:
      return "Comparer ce ticket au contexte proche pour arbitrer plus vite.";
  }
}

function buildSimilarTicketsHref(ticket: Ticket): string {
  const params = new URLSearchParams();
  if (ticket.serviceId != null) {
    params.set("serviceId", String(ticket.serviceId));
  }
  params.set("priority", ticket.priority);
  return `/tickets?${params.toString()}`;
}

function buildIncidentPrefillState(input: {
  ticket: Ticket;
  serviceName: string;
  incidentSignal?: DisplaySignal;
  duplicates?: DuplicateResponse | null;
}): ManagerCopilotIncidentPrefillState {
  const severity =
    input.ticket.priority === TicketPriority.CRITICAL || input.duplicates?.possible_mass_incident
      ? Severity.CRITICAL
      : Severity.MAJOR;
  const impact =
    input.ticket.priority === TicketPriority.CRITICAL
      ? IncidentImpact.MAJOR
      : IncidentImpact.PARTIAL;

  return {
    source: "allie",
    prefill: {
      title:
        input.incidentSignal?.title ||
        `Incident probable sur ${input.serviceName || "service a confirmer"}`,
      description: compactList([
        input.ticket.description,
        input.incidentSignal?.description,
        input.duplicates?.recommendation,
      ]).join("\n\n"),
      severity,
      impact,
      serviceId: input.ticket.serviceId,
      affectedServiceIds: input.ticket.serviceId != null ? [input.ticket.serviceId] : undefined,
      ticketIds: [input.ticket.id],
      cause: input.incidentSignal?.whyMatters || input.duplicates?.reasoning || input.ticket.impact,
    },
  };
}

function buildAction(
  id: ManagerCopilotTicketActionId,
  label: string,
  description: string,
  kind: ManagerCopilotTicketActionKind,
): ManagerCopilotTicketAction {
  return { id, label, description, kind };
}

function limitActions(
  actions: Array<ManagerCopilotTicketAction | null | undefined>,
): ManagerCopilotTicketAction[] {
  const seen = new Set<ManagerCopilotTicketActionId>();

  return actions
    .filter((action): action is ManagerCopilotTicketAction => Boolean(action))
    .filter((action) => {
      if (seen.has(action.id)) {
        return false;
      }

      seen.add(action.id);
      return true;
    })
    .slice(0, 3);
}

function compactList(items: Array<string | undefined | null | false>): string[] {
  return items
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function compactFacts(
  items: Array<ManagerCopilotTicketFact | null | undefined>,
): ManagerCopilotTicketFact[] {
  return items.filter(Boolean).slice(0, 4) as ManagerCopilotTicketFact[];
}
