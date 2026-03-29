// =============================================================================
// MTS TELECOM - Incidents (ITSM) - Supervision des incidents liés aux services télécom
// =============================================================================

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Plus, RefreshCw, Filter, ChevronUp, Shield, Activity, Trash2 } from "lucide-react";
import { incidentService } from "../api/incidentService";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../context/ToastContext";
import type { Incident } from "../types";
import {
  IncidentStatusLabels,
  SeverityLabels,
  ImpactLabels,
  IncidentStatus,
  Severity,
} from "../types";
import { Card, Button, EmptyState, ErrorState, Badge, ConfirmModal } from "../components/ui";

function formatDate(s: string | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const severityBadgeVariant: Record<Severity, "danger" | "warning" | "neutral" | "success"> = {
  [Severity.CRITICAL]: "danger",
  [Severity.MAJOR]: "warning",
  [Severity.MINOR]: "neutral",
  [Severity.LOW]: "success",
};

const statusBadgeVariant: Record<IncidentStatus, "danger" | "warning" | "success" | "neutral"> = {
  [IncidentStatus.OPEN]: "danger",
  [IncidentStatus.IN_PROGRESS]: "warning",
  [IncidentStatus.RESOLVED]: "success",
  [IncidentStatus.CLOSED]: "neutral",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "">("");

  const { canDeleteIncident } = usePermissions();
  const toast = useToast();
  
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!incidentToDelete) return;
    setIsDeleting(true);
    try {
      await incidentService.hardDeleteIncident(incidentToDelete.id);
      toast.success(`Incident ${incidentToDelete.incidentNumber} supprimé définitivement`);
      setIncidentToDelete(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const load = () => {
    setLoading(true);
    setError(null);
    incidentService
      .getAll()
      .then(setIncidents)
      .catch((err) => {
        console.error("Failed to load incidents:", err);
        setError("Impossible de charger les incidents.");
        setIncidents([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = incidents;
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (severityFilter) list = list.filter((i) => i.severity === severityFilter);
    return list;
  }, [incidents, statusFilter, severityFilter]);

  const activeCount = useMemo(
    () =>
      incidents.filter(
        (i) => i.status === IncidentStatus.OPEN || i.status === IncidentStatus.IN_PROGRESS,
      ).length,
    [incidents],
  );
  const criticalCount = useMemo(
    () => incidents.filter((i) => i.severity === Severity.CRITICAL).length,
    [incidents],
  );
  const resolvedCount = useMemo(
    () => incidents.filter((i) => i.status === IncidentStatus.RESOLVED).length,
    [incidents],
  );
  const withPostMortem = useMemo(
    () => incidents.filter((i) => i.hasPostMortem).length,
    [incidents],
  );

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!incidentToDelete}
        onClose={() => setIncidentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer définitivement l'incident ?"
        message={
          incidentToDelete ? (
            <>
              <p>Vous êtes sur le point de supprimer définitivement l'incident <strong>{incidentToDelete.incidentNumber}</strong>.</p>
              <p className="mt-2 text-sm">Cette action est <strong>irréversible</strong> et supprimera également toutes les notes et relations associées (les tickets liés seront conservés mais détachés).</p>
            </>
          ) : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={isDeleting}
        confirmationKeyword="SUPPRIMER"
        confirmationHint="Tapez SUPPRIMER pour confirmer."
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ds-primary">Incidents</h1>
          <p className="text-sm text-ds-secondary mt-0.5">
            Supervision des incidents liés aux services télécom
          </p>
        </div>
        <Link to="/incidents/new">
          <Button variant="primary" icon={<Plus size={18} />} iconPosition="left">
            Nouvel incident
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="border-l-4 border-l-red-500 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs text-ds-secondary uppercase tracking-wider">Actifs</p>
              <p className="text-2xl font-bold text-ds-primary">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="border-l-4 border-l-orange-500 bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs text-ds-secondary uppercase tracking-wider">Critiques</p>
              <p className="text-2xl font-bold text-ds-primary">{criticalCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="border-l-4 border-l-green-500 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/20 text-green-600 dark:text-green-400">
              <ChevronUp size={20} />
            </div>
            <div>
              <p className="text-xs text-ds-secondary uppercase tracking-wider">Résolus</p>
              <p className="text-2xl font-bold text-ds-primary">{resolvedCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="border-l-4 border-l-blue-500 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs text-ds-secondary uppercase tracking-wider">Post-mortem</p>
              <p className="text-2xl font-bold text-ds-primary">{withPostMortem}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et Actualiser */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ds-primary">
          <Filter size={18} /> Filtres
        </span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter((e.target.value || "") as IncidentStatus | "")}
          className="rounded-lg border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/25"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(IncidentStatus) as IncidentStatus[]).map((s) => (
            <option key={s} value={s}>
              {IncidentStatusLabels[s]}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter((e.target.value || "") as Severity | "")}
          className="rounded-lg border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/25"
        >
          <option value="">Toutes gravités</option>
          {(Object.keys(Severity) as Severity[]).map((s) => (
            <option key={s} value={s}>
              {SeverityLabels[s]}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          icon={<RefreshCw size={18} />}
          iconPosition="left"
          onClick={load}
          disabled={loading}
        >
          Actualiser
        </Button>
      </div>

      {/* Tableau des incidents */}
      <Card padding="none" className="overflow-hidden">
        {loading && incidents.length === 0 ? (
          <div className="py-12 text-center text-ds-secondary">Chargement…</div>
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="text-ds-muted" size={48} />}
            title="Aucun incident"
            description="Aucun incident ne correspond aux filtres ou les incidents de supervision apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ds-elevated">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                    N° / Titre
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                    Gravité
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                    Impact
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                    Début
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-ds-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border">
                {filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-ds-elevated/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        {inc.incidentNumber && (
                          <span className="text-xs font-mono text-ds-muted">
                            {inc.incidentNumber}
                          </span>
                        )}
                        <p className="font-medium text-ds-primary">{inc.title}</p>
                        <p className="text-sm text-ds-secondary">
                          {inc.serviceName ?? `Service #${inc.serviceId}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <Badge variant={severityBadgeVariant[inc.severity]}>
                        {SeverityLabels[inc.severity]}
                      </Badge>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-ds-secondary">
                      {inc.impact ? (inc.impactLabel ?? ImpactLabels[inc.impact]) : "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <Badge variant={statusBadgeVariant[inc.status]}>
                        {IncidentStatusLabels[inc.status]}
                      </Badge>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      {inc.ticketNumbers && inc.ticketNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {inc.ticketNumbers.slice(0, 3).map((num, idx) => (
                            <Link
                              key={idx}
                              to={`/tickets/${inc.ticketIds?.[idx]}`}
                              className="text-primary hover:underline text-xs"
                            >
                              {num}
                            </Link>
                          ))}
                          {inc.ticketNumbers.length > 3 && (
                            <span className="text-xs text-ds-muted">
                              +{inc.ticketNumbers.length - 3}
                            </span>
                          )}
                        </div>
                      ) : inc.ticketNumber ? (
                        <Link
                          to={`/tickets/${inc.ticketId}`}
                          className="text-primary hover:underline text-xs"
                        >
                          {inc.ticketNumber}
                        </Link>
                      ) : (
                        <span className="text-ds-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-ds-secondary">
                      {formatDate(inc.startedAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="text-sm font-medium text-primary hover:text-primary-hover"
                        >
                          Voir
                        </Link>
                        {canDeleteIncident && (
                          <button
                            onClick={() => setIncidentToDelete(inc)}
                            className="text-error-600 hover:text-error-700 p-1 rounded-lg hover:bg-ds-elevated transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
