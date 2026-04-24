import {
  type AgentStats,
  type DashboardStats,
  type Incident,
  IncidentStatus,
  PriorityLabels,
  type TelecomService,
  ServiceStatus,
  ServiceStatusLabels,
  Severity,
  SeverityLabels,
  type Ticket,
  TicketPriority,
  TicketStatus,
  StatusLabels,
} from "../../types";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotConfidence,
  ManagerCopilotMetric,
  ManagerCopilotQuickAction,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
  ManagerCopilotTone,
} from "./types";
import { buildDecisionAreas, buildWhyCards } from "./managerCopilotInsights";

interface ManagerCopilotSource {
  stats: DashboardStats;
  tickets: Ticket[];
  incidents: Incident[];
  services: TelecomService[];
  mode: "live" | "degraded";
  generatedAt: string;
}

interface ScoredTicket {
  score: number;
  signal: ManagerCopilotSignal;
  ticket: Ticket;
}

const MAX_PRIORITY_TICKETS = 4;
const MAX_DIRECT_INCIDENT_SIGNALS = 3;
const MAX_INCIDENT_SIGNALS = 4;
const MAX_ASSIGNMENT_SIGNALS = 3;
const MAX_SLA_ALERTS = 4;
const MAX_QUICK_ACTIONS = 5;

const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 95,
  [TicketPriority.HIGH]: 58,
  [TicketPriority.MEDIUM]: 28,
  [TicketPriority.LOW]: 8,
};

const STATUS_WEIGHT: Record<TicketStatus, number> = {
  [TicketStatus.NEW]: 16,
  [TicketStatus.ASSIGNED]: 12,
  [TicketStatus.IN_PROGRESS]: 15,
  [TicketStatus.PENDING]: 10,
  [TicketStatus.PENDING_THIRD_PARTY]: 14,
  [TicketStatus.ESCALATED]: 34,
  [TicketStatus.RESOLVED]: 0,
  [TicketStatus.CLOSED]: 0,
  [TicketStatus.CANCELLED]: 0,
};

const ACTIVE_TICKET_STATUSES = new Set<TicketStatus>([
  TicketStatus.NEW,
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING,
  TicketStatus.PENDING_THIRD_PARTY,
  TicketStatus.ESCALATED,
]);

const ACTIVE_INCIDENT_STATUSES = new Set<IncidentStatus>([
  IncidentStatus.OPEN,
  IncidentStatus.IN_PROGRESS,
]);

export function buildManagerCopilotSnapshot(source: ManagerCopilotSource): ManagerCopilotSnapshot {
  const { stats, tickets, incidents, services, mode, generatedAt } = source;
  const activeTickets = tickets.filter((ticket) => ACTIVE_TICKET_STATUSES.has(ticket.status));
  const activeIncidents = incidents.filter((incident) =>
    ACTIVE_INCIDENT_STATUSES.has(incident.status),
  );
  const servicesById = new Map(services.map((service) => [service.id, service] as const));
  const servicesByName = new Map(
    services.map((service) => [normalize(service.name), service] as const),
  );
  const incidentServiceNames = new Set(
    activeIncidents.map((incident) => normalize(incident.serviceName)).filter(Boolean),
  );
  const servicesAtRisk = services.filter(
    (service) => service.status === ServiceStatus.DOWN || service.status === ServiceStatus.DEGRADED,
  );

  const scoredTickets = activeTickets
    .map((ticket) => scoreTicket(ticket, servicesById, servicesByName, incidentServiceNames))
    .sort((left, right) => right.score - left.score);

  const priorityTickets = scoredTickets.slice(0, MAX_PRIORITY_TICKETS).map(({ signal }) => signal);
  const probableIncidents = buildIncidentSignals(
    activeIncidents,
    activeTickets,
    servicesAtRisk,
    stats,
  );
  const assignments = buildAssignmentSignals(scoredTickets, stats.agentStats ?? []);
  const slaAlerts = buildSlaAlerts(scoredTickets);
  const quickActions = buildQuickActions(
    priorityTickets,
    probableIncidents,
    slaAlerts,
    servicesAtRisk,
  );
  const metrics = buildMetrics(priorityTickets, slaAlerts, probableIncidents, servicesAtRisk);
  const summary = buildSummary(
    stats,
    priorityTickets,
    probableIncidents,
    slaAlerts,
    servicesAtRisk,
  );
  const urgentCount =
    priorityTickets.filter((signal) => signal.tone === "critical").length +
    probableIncidents.filter((signal) => signal.tone === "critical").length +
    slaAlerts.filter((signal) => signal.tone === "critical").length;

  return {
    mode,
    generatedAt,
    summary,
    urgentCount,
    metrics,
    decisionAreas: buildDecisionAreas({
      summary,
      priorityTickets,
      probableIncidents,
      assignments,
      slaAlerts,
    }),
    whyCards: buildWhyCards({
      priorityTickets,
      probableIncidents,
      assignments,
      slaAlerts,
    }),
    priorityTickets,
    probableIncidents,
    assignments,
    slaAlerts,
    quickActions,
  };
}

