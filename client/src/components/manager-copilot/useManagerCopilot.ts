import { useCallback, useEffect, useState } from "react";
import { dashboardService, type DashboardFilters } from "../../api/dashboardService";
import { incidentService } from "../../api/incidentService";
import { managerCopilotService } from "../../api/managerCopilotService";
import { telecomServiceService } from "../../api/telecomServiceService";
import { ticketService } from "../../api/ticketService";
import type { DashboardStats, Incident, TelecomService, Ticket } from "../../types";
import { buildManagerCopilotSnapshot } from "./managerCopilotModel";
import type { ManagerCopilotSnapshot } from "./types";

interface UseManagerCopilotOptions {
  enabled?: boolean;
  filters?: DashboardFilters;
}

const EMPTY_STATS: DashboardStats = {
  totalTickets: 0,
  activeTickets: 0,
  slaBreachedCount: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  unassignedCount: 0,
  createdToday: 0,
  resolvedToday: 0,
};

const REFRESH_INTERVAL_MS = 120000;
const FALLBACK_ERROR_MESSAGE = "Le copilote n'a pas pu charger les signaux manager pour le moment.";
const TICKET_PAGE_REQUEST = {
  page: 0,
  size: 24,
  sort: "createdAt",
  direction: "DESC",
} as const;

function buildTicketFilters(filters?: DashboardFilters) {
  return {
    ...(filters?.serviceId != null ? { serviceId: filters.serviceId } : {}),
    ...(filters?.clientId != null ? { clientId: filters.clientId } : {}),
  };
}

function filterIncidentsByService(incidents: Incident[], serviceId?: number): Incident[] {
  if (serviceId == null) {
    return incidents;
  }

  return incidents.filter((incident) => incident.serviceId === serviceId);
}

function filterServicesById(services: TelecomService[], serviceId?: number): TelecomService[] {
  if (serviceId == null) {
    return services;
  }

  return services.filter((service) => service.id === serviceId);
}

export function useManagerCopilot({ enabled = true, filters }: UseManagerCopilotOptions = {}) {
  const [snapshot, setSnapshot] = useState<ManagerCopilotSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!enabled) {
        return;
      }

      const finishLoad = (
        nextSnapshot: ManagerCopilotSnapshot | null,
        nextError: string | null,
      ) => {
        setSnapshot(nextSnapshot);
        setError(nextError);
        setIsLoading(false);
        setIsRefreshing(false);
      };

      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const backendSnapshot = await managerCopilotService.getDashboardSummary(filters);
        finishLoad(backendSnapshot, null);
        return;
      } catch {
        // The local fallback keeps the manager view useful even when the
        // dedicated backend endpoint is not deployed or one source is down.
      }

      const results = await Promise.allSettled([
        dashboardService.getStats(filters),
        ticketService.getTickets(buildTicketFilters(filters), TICKET_PAGE_REQUEST),
        incidentService.getActive(),
        telecomServiceService.getHealthDashboard(),
      ]);

      const [statsResult, ticketsResult, incidentsResult, servicesResult] = results;

      const stats: DashboardStats =
        statsResult.status === "fulfilled" ? statsResult.value : EMPTY_STATS;
      const tickets: Ticket[] =
        ticketsResult.status === "fulfilled" ? (ticketsResult.value.content ?? []) : [];
      const incidents: Incident[] =
        incidentsResult.status === "fulfilled"
          ? filterIncidentsByService(incidentsResult.value, filters?.serviceId)
          : [];
      const services: TelecomService[] =
        servicesResult.status === "fulfilled"
          ? filterServicesById(servicesResult.value, filters?.serviceId)
          : [];

      const fulfilledCount = results.filter((result) => result.status === "fulfilled").length;
      const fallbackSnapshot = buildManagerCopilotSnapshot({
        stats,
        tickets,
        incidents,
        services,
        mode: fulfilledCount === results.length ? "live" : "degraded",
        generatedAt: new Date().toISOString(),
      });

      finishLoad(fallbackSnapshot, fulfilledCount === 0 ? FALLBACK_ERROR_MESSAGE : null);
    },
    [enabled, filters],
  );

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    void loadSnapshot(false);

    const intervalId = window.setInterval(() => {
      void loadSnapshot(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, loadSnapshot]);

  return {
    snapshot,
    isLoading,
    isRefreshing,
    error,
    refresh: () => loadSnapshot(true),
  };
}
