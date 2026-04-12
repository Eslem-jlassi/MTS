export type ManagerCopilotMode = "live" | "degraded";

export type ManagerCopilotTone = "critical" | "warning" | "info" | "success" | "neutral";

export type ManagerCopilotConfidence = "high" | "medium" | "low";

export type ManagerCopilotSignalKind = "ticket" | "incident" | "assignment" | "sla";

export interface ManagerCopilotMetric {
  label: string;
  value: string;
  tone: ManagerCopilotTone;
}

export interface ManagerCopilotDecisionArea {
  id: string;
  title: string;
  headline: string;
  description: string;
  tone: ManagerCopilotTone;
  confidence: ManagerCopilotConfidence;
}

export interface ManagerCopilotWhyCard {
  id: string;
  title: string;
  description: string;
  tone: ManagerCopilotTone;
}

export interface ManagerCopilotSignal {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  tone: ManagerCopilotTone;
  confidence: ManagerCopilotConfidence;
  meta?: string;
  tags?: string[];
  ctaLabel?: string;
  recommendation?: string;
  whyMatters?: string;
  signalKind?: ManagerCopilotSignalKind;
  ticketId?: number;
  ticketNumber?: string;
  incidentId?: number;
  serviceId?: number;
  serviceName?: string;
  priorityValue?: string;
  statusValue?: string;
}

export interface ManagerCopilotAssignmentSignal extends ManagerCopilotSignal {
  recommendedAgent: string;
  recommendedAgentId?: number;
}

export interface ManagerCopilotQuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  tone: ManagerCopilotTone;
}

export interface ManagerCopilotSnapshot {
  mode: ManagerCopilotMode;
  generatedAt: string;
  summary: string;
  urgentCount: number;
  metrics: ManagerCopilotMetric[];
  decisionAreas: ManagerCopilotDecisionArea[];
  whyCards: ManagerCopilotWhyCard[];
  priorityTickets: ManagerCopilotSignal[];
  probableIncidents: ManagerCopilotSignal[];
  assignments: ManagerCopilotAssignmentSignal[];
  slaAlerts: ManagerCopilotSignal[];
  quickActions: ManagerCopilotQuickAction[];
}
