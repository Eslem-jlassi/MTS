// =============================================================================
// MTS TELECOM - Ticket List Page
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
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
import { formatDurationMinutes, formatPercent } from "../utils/formatters";
import { getAdminHardDeleteErrorMessage } from "../utils/hardDeleteFeedback";
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
          {remainingMinutes !== undefined && remainingMinutes !== null
            ? formatDurationMinutes(remainingMinutes)
            : formatPercent(percentage)}
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
  const routeDrawerTab = searchParams.get("drawerTab") || undefined;
  const routeDrawerFocus = searchParams.get("drawerFocus") || undefined;

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
  const [hardDeletePassword, setHardDeletePassword] = useState("");
  const [hardDeleteVerificationCode, setHardDeleteVerificationCode] = useState("");
  const [isSendingHardDeleteCode, setIsSendingHardDeleteCode] = useState(false);

  // Drawer state
  const [drawerTicketId, setDrawerTicketId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeFiltersSummary = useMemo(() => {
    const items: string[] = [];
    if (filters.search) items.push(`Recherche: ${filters.search}`);
    if (filters.status) items.push(`Statut: ${StatusLabels[filters.status]}`);
    if (filters.priority) items.push(`Priorite: ${PriorityLabels[filters.priority]}`);
    if (filters.category) items.push(`Categorie: ${CategoryLabels[filters.category]}`);
    if (filters.slaStatus === "OK") items.push("SLA: Dans les delais");
    if (filters.slaStatus === "AT_RISK") items.push("SLA: A risque");
    if (filters.slaStatus === "BREACHED") items.push("SLA: Depasse");
    if (filters.serviceId) items.push(`Service #${filters.serviceId}`);
    if (filters.clientId) items.push(`Client #${filters.clientId}`);
    if (filters.assignedToId) items.push(`Assigne #${filters.assignedToId}`);
    return items;
  }, [filters]);

  const buildPersistentSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("drawerTab");
    params.delete("drawerFocus");
    return params.toString();
  };

  const buildTicketFiltersSearch = (nextFilters: TicketFilterParams) => {
    const params = new URLSearchParams();

    if (nextFilters.status) params.set("status", nextFilters.status);
    if (nextFilters.priority) params.set("priority", nextFilters.priority);
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.slaStatus) params.set("slaStatus", nextFilters.slaStatus);
    if (nextFilters.serviceId != null) params.set("serviceId", String(nextFilters.serviceId));
    if (nextFilters.clientId != null) params.set("clientId", String(nextFilters.clientId));
    if (nextFilters.assignedToId != null) {
      params.set("assignedToId", String(nextFilters.assignedToId));
    }

    return params.toString();
  };

  const openDrawer = (ticketId: number) => {
    const search = buildPersistentSearch();
    navigate({
      pathname: `/tickets/${ticketId}`,
      search: search ? `?${search}` : "",
    });
  };

  const closeDrawer = () => {
    const search = buildPersistentSearch();
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
  const isOauthAdmin = Boolean(isAdmin && user?.oauthProvider);
  const canExport = !isClient;
  const canDeleteTicket = (status: TicketStatus, assignedToId?: number) => {
    return isClient && status === TicketStatus.NEW && !assignedToId;
  };
  const canHardDeleteTicket = () => isAdmin;
  const getTicketHardDeleteIdentifier = (ticket: { ticketNumber?: string; id: number }) =>
    ticket.ticketNumber?.trim() || "";
  const isTicketHardDeleteReauthValid = isOauthAdmin
    ? hardDeleteVerificationCode.trim().length > 0
    : hardDeletePassword.trim().length > 0;
  const isTicketHardDeleteFormInvalid = !ticketToHardDelete || !isTicketHardDeleteReauthValid;

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

    const providedTicketIdentifier =
      getTicketHardDeleteIdentifier(ticketToHardDelete) || String(ticketToHardDelete.id);

    if (!isOauthAdmin && !hardDeletePassword.trim()) {
      toast.error("Saisissez votre mot de passe administrateur pour confirmer cette action.");
      return;
    }

    if (isOauthAdmin && !hardDeleteVerificationCode.trim()) {
      toast.error("Saisissez le code de verification recu par email.");
      return;
    }

    setIsHardDeleting(true);
    try {
      await ticketService.hardDeleteTicket(ticketToHardDelete.id, {
        confirmationKeyword: "SUPPRIMER",
        confirmationTargetId: providedTicketIdentifier,
        currentPassword: isOauthAdmin ? undefined : hardDeletePassword,
        verificationCode: isOauthAdmin ? hardDeleteVerificationCode : undefined,
      });
      if (drawerTicketId === ticketToHardDelete.id) {
        closeDrawer();
      }
      toast.success(`Ticket ${ticketToHardDelete.ticketNumber} supprime definitivement`);
      setTicketToHardDelete(null);
      dispatch(fetchTickets({ filters, page: { page: currentPage, size: pageSize } }));
    } catch (error: any) {
      toast.error(
        getAdminHardDeleteErrorMessage(
          "ticket",
          error,
          "Suppression definitive impossible pour ce ticket.",
        ),
      );
    } finally {
      setIsHardDeleting(false);
    }
  };

  const handleRequestHardDeleteChallenge = async () => {
    if (!ticketToHardDelete) return;

    setIsSendingHardDeleteCode(true);
    try {
      await ticketService.requestHardDeleteChallenge(ticketToHardDelete.id);
      toast.success("Un code de verification a ete envoye sur votre email administrateur.");
    } catch (error: any) {
      const backendMessage = error?.response?.data?.detail || error?.response?.data?.message;
      toast.error(backendMessage || "Impossible d'envoyer le code de verification");
    } finally {
      setIsSendingHardDeleteCode(false);
    }
  };

  useEffect(() => {
    if (ticketToHardDelete) {
      setHardDeletePassword("");
      setHardDeleteVerificationCode("");
      return;
    }

    setHardDeletePassword("");
    setHardDeleteVerificationCode("");
  }, [ticketToHardDelete]);

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
    if (searchParams.get("serviceId")) {
      const serviceId = Number(searchParams.get("serviceId"));
      if (!Number.isNaN(serviceId)) urlFilters.serviceId = serviceId;
    }
    if (searchParams.get("clientId")) {
      const clientId = Number(searchParams.get("clientId"));
      if (!Number.isNaN(clientId)) urlFilters.clientId = clientId;
    }
    if (searchParams.get("assignedToId")) {
      const assignedToId = Number(searchParams.get("assignedToId"));
      if (!Number.isNaN(assignedToId)) urlFilters.assignedToId = assignedToId;
    }
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
    navigate({
      pathname: "/tickets",
      search: buildTicketFiltersSearch(newFilters)
        ? `?${buildTicketFiltersSearch(newFilters)}`
        : "",
    });
  };

  const handleFilterChange = (key: keyof TicketFilterParams, value: string | undefined) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    navigate({
      pathname: "/tickets",
      search: buildTicketFiltersSearch(localFilters)
        ? `?${buildTicketFiltersSearch(localFilters)}`
        : "",
    });
    setShowFilters(false);
  };

  const resetFilters = () => {
    setLocalFilters({});
    setSearchTerm("");
    dispatch(clearFilters());
    navigate("/tickets");
    setShowFilters(false);
  };

  const handlePageChange = (newPage: number) => {
    dispatch(fetchTickets({ filters, page: { page: newPage, size: pageSize } }));
  };

  const handlePageSizeChange = (newSize: number) => {
    dispatch(fetchTickets({ filters, page: { page: 0, size: newSize } }));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tickets"
        description={
          activeFiltersSummary.length > 0
            ? `${totalElements} ticket(s) · ${activeFiltersSummary.length} filtre(s) actif(s)`
            : `${totalElements} ticket(s) au total`
        }
        icon={<Ticket size={24} />}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canExport && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={16} />}
                  onClick={() => handleExport("csv")}
                  disabled={!!exporting}
                  loading={exporting === "csv"}
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={() => handleExport("excel")}
                  disabled={!!exporting}
                  loading={exporting === "excel"}
                >
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FileText size={16} />}
                  onClick={() => handleExport("pdf")}
                  disabled={!!exporting}
                  loading={exporting === "pdf"}
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
              <p className="text-sm leading-6">
                Cette action retirera definitivement le ticket{" "}
                <span className="font-semibold text-ds-primary">
                  {ticketToHardDelete.ticketNumber}
                </span>{" "}
                de la base et nettoiera ses relations techniques cote backend.
              </p>
              <p className="mt-2 text-sm text-ds-secondary">
                <span className="font-semibold">Titre :</span> {ticketToHardDelete.title}
              </p>
              <div className="mt-3 space-y-3 rounded-2xl border border-ds-border bg-ds-surface/70 p-4 text-left">
                <p className="rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-xs text-ds-secondary">
                  Reference affichee pour controle :{" "}
                  <span className="font-semibold text-ds-primary">
                    {getTicketHardDeleteIdentifier(ticketToHardDelete) ||
                      `ID ${ticketToHardDelete.id}`}
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
                        value={hardDeleteVerificationCode}
                        onChange={(event) => setHardDeleteVerificationCode(event.target.value)}
                        className="w-full rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-sm text-ds-primary"
                        placeholder="Code a 6 chiffres"
                        autoComplete="one-time-code"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRequestHardDeleteChallenge}
                        disabled={isSendingHardDeleteCode || isHardDeleting}
                      >
                        {isSendingHardDeleteCode ? "Envoi..." : "Envoyer un code"}
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
                      value={hardDeletePassword}
                      onChange={(event) => setHardDeletePassword(event.target.value)}
                      className="w-full rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-sm text-ds-primary"
                      placeholder="Confirmez avec votre mot de passe"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </div>
              <p className="mt-3 rounded-xl border border-error-200/60 bg-error-50/70 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                Suppression irreversible avec nettoyage backend des relations et traces techniques
                associees.
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
        confirmDisabled={isTicketHardDeleteFormInvalid}
        confirmationKeyword="SUPPRIMER"
        confirmationHint="Tapez SUPPRIMER, puis confirmez votre re-authentification administrateur."
        size="lg"
      />

      {/* Search & Filters Bar */}
      <Card padding="md" className="border border-ds-border/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <form onSubmit={handleSearch} className="min-w-0 flex-1">
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
                className="w-full rounded-xl border border-ds-border bg-ds-surface py-2.5 pl-10 pr-4 text-sm text-ds-primary placeholder:text-ds-muted focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
          </form>
          <Button
            size="sm"
            variant={showFilters ? "primary" : "outline"}
            icon={<Filter size={18} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {activeFiltersSummary.length > 0
              ? `Filtres (${activeFiltersSummary.length})`
              : "Filtres"}
          </Button>
        </div>

        {!showFilters && activeFiltersSummary.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ds-border pt-3">
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

        {showFilters && (
          <div className="mt-3 border-t border-ds-border pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ds-muted">
                  Statut
                </label>
                <select
                  value={localFilters.status || ""}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full rounded-xl border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
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
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ds-muted">
                  Priorité
                </label>
                <select
                  value={localFilters.priority || ""}
                  onChange={(e) => handleFilterChange("priority", e.target.value)}
                  className="w-full rounded-xl border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
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
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ds-muted">
                  Catégorie
                </label>
                <select
                  value={localFilters.category || ""}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                  className="w-full rounded-xl border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
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
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ds-muted">
                  SLA
                </label>
                <select
                  value={(localFilters.slaStatus as string) ?? ""}
                  onChange={(e) => handleFilterChange("slaStatus", e.target.value || undefined)}
                  className="w-full rounded-xl border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                >
                  <option value="">Tous</option>
                  <option value="OK">Dans les délais</option>
                  <option value="AT_RISK">À risque</option>
                  <option value="BREACHED">Dépassé</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
              <Button variant="primary" size="sm" onClick={applyFilters}>
                Appliquer
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tickets Table */}
      <Card padding="none" className="overflow-hidden border border-ds-border/80">
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
              <table className="ds-table-raw w-full min-w-[1140px]">
                <thead className="bg-ds-elevated/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Titre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Assigné à
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-border">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="group cursor-pointer transition-colors hover:bg-ds-elevated/50"
                      onClick={() => openDrawer(ticket.id)}
                    >
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(ticket.id);
                          }}
                          className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="max-w-[18rem] truncate px-4 py-3 text-sm text-ds-primary align-top">
                        {ticket.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-ds-secondary align-top">
                        {ticket.clientCompanyName || ticket.clientCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-ds-secondary align-top">
                        {ticket.serviceName}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant={priorityVariant[ticket.priority]} size="sm">
                          {PriorityLabels[ticket.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant={statusVariant[ticket.status]} size="sm">
                          {StatusLabels[ticket.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm align-top">
                        <SlaIndicator
                          breached={ticket.breachedSla}
                          percentage={ticket.slaPercentage}
                          slaWarning={ticket.slaWarning}
                          remainingMinutes={ticket.slaRemainingMinutes}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-ds-secondary align-top">
                        {ticket.assignedToName || <span className="text-warning">Non assigné</span>}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(ticket.id);
                            }}
                            className="inline-flex rounded-xl p-2 text-primary transition-colors hover:bg-ds-elevated hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
                              className="inline-flex rounded-xl p-2 text-error-600 transition-colors hover:bg-error-50 hover:text-error-700 dark:hover:bg-error-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-400/40"
                              aria-label={`Supprimer le ticket ${ticket.ticketNumber}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          {canHardDeleteTicket() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTicketToHardDelete({
                                  id: ticket.id,
                                  ticketNumber: ticket.ticketNumber,
                                  title: ticket.title,
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-error-200 px-2 py-1.5 text-error-700 transition-colors hover:bg-error-50 hover:text-error-800 dark:border-error-900/50 dark:hover:bg-error-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-400/40"
                              aria-label={`Supprimer definitivement le ticket ${ticket.ticketNumber}`}
                              title={`Suppression definitive admin du ticket ${ticket.ticketNumber}`}
                            >
                              <Trash2 size={15} />
                              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] xl:inline">
                                Définitif
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ds-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-4">
                <span className="text-xs text-ds-muted sm:text-sm">
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
                <span className="rounded-lg border border-ds-border px-3 py-1.5 text-sm text-ds-primary">
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
        requestedTab={routeDrawerTab}
        actionContext={routeDrawerFocus}
        onClose={closeDrawer}
        onTicketUpdated={handleTicketUpdated}
        onRequestHardDelete={(ticket) => setTicketToHardDelete(ticket)}
      />
    </div>
  );
};

export default TicketList;
