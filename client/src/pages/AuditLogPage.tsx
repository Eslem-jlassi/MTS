// =============================================================================
// MTS TELECOM - AuditLogPage (Admin Audit Logs Console)
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Globe,
  Inbox,
  Info,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import auditService from "../api/auditService";
import { AuditLog, AuditLogSearchParams } from "../types";
import { Badge, Card, Modal } from "../components/ui";
import type { BadgeVariant } from "../components/ui/Badge";
import { formatDateTime } from "../utils/formatters";

const DEFAULT_FILTERS: AuditLogSearchParams = {
  page: 0,
  size: 20,
  sortBy: "timestamp",
  sortDir: "DESC",
};

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "TICKET", label: "Tickets" },
  { value: "SERVICE", label: "Services" },
  { value: "CLIENT", label: "Clients" },
  { value: "USER", label: "Utilisateurs" },
  { value: "INCIDENT", label: "Incidents" },
  { value: "SLA", label: "SLA" },
  { value: "REPORT", label: "Rapports" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const formatValue = (value?: string | null): string => {
  if (!value) {
    return "Aucune valeur";
  }

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

const LOCAL_IP_VALUES = new Set([
  "::1",
  "0:0:0:0:0:0:0:1",
  "::0:0:0:0:0:0:0:1",
  "127.0.0.1",
  "localhost",
]);

const formatIpAddress = (value?: string | null): string => {
  const normalized = value?.trim();
  if (!normalized) {
    return "N/A";
  }

  const lowerValue = normalized.toLowerCase();
  if (LOCAL_IP_VALUES.has(lowerValue) || lowerValue.startsWith("::ffff:127.")) {
    return "Adresse locale";
  }

  return normalized;
};

const getAuditDescription = (log: AuditLog): string =>
  log.description || log.actionLabel || log.action || "Aucune description";

const truncateDescription = (value: string, maxLength = 132): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const hasAuditSnapshot = (log: AuditLog): boolean =>
  Boolean(log.oldValue || log.newValue || log.userAgent);

const shouldShowAuditDetails = (log: AuditLog, description: string): boolean =>
  description.length > 132 || hasAuditSnapshot(log);

const getActionBadgeVariant = (action: string): BadgeVariant => {
  const normalized = action.toUpperCase();

  if (
    normalized.includes("DELETED") ||
    normalized.includes("SUPPRIM") ||
    normalized.includes("HARD")
  ) {
    return "danger";
  }
  if (normalized.includes("CREATED")) {
    return "success";
  }
  if (
    normalized.includes("LOGIN") ||
    normalized.includes("LOGOUT") ||
    normalized.includes("AUTH")
  ) {
    return "warning";
  }
  if (
    normalized.includes("UPDATED") ||
    normalized.includes("MODIFIED") ||
    normalized.includes("ASSIGNED") ||
    normalized.includes("STATUS")
  ) {
    return "info";
  }

  return "neutral";
};

const AuditLogPage: React.FC = () => {
  const { isAdmin, canAccessAuditLogs } = usePermissions();
  const navigate = useNavigate();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<AuditLogSearchParams>(DEFAULT_FILTERS);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!isAdmin || !canAccessAuditLogs) {
      navigate("/dashboard");
    }
  }, [isAdmin, canAccessAuditLogs, navigate]);

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

  const handleFilterChange = (key: keyof AuditLogSearchParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 0,
    }));
  };

  const handlePageChange = (nextPage: number) => {
    setFilters((prev) => ({ ...prev, page: nextPage }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-ds-border bg-ds-card px-3 text-sm text-ds-primary shadow-sm transition-all placeholder:text-ds-muted focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";
  const selectClass = inputClass;

  const currentPage = filters.page ?? 0;
  const pageSize = filters.size ?? 20;
  const startEntry = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const endEntry = Math.min(totalElements, (currentPage + 1) * pageSize);

  const activeFiltersCount = useMemo(() => {
    const filterValues = [
      filters.userId,
      filters.entityType,
      filters.action,
      filters.startDate,
      filters.endDate,
      filters.ipAddress,
      filters.entityId,
    ];

    return filterValues.reduce<number>((count, value) => {
      if (value === undefined || value === null || value === "") {
        return count;
      }
      return count + 1;
    }, 0);
  }, [filters]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) {
      return [];
    }

    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(0, currentPage - halfWindow);
    let end = Math.min(totalPages - 1, start + windowSize - 1);
    start = Math.max(0, end - windowSize + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [totalPages, currentPage]);

  if (!isAdmin) {
    return null;
  }

  if (loading && auditLogs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-52 animate-pulse rounded-lg bg-ds-elevated" />
        <Card padding="none">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex gap-4 border-b border-ds-border px-5 py-3 last:border-0"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-ds-elevated" />
              <div className="h-4 w-24 animate-pulse rounded bg-ds-elevated" />
              <div className="h-4 w-20 animate-pulse rounded bg-ds-elevated" />
              <div className="h-4 w-16 animate-pulse rounded bg-ds-elevated" />
              <div className="h-4 flex-1 animate-pulse rounded bg-ds-elevated" />
              <div className="h-4 w-24 animate-pulse rounded bg-ds-elevated" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ds-primary">
            <ShieldCheck className="h-7 w-7 text-primary-500" />
            Journal d'Audit
          </h1>
          <p className="mt-1 text-sm text-ds-muted">
            Traçabilité complète des actions système, utilisateur et sécurité.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-border bg-ds-surface px-2.5 py-1 text-ds-secondary">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-semibold text-ds-primary">{totalElements}</span>
            entrée{totalElements > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-border bg-ds-surface px-2.5 py-1 text-ds-secondary">
            Page <span className="font-semibold text-ds-primary">{currentPage + 1}</span> /{" "}
            <span className="font-semibold text-ds-primary">{Math.max(totalPages, 1)}</span>
          </span>
        </div>
      </div>

      <Card padding="md" className="space-y-3 border border-ds-border/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ds-muted" />
            <h2 className="text-sm font-semibold uppercase text-ds-primary">Filtres</h2>
            <span className="rounded-full border border-ds-border bg-ds-surface px-2 py-0.5 text-xs font-medium text-ds-muted">
              {activeFiltersCount} actif{activeFiltersCount > 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ds-border bg-ds-card px-2.5 py-1.5 text-xs font-medium text-ds-secondary transition-colors hover:bg-ds-surface hover:text-ds-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reinitialiser
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-semibold uppercase text-ds-muted">
            Type d'entite
            <select
              className={`${selectClass} mt-1.5`}
              value={filters.entityType || ""}
              onChange={(event) =>
                handleFilterChange("entityType", event.target.value || undefined)
              }
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            Action
            <input
              type="text"
              className={`${inputClass} mt-1.5`}
              placeholder="Ex. : TICKET_CREATED"
              value={filters.action || ""}
              onChange={(event) => handleFilterChange("action", event.target.value || undefined)}
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            Date début
            <input
              type="datetime-local"
              className={`${inputClass} mt-1.5`}
              value={filters.startDate || ""}
              onChange={(event) => handleFilterChange("startDate", event.target.value || undefined)}
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            Date fin
            <input
              type="datetime-local"
              className={`${inputClass} mt-1.5`}
              value={filters.endDate || ""}
              onChange={(event) => handleFilterChange("endDate", event.target.value || undefined)}
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            Adresse IP
            <input
              type="text"
              className={`${inputClass} mt-1.5`}
              placeholder="192.168.1.1"
              value={filters.ipAddress || ""}
              onChange={(event) => handleFilterChange("ipAddress", event.target.value || undefined)}
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            ID utilisateur
            <input
              type="number"
              className={`${inputClass} mt-1.5`}
              placeholder="Ex. : 12"
              value={filters.userId ?? ""}
              onChange={(event) =>
                handleFilterChange(
                  "userId",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            ID entite
            <input
              type="number"
              className={`${inputClass} mt-1.5`}
              placeholder="Ex. : 2026"
              value={filters.entityId ?? ""}
              onChange={(event) =>
                handleFilterChange(
                  "entityId",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-ds-muted">
            Lignes par page
            <select
              className={`${selectClass} mt-1.5`}
              value={filters.size}
              onChange={(event) => handleFilterChange("size", Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          <Info className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden border border-ds-border/80">
        <div className="overflow-x-auto">
          <table className="ds-table-raw w-full min-w-[1024px]">
            <thead className="bg-ds-elevated/70">
              <tr className="border-b border-ds-border">
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase text-ds-muted">
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Date
                  </div>
                </th>
                <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase text-ds-muted">
                  <div className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Utilisateur
                  </div>
                </th>
                <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase text-ds-muted">
                  Action
                </th>
                <th className="w-56 px-4 py-3 text-left text-xs font-semibold uppercase text-ds-muted">
                  <div className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Entité
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ds-muted">
                  Description
                </th>
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase text-ds-muted">
                  <div className="inline-flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    IP
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-border">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Inbox className="mx-auto mb-3 h-12 w-12 text-ds-muted/50" />
                    <p className="text-sm text-ds-muted">Aucun log d'audit trouvé</p>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const description = getAuditDescription(log);
                  const showDetails = shouldShowAuditDetails(log, description);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => handleRowClick(log)}
                      className="group cursor-pointer bg-ds-card/50 transition-colors hover:bg-ds-elevated/70"
                    >
                      <td className="px-4 py-2.5 align-top">
                        <time
                          dateTime={log.timestamp}
                          className="block whitespace-nowrap text-xs font-medium text-ds-secondary"
                        >
                          {formatDateTime(log.timestamp)}
                        </time>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        {log.systemAction ? (
                          <Badge variant="neutral" size="sm">
                            SYSTEM
                          </Badge>
                        ) : (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ds-primary">
                              {log.userName || "N/A"}
                            </p>
                            <p className="truncate text-xs text-ds-muted">
                              {log.userEmail || "N/A"}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.actionLabel || log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="space-y-1">
                          <Badge variant="neutral" size="sm">
                            {log.entityType}
                          </Badge>
                          <p className="text-xs text-ds-secondary">#{log.entityId}</p>
                          {log.entityName && (
                            <p className="truncate text-xs text-ds-muted" title={log.entityName}>
                              {log.entityName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="max-w-[32rem] space-y-1.5">
                          <p
                            className="break-words text-sm leading-5 text-ds-secondary"
                            title={description}
                          >
                            {truncateDescription(description)}
                          </p>
                          {showDetails && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRowClick(log);
                              }}
                              className="inline-flex items-center rounded-full border border-ds-border bg-ds-card px-2.5 py-1 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10"
                            >
                              Voir détails
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <code className="block break-all text-xs font-medium text-ds-muted">
                          {formatIpAddress(log.ipAddress)}
                        </code>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ds-border px-4 py-3">
            <p className="text-xs text-ds-muted">
              Affichage <span className="font-semibold text-ds-primary">{startEntry}</span>-
              <span className="font-semibold text-ds-primary">{endEntry}</span> sur{" "}
              <span className="font-semibold text-ds-primary">{totalElements}</span>
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="rounded-lg p-1.5 text-ds-muted transition-colors hover:bg-ds-elevated hover:text-ds-primary disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Page precedente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-medium transition-colors ${
                    currentPage === pageNumber
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-ds-muted hover:bg-ds-elevated hover:text-ds-primary"
                  }`}
                >
                  {pageNumber + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="rounded-lg p-1.5 text-ds-muted transition-colors hover:bg-ds-elevated hover:text-ds-primary disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        title={selectedLog ? `Détails audit #${selectedLog.id}` : ""}
        size="xl"
        contentClassName="max-h-[72vh] overflow-y-auto px-5 pb-5 pt-4"
      >
        {selectedLog && (
          <div className="space-y-4 pr-1">
            <section className="rounded-xl border border-ds-border bg-ds-surface/40 p-4">
              <h3 className="text-sm font-semibold text-ds-primary">Evenement</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-ds-muted">Horodatage</p>
                  <p className="mt-1 text-sm text-ds-primary">
                    {formatDateTime(selectedLog.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-ds-muted">Utilisateur</p>
                  {selectedLog.systemAction ? (
                    <div className="mt-1">
                      <Badge variant="neutral" size="sm">
                        SYSTEM
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <p className="text-sm font-medium text-ds-primary">
                        {selectedLog.userName || "N/A"}
                      </p>
                      <p className="text-xs text-ds-muted">{selectedLog.userEmail || "N/A"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-ds-muted">Action</p>
                  <div className="mt-1">
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} size="sm">
                      {selectedLog.actionLabel || selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-ds-muted">Entité</p>
                  <p className="mt-1 text-sm font-medium text-ds-primary">
                    {selectedLog.entityType}{" "}
                    <span className="text-ds-muted">#{selectedLog.entityId}</span>
                  </p>
                  {selectedLog.entityName && (
                    <p className="mt-0.5 break-words text-xs text-ds-muted">
                      {selectedLog.entityName}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-ds-border bg-ds-surface/40 p-4">
              <p className="text-[11px] font-semibold uppercase text-ds-muted">Description</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ds-primary">
                {selectedLog.description || "N/A"}
              </p>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-ds-border bg-ds-surface/35 p-4">
                <p className="text-[11px] font-semibold uppercase text-ds-muted">Ancienne valeur</p>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-ds-border bg-ds-card p-3 text-xs leading-5 text-ds-secondary whitespace-pre-wrap break-all">
                  {formatValue(selectedLog.oldValue)}
                </pre>
              </div>
              <div className="rounded-xl border border-ds-border bg-ds-surface/35 p-4">
                <p className="text-[11px] font-semibold uppercase text-ds-muted">Nouvelle valeur</p>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-ds-border bg-ds-card p-3 text-xs leading-5 text-ds-secondary whitespace-pre-wrap break-all">
                  {formatValue(selectedLog.newValue)}
                </pre>
              </div>
            </section>

            <section className="rounded-xl border border-ds-border bg-ds-surface/40 p-4">
              <h3 className="text-sm font-semibold text-ds-primary">Contexte technique</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-ds-muted">Adresse IP</p>
                  <code className="mt-1 block break-all text-xs text-ds-primary">
                    {formatIpAddress(selectedLog.ipAddress)}
                  </code>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-ds-muted">User-Agent</p>
                  <p className="mt-1 whitespace-pre-wrap break-all text-xs leading-5 text-ds-secondary">
                    {selectedLog.userAgent || "N/A"}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogPage;
