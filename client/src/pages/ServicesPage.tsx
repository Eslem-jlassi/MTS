// =============================================================================
// MTS TELECOM - Services Management
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Database,
  Edit2,
  FilterX,
  Globe,
  LayoutGrid,
  List,
  Plus,
  Power,
  RefreshCw,
  Search,
  Server,
  SlidersHorizontal,
  Trash2,
  Wifi,
  Wrench,
} from "lucide-react";
import { getErrorMessage } from "../api/client";
import { telecomServiceService } from "../api/telecomServiceService";
import PageHeader from "../components/layout/PageHeader";
import { Badge, Button, Card, ConfirmModal, EmptyState, Modal, Skeleton } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { usePermissions } from "../hooks/usePermissions";
import {
  CreateServiceRequest,
  ServiceCategory,
  ServiceStatus,
  ServiceStatusBgColors,
  ServiceStatusColors,
  ServiceStatusLabels,
  TelecomService,
} from "../types";

const safeStatus = (status: TelecomService["status"]): ServiceStatus =>
  (status as ServiceStatus) || ServiceStatus.UP;

const categoryConfig: Record<
  ServiceCategory,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  [ServiceCategory.BILLING]: {
    label: "Facturation",
    icon: <Database className="h-4 w-4" />,
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
  },
  [ServiceCategory.CRM]: {
    label: "CRM",
    icon: <Globe className="h-4 w-4" />,
    color: "text-primary-700 dark:text-primary-300",
    bgColor: "bg-primary-100 dark:bg-primary-900/40",
  },
  [ServiceCategory.NETWORK]: {
    label: "Réseau",
    icon: <Wifi className="h-4 w-4" />,
    color: "text-primary-700 dark:text-primary-300",
    bgColor: "bg-primary-100 dark:bg-primary-900/40",
  },
  [ServiceCategory.INFRA]: {
    label: "Infrastructure",
    icon: <Server className="h-4 w-4" />,
    color: "text-ds-primary",
    bgColor: "bg-ds-elevated",
  },
  [ServiceCategory.OTHER]: {
    label: "Autre",
    icon: <Server className="h-4 w-4" />,
    color: "text-ds-secondary",
    bgColor: "bg-ds-elevated",
  },
};

type ViewMode = "cards" | "table";
type FilterStatus = ServiceStatus | "ALL";

const statusOptions = Object.values(ServiceStatus);
const categoryOptions = Object.entries(categoryConfig) as Array<
  [ServiceCategory, (typeof categoryConfig)[ServiceCategory]]
>;

