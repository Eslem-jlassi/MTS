// =============================================================================
// MTS TELECOM - AuditLogPage (Admin Audit Logs Console)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import auditService from '../api/auditService';
import { AuditLog, AuditLogSearchParams } from '../types';
import { useNavigate } from 'react-router-dom';

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
    sortBy: 'timestamp',
    sortDir: 'DESC'
  });

  // Selected log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ==========================================================================
  // RBAC CHECK
  // ==========================================================================

  useEffect(() => {
    if (!isAdmin || !canAccessAuditLogs) {
      navigate('/dashboard');
    }
  }, [isAdmin, canAccessAuditLogs, navigate]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await auditService.searchAuditLogs(filters);
      setAuditLogs(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des logs d\'audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [filters, isAdmin]);

  // ==========================================================================
  // FILTER HANDLERS
  // ==========================================================================

  const handleFilterChange = (key: keyof AuditLogSearchParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 0 // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 0,
      size: 20,
      sortBy: 'timestamp',
      sortDir: 'DESC'
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
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getActionBadgeColor = (action: string): string => {
    if (action.includes('CREATED')) return 'success';
    if (action.includes('UPDATED')) return 'info';
    if (action.includes('DELETED')) return 'danger';
    if (action.includes('LOGIN')) return 'warning';
    return 'secondary';
  };

  const formatValue = (value: string | null): string => {
    if (!value) return '—';
    
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
    return null; // Redirected by useEffect
  }

  if (loading && auditLogs.length === 0) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement des logs d'audit...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">
            <i className="bi bi-shield-lock me-2"></i>
            Logs d'Audit
          </h1>
          <p className="text-muted mt-1">
            Traçabilité complète des actions sur le système (RGPD, ISO 27001)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <i className="bi bi-funnel me-2"></i>
            Filtres de Recherche
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {/* Entity Type */}
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Type d'Entité</label>
              <select
                className="form-select form-select-sm"
                value={filters.entityType || ''}
                onChange={(e) => handleFilterChange('entityType', e.target.value || undefined)}
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
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Date Début</label>
              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
              />
            </div>

            {/* End Date */}
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Date Fin</label>
              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
              />
            </div>

            {/* IP Address */}
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Adresse IP</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="192.168.1.1"
                value={filters.ipAddress || ''}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value || undefined)}
              />
            </div>

            {/* Reset Button */}
            <div className="col-12">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
              >
                <i className="bi bi-x-circle me-1"></i>
                Réinitialiser les Filtres
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <strong>{totalElements}</strong> entrée{totalElements > 1 ? 's' : ''} trouvée{totalElements > 1 ? 's' : ''}
        </div>
        <div>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filters.size}
            onChange={(e) => handleFilterChange('size', parseInt(e.target.value))}
          >
            <option value="10">10 par page</option>
            <option value="20">20 par page</option>
            <option value="50">50 par page</option>
            <option value="100">100 par page</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Audit Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover table-sm mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '150px' }}>Timestamp</th>
                <th style={{ width: '150px' }}>Utilisateur</th>
                <th style={{ width: '180px' }}>Action</th>
                <th style={{ width: '120px' }}>Entité</th>
                <th>Description</th>
                <th style={{ width: '120px' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Aucun log d'audit trouvé
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => handleRowClick(log)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="small">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="small">
                      {log.systemAction ? (
                        <span className="badge bg-secondary">SYSTEM</span>
                      ) : (
                        <span title={log.userEmail || undefined}>
                          {log.userName || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge bg-${getActionBadgeColor(log.action)}`}>
                        {log.actionLabel || log.action}
                      </span>
                    </td>
                    <td className="small">
                      <div>{log.entityType}</div>
                      <div className="text-muted">
                        #{log.entityId}
                        {log.entityName && (
                          <> — {log.entityName.substring(0, 20)}</>
                        )}
                      </div>
                    </td>
                    <td className="small">{log.description}</td>
                    <td className="small text-muted">{log.ipAddress || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer">
            <nav>
              <ul className="pagination pagination-sm mb-0 justify-content-center">
                <li className={`page-item ${filters.page === 0 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(filters.page! - 1)}
                    disabled={filters.page === 0}
                  >
                    Précédent
                  </button>
                </li>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = filters.page! < 3 ? i : filters.page! - 2 + i;
                  if (pageNum >= totalPages) return null;
                  return (
                    <li key={pageNum} className={`page-item ${filters.page === pageNum ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    </li>
                  );
                })}

                <li className={`page-item ${filters.page === totalPages - 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(filters.page! + 1)}
                    disabled={filters.page === totalPages - 1}
                  >
                    Suivant
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-info-circle me-2"></i>
                  Détails du Log d'Audit #{selectedLog.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseDetailModal}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <strong>Timestamp:</strong><br />
                    {formatTimestamp(selectedLog.timestamp)}
                  </div>
                  <div className="col-md-6">
                    <strong>Utilisateur:</strong><br />
                    {selectedLog.systemAction ? (
                      <span className="badge bg-secondary">SYSTEM</span>
                    ) : (
                      <>
                        {selectedLog.userName}<br />
                        <small className="text-muted">{selectedLog.userEmail}</small>
                      </>
                    )}
                  </div>
                  <div className="col-md-6">
                    <strong>Action:</strong><br />
                    <span className={`badge bg-${getActionBadgeColor(selectedLog.action)}`}>
                      {selectedLog.actionLabel || selectedLog.action}
                    </span>
                  </div>
                  <div className="col-md-6">
                    <strong>Entité:</strong><br />
                    {selectedLog.entityType} #{selectedLog.entityId}<br />
                    {selectedLog.entityName && (
                      <small className="text-muted">{selectedLog.entityName}</small>
                    )}
                  </div>
                  <div className="col-12">
                    <strong>Description:</strong><br />
                    {selectedLog.description}
                  </div>
                  {selectedLog.oldValue && (
                    <div className="col-12">
                      <strong>Ancienne Valeur:</strong>
                      <pre className="bg-light p-2 rounded mt-1 small">
                        {formatValue(selectedLog.oldValue)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValue && (
                    <div className="col-12">
                      <strong>Nouvelle Valeur:</strong>
                      <pre className="bg-light p-2 rounded mt-1 small">
                        {formatValue(selectedLog.newValue)}
                      </pre>
                    </div>
                  )}
                  <div className="col-md-6">
                    <strong>Adresse IP:</strong><br />
                    {selectedLog.ipAddress || '—'}
                  </div>
                  <div className="col-md-6">
                    <strong>User-Agent:</strong><br />
                    <small className="text-muted">
                      {selectedLog.userAgent || '—'}
                    </small>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDetailModal}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
