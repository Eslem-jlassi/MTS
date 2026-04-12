// =============================================================================
// MTS TELECOM - Services Management (refactor: design system, cards+table, statuts)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Server,
  Wifi,
  Globe,
  Database,
  RefreshCw,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Power,
  LayoutGrid,
  List,
} from "lucide-react";
import { telecomServiceService } from "../api/telecomServiceService";
import {
  TelecomService,
  ServiceCategory,
  ServiceStatus,
  CreateServiceRequest,
  ServiceStatusLabels,
  ServiceStatusColors,
  ServiceStatusBgColors,
} from "../types";
import { useToast } from "../context/ToastContext";
import { Card, Button, Badge, EmptyState, Skeleton, Modal, ConfirmModal } from "../components/ui";
import { getErrorMessage } from "../api/client";
import { usePermissions } from "../hooks/usePermissions";

// Helper: safe cast status
const safeStatus = (s: TelecomService["status"]): ServiceStatus =>
  (s as ServiceStatus) || ServiceStatus.UP;

const categoryConfig: Record<
  ServiceCategory,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  [ServiceCategory.BILLING]: {
    label: "Facturation",
    icon: <Database className="w-4 h-4" />,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
  },
  [ServiceCategory.CRM]: {
    label: "CRM",
    icon: <Globe className="w-4 h-4" />,
    color: "text-primary-700 dark:text-primary-400",
    bgColor: "bg-primary-100 dark:bg-primary-900/40",
  },
  [ServiceCategory.NETWORK]: {
    label: "Réseau",
    icon: <Wifi className="w-4 h-4" />,
    color: "text-primary-700 dark:text-primary-400",
    bgColor: "bg-primary-100 dark:bg-primary-900/40",
  },
  [ServiceCategory.INFRA]: {
    label: "Infrastructure",
    icon: <Server className="w-4 h-4" />,
    color: "text-ds-primary",
    bgColor: "bg-ds-elevated",
  },
  [ServiceCategory.OTHER]: {
    label: "Autre",
    icon: <Server className="w-4 h-4" />,
    color: "text-ds-secondary",
    bgColor: "bg-ds-elevated",
  },
};