function renderStatusIcon(status: ServiceStatus): React.ReactNode {
  switch (status) {
    case ServiceStatus.UP:
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case ServiceStatus.DEGRADED:
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case ServiceStatus.DOWN:
      return <AlertCircle className="h-3.5 w-3.5" />;
    case ServiceStatus.MAINTENANCE:
      return <Wrench className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export default function ServicesPage() {
  const { canCreateService, canUpdateService, canUpdateServiceStatus, canDeleteService } =
    usePermissions();
  const toastCtx = useToast();

  const [services, setServices] = useState<TelecomService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedService, setSelectedService] = useState<TelecomService | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [createForm, setCreateForm] = useState<CreateServiceRequest>({
    name: "",
    category: ServiceCategory.OTHER,
    description: "",
  });
  const [editForm, setEditForm] = useState<{
    name: string;
    category: ServiceCategory;
    description: string;
  }>({ name: "", category: ServiceCategory.OTHER, description: "" });

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await telecomServiceService.getServices({ page: 0, size: 1000 });
      setServices(response.content ?? []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toastCtx.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toastCtx]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "ALL" || service.category === filterCategory;
      const status = safeStatus(service.status);
      const matchesStatus = filterStatus === "ALL" || status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, searchTerm, filterCategory, filterStatus]);

  const servicesByStatus = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        const status = safeStatus(service.status);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<ServiceStatus, number>,
    );
  }, [services]);

  const activeCount = useMemo(
    () => services.filter((service) => service.isActive).length,
    [services],
  );
  const inactiveCount = services.length - activeCount;
  const degradedOrDownCount =
    (servicesByStatus[ServiceStatus.DEGRADED] ?? 0) + (servicesByStatus[ServiceStatus.DOWN] ?? 0);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || filterCategory !== "ALL" || filterStatus !== "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("ALL");
    setFilterStatus("ALL");
  };

  const kpiCards = [
    {
      key: "total",
      label: "Total services",
      value: services.length,
      helper: `${filteredServices.length} visibles`,
      icon: <Server className="h-5 w-5 text-primary" />,
      iconShell: "bg-primary/10 dark:bg-primary/25",
      valueClass: "text-ds-primary",
    },
    {
      key: "up",
      label: "Opérationnels",
      value: servicesByStatus[ServiceStatus.UP] ?? 0,
      helper: "Services en état nominal",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-300" />,
      iconShell: "bg-green-100 dark:bg-green-900/35",
      valueClass: "text-green-600 dark:text-green-300",
    },
    {
      key: "alert",
      label: "Dégradés / panne",
      value: degradedOrDownCount,
      helper: "À prioriser en supervision",
      icon: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300" />,
      iconShell: "bg-red-100 dark:bg-red-900/35",
      valueClass: "text-red-600 dark:text-red-300",
    },
    {
      key: "active",
      label: "Actifs / Inactifs",
      value: `${activeCount} / ${inactiveCount}`,
      helper: "Activation métier",
      icon: <Power className="h-5 w-5 text-ds-secondary" />,
      iconShell: "bg-ds-elevated",
      valueClass: "text-ds-primary",
    },
  ];

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await telecomServiceService.createService(createForm);
      toastCtx.success("Service cree avec succes");
      setShowCreateModal(false);
      setCreateForm({ name: "", category: ServiceCategory.OTHER, description: "" });
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    }
  };

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedService) {
      return;
    }

    try {
      await telecomServiceService.updateService(selectedService.id, editForm);
      toastCtx.success("Service mis a jour avec succes");
      setShowEditModal(false);
      setSelectedService(null);
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    }
  };
  const handleDelete = async () => {
    if (!selectedService) {
      return;
    }

    setDeleteLoading(true);
    try {
      await telecomServiceService.deleteService(selectedService.id);
      toastCtx.success("Service supprime avec succes");
      setShowDeleteModal(false);
      setSelectedService(null);
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleServiceActive = async (service: TelecomService) => {
    try {
      if (service.isActive) {
        await telecomServiceService.deactivateService(service.id);
        toastCtx.success("Service desactive");
      } else {
        await telecomServiceService.activateService(service.id);
        toastCtx.success("Service active");
      }
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    }
  };

  const handleStatusChange = async (service: TelecomService, newStatus: ServiceStatus) => {
    if (safeStatus(service.status) === newStatus) {
      return;
    }

    setStatusUpdatingId(service.id);
    try {
      await telecomServiceService.updateServiceStatus(service.id, newStatus);
      toastCtx.success(`Statut mis a jour: ${ServiceStatusLabels[newStatus]}`);
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openEditModal = (service: TelecomService) => {
    setSelectedService(service);
    setEditForm({
      name: service.name,
      category: service.category,
      description: service.description || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (service: TelecomService) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-ds-border bg-ds-card px-3 text-sm text-ds-primary shadow-sm placeholder:text-ds-muted focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestion des services"
        description="Supervision des services télécom, de leur état opérationnel et des actions d'administration."
        icon={<Server size={20} />}
        actions={
          canCreateService ? (
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setShowCreateModal(true)}
            >
              Nouveau service
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <Card
            key={card.key}
            padding="md"
            className="border border-ds-border/80 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ds-muted">
                  {card.label}
                </p>
                <p className={`mt-1 text-2xl font-semibold tracking-tight ${card.valueClass}`}>
                  {card.value}
                </p>
                <p className="mt-1 truncate text-xs text-ds-muted">{card.helper}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.iconShell}`}>{card.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card padding="md" className="space-y-3 border border-ds-border/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label htmlFor="services-search" className="relative block w-full lg:max-w-xl">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ds-muted"
            />
            <input
              id="services-search"
              type="text"
              placeholder="Rechercher un service, un domaine ou une catégorie..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`${inputClass} pl-10`}
            />
          </label>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                icon={<FilterX size={16} />}
                onClick={clearFilters}
              >
                Réinitialiser
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchServices}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Actualiser
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-[620px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-ds-muted">
              Catégorie
              <select
                value={filterCategory}
                onChange={(event) =>
                  setFilterCategory(
                    event.target.value === "ALL" ? "ALL" : (event.target.value as ServiceCategory),
                  )
                }
                className={`${inputClass} mt-1.5`}
              >
                <option value="ALL">Toutes catégories</option>
                {categoryOptions.map(([category, config]) => (
                  <option key={category} value={category}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-ds-muted">
              Statut opérationnel
              <select
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(
                    event.target.value === "ALL" ? "ALL" : (event.target.value as ServiceStatus),
                  )
                }
                className={`${inputClass} mt-1.5`}
              >
                <option value="ALL">Tous les statuts</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {ServiceStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-ds-border bg-ds-surface/60 p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  viewMode === "cards"
                    ? "bg-primary text-white"
                    : "text-ds-secondary hover:bg-ds-elevated"
                }`}
                title="Vue cartes"
                aria-label="Vue cartes"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-white"
                    : "text-ds-secondary hover:bg-ds-elevated"
                }`}
                title="Vue tableau"
                aria-label="Vue tableau"
              >
                <List size={16} />
              </button>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-ds-border bg-ds-surface px-2.5 py-1 text-xs font-medium text-ds-secondary">
              <SlidersHorizontal size={13} />
              {filteredServices.length} / {services.length} services
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
                Filtres actifs
              </span>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Card key={item} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="38%" />
                </div>
                <Skeleton variant="circular" width={40} height={40} />
              </div>
              <Skeleton variant="text" width="100%" className="mt-4" />
              <Skeleton variant="text" width="80%" className="mt-2" />
              <Skeleton variant="text" width="70%" className="mt-4" />
            </Card>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={<Server className="h-12 w-12" />}
          title="Aucun service trouvé"
          description="Ajustez les filtres actifs ou créez un nouveau service."
          action={
            canCreateService ? (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Créer un service
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => {
            const category = categoryConfig[service.category];
            const status = safeStatus(service.status);

            return (
              <Card
                key={service.id}
                padding="md"
                className={`flex h-full flex-col border border-ds-border/80 transition-all duration-200 hover:shadow-md ${
                  !service.isActive ? "opacity-80" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.bgColor} ${category.color}`}
                    >
                      {category.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-ds-primary">
                        {service.name}
                      </h3>
                      <p className={`mt-0.5 text-xs font-medium ${category.color}`}>
                        {category.label}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ServiceStatusBgColors[status]} ${ServiceStatusColors[status]}`}
                  >
                    {renderStatusIcon(status)}
                    {ServiceStatusLabels[status]}
                  </span>
                </div>

                <p className="mt-3 min-h-[2.8rem] text-sm leading-relaxed text-ds-secondary">
                  {service.description || "Aucune description disponible."}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-ds-border bg-ds-surface/55 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ds-muted">
                      Tickets liés
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ds-primary">
                      {service.ticketCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ds-border bg-ds-surface/55 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ds-muted">
                      Activation
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ds-primary">
                      {service.isActive ? "Actif" : "Inactif"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ds-border pt-3">
                  <div className="flex items-center gap-2">
                    {canUpdateServiceStatus ? (
                      <select
                        value={status}
                        onChange={(event) =>
                          handleStatusChange(service, event.target.value as ServiceStatus)
                        }
                        disabled={statusUpdatingId === service.id}
                        className="h-9 min-w-[148px] rounded-lg border border-ds-border bg-ds-card px-2.5 text-xs font-medium text-ds-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {statusOptions.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {ServiceStatusLabels[statusOption]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        {ServiceStatusLabels[status]}
                      </Badge>
                    )}

                    {canUpdateService ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleServiceActive(service)}
                        icon={<Power size={14} />}
                      >
                        {service.isActive ? "Actif" : "Inactif"}
                      </Button>
                    ) : (
                      <Badge variant={service.isActive ? "success" : "neutral"} size="sm">
                        {service.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canUpdateService && (
                      <button
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 dark:text-primary-300 dark:hover:bg-primary/20"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {canDeleteService && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(service)}
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden border border-ds-border/80">
          <div className="overflow-x-auto">
            <table className="ds-table-raw w-full">
              <thead className="bg-ds-elevated/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    Activation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    Tickets
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border">
                {filteredServices.map((service) => {
                  const category = categoryConfig[service.category];
                  const status = safeStatus(service.status);

                  return (
                    <tr
                      key={service.id}
                      className={`transition-colors hover:bg-ds-elevated/70 ${
                        !service.isActive ? "opacity-80" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-[220px]">
                          <p className="font-medium text-ds-primary">{service.name}</p>
                          {service.description && (
                            <p className="max-w-sm truncate text-xs text-ds-muted">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm ${category.color}`}
                        >
                          {category.icon}
                          {category.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canUpdateServiceStatus ? (
                          <select
                            value={status}
                            onChange={(event) =>
                              handleStatusChange(service, event.target.value as ServiceStatus)
                            }
                            disabled={statusUpdatingId === service.id}
                            className="h-9 rounded-lg border border-ds-border bg-ds-card px-2.5 text-xs font-medium text-ds-primary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {statusOptions.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {ServiceStatusLabels[statusOption]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            {ServiceStatusLabels[status]}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canUpdateService ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleServiceActive(service)}
                            icon={<Power size={14} />}
                          >
                            {service.isActive ? "Actif" : "Inactif"}
                          </Button>
                        ) : (
                          <Badge variant={service.isActive ? "success" : "neutral"} size="sm">
                            {service.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ds-primary">
                        {service.ticketCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateService && (
                            <button
                              type="button"
                              onClick={() => openEditModal(service)}
                              className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 dark:text-primary-300 dark:hover:bg-primary/20"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteService && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(service)}
                              className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal
        isOpen={canCreateService && showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau service"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">
              Nom du service *
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              className={inputClass}
              placeholder="Ex: BSCS Billing System"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Catégorie *</label>
            <select
              required
              value={createForm.category}
              onChange={(event) =>
                setCreateForm({ ...createForm, category: event.target.value as ServiceCategory })
              }
              className={inputClass}
            >
              {categoryOptions.map(([category, config]) => (
                <option key={category} value={category}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Description</label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm({ ...createForm, description: event.target.value })
              }
              className={`${inputClass} h-auto py-2`}
              placeholder="Description du service..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" icon={<Check className="h-4 w-4" />}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={canUpdateService && showEditModal && !!selectedService}
        onClose={() => setShowEditModal(false)}
        title="Modifier le service"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Nom du service</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Catégorie</label>
            <select
              value={editForm.category}
              onChange={(event) =>
                setEditForm({ ...editForm, category: event.target.value as ServiceCategory })
              }
              className={inputClass}
            >
              {categoryOptions.map(([category, config]) => (
                <option key={category} value={category}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
              className={`${inputClass} h-auto py-2`}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" icon={<Check className="h-4 w-4" />}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={canDeleteService && showDeleteModal && !!selectedService}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Supprimer le service"
        message={
          <>
            <p>
              Voulez-vous vraiment supprimer le service{" "}
              <span className="font-semibold text-ds-primary">{selectedService?.name}</span> ?
            </p>
            <p className="mt-2 text-sm text-ds-secondary">
              Cette action est irréversible et peut impacter les tickets associés.
            </p>
          </>
        }
        confirmLabel="Supprimer"
        cancelLabel="Conserver"
        variant="danger"
        loading={deleteLoading}
        size="md"
      />
    </div>
  );
}
