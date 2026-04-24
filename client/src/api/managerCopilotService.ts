import api from "./client";
import type { DashboardFilters } from "./dashboardService";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotConfidence,
  ManagerCopilotDecisionArea,
  ManagerCopilotMetric,
  ManagerCopilotNearestExample,
  ManagerCopilotQuickAction,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
  ManagerCopilotTone,
  ManagerCopilotWhyCard,
} from "../components/manager-copilot/types";
import {
  buildDecisionAreas,
  buildWhyCards,
} from "../components/manager-copilot/managerCopilotInsights";

const MANAGER_COPILOT_PREFIX = "/manager-ai/copilot";
const DEFAULT_SUMMARY = "Le copilote n'a remonte aucune recommandation prioritaire pour le moment.";
const DEFAULT_SIGNAL_DESCRIPTION = "Signal a valider par le manager.";
const DEFAULT_ASSIGNMENT_IMPACT =
  "La proposition vise a absorber la charge sans deteriorer le temps de resolution global.";
const DEFAULT_QUICK_ACTION_DESCRIPTION = "Action a valider par le manager.";

type ManagerCopilotItemKind = "ticket" | "incident" | "sla";

interface ManagerCopilotDashboardApiResponse {
  available?: boolean;
  mode?: string;
  generatedAt?: string;
  generated_at?: string;
  summary?: string;
  executiveSummary?: string;
  executive_summary?: string;
  modelVersion?: string;
  model_version?: string;
  inferenceMode?: string;
  inference_mode?: string;
  confidenceScore?: number;
  confidence_score?: number;
  featureSummary?: unknown[];
  feature_summary?: unknown[];
  reasoningSteps?: unknown[];
  reasoning_steps?: unknown[];
  decisionAreas?: unknown[];
  decision_areas?: unknown[];
  whyCards?: unknown[];
  why_cards?: unknown[];
  metrics?: unknown[];
  priorityTickets?: unknown[];
  ticketSuggestions?: unknown[];
  newRiskTickets?: unknown[];
  probableIncidents?: unknown[];
  incidentSignals?: unknown[];
  incident_signals?: unknown[];
  assignments?: unknown[];
  agentRecommendations?: unknown[];
  agent_recommendations?: unknown[];
  slaAlerts?: unknown[];
  sla_alerts?: unknown[];
  quickActions?: unknown[];
  recommendedActions?: unknown[];
  recommended_actions?: unknown[];
}

export const managerCopilotService = {
  async getDashboardSummary(filters?: DashboardFilters): Promise<ManagerCopilotSnapshot> {
    const params = new URLSearchParams();
    if (filters?.period) params.append("period", filters.period);
    if (filters?.serviceId != null) params.append("serviceId", String(filters.serviceId));
    if (filters?.clientId != null) params.append("clientId", String(filters.clientId));

    const response = await api.get<ManagerCopilotDashboardApiResponse>(
      `${MANAGER_COPILOT_PREFIX}/dashboard`,
      {
        params: params.toString() ? params : undefined,
      },
    );

    return normalizeDashboardSnapshot(response.data);
  },
};