type ViewMode = "cards" | "table";
type FilterStatus = ServiceStatus | "ALL";

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

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "ALL" || service.category === filterCategory;
    const status = safeStatus(service.status);
    const matchesStatus = filterStatus === "ALL" || status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const servicesByStatus = services.reduce(
    (acc, s) => {
      const st = safeStatus(s.status);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<ServiceStatus, number>,
  );
  const activeCount = services.filter((s) => s.isActive).length;
  const inactiveCount = services.filter((s) => !s.isActive).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await telecomServiceService.createService(createForm);
      toastCtx.success("Service créé avec succès");
      setShowCreateModal(false);
      setCreateForm({ name: "", category: ServiceCategory.OTHER, description: "" });
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    try {
      await telecomServiceService.updateService(selectedService.id, editForm);
      toastCtx.success("Service mis à jour avec succès");
      setShowEditModal(false);
      setSelectedService(null);
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    setDeleteLoading(true);
    try {
      await telecomServiceService.deleteService(selectedService.id);
      toastCtx.success("Service supprimé avec succès");
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
        toastCtx.success("Service désactivé");
      } else {
        await telecomServiceService.activateService(service.id);
        toastCtx.success("Service activé");
      }
      fetchServices();
    } catch (error: unknown) {
      toastCtx.error(getErrorMessage(error));
    }
  };

  const handleStatusChange = async (service: TelecomService, newStatus: ServiceStatus) => {
    if (safeStatus(service.status) === newStatus) return;
    setStatusUpdatingId(service.id);
    try {
      await telecomServiceService.updateServiceStatus(service.id, newStatus);
      toastCtx.success(`Statut mis à jour : ${ServiceStatusLabels[newStatus]}`);
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
    "w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <Server className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ds-primary">Gestion des Services</h1>
            <p className="text-ds-muted text-sm mt-0.5">Services télécom supervisés par MTS</p>
          </div>
        </div>
        {canCreateService && (
          <Button
            variant="primary"
            icon={<Plus size={20} />}
            onClick={() => setShowCreateModal(true)}
          >
            Nouveau Service
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="group hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ds-muted">Total</p>
              <p className="text-2xl font-bold text-ds-primary mt-1">{services.length}</p>
            </div>
            <div className="p-3 bg-primary/10 dark:bg-primary/30 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Server className="w-6 h-6 text-primary dark:text-white" />
            </div>
          </div>
        </Card>
        <Card padding="md" className="group hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ds-muted">Opérationnels</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {servicesByStatus[ServiceStatus.UP] ?? 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        <Card padding="md" className="group hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ds-muted">Dégradés / Panne</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {(servicesByStatus[ServiceStatus.DEGRADED] ?? 0) +
                  (servicesByStatus[ServiceStatus.DOWN] ?? 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
        <Card padding="md" className="group hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ds-muted">Actifs / Inactifs</p>
              <p className="text-2xl font-bold text-ds-primary mt-1">
                {activeCount} / {inactiveCount}
              </p>
            </div>
            <div className="p-3 bg-ds-elevated rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Power className="w-6 h-6 text-ds-secondary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters + search + view toggle */}
      <Card padding="md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ds-muted" />
              <input
                type="text"
                placeholder="Rechercher un service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(
                    e.target.value === "ALL" ? "ALL" : (e.target.value as ServiceCategory),
                  )
                }
                className={inputClass}
              >
                <option value="ALL">Toutes catégories</option>
                {Object.entries(categoryConfig).map(([cat, config]) => (
                  <option key={cat} value={cat}>
                    {config.label}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value === "ALL" ? "ALL" : (e.target.value as ServiceStatus),
                  )
                }
                className={inputClass}
              >
                <option value="ALL">Tous les états</option>
                {(Object.keys(ServiceStatus) as ServiceStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {ServiceStatusLabels[st]}
                  </option>
                ))}
              </select>
              <div className="flex rounded-lg border border-ds-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-2 ${viewMode === "cards" ? "bg-primary text-white" : "bg-ds-card text-ds-secondary hover:bg-ds-elevated"}`}
                  title="Vue cartes"
                >
                  <LayoutGrid size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-2 ${viewMode === "table" ? "bg-primary text-white" : "bg-ds-card text-ds-secondary hover:bg-ds-elevated"}`}
                  title="Vue tableau"
                >
                  <List size={20} />
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchServices}
                loading={loading}
                icon={<RefreshCw size={18} />}
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} padding="md">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={24} />
                </div>
                <Skeleton variant="circular" width={40} height={40} />
              </div>
              <Skeleton variant="text" width="100%" className="mt-4" />
              <Skeleton variant="text" width="80%" className="mt-2" />
            </Card>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={<Server className="w-12 h-12" />}
          title="Aucun service trouvé"
          description="Ajustez les filtres ou créez le premier service."
          action={
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Créer un service
            </Button>
          }
        />
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const category = categoryConfig[service.category];
            const status = safeStatus(service.status);
            return (
              <Card
                key={service.id}
                padding="md"
                className={`hover:shadow-md transition-shadow ${!service.isActive ? "opacity-75" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${category.bgColor} ${category.color}`}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ds-primary">{service.name}</h3>
                      <span className={`text-xs ${category.color}`}>{category.label}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ServiceStatusBgColors[status]} ${ServiceStatusColors[status]}`}
                  >
                    {status === ServiceStatus.UP && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {status === ServiceStatus.DEGRADED && <AlertTriangle className="w-3.5 h-3.5" />}
                    {status === ServiceStatus.DOWN && <AlertCircle className="w-3.5 h-3.5" />}
                    {status === ServiceStatus.MAINTENANCE && <Wrench className="w-3.5 h-3.5" />}
                    {ServiceStatusLabels[status]}
                  </span>
                </div>
                <p className="text-sm text-ds-secondary mb-4 line-clamp-2">
                  {service.description || "Aucune description"}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-ds-border">
                  {canUpdateService ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleServiceActive(service)}
                      className={
                        service.isActive ? "text-green-700 dark:text-green-400" : "text-ds-muted"
                      }
                    >
                      {service.isActive ? "Actif" : "Inactif"}
                    </Button>
                  ) : (
                    <Badge variant={service.isActive ? "success" : "neutral"}>
                      {service.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    {canUpdateServiceStatus ? (
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(service, e.target.value as ServiceStatus)
                        }
                        disabled={statusUpdatingId === service.id}
                        className="text-xs rounded border border-ds-border bg-ds-card text-ds-primary py-1.5 px-2"
                      >
                        {(Object.keys(ServiceStatus) as ServiceStatus[]).map((st) => (
                          <option key={st} value={st}>
                            {ServiceStatusLabels[st]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="neutral">{ServiceStatusLabels[status]}</Badge>
                    )}
                    {canUpdateService && (
                      <button
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="p-2 text-primary hover:bg-primary/10 dark:text-secondary dark:hover:bg-primary/20 rounded-lg"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteService && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(service)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="ds-table-raw w-full">
              <thead className="bg-ds-elevated/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    État
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Actif
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ds-muted uppercase tracking-wider">
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
                      className={`hover:bg-ds-elevated ${!service.isActive ? "opacity-75" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-ds-primary">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-ds-muted truncate max-w-xs">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-sm ${category.color}`}
                        >
                          {category.icon}
                          {category.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canUpdateServiceStatus ? (
                          <select
                            value={status}
                            onChange={(e) =>
                              handleStatusChange(service, e.target.value as ServiceStatus)
                            }
                            disabled={statusUpdatingId === service.id}
                            className={`text-sm rounded border border-ds-border bg-ds-card py-1 px-2 ${ServiceStatusColors[status]}`}
                          >
                            {(Object.keys(ServiceStatus) as ServiceStatus[]).map((st) => (
                              <option key={st} value={st}>
                                {ServiceStatusLabels[st]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="neutral">{ServiceStatusLabels[status]}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canUpdateService ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleServiceActive(service)}
                          >
                            {service.isActive ? (
                              <Badge variant="success">Actif</Badge>
                            ) : (
                              <Badge variant="neutral">Inactif</Badge>
                            )}
                          </Button>
                        ) : service.isActive ? (
                          <Badge variant="success">Actif</Badge>
                        ) : (
                          <Badge variant="neutral">Inactif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ds-primary">{service.ticketCount ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateService && (
                            <button
                              type="button"
                              onClick={() => openEditModal(service)}
                              className="p-2 text-primary hover:bg-primary/10 dark:text-secondary dark:hover:bg-primary/20 rounded-lg"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteService && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(service)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Create Modal */}
      <Modal
        isOpen={canCreateService && showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau Service"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Nom du service *
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className={inputClass}
              placeholder="Ex: BSCS Billing System"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Catégorie *</label>
            <select
              required
              value={createForm.category}
              onChange={(e) =>
                setCreateForm({ ...createForm, category: e.target.value as ServiceCategory })
              }
              className={inputClass}
            >
              {Object.entries(categoryConfig).map(([cat, config]) => (
                <option key={cat} value={cat}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Description</label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className={inputClass}
              placeholder="Description du service..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" icon={<Check className="w-4 h-4" />}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={canUpdateService && showEditModal && !!selectedService}
        onClose={() => setShowEditModal(false)}
        title="Modifier le Service"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Nom du service</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Catégorie</label>
            <select
              value={editForm.category}
              onChange={(e) =>
                setEditForm({ ...editForm, category: e.target.value as ServiceCategory })
              }
              className={inputClass}
            >
              {Object.entries(categoryConfig).map(([cat, config]) => (
                <option key={cat} value={cat}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" icon={<Check className="w-4 h-4" />}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={canDeleteService && showDeleteModal && !!selectedService}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Supprimer le service"
        message={`Êtes-vous sûr de vouloir supprimer le service « ${selectedService?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