function buildMetrics(
  priorityTickets: ManagerCopilotSignal[],
  slaAlerts: ManagerCopilotSignal[],
  probableIncidents: ManagerCopilotSignal[],
  servicesAtRisk: TelecomService[],
): ManagerCopilotMetric[] {
  return [
    {
      label: "Arbitrages",
      value: String(priorityTickets.length),
      tone: priorityTickets.some((signal) => signal.tone === "critical") ? "critical" : "info",
    },
    {
      label: "SLA sous tension",
      value: String(slaAlerts.length),
      tone: slaAlerts.some((signal) => signal.tone === "critical") ? "critical" : "warning",
    },
    {
      label: "Incidents probables",
      value: String(probableIncidents.length),
      tone: probableIncidents.some((signal) => signal.tone === "critical") ? "critical" : "warning",
    },
    {
      label: "Services a risque",
      value: String(servicesAtRisk.length),
      tone: servicesAtRisk.length > 0 ? "warning" : "success",
    },
  ];
}

function buildSummary(
  stats: DashboardStats,
  priorityTickets: ManagerCopilotSignal[],
  probableIncidents: ManagerCopilotSignal[],
  slaAlerts: ManagerCopilotSignal[],
  servicesAtRisk: TelecomService[],
): string {
  const criticalTicketCount = priorityTickets.filter((signal) => signal.tone === "critical").length;
  const criticalSlaCount = slaAlerts.filter((signal) => signal.tone === "critical").length;

  if (criticalSlaCount > 0) {
    return `${criticalSlaCount} ticket(s) necessitent un arbitrage SLA immediat, avec ${servicesAtRisk.length} service(s) sous surveillance renforcee.`;
  }

  if (probableIncidents.length > 0) {
    return `${probableIncidents.length} faisceau(x) incident ressort(ent) de la supervision. Priorisez les ${priorityTickets.length} tickets les plus structurants avant escalade.`;
  }

  if (criticalTicketCount > 0) {
    return `${criticalTicketCount} ticket(s) hautement prioritaires ressort(ent) aujourd'hui, dans un portefeuille de ${stats.activeTickets ?? 0} tickets actifs.`;
  }

  return `Supervision stable: ${stats.activeTickets ?? 0} tickets actifs, ${stats.slaBreachedCount ?? 0} SLA depasse(s) et ${servicesAtRisk.length} service(s) a controler.`;
}