export function normalizeDashboardSnapshot(
  payload: ManagerCopilotDashboardApiResponse,
): ManagerCopilotSnapshot {
  const priorityTickets = normalizeSignals(
    pickArray(payload.priorityTickets, payload.ticketSuggestions, payload.newRiskTickets),
    "ticket",
  );
  const probableIncidents = normalizeSignals(
    pickArray(payload.probableIncidents, payload.incidentSignals, payload.incident_signals),
    "incident",
  );
  const assignments = normalizeAssignmentSignals(
    pickArray(payload.assignments, payload.agentRecommendations, payload.agent_recommendations),
  );
  const slaAlerts = normalizeSignals(pickArray(payload.slaAlerts, payload.sla_alerts), "sla");
  const quickActions = normalizeQuickActions(
    pickArray(payload.quickActions, payload.recommendedActions, payload.recommended_actions),
  );
  const metrics = normalizeMetrics(
    payload.metrics,
    priorityTickets,
    probableIncidents,
    assignments,
    slaAlerts,
  );
  const decisionAreas = normalizeDecisionAreas(
    pickArray(payload.decisionAreas, payload.decision_areas),
  );
  const whyCards = normalizeWhyCards(pickArray(payload.whyCards, payload.why_cards));
  const summary =
    pickText(payload.summary, payload.executiveSummary, payload.executive_summary) ??
    DEFAULT_SUMMARY;

  return {
    mode:
      payload.available === false || `${payload.mode || ""}`.toLowerCase() === "degraded"
        ? "degraded"
        : "live",
    generatedAt: pickText(payload.generatedAt, payload.generated_at) ?? new Date().toISOString(),
    summary,
    urgentCount: countUrgentSignals(priorityTickets, probableIncidents, assignments, slaAlerts),
    modelVersion: pickText(payload.modelVersion, payload.model_version),
    inferenceMode: pickText(payload.inferenceMode, payload.inference_mode),
    confidenceScore: toNumber(payload.confidenceScore ?? payload.confidence_score) ?? undefined,
    featureSummary: normalizeStringList(payload.featureSummary, payload.feature_summary),
    reasoningSteps: normalizeStringList(payload.reasoningSteps, payload.reasoning_steps),
    recommendedActions: normalizeStringList(payload.recommendedActions, payload.recommended_actions),
    metrics,
    decisionAreas:
      decisionAreas.length > 0
        ? decisionAreas
        : buildDecisionAreas({
            summary,
            priorityTickets,
            probableIncidents,
            assignments,
            slaAlerts,
          }),
    whyCards:
      whyCards.length > 0
        ? whyCards
        : buildWhyCards({
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

function normalizeSignals(source: unknown, kind: ManagerCopilotItemKind): ManagerCopilotSignal[] {
  return normalizeList(source, (item, index) => normalizeSignal(item, kind, index));
}

function normalizeAssignmentSignals(source: unknown): ManagerCopilotAssignmentSignal[] {
  return normalizeList(source, (item, index) => {
    const base = normalizeSignal(item, "ticket", index);
    if (!base || !isRecord(item)) {
      return null;
    }

    const recommendedAgent =
      pickText(item.recommendedAgent, item.recommendedAgentName, item.agentName, item.name) ??
      "Agent recommande";

    return {
      ...base,
      signalKind: "assignment",
      recommendedAgent,
      recommendedAgentId:
        toNumber(item.recommendedAgentId ?? item.recommended_agent_id ?? item.agentId) ?? undefined,
      recommendation:
        pickText(item.recommendation, item.recommendedAction, item.nextStep) ??
        `Valider l'affectation a ${recommendedAgent} pour repartir la charge de facon credible.`,
      whyMatters:
        pickText(item.whyMatters, item.impact, item.businessImpact, item.business_impact) ??
        DEFAULT_ASSIGNMENT_IMPACT,
    };
  });
}

function normalizeQuickActions(source: unknown): ManagerCopilotQuickAction[] {
  return normalizeList(source, (item, index) => {
    if (typeof item === "string") {
      return {
        id: `quick-action-${index}`,
        label: item,
        description: item,
        href: "/tickets",
        tone: "info",
      };
    }

    if (!isRecord(item)) {
      return null;
    }

    return {
      id: pickText(item.id, item.code) ?? `quick-action-${index}`,
      label: pickText(item.label, item.title, item.action, item.name) ?? "Action recommandee",
      description:
        pickText(item.description, item.reasoning, item.summary) ??
        DEFAULT_QUICK_ACTION_DESCRIPTION,
      href: buildHref(item, "ticket"),
      tone: inferTone(
        pickText(item.tone, item.severity, item.riskLevel, item.risk_level, item.priority),
      ),
    };
  });
}

function normalizeMetrics(
  source: unknown,
  priorityTickets: ManagerCopilotSignal[],
  probableIncidents: ManagerCopilotSignal[],
  assignments: ManagerCopilotAssignmentSignal[],
  slaAlerts: ManagerCopilotSignal[],
): ManagerCopilotMetric[] {
  const normalized = normalizeList(source, (item) => {
    if (!isRecord(item)) {
      return null;
    }

    return {
      label: pickText(item.label, item.name, item.title) ?? "Signal",
      value: pickText(item.value, item.count, item.total, item.metricValue) ?? "0",
      tone: inferTone(pickText(item.tone, item.severity, item.riskLevel, item.risk_level)),
    };
  });

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      label: "Tickets prioritaires",
      value: String(priorityTickets.length),
      tone: priorityTickets.length > 0 ? "warning" : "success",
    },
    {
      label: "Incidents probables",
      value: String(probableIncidents.length),
      tone: probableIncidents.length > 0 ? "warning" : "success",
    },
    {
      label: "Assignations",
      value: String(assignments.length),
      tone: assignments.length > 0 ? "info" : "neutral",
    },
    {
      label: "Alertes SLA",
      value: String(slaAlerts.length),
      tone: slaAlerts.some((item) => item.tone === "critical")
        ? "critical"
        : slaAlerts.length > 0
          ? "warning"
          : "success",
    },
  ];
}

function normalizeSignal(
  item: unknown,
  kind: ManagerCopilotItemKind,
  index: number,
): ManagerCopilotSignal | null {
  if (!isRecord(item)) {
    return null;
  }

  const title = pickText(item.title, item.name, item.ticketTitle, item.incidentTitle);
  if (!title) {
    return null;
  }

  return {
    id: pickText(item.id, item.code, item.ticketNumber, item.incidentNumber) ?? `${kind}-${index}`,
    eyebrow:
      pickText(item.eyebrow, item.ticketNumber, item.incidentNumber, item.status, item.kind) ??
      (kind === "ticket"
        ? "Ticket prioritaire"
        : kind === "sla"
          ? "Alerte SLA"
          : "Incident probable"),
    title,
    description:
      pickText(item.description, item.reasoning, item.summary, item.justification) ??
      DEFAULT_SIGNAL_DESCRIPTION,
    href: buildHref(item, kind),
    tone: inferTone(
      pickText(item.tone, item.severity, item.riskLevel, item.risk_level, item.priority),
    ),
    confidence: inferConfidence(
      item.confidence,
      pickText(item.confidenceLevel, item.confidence_level),
    ),
    meta: pickText(item.meta, item.serviceName, item.service, item.category, item.agentName),
    tags: normalizeTags(item.tags, item.badges),
    recommendation:
      pickText(item.recommendation, item.recommendedAction, item.nextStep) ??
      inferRecommendation(kind, item, title),
    whyMatters:
      pickText(item.whyMatters, item.impact, item.businessImpact, item.business_impact) ??
      inferWhyMatters(kind, item),
    ctaLabel:
      pickText(item.ctaLabel, item.actionLabel) ??
      (kind === "ticket"
        ? "Ouvrir le ticket"
        : kind === "sla"
          ? "Ouvrir la vue SLA"
          : "Voir l'incident"),
    signalKind: kind === "sla" ? "sla" : kind,
    ticketId: toNumber(item.ticketId ?? item.ticket_id) ?? undefined,
    ticketNumber: pickText(item.ticketNumber),
    incidentId: toNumber(item.incidentId ?? item.incident_id) ?? undefined,
    serviceId: toNumber(item.serviceId ?? item.service_id) ?? undefined,
    serviceName: pickText(item.serviceName, item.service),
    priorityValue: pickText(item.priority, item.priorityValue, item.priority_value),
    statusValue: pickText(item.status, item.statusLabel, item.status_label),
    predictedAction: pickText(item.predictedAction, item.predicted_action),
    confidenceScore:
      toNumber(item.confidenceScore ?? item.confidence_score ?? item.score) ?? undefined,
    inferenceMode: pickText(item.inferenceMode, item.inference_mode),
    modelVersion: pickText(item.modelVersion, item.model_version),
    featureSummary: normalizeStringList(item.featureSummary, item.feature_summary),
    nearestExamples: normalizeNearestExamples(item.nearestExamples, item.nearest_examples),
  };
}

function normalizeDecisionAreas(source: unknown): ManagerCopilotDecisionArea[] {
  return normalizeList(source, (item, index) => {
    if (!isRecord(item)) {
      return null;
    }

    const title = pickText(item.title, item.label);
    const headline = pickText(item.headline, item.summary);
    const description = pickText(item.description, item.whyMatters, item.why_matters);
    if (!title || !headline || !description) {
      return null;
    }

    return {
      id: pickText(item.id) ?? `decision-area-${index}`,
      title,
      headline,
      description,
      tone: inferTone(pickText(item.tone, item.severity, item.priority)),
      confidence: inferConfidence(item.confidenceScore ?? item.confidence_score, pickText(item.confidence)),
    };
  });
}

function normalizeWhyCards(source: unknown): ManagerCopilotWhyCard[] {
  return normalizeList(source, (item, index) => {
    if (!isRecord(item)) {
      return null;
    }

    const title = pickText(item.title, item.label);
    const description = pickText(item.description, item.summary);
    if (!title || !description) {
      return null;
    }

    return {
      id: pickText(item.id) ?? `why-card-${index}`,
      title,
      description,
      tone: inferTone(pickText(item.tone, item.severity, item.priority)),
    };
  });
}

function normalizeNearestExamples(...candidates: unknown[]): ManagerCopilotNearestExample[] {
  for (const candidate of candidates) {
    const normalized = normalizeList(candidate, (item, index) => {
      if (!isRecord(item)) {
        return null;
      }

      const title = pickText(item.title);
      if (!title) {
        return null;
      }

      return {
        exampleId: pickText(item.exampleId, item.example_id) ?? `example-${index}`,
        label: pickText(item.label) ?? "MONITOR",
        title,
        summary: pickText(item.summary) ?? "",
        recommendation: pickText(item.recommendation) ?? "",
        distance: toNumber(item.distance) ?? undefined,
        featureSummary: normalizeStringList(item.featureSummary, item.feature_summary),
      };
    });

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

function buildHref(item: Record<string, unknown>, defaultKind: ManagerCopilotItemKind): string {
  const ticketId = toNumber(item.ticketId ?? item.ticket_id ?? item.id);
  if (ticketId != null && defaultKind === "ticket") {
    return `/tickets/${ticketId}`;
  }

  if (ticketId != null && defaultKind === "sla") {
    return `/tickets/${ticketId}?drawerTab=sla`;
  }

  const incidentId = toNumber(item.incidentId ?? item.incident_id ?? item.id);
  if (incidentId != null && defaultKind === "incident") {
    return `/incidents/${incidentId}`;
  }

  const serviceId = toNumber(item.serviceId ?? item.service_id);
  if (serviceId != null) {
    return defaultKind === "incident"
      ? `/health?serviceId=${serviceId}`
      : defaultKind === "sla"
        ? `/tickets?serviceId=${serviceId}&slaStatus=AT_RISK`
        : `/tickets?serviceId=${serviceId}`;
  }

  const href = pickText(item.href, item.path, item.referencePath);
  if (href) {
    return href;
  }

  if (defaultKind === "sla") {
    return "/tickets?slaStatus=AT_RISK";
  }

  return defaultKind === "ticket" ? "/tickets" : "/incidents";
}

function normalizeTags(...candidates: unknown[]): string[] | undefined {
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const tags = candidate
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    if (tags.length > 0) {
      return tags;
    }
  }

  return undefined;
}

function inferTone(value?: string | null): ManagerCopilotTone {
  const normalized = (value || "").trim().toLowerCase();

  if (["critical", "danger", "breached", "urgent", "high"].includes(normalized)) {
    return "critical";
  }
  if (["warning", "at_risk", "risk", "medium", "major"].includes(normalized)) {
    return "warning";
  }
  if (["success", "ok", "healthy", "safe", "low"].includes(normalized)) {
    return "success";
  }
  if (["info", "neutral", "suggested"].includes(normalized)) {
    return normalized === "neutral" ? "neutral" : "info";
  }

  return "info";
}

function inferConfidence(score: unknown, label?: string | null): ManagerCopilotConfidence {
  const numericScore = typeof score === "number" ? score : Number.NaN;
  if (Number.isFinite(numericScore)) {
    if (numericScore >= 0.75) return "high";
    if (numericScore >= 0.45) return "medium";
    return "low";
  }

  const normalized = (label || "").trim().toLowerCase();
  if (["high", "strong", "elevee"].includes(normalized)) {
    return "high";
  }
  if (["medium", "moderate", "moyenne"].includes(normalized)) {
    return "medium";
  }
  return "low";
}

function inferRecommendation(
  kind: ManagerCopilotItemKind,
  item: Record<string, unknown>,
  title: string,
): string {
  if (kind === "sla") {
    return "Verifier immediatement la vue SLA puis decider d'une escalation ou d'un suivi renforce.";
  }

  if (kind === "incident") {
    return "Valider rapidement s'il faut centraliser la reponse sous un incident global.";
  }

  const normalizedPriority = `${pickText(item.priority, item.riskLevel, item.risk_level) || ""}`
    .trim()
    .toLowerCase();

  if (["critical", "high", "urgent"].includes(normalizedPriority)) {
    return `Confirmer ${title.toLowerCase()} dans la file de tete et securiser son traitement.`;
  }

  return "Conserver ce ticket dans le radar manager et valider l'action la plus structurante.";
}

function inferWhyMatters(kind: ManagerCopilotItemKind, item: Record<string, unknown>): string {
  if (kind === "sla") {
    return "Une decision manageriale prise avant la rupture SLA protege le client, la charge equipe et le reporting.";
  }

  if (kind === "incident") {
    return "Plusieurs signaux peuvent relever d'une meme cause racine, ce qui change la maniere de communiquer et d'escalader.";
  }

  const service = pickText(item.serviceName, item.service);
  if (service) {
    return `Ce signal peut avoir un effet direct sur la tenue du service ${service} et la perception client.`;
  }

  return "Ce signal ressort au-dessus du flux courant et merite une validation manager explicite.";
}

function countUrgentSignals(...groups: Array<Array<{ tone: ManagerCopilotTone }>>): number {
  return groups.flat().filter((item) => item.tone === "critical").length;
}

function normalizeStringList(...candidates: unknown[]): string[] {
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const normalized = candidate
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

function normalizeList<T>(
  source: unknown,
  mapper: (item: unknown, index: number) => T | null,
): T[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map(mapper).filter((item): item is T => item !== null);
}

function pickArray(...values: unknown[]): unknown[] | undefined {
  return values.find(Array.isArray) as unknown[] | undefined;
}

function pickText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default managerCopilotService;
