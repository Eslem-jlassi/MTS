// =============================================================================
// MTS TELECOM - Manager Dashboard Data Adapter
// =============================================================================
// Transforms raw DashboardStats from the backend into a structured format
// for the Manager Dashboard view. Derives computed values (SLA compliance,
// service risk scores) from real backend data.
// =============================================================================

import type { DashboardStats, TelecomService, AgentStats } from "../types";
import { ServiceStatus } from "../types";

// ---------------------------------------------------------------------------
// Types spécifiques au Manager Dashboard
// ---------------------------------------------------------------------------

/** KPI enrichis pour le Manager */
export interface ManagerKpis {
  /** Taux de conformité SLA (%) — vient de stats.slaComplianceRate ou mock */
  slaCompliance: number;
  /** MTTR = Mean Time To Resolution (heures) */
  mttr: number;
  /** Backlog = tickets actifs non résolus */
  backlog: number;
  /** Nombre de tickets escaladés actuellement */
  escalations: number;
  /** Tickets critiques ouverts */
  criticalTickets: number;
}

/** Service at risk (pour section "Top services à risque") */
export interface ServiceAtRisk {
  id: number;
  name: string;
  category: string;
  status: string;
  /** Nombre de tickets ouverts sur ce service */
  openTickets: number;
  /** Nombre de tickets en SLA dépassé sur ce service */
  slaBreached: number;
  /** Taux SLA (%) — mock: 100 - (breached / open * 100) */
  slaRate: number;
}

/** Item pour le filtre équipe (agents) */
export interface TeamFilterItem {
  id: number;
  name: string;
}

/** Item pour le filtre client */
export interface ClientFilterItem {
  id: number;
  label: string;
}

/** Données prêtes à rendre par le ManagerDashboard */
export interface ManagerDashboardData {
  kpis: ManagerKpis;
  servicesAtRisk: ServiceAtRisk[];
  /** Données pour le bar-chart « répartition par statut » */
  statusChartData: { name: string; value: number; color: string }[];
  /** Données pour le bar-chart « répartition par priorité » */
  priorityChartData: { name: string; value: number; color: string }[];
  /** Données pour le bar-chart « tickets par service » */
  serviceChartData: { name: string; value: number }[];
  /** Performance agents (top 5) */
  agentPerformance: { name: string; resolved: number; assigned: number }[];
  /** Trend data pour sparklines + zone chart (7j) */
  trend7d: { date: string; created: number; resolved: number }[];
  /** Options filtre équipe */
  teamOptions: TeamFilterItem[];
  /** Options filtre client */
  clientOptions: ClientFilterItem[];
}

// ---------------------------------------------------------------------------
// Constantes locales (couleurs charts)
// ---------------------------------------------------------------------------
const STATUS_CHART_COLORS: Record<string, string> = {
  NEW: "#2C8DB6",
  ASSIGNED: "#3FA7D6",
  IN_PROGRESS: "#3b82f6",
  PENDING: "#f59e0b",
  PENDING_THIRD_PARTY: "#f97316",
  ESCALATED: "#ef4444",
  RESOLVED: "#10b981",
  CLOSED: "#6b7280",
  CANCELLED: "#9ca3af",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nouveau",
  ASSIGNED: "Assigné",
  IN_PROGRESS: "En cours",
  PENDING: "En attente",
  PENDING_THIRD_PARTY: "Att. tiers",
  ESCALATED: "Escaladé",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
  CANCELLED: "Annulé",
};

const PRIORITY_CHART_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

// ---------------------------------------------------------------------------
// Adapter principal
// ---------------------------------------------------------------------------

/**
 * Transforms raw backend data (DashboardStats + services + agents) into a
 * structure ready to render in the ManagerDashboard.
 * Derives missing computed fields from available data.
 */
