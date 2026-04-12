/**
 * Health Monitoring - Supervision des services (état, disponibilité, alertes)
 */
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";
import { telecomServiceService } from "../api/telecomServiceService";
import { incidentService } from "../api/incidentService";
import PageHeader from "../components/layout/PageHeader";
import { Card, Button, EmptyState, Badge } from "../components/ui";
import type { TelecomService, Incident, ServiceStatusHistoryEntry } from "../types";
import {
  ServiceStatus,
  ServiceStatusLabels,
  ServiceStatusColors,
  ServiceStatusBgColors,
  CriticalityLabels,
  SeverityLabels,
} from "../types";
import { formatDateTime, formatDurationMinutes, formatPercent } from "../utils/formatters";

const statusIcon: Record<ServiceStatus, React.ReactNode> = {
  [ServiceStatus.UP]: <CheckCircle2 size={20} />,
  [ServiceStatus.DEGRADED]: <AlertTriangle size={20} />,
  [ServiceStatus.DOWN]: <XCircle size={20} />,
  [ServiceStatus.MAINTENANCE]: <Wrench size={20} />,
};

const statusCardConfig: Record<
  ServiceStatus,
  { label: string; borderColor: string; bgColor: string; iconBg: string; iconColor: string }
> = {
  [ServiceStatus.UP]: {
    label: "Opérationnels",
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-500/5",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  [ServiceStatus.DEGRADED]: {
    label: "Dégradés",
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/5",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  [ServiceStatus.DOWN]: {
    label: "En panne",
    borderColor: "border-l-red-500",
    bgColor: "bg-red-500/5",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-600 dark:text-red-400",
  },
  [ServiceStatus.MAINTENANCE]: {
    label: "Maintenance",
    borderColor: "border-l-slate-400",
    bgColor: "bg-slate-500/5",
    iconBg: "bg-slate-500/20",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
};

const HealthMonitoringPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<TelecomService[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Service detail panel
  const [selectedService, setSelectedService] = useState<TelecomService | null>(null);
  const [statusHistory, setStatusHistory] = useState<ServiceStatusHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([telecomServiceService.getHealthDashboard(), incidentService.getActive()])
      .then(([svcList, incList]) => {
        setServices(svcList);
        setActiveIncidents(incList);
      })
      .catch((e) => setError(e.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectService = useCallback(
    async (svc: TelecomService) => {
      const params = new URLSearchParams(searchParams);
      params.set("serviceId", String(svc.id));
      setSearchParams(params, { replace: true });
      setSelectedService(svc);
      setLoadingHistory(true);
      try {
        const history = await telecomServiceService.getRecentStatusHistory(svc.id, 30);
        setStatusHistory(history);
      } catch {
        setStatusHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const requestedServiceId = Number(searchParams.get("serviceId"));
    if (Number.isNaN(requestedServiceId) || requestedServiceId <= 0 || services.length === 0) {
      return;
    }

    const requestedService = services.find((service) => service.id === requestedServiceId);
    if (!requestedService || selectedService?.id === requestedService.id) {
      return;
    }

    void selectService(requestedService);
  }, [searchParams, selectService, services, selectedService?.id]);

  const byStatus = React.useMemo(() => {
    const m: Record<ServiceStatus, number> = {
      [ServiceStatus.UP]: 0,
      [ServiceStatus.DEGRADED]: 0,
      [ServiceStatus.DOWN]: 0,
      [ServiceStatus.MAINTENANCE]: 0,
    };
    services.forEach((s) => {
      const st = (s.status as ServiceStatus) || ServiceStatus.UP;
      if (m[st] !== undefined) m[st]++;
    });
    return m;
  }, [services]);

  // Overall health score
  const healthPct = React.useMemo(() => {
    if (services.length === 0) return 100;
    const upCount = byStatus[ServiceStatus.UP] + byStatus[ServiceStatus.MAINTENANCE];
    return Math.round((upCount / services.length) * 100);
  }, [services, byStatus]);

  if (loading && services.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Health Monitoring" description="Chargement…" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="md" className="animate-pulse h-24 bg-ds-elevated">
              <span className="sr-only">Chargement</span>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-12 h-12" />}
        title="Erreur"
        description={error}
        action={
          <Button variant="primary" onClick={load} icon={<RefreshCw size={18} />}>
            Réessayer
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Monitoring"
        description="État des services et disponibilité en temps réel."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              disabled={loading}
              icon={<RefreshCw size={18} />}
            >
              Actualiser
            </Button>
            <Link to="/services">
              <Button variant="primary" size="sm" icon={<Server size={18} />}>
                Gérer les services
              </Button>
            </Link>
          </>
        }
      />

      {/* Overall health + KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Overall health */}
        <Card padding="md" className="border-l-4 border-l-primary bg-primary/5 col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-xs text-ds-secondary uppercase tracking-wider">Santé globale</p>
              <p className="text-2xl font-bold text-ds-primary">{formatPercent(healthPct)}</p>
            </div>
          </div>
        </Card>
        {/* Status cards */}
        {(
          [
            ServiceStatus.UP,
            ServiceStatus.DEGRADED,
            ServiceStatus.DOWN,
            ServiceStatus.MAINTENANCE,
          ] as ServiceStatus[]
        ).map((st) => {
          const config = statusCardConfig[st];
          return (
            <Card
              key={st}
              padding="md"
              className={`border-l-4 ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${config.iconBg} ${config.iconColor}`}>
                  {statusIcon[st]}
                </div>
                <div>
                  <p className="text-xs text-ds-secondary uppercase tracking-wider">
                    {config.label}
                  </p>
                  <p className="text-2xl font-bold text-ds-primary">{byStatus[st]}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Active incidents banner */}
      {activeIncidents.length > 0 && (
        <Card
          padding="md"
          className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              <span className="font-semibold text-red-700 dark:text-red-400">
                {activeIncidents.length} incident{activeIncidents.length > 1 ? "s" : ""} actif
                {activeIncidents.length > 1 ? "s" : ""}
              </span>
            </div>
            <Link
              to="/incidents"
              className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1"
            >
              Voir les incidents <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="mt-2 space-y-1">
            {activeIncidents.slice(0, 5).map((inc) => (
              <li key={inc.id} className="text-sm text-ds-secondary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <Link to={`/incidents/${inc.id}`} className="hover:text-primary truncate">
                  {inc.incidentNumber && (
                    <span className="font-mono text-xs mr-1">{inc.incidentNumber}</span>
                  )}
                  {inc.title}
                  <span className="text-ds-muted ml-1">({SeverityLabels[inc.severity]})</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service list */}
        <div className="lg:col-span-2">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-ds-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ds-primary flex items-center gap-2">
                <Activity size={20} className="text-primary" />
                État des services ({services.length})
              </h3>
              <Link
                to="/services"
                className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1"
              >
                Voir tout <ArrowRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="ds-table-raw w-full">
                <thead className="bg-ds-elevated">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
                      Criticité
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-ds-muted uppercase tracking-wider">
                      Dispo.
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-ds-muted uppercase tracking-wider">
                      Incidents
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-border">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 sm:px-6 py-12 text-center text-ds-muted">
                        Aucun service configuré.
                      </td>
                    </tr>
                  ) : (
                    services.map((s) => {
                      const st = (s.status as ServiceStatus) || ServiceStatus.UP;
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-ds-elevated/50 transition-colors cursor-pointer ${selectedService?.id === s.id ? "bg-primary/5" : ""}`}
                          onClick={() => selectService(s)}
                        >
                          <td className="px-4 sm:px-6 py-4">
                            <div>
                              <p className="font-medium text-ds-primary">{s.name}</p>
                              <p className="text-xs text-ds-muted">
                                {s.categoryLabel ?? s.category}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium border ${ServiceStatusBgColors[st]} ${ServiceStatusColors[st]}`}
                            >
                              {statusIcon[st]}
                              {ServiceStatusLabels[st]}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-ds-secondary">
                            {s.criticality
                              ? (s.criticalityLabel ?? CriticalityLabels[s.criticality])
                              : "—"}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            {s.availabilityPct != null ? (
                              <span
                                className={`text-sm font-medium ${s.availabilityPct >= 99 ? "text-green-600 dark:text-green-400" : s.availabilityPct >= 95 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {formatPercent(s.availabilityPct)}
                              </span>
                            ) : (
                              <span className="text-sm text-ds-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            {(s.activeIncidentCount ?? 0) > 0 ? (
                              <Badge variant="danger">{s.activeIncidentCount}</Badge>
                            ) : (
                              <span className="text-sm text-ds-muted">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Service detail panel (right sidebar) */}
        <div className="space-y-6">
          {selectedService ? (
            <>
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ds-primary">
                      {selectedService.name}
                    </h3>
                    <p className="text-sm text-ds-muted">
                      {selectedService.categoryLabel ?? selectedService.category}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${ServiceStatusBgColors[(selectedService.status as ServiceStatus) || ServiceStatus.UP]} ${ServiceStatusColors[(selectedService.status as ServiceStatus) || ServiceStatus.UP]}`}
                  >
                    {statusIcon[(selectedService.status as ServiceStatus) || ServiceStatus.UP]}
                    {
                      ServiceStatusLabels[
                        (selectedService.status as ServiceStatus) || ServiceStatus.UP
                      ]
                    }
                  </span>
                </div>
                {selectedService.description && (
                  <p className="text-sm text-ds-secondary mb-4">{selectedService.description}</p>
                )}
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {selectedService.ownerName && (
                    <div>
                      <dt className="text-ds-muted">Responsable</dt>
                      <dd className="font-medium text-ds-primary">{selectedService.ownerName}</dd>
                    </div>
                  )}
                  {selectedService.criticality && (
                    <div>
                      <dt className="text-ds-muted">Criticité</dt>
                      <dd className="font-medium text-ds-primary">
                        {selectedService.criticalityLabel ??
                          CriticalityLabels[selectedService.criticality]}
                      </dd>
                    </div>
                  )}
                  {selectedService.slaPolicyName && (
                    <div>
                      <dt className="text-ds-muted">Politique SLA</dt>
                      <dd className="font-medium text-ds-primary">
                        {selectedService.slaPolicyName}
                      </dd>
                    </div>
                  )}
                  {selectedService.availabilityPct != null && (
                    <div>
                      <dt className="text-ds-muted flex items-center gap-1">
                        <TrendingUp size={12} /> Disponibilite
                      </dt>
                      <dd className="font-medium text-ds-primary">
                        {formatPercent(selectedService.availabilityPct, {
                          maximumFractionDigits: 2,
                        })}
                      </dd>
                    </div>
                  )}
                  {selectedService.avgLatencyMs != null && (
                    <div>
                      <dt className="text-ds-muted">Latence moy.</dt>
                      <dd className="font-medium text-ds-primary">
                        {selectedService.avgLatencyMs} ms
                      </dd>
                    </div>
                  )}
                  {selectedService.mttrMinutes != null && (
                    <div>
                      <dt className="text-ds-muted">MTTR</dt>
                      <dd className="font-medium text-ds-primary">
                        {formatDurationMinutes(selectedService.mttrMinutes)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-ds-muted">Tickets</dt>
                    <dd className="font-medium text-ds-primary">
                      {selectedService.ticketCount ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ds-muted">Incidents actifs</dt>
                    <dd className="font-medium text-ds-primary">
                      {selectedService.activeIncidentCount ?? 0}
                    </dd>
                  </div>
                </dl>
              </Card>

              {/* Status history timeline */}
              <Card>
                <h3 className="text-sm font-semibold text-ds-primary mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  Historique des statuts (30j)
                </h3>
                {loadingHistory ? (
                  <p className="text-sm text-ds-muted py-4 text-center">Chargement…</p>
                ) : statusHistory.length === 0 ? (
                  <p className="text-sm text-ds-muted italic">Aucun changement de statut récent.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-ds-border" />
                    <ul className="space-y-3">
                      {statusHistory.slice(0, 20).map((entry) => (
                        <li key={entry.id} className="relative pl-8">
                          <div className="absolute left-1 top-1 w-5 h-5 rounded-full bg-ds-elevated border-2 border-ds-border flex items-center justify-center">
                            <Activity size={10} className="text-ds-muted" />
                          </div>
                          <div>
                            <p className="text-sm text-ds-primary">
                              <span
                                className={`font-medium ${ServiceStatusColors[entry.oldStatus as ServiceStatus] ?? ""}`}
                              >
                                {entry.oldStatusLabel ?? entry.oldStatus}
                              </span>
                              {" → "}
                              <span
                                className={`font-medium ${ServiceStatusColors[entry.newStatus as ServiceStatus] ?? ""}`}
                              >
                                {entry.newStatusLabel ?? entry.newStatus}
                              </span>
                            </p>
                            {entry.reason && (
                              <p className="text-xs text-ds-secondary mt-0.5">{entry.reason}</p>
                            )}
                            <p className="text-xs text-ds-muted mt-0.5">
                              {entry.changedByName && `${entry.changedByName} — `}
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="text-center py-12">
              <Server size={48} className="mx-auto text-ds-muted mb-3" />
              <p className="text-ds-secondary text-sm">
                Cliquez sur un service pour voir ses détails et son historique.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthMonitoringPage;
