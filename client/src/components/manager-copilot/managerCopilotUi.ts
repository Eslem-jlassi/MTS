import { UserRole } from "../../types";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotConfidence,
  ManagerCopilotMode,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
  ManagerCopilotTone,
} from "./types";

export type ManagerCopilotBadgeVariant =
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "neutral"
  | "ai";

export const MANAGER_COPILOT_NAME = "ALLIE";
export const MANAGER_COPILOT_PRODUCT_LABEL = "Assistant IA Manager";
export const MANAGER_COPILOT_TITLE = `${MANAGER_COPILOT_NAME} — ${MANAGER_COPILOT_PRODUCT_LABEL}`;
export const MANAGER_COPILOT_SUBTITLE = "Copilote de supervision basé sur une recommandation KNN";
export const MANAGER_COPILOT_FULL_LABEL = MANAGER_COPILOT_TITLE;

export const MANAGER_COPILOT_WIDGET_SUBTITLE = MANAGER_COPILOT_SUBTITLE;

export const MANAGER_COPILOT_DASHBOARD_SUBTITLE = MANAGER_COPILOT_SUBTITLE;

export function isManagerCopilotAllowedRole(role?: UserRole | null): role is UserRole.MANAGER {
  return role === UserRole.MANAGER;
}

export interface ManagerCopilotMoment {
  title: string;
  detail: string;
  tone: ManagerCopilotTone;
}

export const toneLabels: Record<ManagerCopilotTone, string> = {
  critical: "Critique",
  warning: "A surveiller",
  success: "Stable",
  info: "Pilotage",
  neutral: "Info",
};

export const confidenceLabels: Record<ManagerCopilotConfidence, string> = {
  high: "Confiance elevee",
  medium: "Confiance moyenne",
  low: "A confirmer",
};

export const modeLabels: Record<ManagerCopilotMode, string> = {
  live: "Sources consolidees",
  degraded: "Mode degrade",
};

const predictedActionLabels: Record<string, string> = {
  ESCALATE: "Escalader",
  REASSIGN: "Reassigner",
  OPEN_INCIDENT: "Ouvrir un incident",
  MONITOR: "Surveiller",
  PREPARE_SUMMARY: "Preparer une synthese",
};

export function toneToBadgeVariant(tone: ManagerCopilotTone): ManagerCopilotBadgeVariant {
  switch (tone) {
    case "critical":
      return "danger";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "info":
      return "ai";
    default:
      return "neutral";
  }
}

export function confidenceToBadgeVariant(
  confidence: ManagerCopilotConfidence,
): ManagerCopilotBadgeVariant {
  switch (confidence) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function formatManagerCopilotDecisionAction(value?: string | null): string {
  const normalized = (value || "").trim().toUpperCase();
  return predictedActionLabels[normalized] || "Validation manager";
}

export function formatManagerCopilotConfidenceScore(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/d";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: value >= 0.1 ? 0 : 1,
  }).format(value);
}

export function getManagerCopilotInferenceModeLabel(value?: string | null): string {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "knn") {
    return "Recommandation KNN supervisee";
  }
  if (normalized === "degraded_rules") {
    return "Fallback deterministe";
  }

  return "Assistance supervisee";
}

export function formatManagerCopilotUpdatedAt(value?: string): string {
  if (!value) {
    return "Mise a jour recente";
  }

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Mise a jour recente";
  }
}

export function formatManagerCopilotUpdatedLabel(value?: string): string {
  if (!value) {
    return "Mise a jour recente";
  }

  return `Actualise a ${formatManagerCopilotUpdatedAt(value)}`;
}

export function getManagerCopilotTelemetryLabel(snapshot?: ManagerCopilotSnapshot | null): string {
  if (!snapshot) {
    return "Consolidation des signaux manager";
  }

  return snapshot.mode === "degraded" ? "Vue assistee partielle" : "Sources manager consolidees";
}

export function getManagerCopilotMoment(
  snapshot?: ManagerCopilotSnapshot | null,
): ManagerCopilotMoment {
  if (!snapshot) {
    return {
      title: "Analyse en cours",
      detail: "Consolidation des arbitrages manager du moment.",
      tone: "info",
    };
  }

  if (snapshot.priorityTickets.length > 0) {
    return {
      title: `${snapshot.priorityTickets.length} arbitrage(s) a traiter`,
      detail:
        snapshot.urgentCount > 0
          ? `${snapshot.urgentCount} signal(s) critique(s) appellent une validation rapide.`
          : "Les tickets les plus structurants ont ete isoles pour decision.",
      tone: snapshot.priorityTickets.some((signal) => signal.tone === "critical")
        ? "critical"
        : "info",
    };
  }

  if (snapshot.slaAlerts.length > 0) {
    return {
      title: `${snapshot.slaAlerts.length} dossier(s) SLA a securiser`,
      detail: "Le copilote met en avant les tickets proches de rupture ou deja sous tension.",
      tone: snapshot.slaAlerts.some((signal) => signal.tone === "critical")
        ? "critical"
        : "warning",
    };
  }

  if (snapshot.probableIncidents.length > 0) {
    return {
      title: `${snapshot.probableIncidents.length} signal(s) d'incident a confirmer`,
      detail: "Les correlations tickets, services et supervision restent a arbitrer.",
      tone: snapshot.probableIncidents.some((signal) => signal.tone === "critical")
        ? "critical"
        : "warning",
    };
  }

  return {
    title: "Portefeuille sous controle",
    detail: "Aucune urgence critique detectee dans les signaux consolides.",
    tone: "success",
  };
}

export function getManagerCopilotPrimarySignal(
  snapshot?: ManagerCopilotSnapshot | null,
): ManagerCopilotSignal | ManagerCopilotAssignmentSignal | null {
  if (!snapshot) {
    return null;
  }

  const signalPools: Array<Array<ManagerCopilotSignal | ManagerCopilotAssignmentSignal>> = [
    snapshot.slaAlerts,
    snapshot.priorityTickets,
    snapshot.probableIncidents,
    snapshot.assignments,
  ];
  const flatSignals = signalPools.flat();

  return flatSignals.find((signal) => signal.tone === "critical") || flatSignals[0] || null;
}

export function getManagerCopilotPreviewSignals(
  snapshot?: ManagerCopilotSnapshot | null,
  limit = 3,
): Array<ManagerCopilotSignal | ManagerCopilotAssignmentSignal> {
  if (!snapshot || limit <= 0) {
    return [];
  }

  const signalPools: Array<Array<ManagerCopilotSignal | ManagerCopilotAssignmentSignal>> = [
    snapshot.priorityTickets,
    snapshot.slaAlerts,
    snapshot.probableIncidents,
    snapshot.assignments,
  ];
  const seen = new Set<string>();
  const selected: Array<ManagerCopilotSignal | ManagerCopilotAssignmentSignal> = [];

  for (const pool of signalPools) {
    for (const signal of pool) {
      if (seen.has(signal.id)) {
        continue;
      }

      seen.add(signal.id);
      selected.push(signal);

      if (selected.length >= limit) {
        return selected;
      }
    }
  }

  return selected;
}
