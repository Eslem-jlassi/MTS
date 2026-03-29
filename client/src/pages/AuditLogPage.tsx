// =============================================================================
// MTS TELECOM - AuditLogPage (Admin Audit Logs Console)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  User,
  FileText,
  Activity,
  Info,
  Inbox,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import auditService from "../api/auditService";
import { AuditLog, AuditLogSearchParams } from "../types";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Modal } from "../components/ui";
import type { BadgeVariant } from "../components/ui/Badge";

/**
 * AuditLogPage - Console d'audit complète pour les admins (RGPD/ISO 27001).
 *
 * Features:
 * - Advanced search with 7 filters (user, entity type, action, date range, IP)
 * - Paginated table with sortable columns
 * - Click row to show modal with full details (old/new values)
 * - Role-based access: ADMIN only
 *
 * @author Billcom Consulting
 * @version 2.0 - Enhanced for V30 audit_logs schema
 * @since 2026-02-28
 */
const AuditLogPage: React.FC = () => {
  const { isAdmin, canAccessAuditLogs } = usePermissions();
  const navigate = useNavigate();

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Search filters
  const [filters, setFilters] = useState<AuditLogSearchParams>({
    page: 0,
    size: 20,
    sortBy: "timestamp",
    sortDir: "DESC",
  });

  // Selected log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ==========================================================================
  // RBAC CHECK
  // ==========================================================================

  useEffect(() => {
    if (!isAdmin || !canAccessAuditLogs) {
      navigate("/dashboard");
    }
  }, [isAdmin, canAccessAuditLogs, navigate]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await auditService.searchAuditLogs(filters);
      setAuditLogs(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setError(err.response?.data?.message || "Erreur lors du chargement des logs d'audit");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin, fetchAuditLogs]);

  // ==========================================================================
  // FILTER HANDLERS
  // ==========================================================================

  const handleFilterChange = (key: keyof AuditLogSearchParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 0, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 0,
      size: 20,
      sortBy: "timestamp",
      sortDir: "DESC",
    });
  };

  // ==========================================================================
  // DETAIL MODAL
  // ==========================================================================

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getActionBadgeVariant = (action: string): BadgeVariant => {
    if (action.includes("CREATED")) return "success";
    if (action.includes("UPDATED") || action.includes("MODIFIED")) return "info";
    if (action.includes("DELETED") || action.includes("SUPPRIM")) return "danger";
    if (action.includes("LOGIN") || action.includes("LOGOUT")) return "warning";
    return "neutral";
  };

  const formatValue = (value: string | null): string => {
    if (!value) return "—";

    // Try to parse as JSON for pretty printing
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  // ==========================================================================
  // LOADING & ERROR STATES
  // ==========================================================================

  if (!isAdmin) {
    return null;
  }

  if (loading && auditLogs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-7 w-48 bg-ds-elevated rounded-lg animate-pulse" />
        </div>
        <Card padding="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-3 border-b border-ds-border last:border-0">
              <div className="h-4 w-28 bg-ds-elevated rounded animate-pulse" />
              <div className="h-4 w-24 bg-ds-elevated rounded animate-pulse" />
              <div className="h-4 w-20 bg-ds-elevated rounded animate-pulse" />
              <div className="h-4 w-16 bg-ds-elevated rounded animate-pulse" />
              <div className="h-4 flex-1 bg-ds-elevated rounded animate-pulse" />
              <div className="h-4 w-24 bg-ds-elevated rounded animate-pulse" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  const inputClass =
    "block w-full rounded-xl border border-ds-border bg-ds-card text-ds-primary text-sm px-3.5 py-2 transition-all focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500 hover:border-ds-muted/50";
  const selectClass =
    "block w-full rounded-xl border border-ds-border bg-ds-card text-ds-primary text-sm px-3.5 py-2 transition-all focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500 hover:border-ds-muted/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ds-primary flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary-500" />
            Journal d'Audit
          </h1>
          <p className="text-ds-muted mt-1">
            Traçabilité complète des actions sur le système (RGPD, ISO 27001)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-ds-muted">
          <Activity className="w-4 h-4" />
          <span className="font-semibold text-ds-primary">{totalElements}</span> entrée
          {totalElements > 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters Card */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-ds-muted" />
          <h2 className="text-sm font-semibold text-ds-primary uppercase tracking-wide">Filtres</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Entity Type */}
          <div>
            <label className="block text-xs font-medium text-ds-muted mb-1.5">Type d'Entité</label>
            <select
              className={selectClass}
              value={filters.entityType || ""}
              onChange={(e) => handleFilterChange("entityType", e.target.value || undefined)}
            >
              <option value="">Tous les types</option>
              <option value="TICKET">Tickets</option>
              <option value="SERVICE">Services</option>
              <option value="CLIENT">Clients</option>
              <option value="USER">Utilisateurs</option>
              <option value="INCIDENT">Incidents</option>
              <option value="SLA">SLA</option>
              <option value="REPORT">Rapports</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-ds-muted mb-1.5">Date Début</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={filters.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value || undefined)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-ds-muted mb-1.5">Date Fin</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={filters.endDate || ""}
              onChange={(e) => handleFilterChange("endDate", e.target.value || undefined)}
            />
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-xs font-medium text-ds-muted mb-1.5">Adresse IP</label>
            <input
              type="text"
              className={inputClass}
              placeholder="192.168.1.1"
              value={filters.ipAddress || ""}
              onChange={(e) => handleFilterChange("ipAddress", e.target.value || undefined)}
            />
          </div>
        </div>

        {/* Reset + Page size */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ds-border">
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-sm text-ds-muted hover:text-ds-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ds-muted">Par page :</span>
            <select
              className="rounded-lg border border-ds-border bg-ds-card text-ds-primary text-xs px-2 py-1.5 focus:ring-2 focus:ring-primary-400/30"
              value={filters.size}
              onChange={(e) => handleFilterChange("size", parseInt(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-300 text-sm">
          <Info className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ds-border bg-ds-elevated/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider w-40">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Date
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider w-36">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Utilisateur
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider w-44">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider w-32">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Entité
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider w-32">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    IP
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-border">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Inbox className="w-12 h-12 text-ds-muted mx-auto mb-3 opacity-40" />
                    <p className="text-ds-muted text-sm">Aucun log d'audit trouvé</p>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => handleRowClick(log)}
                    className="hover:bg-ds-elevated/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-ds-secondary whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.systemAction ? (
                        <Badge variant="neutral">SYSTEM</Badge>
                      ) : (
                        <span
                          className="text-ds-primary font-medium"
                          title={log.userEmail || undefined}
                        >
                          {log.userName || "N/A"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.actionLabel || log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-ds-primary">{log.entityType}</div>
                      <div className="text-xs text-ds-muted">
                        #{log.entityId}
                        {log.entityName && <span> — {log.entityName.substring(0, 20)}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ds-secondary max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-xs text-ds-muted font-mono">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ds-border">
            <p className="text-xs text-ds-muted">
              Page <span className="font-semibold text-ds-primary">{(filters.page || 0) + 1}</span>{" "}
              sur <span className="font-semibold text-ds-primary">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange((filters.page || 0) - 1)}
                disabled={(filters.page || 0) === 0}
                className="p-1.5 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const current = filters.page || 0;
                const pageNum = current < 3 ? i : current - 2 + i;
                if (pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                      current === pageNum
                        ? "bg-primary-500 text-white shadow-sm"
                        : "text-ds-muted hover:text-ds-primary hover:bg-ds-elevated"
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange((filters.page || 0) + 1)}
                disabled={(filters.page || 0) === totalPages - 1}
                className="p-1.5 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        title={selectedLog ? `Détail Audit #${selectedLog.id}` : ""}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Timestamp</p>
                <p className="text-sm text-ds-primary">{formatTimestamp(selectedLog.timestamp)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Utilisateur</p>
                {selectedLog.systemAction ? (
                  <Badge variant="neutral">SYSTEM</Badge>
                ) : (
                  <div>
                    <p className="text-sm text-ds-primary font-medium">{selectedLog.userName}</p>
                    <p className="text-xs text-ds-muted">{selectedLog.userEmail}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Action</p>
                <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                  {selectedLog.actionLabel || selectedLog.action}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Entité</p>
                <p className="text-sm text-ds-primary">
                  {selectedLog.entityType}{" "}
                  <span className="text-ds-muted">#{selectedLog.entityId}</span>
                </p>
                {selectedLog.entityName && (
                  <p className="text-xs text-ds-muted">{selectedLog.entityName}</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-ds-muted mb-1">Description</p>
              <p className="text-sm text-ds-primary">{selectedLog.description}</p>
            </div>

            {selectedLog.oldValue && (
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Ancienne valeur</p>
                <pre className="text-xs bg-ds-elevated rounded-lg p-3 overflow-x-auto text-ds-secondary border border-ds-border">
                  {formatValue(selectedLog.oldValue)}
                </pre>
              </div>
            )}

            {selectedLog.newValue && (
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Nouvelle valeur</p>
                <pre className="text-xs bg-ds-elevated rounded-lg p-3 overflow-x-auto text-ds-secondary border border-ds-border">
                  {formatValue(selectedLog.newValue)}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-ds-border">
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">Adresse IP</p>
                <p className="text-sm text-ds-primary font-mono">{selectedLog.ipAddress || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ds-muted mb-1">User-Agent</p>
                <p className="text-xs text-ds-muted break-all">{selectedLog.userAgent || "—"}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogPage;