function buildIncidentSignals(
  incidents: Incident[],
  tickets: Ticket[],
  servicesAtRisk: TelecomService[],
  stats: DashboardStats,
): ManagerCopilotSignal[] {
  const directSignals = incidents
    .slice(0, MAX_DIRECT_INCIDENT_SIGNALS)
    .map<ManagerCopilotSignal>((incident) => {
      const relatedTickets = incident.ticketNumbers?.length ?? incident.ticketIds?.length ?? 0;
      const severity = incident.severity ?? Severity.MINOR;
      const tone: ManagerCopilotTone =
        severity === Severity.CRITICAL
          ? "critical"
          : severity === Severity.MAJOR
            ? "warning"
            : "info";

      return {
        id: `incident-${incident.id}`,
        eyebrow: incident.statusLabel || "Incident actif",
        title: incident.title,
        description: `${incident.serviceName || "Service multi-sources"}${relatedTickets > 0 ? ` - ${relatedTickets} ticket(s) lies` : ""}`,
        recommendation:
          "Verifier si la communication et la qualification doivent etre centralisees au niveau incident.",
        href: `/incidents/${incident.id}`,
        tone,
        confidence: "high",
        meta: incident.incidentNumber || "Supervision active",
        whyMatters:
          relatedTickets > 0
            ? "Plusieurs tickets semblent dependre du meme contexte operationnel, ce qui peut justifier une coordination globale."
            : "Un incident deja actif peut concentrer plusieurs impacts clients et mobiliser plusieurs equipes.",
        tags: [SeverityLabels[severity] || "Incident", incident.serviceName || "Analyse globale"],
        ctaLabel: "Ouvrir l'incident",
        signalKind: "incident",
        incidentId: incident.id,
        serviceId: incident.serviceId,
        serviceName: incident.serviceName,
        statusValue: incident.status,
      };
    });

  const clusterSignals = servicesAtRisk
    .map((service) => {
      const ticketCount =
        tickets.filter((ticket) => ticket.serviceId === service.id).length ||
        stats.ticketsByService?.[service.name] ||
        0;
      if (ticketCount < 2) {
        return null;
      }

      const statusLabel =
        ServiceStatusLabels[(service.status as ServiceStatus) || ServiceStatus.UP];
      return {
        id: `cluster-${service.id}`,
        eyebrow: "Incident probable",
        title: `${service.name} montre un faisceau de tickets`,
        description: `${ticketCount} ticket(s) actifs autour d'un service ${statusLabel.toLowerCase()}. Verifiez si un incident global doit etre ouvert.`,
        recommendation:
          "Confirmer rapidement s'il faut regrouper ces tickets sous un incident global pour piloter la communication.",
        href: `/health?serviceId=${service.id}`,
        tone: service.status === ServiceStatus.DOWN ? "critical" : "warning",
        confidence: ticketCount >= 3 ? "high" : "medium",
        meta: "Correlation service / tickets",
        whyMatters:
          "Traiter ces tickets comme un signal commun evite des arbitrages isoles et accelere la decision manager.",
        tags: [statusLabel, `${ticketCount} tickets`],
        ctaLabel: "Voir la supervision",
        signalKind: "incident",
        serviceId: service.id,
        serviceName: service.name,
        statusValue: service.status,
      } satisfies ManagerCopilotSignal;
    })
    .filter(Boolean) as ManagerCopilotSignal[];

  return [...directSignals, ...clusterSignals].slice(0, MAX_INCIDENT_SIGNALS);
}

function buildAssignmentSignals(
  scoredTickets: ScoredTicket[],
  agentStats: AgentStats[],
): ManagerCopilotAssignmentSignal[] {
  if (agentStats.length === 0) {
    return [];
  }

  const topAgents = rankAgents(agentStats);
  const candidateTickets = scoredTickets
    .filter(({ ticket }) => !ticket.assignedToId || ticket.status === TicketStatus.ESCALATED)
    .slice(0, MAX_ASSIGNMENT_SIGNALS);

  return candidateTickets.map((candidate, index) => {
    const selectedAgent = topAgents[index % topAgents.length];
    return {
      id: `assignment-${candidate.ticket.id}-${selectedAgent.agentId}`,
      eyebrow: candidate.ticket.ticketNumber,
      title: `Pre-affecter ${selectedAgent.agentName}`,
      description: `${selectedAgent.agentName} est la meilleure option pour ${candidate.ticket.title.toLowerCase()} avec une charge active maitrisee.`,
      recommendation: `Valider l'affectation a ${selectedAgent.agentName} pour absorber ce ticket sans creer de saturation.`,
      href: `/tickets/${candidate.ticket.id}?drawerFocus=assign`,
      tone: candidate.ticket.priority === TicketPriority.CRITICAL ? "critical" : "info",
      confidence: selectedAgent.confidence,
      meta: `${candidate.ticket.serviceName || "Service"} - ${PriorityLabels[candidate.ticket.priority]}`,
      whyMatters:
        "La recommandation equilibre le flux entre capacite disponible, historique de resolution et rapidite d'execution.",
      tags: [
        `Charge ${selectedAgent.assignedTickets}`,
        `${selectedAgent.resolvedTickets} resolus`,
        `MTTR ${formatHours(selectedAgent.averageResolutionTimeHours)}`,
      ],
      recommendedAgent: selectedAgent.agentName,
      recommendedAgentId: selectedAgent.agentId,
      ctaLabel: "Preparer l'affectation",
      signalKind: "assignment",
      ticketId: candidate.ticket.id,
      ticketNumber: candidate.ticket.ticketNumber,
      serviceId: candidate.ticket.serviceId,
      serviceName: candidate.ticket.serviceName,
      priorityValue: candidate.ticket.priority,
      statusValue: candidate.ticket.status,
    };
  });
}

