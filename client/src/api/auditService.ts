// =============================================================================
// MTS TELECOM - Audit Service (Frontend API Client)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

import api from "./client";
import { AuditLog, AuditLogSearchParams, PageResponse } from "../types";

/**
 * auditService - Requêtes API pour les logs d'audit (RGPD, ISO 27001).
 *
 * Endpoints:
 * - searchAuditLogs(): Advanced search with filters (ADMIN only)
 * - getEntityHistory(): Get history for specific entity (AGENT+ with restrictions)
 * - getRecentActivity(): Get recent activity (ADMIN dashboard widget)
 *
 * RBAC Rules:
 * - ADMIN: Full audit access (all filters, all entities)
 * - MANAGER: Can view managed entity history (tickets, clients)
 * - AGENT: Can only view ticket history (entity/{type}/{id} with type=TICKET)
 * - CLIENT: No access to audit logs
 *
 * @author Billcom Consulting
 * @version 2.0 - Enhanced for V30 audit_logs schema
 * @since 2026-02-28
 */
export const auditService = {
  /**
   * Advanced search with multiple filters (ADMIN only).
   *
   * Used in AuditLogPage filters form.
   *
   * @param params Search criteria (all optional)
   * @returns Paginated audit logs
   *
   * @example
   * const logs = await auditService.searchAuditLogs({
   *   userId: 5,
   *   entityType: 'TICKET',
   *   action: 'TICKET_CREATED',
   *   startDate: '2026-01-01T00:00:00',
   *   endDate: '2026-12-31T23:59:59',
   *   ipAddress: '192.168.1.1',
   *   page: 0,
   *   size: 20
   * });
   */
  async searchAuditLogs(params: AuditLogSearchParams = {}): Promise<PageResponse<AuditLog>> {
    const {
      userId,
      entityType,
      action,
      startDate,
      endDate,
      ipAddress,
      page = 0,
      size = 20,
      sortBy = "timestamp",
      sortDir = "DESC",
    } = params;

    const response = await api.get<PageResponse<AuditLog>>("/audit-logs", {
      params: {
        userId,
        entityType,
        action,
        startDate,
        endDate,
        ipAddress,
        page,
        size,
        sortBy,
        sortDir,
      },
    });

    return response.data;
  },

  /**
   * Get single audit log by ID (ADMIN only).
   *
   * @param id Audit log ID
   * @returns Single audit log
   */
  async getAuditLog(id: number): Promise<AuditLog> {
    const response = await api.get<AuditLog>(`/audit-logs/${id}`);
    return response.data;
  },

  /**
   * Get entity history (e.g., all changes on Ticket #123).
   *
   * Used in:
   * - TicketDetailPage "Historique" tab (entityType=TICKET)
   * - ServiceDetailPage timeline (entityType=SERVICE)
   * - UserDetailPage actions (entityType=USER)
   *
   * Business rules:
   * - AGENT/MANAGER: Can view TICKET history only
   * - ADMIN: Can view any entity history
   *
   * @param entityType Entity type (TICKET, SERVICE, CLIENT, USER, INCIDENT, SLA)
   * @param entityId Entity ID
   * @param page Page number (0-indexed)
   * @param size Page size (default 20, max 100)
   * @returns Paginated entity history
   *
   * @example
   * const history = await auditService.getEntityHistory('TICKET', 123, 0, 20);
   */
  async getEntityHistory(
    entityType: string,
    entityId: number,
    page: number = 0,
    size: number = 20,
  ): Promise<PageResponse<AuditLog>> {
    const response = await api.get<PageResponse<AuditLog>>(
      `/audit-logs/entity/${entityType}/${entityId}`,
      {
        params: { page, size },
      },
    );

    return response.data;
  },

  /**
   * Get recent activity (ADMIN only, for dashboard widget).
   *
   * @param limit Max number of entries (default 10, max 50)
   * @returns Recent audit logs (not paginated)
   *
   * @example
   * const recent = await auditService.getRecentActivity(10);
   */
  async getRecentActivity(limit: number = 10): Promise<AuditLog[]> {
    const response = await api.get<AuditLog[]>("/audit-logs/recent", {
      params: { limit },
    });

    return response.data;
  },
};

export default auditService;
