// =============================================================================
// MTS TELECOM - Ticket List Page
// =============================================================================

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  Ticket,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { ticketService } from "../api/ticketService";
import { RootState, AppDispatch } from "../redux/store";
import { fetchTickets, setFilters, clearFilters } from "../redux/slices/ticketsSlice";
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  StatusLabels,
  PriorityLabels,
  CategoryLabels,
  TicketFilterParams,
  UserRole,
  SlaStatusFilter,
} from "../types";
import CreateTicketModal from "../components/tickets/CreateTicketModal";
import PageHeader from "../components/layout/PageHeader";
import { Button, Card, Badge, EmptyState, SkeletonTable, ConfirmModal } from "../components/ui";
import TicketDrawer from "../components/tickets/TicketDrawer";

// Priority/Status: use design system Badge variants (mapped from priority/status)
const priorityVariant: Record<TicketPriority, "danger" | "warning" | "info" | "success"> = {
  [TicketPriority.CRITICAL]: "danger",
  [TicketPriority.HIGH]: "warning",
  [TicketPriority.MEDIUM]: "info",
  [TicketPriority.LOW]: "success",
};
const statusVariant: Record<
  TicketStatus,
  "default" | "success" | "warning" | "danger" | "info" | "neutral"
> = {
  [TicketStatus.NEW]: "info",
  [TicketStatus.ASSIGNED]: "default",
  [TicketStatus.IN_PROGRESS]: "default",
  [TicketStatus.PENDING]: "warning",
  [TicketStatus.PENDING_THIRD_PARTY]: "warning",
  [TicketStatus.ESCALATED]: "danger",
  [TicketStatus.RESOLVED]: "success",
  [TicketStatus.CLOSED]: "neutral",
  [TicketStatus.CANCELLED]: "neutral",
};

/**
 * SLA Indicator - Affiche le statut SLA d'un ticket dans la liste.
 *
 * LOGIQUE D'AFFICHAGE:
 * - SLA dépassé → Rouge avec icône d'alerte
 * - SLA > 75% → Orange (zone d'avertissement)
 * - SLA < 75% → Vert (dans les délais)
 *
 * Inclut aussi une mini barre de progression visuelle.
 */
