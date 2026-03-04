// =============================================================================
// MTS TELECOM - usePermissions Hook (RBAC Frontend)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { UserRole } from '../types';

/**
 * usePermissions - Hook React pour vérifier les permissions RBAC côté frontend.
 * 
 * Méthodes:
 * - hasRole(role): Vérifie si l'utilisateur a un rôle spécifique
 * - hasAnyRole(...roles): Vérifie si l'utilisateur a au moins un des rôles
 * - can{Action}{Entity}: Méthodes de permission spécifiques (ex: canCreateTicket)
 * 
 * IMPORTANT: Ces vérifications sont pour l'UI uniquement (masquer boutons/menus).
 * Le backend DOIT toujours valider avec @PreAuthorize pour la sécurité réelle.
 * 
 * @author Billcom Consulting
 * @version 1.0
 * @since 2026-02-28
 * 
 * @example
 * const { hasRole, canDeleteTicket } = usePermissions();
 * 
 * if (hasRole(UserRole.ADMIN)) {
 *   // Show admin menu
 * }
 * 
 * if (canDeleteTicket) {
 *   // Show delete button
 * }
 */
export function usePermissions() {
  const { user } = useSelector((state: RootState) => state.auth);
  const userRole = user?.role;

  // ==========================================================================
  // CORE PERMISSION CHECKS
  // ==========================================================================

  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const hasAnyRole = (...roles: UserRole[]): boolean => {
    return userRole ? roles.includes(userRole) : false;
  };

  const isAdmin = hasRole(UserRole.ADMIN);
  const isManager = hasRole(UserRole.MANAGER);
  const isAgent = hasRole(UserRole.AGENT);
  const isClient = hasRole(UserRole.CLIENT);

  // ==========================================================================
  // TICKET PERMISSIONS (see docs/RBAC_MATRIX.md)
  // ==========================================================================

  const canCreateTicket = userRole !== undefined; // All authenticated users
  const canViewTickets = userRole !== undefined; // All (CLIENT sees own only)
  const canUpdateTicket = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canAssignTicket = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canChangeTicketStatus = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canChangeTicketPriority = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteTicket = isAdmin;
  const canAddComment = userRole !== undefined; // All
  const canViewAllTickets = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canExportTickets = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);

  // ==========================================================================
  // CLIENT PERMISSIONS
  // ==========================================================================

  const canViewClients = userRole !== undefined; // All (CLIENT sees own profile only)
  const canCreateClient = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canUpdateClient = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteClient = isAdmin;

  // ==========================================================================
  // SERVICE PERMISSIONS
  // ==========================================================================

  const canViewServices = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canCreateService = isAdmin;
  const canUpdateService = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canUpdateServiceStatus = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteService = isAdmin;
  const canViewServiceHistory = isAdmin;

  // ==========================================================================
  // INCIDENT PERMISSIONS
  // ==========================================================================

  const canViewIncidents = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canCreateIncident = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canUpdateIncident = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canResolveIncident = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteIncident = isAdmin;

  // ==========================================================================
  // REPORT PERMISSIONS
  // ==========================================================================

  const canViewReports = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canGenerateReport = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDownloadReport = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canDeleteReport = isAdmin;

  // ==========================================================================
  // SLA & ESCALATION PERMISSIONS
  // ==========================================================================

  const canViewSlaPolicies = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canCreateSlaPolicy = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canUpdateSlaPolicy = isAdmin;
  const canDeleteSlaPolicy = isAdmin;
  const canViewEscalations = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canResolveEscalation = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canManageBusinessHours = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  // ==========================================================================
  // USER MANAGEMENT PERMISSIONS
  // ==========================================================================

  const canViewUsers = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canCreateUser = isAdmin;
  const canUpdateUser = isAdmin;
  const canDeleteUser = isAdmin;
  const canChangeUserRole = isAdmin;
  const canActivateDeactivateUser = isAdmin;

  // ==========================================================================
  // AUDIT & NOTIFICATIONS PERMISSIONS
  // ==========================================================================

  const canViewAuditLogs = isAdmin; // Full audit
  const canViewTicketHistory = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canViewNotifications = userRole !== undefined; // All (own notifications only)

  // ==========================================================================
  // HEALTH MONITORING PERMISSIONS
  // ==========================================================================

  const canViewHealthMonitoring = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  // ==========================================================================
  // ROUTE PERMISSIONS (for RoleBasedRoute)
  // ==========================================================================

  const canAccessDashboard = userRole !== undefined; // All roles have a dashboard
  const canAccessTickets = userRole !== undefined;
  const canAccessClients = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canAccessServices = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canAccessIncidents = hasAnyRole(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN);
  const canAccessReports = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canAccessSla = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);
  const canAccessUsers = isAdmin;
  const canAccessAuditLogs = isAdmin;
  const canAccessSettings = userRole !== undefined; // All (own profile)
  const canAccessHealthMonitoring = hasAnyRole(UserRole.MANAGER, UserRole.ADMIN);

  // ==========================================================================
  // RETURN OBJECT (all permissions)
  // ==========================================================================

  return {
    // Core checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isManager,
    isAgent,
    isClient,

    // Tickets
    canCreateTicket,
    canViewTickets,
    canUpdateTicket,
    canAssignTicket,
    canChangeTicketStatus,
    canChangeTicketPriority,
    canDeleteTicket,
    canAddComment,
    canViewAllTickets,
    canExportTickets,

    // Clients
    canViewClients,
    canCreateClient,
    canUpdateClient,
    canDeleteClient,

    // Services
    canViewServices,
    canCreateService,
    canUpdateService,
    canUpdateServiceStatus,
    canDeleteService,
    canViewServiceHistory,

    // Incidents
    canViewIncidents,
    canCreateIncident,
    canUpdateIncident,
    canResolveIncident,
    canDeleteIncident,

    // Reports
    canViewReports,
    canGenerateReport,
    canDownloadReport,
    canDeleteReport,

    // SLA
    canViewSlaPolicies,
    canCreateSlaPolicy,
    canUpdateSlaPolicy,
    canDeleteSlaPolicy,
    canViewEscalations,
    canResolveEscalation,
    canManageBusinessHours,

    // Users
    canViewUsers,
    canCreateUser,
    canUpdateUser,
    canDeleteUser,
    canChangeUserRole,
    canActivateDeactivateUser,

    // Audit & Notifications
    canViewAuditLogs,
    canViewTicketHistory,
    canViewNotifications,

    // Health Monitoring
    canViewHealthMonitoring,

    // Routes
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
    canAccessHealthMonitoring
  };
}

export default usePermissions;