function buildSlaAlerts(scoredTickets: ScoredTicket[]): ManagerCopilotSignal[] {
  return scoredTickets
    .filter(
      ({ ticket }) =>
        ticket.breachedSla ||
        ticket.overdue ||
        ticket.slaWarning ||
        (ticket.slaPercentage ?? 0) >= 78,
    )
    .slice(0, MAX_SLA_ALERTS)
    .map(({ ticket }) => ({
      id: `sla-${ticket.id}`,
      eyebrow: ticket.ticketNumber,
      title: ticket.title,
      description: buildSlaDescription(ticket),
      recommendation:
        "Decider d'une escalade, d'une reaffectation ou d'un suivi renforce avant que l'impact client ne s'aggrave.",
      href: `/tickets/${ticket.id}?drawerTab=sla`,
      tone: ticket.breachedSla || ticket.overdue ? "critical" : "warning",
      confidence: ticket.breachedSla || ticket.overdue ? "high" : "medium",
      meta: ticket.serviceName || "Service a confirmer",
      whyMatters:
        "Une decision manageriale prise avant la rupture SLA protege a la fois le client, la charge equipe et le reporting.",
      tags: [
        PriorityLabels[ticket.priority],
        ticket.breachedSla || ticket.overdue ? "Hors SLA" : "SLA a surveiller",
      ],
      ctaLabel: "Ouvrir la vue SLA",
      signalKind: "sla",
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceId: ticket.serviceId,
      serviceName: ticket.serviceName,
      priorityValue: ticket.priority,
      statusValue: ticket.status,
    }));
}

function buildQuickActions(
  priorityTickets: ManagerCopilotSignal[],
  probableIncidents: ManagerCopilotSignal[],
  slaAlerts: ManagerCopilotSignal[],
  servicesAtRisk: TelecomService[],
): ManagerCopilotQuickAction[] {
  const actions: ManagerCopilotQuickAction[] = [];

  if (priorityTickets[0]) {
    actions.push({
      id: "open-priority-ticket",
      label: "Traiter le ticket cle",
      description: "Ouvre immédiatement le ticket recommandé en tête de liste.",
      href: priorityTickets[0].href,
      tone: priorityTickets[0].tone,
    });
  }

  if (slaAlerts.length > 0) {
    actions.push({
      id: "review-sla",
      label: "Voir les SLA critiques",
      description: "Passe en revue les tickets deja hors SLA ou proches de rupture.",
      href: "/tickets?slaStatus=BREACHED",
      tone: "critical",
    });
  }

  if (probableIncidents.length > 0) {
    actions.push({
      id: "review-incidents",
      label: "Controler les incidents",
      description: "Valide s'il faut ouvrir ou relier un incident cote supervision.",
      href: "/incidents",
      tone: "warning",
    });
  }

  if (servicesAtRisk.length > 0) {
    actions.push({
      id: "review-health",
      label: "Verifier les services",
      description: "Inspecte les services degrades ou en panne dans la supervision.",
      href: "/health",
      tone: "info",
    });
  }

  actions.push({
    id: "open-reports",
    label: "Préparer la synthèse",
    description: "Accede au reporting pour consolider le point manager du jour.",
    href: "/reports",
    tone: "neutral",
  });

  return actions.slice(0, MAX_QUICK_ACTIONS);
}

