// =============================================================================
// MTS TELECOM - Dashboard (role-based router)
// =============================================================================

import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import { UserRole } from "../../types";
import type { DashboardStats, Ticket, TelecomService } from "../../types";
import { dashboardService, telecomServiceService } from "../../api";
import { ticketService } from "../../api";
import { clientService } from "../../api/clientService";
import type { DashboardFilters } from "../../api/dashboardService";
import { ClientDashboard } from "./ClientDashboard";
import { AgentDashboard } from "./AgentDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { ManagerDashboard } from "./ManagerDashboard";
import { ErrorState } from "../../components/ui";

const emptyStats: DashboardStats = {
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

/**
 * Dashboard principal - Fetches data then renders the right dashboard per role.
 */
const Dashboard: React.FC = () => {
  const user = useSelector(selectUser);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [services, setServices] = useState<TelecomService[]>([]);
  const [clients, setClients] = useState<{ id: number; companyName?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>();

  const fetchData = useCallback(
    async (isRefresh = false, filters?: DashboardFilters) => {
      try {
        if (isRefresh) setRefreshing(true);
        setError(null);
        const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
        const statsData = isAdmin
          ? await dashboardService.getStats(filters)
          : await dashboardService.getMyStats();
        setStats(statsData);

        // CLIENT → /my-tickets, AGENT → /assigned, ADMIN/MANAGER → /tickets (all)
        if (user?.role === UserRole.CLIENT) {
          const ticketsRes = await ticketService.getMyTickets({ page: 0, size: 10 });
          setRecentTickets(ticketsRes.content ?? []);
        } else if (user?.role === UserRole.AGENT) {
          const ticketsRes = await ticketService.getAssignedToMe({ page: 0, size: 10 });
          setRecentTickets(ticketsRes.content ?? []);
        } else if (user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER) {
          const ticketsRes = await ticketService.getTickets({}, { page: 0, size: 10 });
          setRecentTickets(ticketsRes.content ?? []);
        }

        // Fetch services for ADMIN, MANAGER, and CLIENT dashboards
        if (
          user?.role === UserRole.ADMIN ||
          user?.role === UserRole.MANAGER ||
          user?.role === UserRole.CLIENT
        ) {
          try {
            const svcRes =
              user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER
                ? await telecomServiceService.getServices({ page: 0, size: 100 })
                : await telecomServiceService.getActiveServices();
            setServices(Array.isArray(svcRes) ? svcRes : (svcRes.content ?? []));
          } catch {
            /* services are optional for dashboard */
          }
        }

        // Fetch clients for MANAGER dashboard filters
        if (user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN) {
          try {
            const clientsRes = await clientService.getClients({ page: 0, size: 100 });
            setClients(
              (clientsRes.content ?? []).map((c) => ({ id: c.id, companyName: c.companyName })),
            );
          } catch {
            /* clients are optional */
          }
        }
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Impossible de charger le tableau de bord. Vérifiez votre connexion.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.role],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = (filters?: DashboardFilters) => fetchData(true, filters);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Erreur de chargement" message={error} onRetry={() => fetchData()} />
      </div>
    );
  }

  switch (user?.role) {
    case UserRole.CLIENT:
      return (
        <ClientDashboard
          stats={stats}
          recentTickets={recentTickets}
          services={services}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isLoadingRefresh={refreshing}
        />
      );
    case UserRole.AGENT:
      return (
        <AgentDashboard
          stats={stats}
          recentTickets={recentTickets}
          assignedToMeCount={recentTickets.length}
          slaAtRiskCount={stats.slaBreachedCount ?? 0}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isLoadingRefresh={refreshing}
        />
      );
    case UserRole.MANAGER:
      return (
        <ManagerDashboard
          stats={stats}
          services={services}
          clients={clients}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isLoadingRefresh={refreshing}
        />
      );
    case UserRole.ADMIN:
      return (
        <AdminDashboard
          stats={stats}
          services={services}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isLoadingRefresh={refreshing}
        />
      );
    default:
      return (
        <ClientDashboard
          stats={stats}
          recentTickets={recentTickets}
          services={services}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isLoadingRefresh={refreshing}
        />
      );
  }
};

export default Dashboard;