const SlaIndicator: React.FC<{
  breached: boolean;
  percentage?: number;
  slaWarning?: boolean;
  remainingMinutes?: number;
}> = ({ breached, percentage, slaWarning, remainingMinutes }) => {
  // Formatage du temps restant
  const formatRemaining = (min?: number): string => {
    if (min === undefined || min === null) return "";
    const absMin = Math.abs(min);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return min < 0
      ? `-${h}h${m.toString().padStart(2, "0")}`
      : `${h}h${m.toString().padStart(2, "0")}`;
  };

  if (breached) {
    return (
      <div className="flex flex-col items-start">
        <span className="flex items-center text-error-600 dark:text-error-400 text-xs font-semibold">
          <AlertTriangle size={13} className="mr-1" />
          Dépassé
        </span>
        <div className="w-full bg-ds-elevated rounded-full h-1 mt-1" style={{ minWidth: "48px" }}>
          <div className="h-1 rounded-full bg-error-500" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }
  if (percentage !== undefined) {
    const color =
      slaWarning || percentage > 75
        ? "text-warning-600 dark:text-warning-400"
        : percentage > 50
          ? "text-accent-600 dark:text-accent-400"
          : "text-success-600 dark:text-success-400";
    const barColor =
      slaWarning || percentage > 75
        ? "bg-warning-500"
        : percentage > 50
          ? "bg-accent-500"
          : "bg-success-500";
    return (
      <div className="flex flex-col items-start">
        <span className={`flex items-center ${color} text-xs font-medium`}>
          <Clock size={13} className="mr-1" />
          {formatRemaining(remainingMinutes) || `${percentage.toFixed(0)}%`}
        </span>
        <div className="w-full bg-ds-elevated rounded-full h-1 mt-1" style={{ minWidth: "48px" }}>
          <div
            className={`h-1 rounded-full ${barColor}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>
    );
  }
  return <span className="text-ds-muted text-xs">—</span>;
};

const TicketList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id: routeTicketId } = useParams<{ id?: string }>();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { tickets, totalElements, totalPages, currentPage, pageSize, isLoading, filters } =
    useSelector((state: RootState) => state.tickets);
  const routeDrawerTicketId =
    routeTicketId && !Number.isNaN(Number(routeTicketId)) ? Number(routeTicketId) : null;

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [localFilters, setLocalFilters] = useState<TicketFilterParams>(filters);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "excel" | "pdf" | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<{ id: number; ticketNumber: string } | null>(
    null,
  );
  const [ticketToHardDelete, setTicketToHardDelete] = useState<{
    id: number;
    ticketNumber: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // Drawer state
  const [drawerTicketId, setDrawerTicketId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = (ticketId: number) => {
    const search = searchParams.toString();
    navigate({
      pathname: `/tickets/${ticketId}`,
      search: search ? `?${search}` : "",
    });
  };

  const closeDrawer = () => {
    const search = searchParams.toString();
    navigate({
      pathname: "/tickets",
      search: search ? `?${search}` : "",
    });
  };

  useEffect(() => {
    if (routeDrawerTicketId === null) {
      setDrawerTicketId(null);
      setIsDrawerOpen(false);
      return;
    }

    setDrawerTicketId(routeDrawerTicketId);
    setIsDrawerOpen(true);
  }, [routeDrawerTicketId]);

  const handleTicketUpdated = () => {
    dispatch(fetchTickets({ filters, page: { page: currentPage, size: pageSize } }));
  };

  const user = useSelector((state: RootState) => state.auth.user);
  const isClient = user?.role === ("CLIENT" as UserRole);
  const isAdmin = user?.role === ("ADMIN" as UserRole);
  const canExport = !isClient;
  const canDeleteTicket = (status: TicketStatus, assignedToId?: number) => {
    return isClient && status === TicketStatus.NEW && !assignedToId;
  };
  const canHardDeleteTicket = (status: TicketStatus, assignedToId?: number) => {
    return isAdmin && status === TicketStatus.NEW && !assignedToId;
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;

    setIsDeleting(true);
    try {
      await ticketService.deleteTicket(ticketToDelete.id);
      toast.success(`Ticket ${ticketToDelete.ticketNumber} annulé avec succès`);
      setTicketToDelete(null);
      dispatch(fetchTickets({ filters, page: { page: currentPage, size: pageSize } }));
    } catch (error: any) {
      const backendMessage = error?.response?.data?.detail || error?.response?.data?.message;
      toast.error(backendMessage || "Impossible d'annuler ce ticket");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (!ticketToHardDelete) return;

    setIsHardDeleting(true);
    try {
      await ticketService.hardDeleteTicket(ticketToHardDelete.id);
      if (drawerTicketId === ticketToHardDelete.id) {
        closeDrawer();
      }
      toast.success(`Ticket ${ticketToHardDelete.ticketNumber} supprime definitivement`);
      setTicketToHardDelete(null);
      dispatch(fetchTickets({ filters, page: { page: currentPage, size: pageSize } }));
    } catch (error: any) {
      const backendMessage = error?.response?.data?.detail || error?.response?.data?.message;
      toast.error(backendMessage || "Suppression definitive impossible");
    } finally {
      setIsHardDeleting(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setExporting(format);
    try {
      const blob =
        format === "csv"
          ? await ticketService.exportCsv(filters)
          : format === "excel"
            ? await ticketService.exportExcel(filters)
            : await ticketService.exportPdf(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets_export.${format === "csv" ? "csv" : format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} téléchargé`);
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    const urlFilters: TicketFilterParams = {};
    if (searchParams.get("status")) urlFilters.status = searchParams.get("status") as TicketStatus;
    if (searchParams.get("priority"))
      urlFilters.priority = searchParams.get("priority") as TicketPriority;
    if (searchParams.get("category"))
      urlFilters.category = searchParams.get("category") as TicketCategory;
    if (searchParams.get("search")) urlFilters.search = searchParams.get("search") || undefined;
    if (searchParams.get("slaStatus"))
      urlFilters.slaStatus = searchParams.get("slaStatus") as SlaStatusFilter;
    if (searchParams.get("assignedToMe") === "1" && user?.id) urlFilters.assignedToId = user.id;

    dispatch(setFilters(urlFilters));
    setLocalFilters(urlFilters);
    setSearchTerm(urlFilters.search ?? "");

    dispatch(
      fetchTickets({
        filters: urlFilters,
        page: { page: 0, size: pageSize },
      }),
    );
  }, [dispatch, pageSize, searchParams, user?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { ...localFilters, search: searchTerm || undefined };
    dispatch(setFilters(newFilters));
    dispatch(fetchTickets({ filters: newFilters, page: { page: 0, size: pageSize } }));
  };

  const handleFilterChange = (key: keyof TicketFilterParams, value: string | undefined) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    dispatch(setFilters(localFilters));
    dispatch(fetchTickets({ filters: localFilters, page: { page: 0, size: pageSize } }));
    setShowFilters(false);
  };

  const resetFilters = () => {
    setLocalFilters({});
    setSearchTerm("");
    dispatch(clearFilters());
    dispatch(fetchTickets({ filters: {}, page: { page: 0, size: pageSize } }));
    setShowFilters(false);
  };

  const handlePageChange = (newPage: number) => {
    dispatch(fetchTickets({ filters, page: { page: newPage, size: pageSize } }));
  };

  const handlePageSizeChange = (newSize: number) => {
    dispatch(fetchTickets({ filters, page: { page: 0, size: newSize } }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description={`${totalElements} ticket(s) au total`}
        icon={<Ticket size={24} />}
        actions={
          <div className="flex items-center gap-2">
            {canExport && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={16} />}
                  onClick={() => handleExport("csv")}
                  disabled={!!exporting}
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={() => handleExport("excel")}
                  disabled={!!exporting}
                >
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FileText size={16} />}
                  onClick={() => handleExport("pdf")}
                  disabled={!!exporting}
                >
                  PDF
                </Button>
              </>
            )}
            {isClient && (
              <Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={() => setShowCreateModal(true)}
              >
                Nouveau ticket
              </Button>
            )}
          </div>
        }
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => dispatch(fetchTickets({ filters, page: { page: 0, size: pageSize } }))}
      />

      <ConfirmModal
        isOpen={!!ticketToDelete}
        onClose={() => {
          if (!isDeleting) setTicketToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Annuler ce ticket ?"
        message={
          ticketToDelete
            ? `Le ticket ${ticketToDelete.ticketNumber} sera annulé tout en restant traçable dans l'historique.`
            : "Cette action annule le ticket sans suppression physique."
        }
        confirmLabel="Annuler le ticket"
        cancelLabel="Annuler"
        variant="danger"
        loading={isDeleting}
      />

      <ConfirmModal
        isOpen={!!ticketToHardDelete}
        onClose={() => {
          if (!isHardDeleting) setTicketToHardDelete(null);
        }}
        onConfirm={handleConfirmHardDelete}
        title="Supprimer definitivement ce ticket ?"
        message={
          ticketToHardDelete ? (
            <>
              <p>
                Cette action retirera definitivement le ticket {ticketToHardDelete.ticketNumber} de
                la base.
              </p>
              <p className="mt-2">
                <span className="font-semibold">Titre :</span> {ticketToHardDelete.title}
              </p>
              <p className="mt-2">
                Cette suppression est irreversible et reservee aux tickets neufs, non assignes et
                sans dependances critiques.
              </p>
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Supprimer definitivement"
        cancelLabel="Conserver"
        variant="danger"
        loading={isHardDeleting}
        confirmationKeyword="SUPPRIMER"
        confirmationHint="Tapez SUPPRIMER pour confirmer la suppression definitive du ticket."
      />

      {/* Search & Filters Bar */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-muted"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par numéro, titre, client..."
                className="w-full pl-10 pr-4 py-2 border border-ds-border rounded-xl bg-ds-surface text-ds-primary placeholder:text-ds-muted focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </form>
          <Button
            variant={showFilters ? "primary" : "outline"}
            icon={<Filter size={18} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-ds-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Statut</label>
                <select
                  value={localFilters.status || ""}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-surface text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                >
                  <option value="">Tous</option>
                  {Object.values(TicketStatus).map((status) => (
                    <option key={status} value={status}>
                      {StatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Priorité</label>
                <select
                  value={localFilters.priority || ""}
                  onChange={(e) => handleFilterChange("priority", e.target.value)}
                  className="w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-surface text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                >
                  <option value="">Toutes</option>
                  {Object.values(TicketPriority).map((priority) => (
                    <option key={priority} value={priority}>
                      {PriorityLabels[priority]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Catégorie</label>
                <select
                  value={localFilters.category || ""}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                  className="w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-surface text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                >
                  <option value="">Toutes</option>
                  {Object.values(TicketCategory).map((category) => (
                    <option key={category} value={category}>
                      {CategoryLabels[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">SLA</label>
                <select
                  value={(localFilters.slaStatus as string) ?? ""}
                  onChange={(e) => handleFilterChange("slaStatus", e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-surface text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                >
                  <option value="">Tous</option>
                  <option value="OK">Dans les délais</option>
                  <option value="AT_RISK">À risque</option>
                  <option value="BREACHED">Dépassé</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={resetFilters}>
                Réinitialiser
              </Button>
              <Button variant="primary" onClick={applyFilters}>
                Appliquer
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tickets Table */}
      <Card padding="none">
        {isLoading ? (
          <SkeletonTable rows={Math.min(pageSize, 10)} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<Search size={48} className="text-ds-muted" />}
            title="Aucun ticket trouvé"
            description={
              Object.keys(filters).length > 0 || searchTerm
                ? "Essayez de modifier vos filtres ou votre recherche."
                : isClient
                  ? "Vous n'avez pas encore créé de ticket. Cliquez sur « Nouveau ticket » pour commencer."
                  : "Aucun ticket ne correspond à votre rôle pour le moment."
            }
            action={
              Object.keys(filters).length > 0 || searchTerm ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              ) : isClient ? (
                <Button
                  variant="primary"
                  icon={<Plus size={18} />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Nouveau ticket
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ds-elevated/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Titre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Assigné à
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-border">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-ds-elevated/50 transition-colors cursor-pointer"
                      onClick={() => openDrawer(ticket.id)}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(ticket.id);
                          }}
                          className="text-primary hover:text-primary-hover font-medium"
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-ds-primary max-w-xs truncate">
                        {ticket.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-ds-secondary">
                        {ticket.clientCompanyName || ticket.clientCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-ds-secondary">{ticket.serviceName}</td>
                      <td className="px-6 py-4">
                        <Badge variant={priorityVariant[ticket.priority]}>
                          {PriorityLabels[ticket.priority]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant[ticket.status]}>
                          {StatusLabels[ticket.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <SlaIndicator
                          breached={ticket.breachedSla}
                          percentage={ticket.slaPercentage}
                          slaWarning={ticket.slaWarning}
                          remainingMinutes={ticket.slaRemainingMinutes}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-ds-secondary">
                        {ticket.assignedToName || <span className="text-warning">Non assigné</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(ticket.id);
                          }}
                          className="text-primary hover:text-primary-hover p-2 inline-block rounded-xl hover:bg-ds-elevated transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {canDeleteTicket(ticket.status, ticket.assignedToId) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTicketToDelete({
                                id: ticket.id,
                                ticketNumber: ticket.ticketNumber,
                              });
                            }}
                            className="text-error-600 hover:text-error-700 p-2 inline-block rounded-xl hover:bg-ds-elevated transition-colors"
                            aria-label={`Supprimer le ticket ${ticket.ticketNumber}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {canHardDeleteTicket(ticket.status, ticket.assignedToId) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTicketToHardDelete({
                                id: ticket.id,
                                ticketNumber: ticket.ticketNumber,
                                title: ticket.title,
                              });
                            }}
                            className="text-error-700 hover:text-error-800 p-2 inline-block rounded-xl hover:bg-ds-elevated transition-colors"
                            aria-label={`Supprimer definitivement le ticket ${ticket.ticketNumber}`}
                            title={`Supprimer definitivement le ticket ${ticket.ticketNumber}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-ds-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-ds-muted">
                  {totalElements} ticket(s) · {currentPage * pageSize + 1}–
                  {Math.min((currentPage + 1) * pageSize, totalElements)}
                </span>
                <label className="flex items-center gap-2 text-sm text-ds-secondary">
                  <span>Par page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="rounded-lg border border-ds-border bg-ds-surface text-ds-primary px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    aria-label="Nombre par page"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ChevronLeft size={18} />}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Page précédente"
                />
                <span className="px-4 py-2 text-sm text-ds-primary">
                  Page {currentPage + 1} sur {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ChevronRight size={18} />}
                  iconPosition="right"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  aria-label="Page suivante"
                />
              </div>
            </div>
          </>
        )}
      </Card>
      {/* Ticket Drawer */}
      <TicketDrawer
        ticketId={drawerTicketId}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onTicketUpdated={handleTicketUpdated}
      />
    </div>
  );
};

export default TicketList;