function scoreTicket(
  ticket: Ticket,
  servicesById: Map<number, TelecomService>,
  servicesByName: Map<string, TelecomService>,
  incidentServiceNames: Set<string>,
): ScoredTicket {
  const service = resolveService(ticket, servicesById, servicesByName);
  const serviceStatus = (service?.status as ServiceStatus | undefined) ?? ServiceStatus.UP;
  const hasActiveIncident = incidentServiceNames.has(normalize(ticket.serviceName));

  let score = PRIORITY_WEIGHT[ticket.priority] + STATUS_WEIGHT[ticket.status];

  if (ticket.breachedSla || ticket.overdue) {
    score += 120;
  } else if (ticket.slaWarning) {
    score += 34;
  }

  if ((ticket.slaPercentage ?? 0) > 0) {
    score += Math.round((ticket.slaPercentage ?? 0) / 4);
  }

  if (!ticket.assignedToId) {
    score += 18;
  }

  if (serviceStatus === ServiceStatus.DOWN) {
    score += 42;
  } else if (serviceStatus === ServiceStatus.DEGRADED) {
    score += 24;
  }

  if (hasActiveIncident) {
    score += 26;
  }

  const confidence = deriveTicketConfidence(ticket, serviceStatus, hasActiveIncident);
  const tone = deriveTicketTone(ticket, serviceStatus);
  const reasons = buildTicketReasons(ticket, serviceStatus, hasActiveIncident);

  return {
    score,
    ticket,
    signal: {
      id: `ticket-${ticket.id}`,
      eyebrow: ticket.ticketNumber,
      title: ticket.title,
      description: reasons.join(" - "),
      recommendation: buildTicketRecommendation(ticket, serviceStatus, hasActiveIncident),
      href: `/tickets/${ticket.id}`,
      tone,
      confidence,
      meta: `${ticket.serviceName || "Service a confirmer"} - ${StatusLabels[ticket.status]}`,
      whyMatters: buildTicketWhyMatters(ticket, serviceStatus, hasActiveIncident),
      tags: compact([
        PriorityLabels[ticket.priority],
        serviceStatus !== ServiceStatus.UP ? ServiceStatusLabels[serviceStatus] : undefined,
        !ticket.assignedToId ? "Non assigne" : ticket.assignedToName,
      ]),
      ctaLabel: "Ouvrir le ticket",
      signalKind: "ticket",
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceId: ticket.serviceId,
      serviceName: ticket.serviceName,
      priorityValue: ticket.priority,
      statusValue: ticket.status,
    },
  };
}

function resolveService(
  ticket: Ticket,
  servicesById: Map<number, TelecomService>,
  servicesByName: Map<string, TelecomService>,
) {
  return servicesById.get(ticket.serviceId) || servicesByName.get(normalize(ticket.serviceName));
}

function deriveTicketTone(ticket: Ticket, serviceStatus: ServiceStatus): ManagerCopilotTone {
  if (ticket.breachedSla || ticket.overdue || ticket.priority === TicketPriority.CRITICAL) {
    return "critical";
  }

  if (
    ticket.slaWarning ||
    serviceStatus === ServiceStatus.DOWN ||
    serviceStatus === ServiceStatus.DEGRADED ||
    ticket.priority === TicketPriority.HIGH
  ) {
    return "warning";
  }

  return "info";
}

function deriveTicketConfidence(
  ticket: Ticket,
  serviceStatus: ServiceStatus,
  hasActiveIncident: boolean,
): ManagerCopilotConfidence {
  if (
    ticket.breachedSla ||
    ticket.overdue ||
    hasActiveIncident ||
    serviceStatus === ServiceStatus.DOWN
  ) {
    return "high";
  }

  if (
    ticket.slaWarning ||
    ticket.priority === TicketPriority.HIGH ||
    serviceStatus === ServiceStatus.DEGRADED
  ) {
    return "medium";
  }

  return "low";
}

