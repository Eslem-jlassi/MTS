// =============================================================================
// MTS TELECOM - Dashboard Service
// =============================================================================

import api from "./client";
import { DashboardStats, AgentPerformance } from "../types";

const DASHBOARD_PREFIX = "/dashboard";

/** Filtres optionnels pour les stats (TODO BACKEND: supporter en query params) */
export interface DashboardFilters {
  period?: "DAY" | "WEEK" | "MONTH";
  serviceId?: number;
  clientId?: number;
}

export const dashboardService = {
  /**
   * Get dashboard statistics (for admin/manager).
   * Pass filters to filter by period, service, client (backend may ignore until implemented).
   */
  getStats: async (filters?: DashboardFilters): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (filters?.period) params.append("period", filters.period);
    if (filters?.serviceId != null) params.append("serviceId", String(filters.serviceId));
    if (filters?.clientId != null) params.append("clientId", String(filters.clientId));
    const response = await api.get<DashboardStats>(`${DASHBOARD_PREFIX}/stats`, {
      params: params.toString() ? params : undefined,
    });
    return response.data;
  },

  /**
   * Get my dashboard statistics (for current user)
   */
  getMyStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>(`${DASHBOARD_PREFIX}/my-stats`);
    return response.data;
  },

  /**
   * Get agent performance metrics
   */
  getAgentPerformance: async (): Promise<AgentPerformance[]> => {
    const stats = await dashboardService.getStats();
    return (stats.agentStats ?? []).map((agent) => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      assignedTickets: agent.assignedTickets,
      resolvedTickets: agent.resolvedTickets,
      averageResolutionHours: agent.averageResolutionTimeHours,
      slaComplianceRate: stats.slaComplianceRate ?? 0,
    }));
  },
};

export default dashboardService;
