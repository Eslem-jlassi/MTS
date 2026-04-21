// =============================================================================
// MTS TELECOM - Incidents (ITSM) - Supervision des incidents liés aux services télécom
// =============================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Plus,
  RefreshCw,
  Filter,
  ChevronUp,
  Shield,
  Activity,
  Trash2,
} from "lucide-react";
import { getErrorMessage } from "../api/client";
import { incidentService } from "../api/incidentService";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../context/ToastContext";
import type { Incident, UserRole } from "../types";
import {
  IncidentStatusLabels,
  SeverityLabels,
  ImpactLabels,
  IncidentStatus,
  Severity,
} from "../types";
import { Card, Button, EmptyState, ErrorState, Badge, ConfirmModal } from "../components/ui";
import { isManagerCopilotAllowedRole } from "../components/manager-copilot/managerCopilotUi";
import { formatDateTime } from "../utils/formatters";
import { getAdminHardDeleteErrorMessage } from "../utils/hardDeleteFeedback";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

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
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { canDeleteIncident } = usePermissions();
  const toast = useToast();

  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteVerificationCode, setDeleteVerificationCode] = useState("");
  const [isSendingDeleteCode, setIsSendingDeleteCode] = useState(false);

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === ("ADMIN" as UserRole);
  const isOauthAdmin = Boolean(isAdmin && currentUser?.oauthProvider);
  const isManagerCopilotContext = isManagerCopilotAllowedRole(currentUser?.role);
  const getIncidentHardDeleteIdentifier = (incident: Incident) =>
    incident.incidentNumber?.trim() || "";
  const isIncidentHardDeleteReauthValid = isOauthAdmin
    ? deleteVerificationCode.trim().length > 0
    : deletePassword.trim().length > 0;
  const isIncidentHardDeleteFormInvalid =
    !incidentToDelete || !isIncidentHardDeleteReauthValid;

  const handleDeleteConfirm = async () => {
    if (!incidentToDelete) return;

    const providedIncidentIdentifier =
      getIncidentHardDeleteIdentifier(incidentToDelete) || String(incidentToDelete.id);

    if (!isOauthAdmin && !deletePassword.trim()) {
      toast.error("Saisissez votre mot de passe administrateur pour confirmer.");
      return;
    }

    if (isOauthAdmin && !deleteVerificationCode.trim()) {
      toast.error("Saisissez le code de verification recu par email.");
      return;
    }

    setIsDeleting(true);
    try {
      await incidentService.hardDeleteIncident(incidentToDelete.id, {
        confirmationKeyword: "SUPPRIMER",
        confirmationTargetId: providedIncidentIdentifier,
        currentPassword: isOauthAdmin ? undefined : deletePassword,
        verificationCode: isOauthAdmin ? deleteVerificationCode : undefined,
      });
      toast.success(`Incident ${incidentToDelete.incidentNumber} supprime definitivement`);
      setIncidentToDelete(null);
      load();
    } catch (err: any) {
      toast.error(
        getAdminHardDeleteErrorMessage(
          "incident",
          err,
          "Suppression definitive impossible pour cet incident.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRequestDeleteChallenge = async () => {
    if (!incidentToDelete) return;

    setIsSendingDeleteCode(true);
    try {
      await incidentService.requestHardDeleteChallenge(incidentToDelete.id);
      toast.success("Un code de verification a ete envoye sur votre email administrateur.");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail || err?.response?.data?.message || "Envoi du code impossible",
      );
    } finally {
      setIsSendingDeleteCode(false);
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

  useEffect(() => {
    const nextStatus = searchParams.get("status") as IncidentStatus | null;
    const nextSeverity = searchParams.get("severity") as Severity | null;
    setStatusFilter(
      nextStatus && Object.values(IncidentStatus).includes(nextStatus) ? nextStatus : "",
    );
    setSeverityFilter(
      nextSeverity && Object.values(Severity).includes(nextSeverity) ? nextSeverity : "",
    );
  }, [searchParams]);

  useEffect(() => {
    if (incidentToDelete) {
      setDeletePassword("");
      setDeleteVerificationCode("");
      return;
    }

    setDeletePassword("");
    setDeleteVerificationCode("");
  }, [incidentToDelete]);

  const routeServiceFilter = useMemo(() => {
    const rawValue = searchParams.get("serviceId");
    if (!rawValue) {
      return undefined;
    }

    const value = Number(rawValue);
    return Number.isNaN(value) ? undefined : value;
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = incidents;
    if (routeServiceFilter != null) {
      list = list.filter(
        (incident) =>
          incident.serviceId === routeServiceFilter ||
          incident.affectedServiceIds?.includes(routeServiceFilter),
      );
    }
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (severityFilter) list = list.filter((i) => i.severity === severityFilter);
    return list;
  }, [incidents, routeServiceFilter, statusFilter, severityFilter]);
  const activeFiltersSummary = useMemo(() => {
    const items: string[] = [];
    if (routeServiceFilter != null) items.push(`Service #${routeServiceFilter}`);
    if (statusFilter) items.push(`Statut: ${IncidentStatusLabels[statusFilter]}`);
    if (severityFilter) items.push(`Gravite: ${SeverityLabels[severityFilter]}`);
    return items;
  }, [routeServiceFilter, severityFilter, statusFilter]);

  const updateSearchFilter = useCallback(
    (key: "status" | "severity", value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

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
        title="Supprimer definitivement l'incident ?"
        message={
          incidentToDelete ? (
            <>
              <p>
                Vous etes sur le point de supprimer definitivement l'incident{" "}
                <strong>{incidentToDelete.incidentNumber}</strong>.
              </p>
              <p className="mt-2 text-sm">
                Cette action est <strong>irreversible</strong> et supprimera egalement les notes,
                le suivi et les relations associees. Les tickets lies seront conserves mais
                detaches proprement.
              </p>
              <div className="mt-3 space-y-3 rounded-xl border border-ds-border bg-ds-surface/70 p-3 text-left">
                <p className="rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-xs text-ds-secondary">
                  Reference affichee pour controle :{" "}
                  <span className="font-semibold text-ds-primary">
                    {getIncidentHardDeleteIdentifier(incidentToDelete) ||
                      `ID ${incidentToDelete.id}`}
                  </span>
                </p>

                {isOauthAdmin ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ds-muted">
                      Code de verification email
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={deleteVerificationCode}
                        onChange={(event) => setDeleteVerificationCode(event.target.value)}
                        className="w-full rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-sm text-ds-primary"
                        placeholder="Code a 6 chiffres"
                        autoComplete="one-time-code"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRequestDeleteChallenge}
                        disabled={isSendingDeleteCode || isDeleting}
                      >
                        {isSendingDeleteCode ? "Envoi..." : "Envoyer un code"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ds-muted">
                      Mot de passe administrateur
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      className="w-full rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-sm text-ds-primary"
                      placeholder="Confirmez avec votre mot de passe"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Supprimer definitivement"
        cancelLabel="Annuler"
        variant="danger"
        loading={isDeleting}
        confirmDisabled={isIncidentHardDeleteFormInvalid}
        confirmationKeyword="SUPPRIMER"
        confirmationHint="Tapez SUPPRIMER, puis confirmez votre re-authentification administrateur."
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ds-primary">Incidents</h1>
          <p className="text-sm text-ds-secondary mt-0.5">
            Supervision des incidents liés aux services télécom
          </p>
          {routeServiceFilter != null && (
            <p className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-300">
              {isManagerCopilotContext
                ? `Filtre ALLIE actif sur le service #${routeServiceFilter}`
                : `Filtre de service actif sur le service #${routeServiceFilter}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showFilters ? "primary" : "outline"}
            icon={<Filter size={18} />}
            iconPosition="left"
            onClick={() => setShowFilters((current) => !current)}
          >
            {activeFiltersSummary.length > 0
              ? `Filtres (${activeFiltersSummary.length})`
              : "Filtres"}
          </Button>
          <Button
            variant="outline"
            icon={<RefreshCw size={18} />}
            iconPosition="left"
            onClick={load}
            disabled={loading}
          >
            Actualiser
          </Button>
          <Link to="/incidents/new">
            <Button variant="primary" icon={<Plus size={18} />} iconPosition="left">
              Nouvel incident
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="border border-ds-border/80 bg-ds-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
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
        <Card padding="md" className="border border-ds-border/80 bg-ds-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
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
        <Card padding="md" className="border border-ds-border/80 bg-ds-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
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
        <Card padding="md" className="border border-ds-border/80 bg-ds-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
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

      {!showFilters && activeFiltersSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFiltersSummary.map((item) => (
            <span
              key={item}
              className="inline-flex min-h-8 items-center rounded-full border border-ds-border bg-ds-elevated px-3 py-1 text-xs font-medium text-ds-secondary"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Filtres */}
      {showFilters && (
        <Card padding="md" className="border border-ds-border/80">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-ds-primary">
              <Filter size={18} /> Filtres
            </span>
            <select
              value={statusFilter}
              onChange={(e) => updateSearchFilter("status", e.target.value)}
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
              onChange={(e) => updateSearchFilter("severity", e.target.value)}
              className="rounded-lg border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/25"
            >
              <option value="">Toutes gravités</option>
              {(Object.keys(Severity) as Severity[]).map((s) => (
                <option key={s} value={s}>
                  {SeverityLabels[s]}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Tableau des incidents */}
      <Card padding="none" className="overflow-hidden border border-ds-border/80">
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
            <table className="ds-table-raw w-full">
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
                      {formatDateTime(inc.startedAt)}
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