function buildTicketReasons(
  ticket: Ticket,
  serviceStatus: ServiceStatus,
  hasActiveIncident: boolean,
) {
  const reasons = compact([
    ticket.breachedSla || ticket.overdue
      ? "SLA depasse"
      : ticket.slaWarning || (ticket.slaPercentage ?? 0) >= 78
        ? `SLA a ${Math.round(ticket.slaPercentage ?? 0)}%`
        : undefined,
    ticket.priority === TicketPriority.CRITICAL
      ? "Priorite critique"
      : ticket.priority === TicketPriority.HIGH
        ? "Priorite haute"
        : undefined,
    serviceStatus === ServiceStatus.DOWN
      ? "Service en panne"
      : serviceStatus === ServiceStatus.DEGRADED
        ? "Service degrade"
        : undefined,
    !ticket.assignedToId ? "Aucune affectation" : undefined,
    hasActiveIncident ? "Incident actif lie" : undefined,
  ]);

  return reasons.length > 0 ? reasons : ["Ticket a surveiller dans la file manager"];
}

function buildSlaDescription(ticket: Ticket) {
  if (ticket.breachedSla || ticket.overdue) {
    return `Le ticket est deja hors SLA${ticket.assignedToName ? ` malgre l'affectation a ${ticket.assignedToName}` : ""}.`;
  }

  if ((ticket.slaRemainingMinutes ?? 0) > 0) {
    return `Temps restant estime: ${formatDuration(ticket.slaRemainingMinutes ?? 0)} avant depassement.`;
  }

  return `SLA consommé à ${Math.round(ticket.slaPercentage ?? 0)} %, validation manager recommandée.`;
}

function buildTicketRecommendation(
  ticket: Ticket,
  serviceStatus: ServiceStatus,
  hasActiveIncident: boolean,
) {
  if (hasActiveIncident) {
    return "Arbitrer ce ticket dans le contexte de l'incident actif pour eviter une decision isolee.";
  }

  if (!ticket.assignedToId) {
    return "Prioriser et confirmer une affectation pour eviter une derive de delai des la prise en charge.";
  }

  if (ticket.breachedSla || ticket.overdue) {
    return "Reevaluer immediatement le niveau d'escalade et le plan d'action pour contenir l'impact client.";
  }

  if (serviceStatus === ServiceStatus.DOWN || serviceStatus === ServiceStatus.DEGRADED) {
    return "Surveiller ce ticket comme signal de service et coordonner la reponse avec la supervision.";
  }

  return "Maintenir ce ticket dans la file de tete et confirmer qu'il reste prioritaire au regard du portefeuille.";
}

function buildTicketWhyMatters(
  ticket: Ticket,
  serviceStatus: ServiceStatus,
  hasActiveIncident: boolean,
) {
  const factors = compact([
    ticket.breachedSla || ticket.overdue ? "Le delai contractuel est deja en tension." : undefined,
    !ticket.assignedToId ? "Le ticket n'est pas encore porte par un agent identifie." : undefined,
    serviceStatus === ServiceStatus.DOWN
      ? "Le service concerne est en panne."
      : serviceStatus === ServiceStatus.DEGRADED
        ? "Le service concerne est degrade."
        : undefined,
    hasActiveIncident ? "Le contexte suggere un impact plus large que le seul ticket." : undefined,
  ]);

  if (factors.length > 0) {
    return factors.join(" ");
  }

  return "Ce ticket ressort comme un bon candidat d'arbitrage car son impact combine reste superieur au bruit operationnel moyen.";
}

function rankAgents(agentStats: AgentStats[]) {
  return agentStats
    .map((agent) => {
      // Heuristique MVP volontairement lisible:
      // on favorise les agents qui resolvent vite et souvent,
      // tout en penalisant une charge active deja elevee.
      const score =
        agent.resolvedTickets * 8 -
        agent.assignedTickets * 5 -
        Math.round((agent.averageResolutionTimeHours ?? 0) * 1.7);

      const confidence: ManagerCopilotConfidence =
        score >= 35 ? "high" : score >= 12 ? "medium" : "low";

      return { ...agent, score, confidence };
    })
    .sort((left, right) => right.score - left.score);
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return "échéance immédiate";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "n/d";
  }

  if (hours >= 10) {
    return `${Math.round(hours)} h`;
  }

  return `${hours.toFixed(1)} h`;
}

function compact(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
