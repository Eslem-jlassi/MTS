import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { UserRole } from "../types";

/**
 * Hook de permissions UI.
 * Le backend reste la source de verite; ce hook ne sert qu'a aligner l'affichage.
 */
export function usePermissions() {
  const { user } = useSelector((state: RootState) => state.auth);
  const userRole = user?.role;

  const hasRole = (role: UserRole): boolean => userRole === role;
  const hasAnyRole = (...roles: UserRole[]): boolean =>
    userRole ? roles.includes(userRole) : false;

  const isAdmin = hasRole(UserRole.ADMIN);
  const isManager = hasRole(UserRole.MANAGER);
  const isAgent = hasRole(UserRole.AGENT);
  const isClient = hasRole(UserRole.CLIENT);
  const isAuthenticated = userRole !== undefined;

  // Tickets
  const canCreateTicket = isClient;
  const canViewTickets = isAuthenticated;
  const canUpdateTicket = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canAssignTicket = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canChangeTicketStatus = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canChangeTicketPriority = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteTicket = isAdmin;
  const canHardDeleteTicket = isAdmin;
  const canAddComment = isAuthenticated;
  const canViewAllTickets = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canExportTickets = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);

  // Clients
  const canViewClients = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canCreateClient = isAdmin;
  const canUpdateClient = isAdmin;
  const canDeleteClient = isAdmin;
  const canArchiveClient = isAdmin;

  // Services
  const canViewServices = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canCreateService = isAdmin;
  const canUpdateService = isAdmin;
  const canUpdateServiceStatus = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteService = isAdmin;
  const canViewServiceHistory = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  // Incidents
  const canViewIncidents = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canCreateIncident = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canUpdateIncident = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canResolveIncident = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteIncident = isAdmin;

  // Reports
  const canViewReports = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canGenerateReport = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDownloadReport = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteReport = isAdmin;

  // SLA
  const canViewSlaPolicies = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canCreateSlaPolicy = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canUpdateSlaPolicy = isAdmin;
  const canDeleteSlaPolicy = isAdmin;
  const canViewEscalations = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canResolveEscalation = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canManageBusinessHours = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  // Users
  const canViewUsers = isAdmin;
  const canCreateUser = isAdmin;
  const canUpdateUser = isAdmin;
  const canDeleteUser = isAdmin;
  const canHardDeleteUser = isAdmin;
  const canChangeUserRole = isAdmin;
  const canActivateDeactivateUser = isAdmin;

  // Audit & notifications
  const canViewAuditLogs = isAdmin;
  const canViewTicketHistory = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canViewNotifications = isAuthenticated;

  // Health
  const canViewHealthMonitoring = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  // Routes
  const canAccessDashboard = isAuthenticated;
  const canAccessTickets = isAuthenticated;
  const canAccessClients = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canAccessServices = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canAccessIncidents = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canAccessReports = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canAccessSla = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canAccessUsers = isAdmin;
  const canAccessAuditLogs = isAdmin;
  const canAccessSettings = isAuthenticated;
  const canAccessHealthMonitoring = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    isManager,
    isAgent,
    isClient,
    canCreateTicket,
    canViewTickets,
    canUpdateTicket,
    canAssignTicket,
    canChangeTicketStatus,
    canChangeTicketPriority,
    canDeleteTicket,
    canHardDeleteTicket,
    canAddComment,
    canViewAllTickets,
    canExportTickets,
    canViewClients,
    canCreateClient,
    canUpdateClient,
    canDeleteClient,
    canArchiveClient,
    canViewServices,
    canCreateService,
    canUpdateService,
    canUpdateServiceStatus,
    canDeleteService,
    canViewServiceHistory,
    canViewIncidents,
    canCreateIncident,
    canUpdateIncident,
    canResolveIncident,
    canDeleteIncident,
    canViewReports,
    canGenerateReport,
    canDownloadReport,
    canDeleteReport,
    canViewSlaPolicies,
    canCreateSlaPolicy,
    canUpdateSlaPolicy,
    canDeleteSlaPolicy,
    canViewEscalations,
    canResolveEscalation,
    canManageBusinessHours,
    canViewUsers,
    canCreateUser,
    canUpdateUser,
    canDeleteUser,
    canHardDeleteUser,
    canChangeUserRole,
    canActivateDeactivateUser,
    canViewAuditLogs,
    canViewTicketHistory,
    canViewNotifications,
    canViewHealthMonitoring,
    canAccessDashboard,
    canAccessTickets,
    canAccessClients,
    canAccessServices,
    canAccessIncidents,
    canAccessReports,
    canAccessSla,
    canAccessUsers,
    canAccessAuditLogs,
    canAccessSettings,
    canAccessHealthMonitoring,
  };
}

export default usePermissions;