export function buildManagerDashboardData(
  stats: DashboardStats,
  services: TelecomService[],
  clients?: { id: number; companyName?: string; name?: string }[],
): ManagerDashboardData {
  // -- KPI ------------------------------------------------------------------
  const slaCompliance = stats.slaComplianceRate ?? estimateSlaCompliance(stats);
  const mttr = stats.averageResolutionTimeHours ?? stats.averageResolutionHours ?? 0;
  const backlog = stats.activeTickets ?? 0;
  const escalations = stats.ticketsByStatus?.ESCALATED ?? 0;
  const criticalTickets = stats.criticalCount ?? 0;

  // -- Status chart ---------------------------------------------------------
  const statusChartData = Object.entries(stats.ticketsByStatus ?? {})
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] ?? key,
      value,
      color: STATUS_CHART_COLORS[key] ?? "#94a3b8",
    }));

  // -- Priority chart -------------------------------------------------------
  const priorityChartData = Object.entries(stats.ticketsByPriority ?? {})
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: PRIORITY_LABELS[key] ?? key,
      value,
      color: PRIORITY_CHART_COLORS[key] ?? "#94a3b8",
    }));

  // -- Service chart --------------------------------------------------------
  const serviceChartData = Object.entries(stats.ticketsByService ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // -- Agent performance ----------------------------------------------------
  const agentPerformance = (stats.agentStats ?? []).slice(0, 6).map((a) => ({
    name: a.agentName || `Agent #${a.agentId}`,
    resolved: a.resolvedTickets ?? 0,
    assigned: a.assignedTickets ?? 0,
  }));

  // -- Trend 7j -------------------------------------------------------------
  const trend7d = (stats.trendLast7Days ?? []).map((d) => ({
    date: d.date,
    created: d.created,
    resolved: d.resolved,
  }));

  // -- Services at risk (derived from services + ticketsByService) ----------
  const servicesAtRisk = deriveServicesAtRisk(services, stats);

  // -- Team / client filters (derived from agentStats) ---------------------
  const teamOptions = deriveTeamOptions(stats.agentStats ?? []);
  // Client options from real data
  const clientOptions: ClientFilterItem[] = (clients ?? []).map((c) => ({
    id: c.id,
    label: c.companyName || c.name || `Client #${c.id}`,
  }));

  return {
    kpis: { slaCompliance, mttr, backlog, escalations, criticalTickets },
    servicesAtRisk,
    statusChartData,
    priorityChartData,
    serviceChartData,
    agentPerformance,
    trend7d,
    teamOptions,
    clientOptions,
  };
}

// ---------------------------------------------------------------------------
// Internal derivation functions
// ---------------------------------------------------------------------------

/**
 * Estime un taux SLA approximatif quand le backend ne le fournit pas.
 * Formule: (total - breached) / total * 100
 */
function estimateSlaCompliance(stats: DashboardStats): number {
  const total = stats.totalTickets || 1; // évite div/0
  const breached = stats.slaBreachedCount ?? 0;
  return Math.round(((total - breached) / total) * 100 * 10) / 10;
}

/**
 * Derives at-risk services from the service list and ticket distribution.
 * Computes SLA rates from available breach data.
 */
function deriveServicesAtRisk(services: TelecomService[], stats: DashboardStats): ServiceAtRisk[] {
  const byService = stats.ticketsByService ?? {};

  // Si on a ticketsByService, on s'en sert
  if (Object.keys(byService).length > 0) {
    return Object.entries(byService)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => {
        const svc = services.find((s) => s.name === name);
        // Utilise les données SLA réelles du backend si disponibles
        const svcBreached = svc?.slaBreachedCount ?? 0;
        const breached = svcBreached > 0 ? svcBreached : 0;
        const rate = count > 0 ? Math.round(((count - breached) / count) * 100) : 100;
        return {
          id: svc?.id ?? 0,
          name,
          category: svc?.categoryLabel ?? svc?.category ?? "—",
          status: svc?.status ?? ServiceStatus.UP,
          openTickets: count,
          slaBreached: breached,
          slaRate: rate,
        };
      })
      .sort((a, b) => b.slaBreached - a.slaBreached)
      .slice(0, 6);
  }

  // Fallback: dériver depuis services list
  return services
    .filter(
      (s) =>
        s.ticketCount > 0 || s.status === ServiceStatus.DEGRADED || s.status === ServiceStatus.DOWN,
    )
    .slice(0, 6)
    .map((s) => {
      const openTickets = s.ticketCount ?? 0;
      const breached = s.slaBreachedCount ?? 0;
      return {
        id: s.id,
        name: s.name,
        category: s.categoryLabel ?? s.category ?? "—",
        status: s.status ?? ServiceStatus.UP,
        openTickets,
        slaBreached: breached,
        slaRate: openTickets > 0 ? Math.round(((openTickets - breached) / openTickets) * 100) : 100,
      };
    })
    .sort((a, b) => a.slaRate - b.slaRate);
}

/** Dérive la liste d'agents depuis agentStats pour le filtre équipe */
function deriveTeamOptions(agents: AgentStats[]): TeamFilterItem[] {
  return agents.map((a) => ({
    id: a.agentId,
    name: a.agentName || `Agent #${a.agentId}`,
  }));
}
