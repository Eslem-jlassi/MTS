// =============================================================================
// MTS TELECOM - TicketDrawer — Détail ticket en Drawer + Tabs (Enterprise)
// =============================================================================
/**
 * Affiche le détail d'un ticket dans un Drawer latéral avec 6 tabs:
 * - Détails      → infos complètes, dropdowns statut/priorité/assignation
 * - Activité     → timeline chronologique (commentaires + historique fusionnés)
 * - Commentaires → liste + formulaire (note interne / réponse client toggle)
 * - SLA          → deadline, barre de progression, temps restant
 * - Pièces jointes → liste, upload, téléchargement
 * - Historique   → audit trail complet
 *
 * Actions contextuelles en header (changer statut, assigner).
 * Ne casse rien de l'existant: affiché depuis TicketList via drawer.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { Tabs, Tab } from "../ui";
import Drawer from "../ui/Drawer";
import QuickReplies from "./QuickReplies";
import { ticketService } from "../../api/ticketService";
import { userService } from "../../api/userService";
import {
  Ticket,
  TicketStatus,
  TicketComment as TicketCommentType,
  TicketHistory,
  TicketAttachmentInfo,
  UserRole,
  UserResponse,
  CategoryLabels,
} from "../../types";
import {
  FileText,
  MessageSquare,
  Clock,
  Paperclip,
  History,
  Activity,
  AlertTriangle,
  CheckCircle,
  Send,
  Loader2,
  Shield,
  UserPlus,
  UserMinus,
  Upload,
  Download,
  File,
  Inbox,
  RefreshCw,
  ChevronDown,
  X,
} from "lucide-react";

// =============================================================================
// TYPES & PROPS
// =============================================================================

interface TicketDrawerProps {
  ticketId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated?: () => void; // callback pour rafraîchir la liste
}

// =============================================================================
// CONFIG BADGES
// =============================================================================

const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-200", label: "Critique" },
  HIGH:     { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-800 dark:text-orange-200", label: "Haute" },
  MEDIUM:   { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-200", label: "Moyenne" },
  LOW:      { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-200", label: "Basse" },
};

const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  NEW:                 { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-200", label: "Nouveau", dot: "bg-blue-500" },
  ASSIGNED:            { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-800 dark:text-indigo-200", label: "Assigné", dot: "bg-indigo-500" },
  IN_PROGRESS:         { bg: "bg-primary-100 dark:bg-primary-900/30", text: "text-primary-800 dark:text-primary-200", label: "En cours", dot: "bg-primary-500" },
  PENDING:             { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-200", label: "En attente", dot: "bg-yellow-500" },
  PENDING_THIRD_PARTY: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-200", label: "En attente tiers", dot: "bg-amber-500" },
  ESCALATED:           { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-200", label: "Escaladé", dot: "bg-purple-500" },
  RESOLVED:            { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-200", label: "Résolu", dot: "bg-green-500" },
  CLOSED:              { bg: "bg-gray-100 dark:bg-gray-700/30", text: "text-gray-800 dark:text-gray-200", label: "Fermé", dot: "bg-gray-500" },
  CANCELLED:           { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-300", label: "Annulé", dot: "bg-red-400" },
};

const roleConfig: Record<string, { label: string; color: string }> = {
  CLIENT:  { label: "Client", color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300" },
  AGENT:   { label: "Agent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  MANAGER: { label: "Manager", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ADMIN:   { label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

// =============================================================================
// TABS DEFINITION
// =============================================================================

const buildTabs = (ticket: Ticket | null): Tab[] => [
  { key: "details",     label: "Détails",         icon: <FileText size={14} /> },
  { key: "activity",    label: "Activité",        icon: <Activity size={14} />, badge: (ticket?.comments?.length || 0) + (ticket?.history?.length || 0) },
  { key: "comments",    label: "Commentaires",    icon: <MessageSquare size={14} />, badge: ticket?.commentCount || 0 },
  { key: "sla",         label: "SLA",             icon: <Clock size={14} /> },
  { key: "attachments", label: "Pièces jointes",  icon: <Paperclip size={14} />, badge: ticket?.attachments?.length || 0 },
  { key: "history",     label: "Historique",       icon: <History size={14} />, badge: ticket?.history?.length || 0 },
];

// =============================================================================
// HELPERS
// =============================================================================

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatDateShort = (dateStr?: string): string => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatSlaRemaining = (minutes?: number): string => {
  if (minutes === undefined || minutes === null) return "—";
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const timeStr = `${h}h ${m.toString().padStart(2, "0")}min`;
  return minutes < 0 ? `Dépassé de ${timeStr}` : timeStr;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TicketDrawer: React.FC<TicketDrawerProps> = ({
  ticketId,
  isOpen,
  onClose,
  onTicketUpdated,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role as UserRole | undefined;
  const isStaff = userRole && ["ADMIN", "MANAGER", "AGENT"].includes(userRole);
  const canAssign = userRole && ["ADMIN", "MANAGER"].includes(userRole);
  const canChangeStatus = isStaff;

  // --- Core state ---
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Comments state ---
  const [comments, setComments] = useState<TicketCommentType[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // --- History state ---
  const [history, setHistory] = useState<TicketHistory[]>([]);

  // --- Status change ---
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [newStatus, setNewStatus] = useState<TicketStatus | "">("");
  const [resolution, setResolution] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // --- Assignment ---
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [agents, setAgents] = useState<UserResponse[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // --- Attachments ---
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Toast ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await ticketService.getTicketById(ticketId);
      setTicket(data);
      setComments(data.comments || []);
      setHistory(data.history || []);
    } catch {
      setToast({ message: "Impossible de charger le ticket", type: "error" });
    }
  }, [ticketId]);

  // Load on open
  useEffect(() => {
    if (!ticketId || !isOpen) return;
    setLoading(true);
    setActiveTab("details");
    loadTicket().finally(() => setLoading(false));
  }, [ticketId, isOpen, loadTicket]);

  // Load separate comments & history when switching to those tabs
  const loadComments = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await ticketService.getComments(ticketId);
      setComments(data);
    } catch { /* silent */ }
  }, [ticketId]);

  const loadHistory = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await ticketService.getHistory(ticketId);
      setHistory(data);
    } catch { /* silent */ }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || !isOpen) return;
    if (activeTab === "comments") loadComments();
    if (activeTab === "history" || activeTab === "activity") {
      loadComments();
      loadHistory();
    }
  }, [activeTab, ticketId, isOpen, loadComments, loadHistory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
    if (activeTab === "comments") await loadComments();
    if (activeTab === "history" || activeTab === "activity") {
      await loadComments();
      await loadHistory();
    }
    setRefreshing(false);
  };

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await ticketService.addComment(ticket.id, {
        content: commentText.trim(),
        isInternal,
      });
      setCommentText("");
      setIsInternal(false);
      setToast({ message: isInternal ? "Note interne ajoutée" : "Commentaire ajouté", type: "success" });
      await loadTicket();
      await loadComments();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || "Erreur lors de l'ajout", type: "error" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async () => {
    if (!ticket || !newStatus) return;
    setSubmittingStatus(true);
    try {
      await ticketService.changeStatus(ticket.id, {
        newStatus: newStatus as TicketStatus,
        resolution: resolution || undefined,
        comment: statusComment || undefined,
      });
      setShowStatusDropdown(false);
      setNewStatus("");
      setResolution("");
      setStatusComment("");
      const label = statusConfig[newStatus]?.label || newStatus;
      setToast({ message: `Statut → "${label}"`, type: "success" });
      await loadTicket();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || "Erreur changement statut", type: "error" });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const list = await userService.getAgents();
      setAgents(list);
    } catch {
      setToast({ message: "Erreur chargement agents", type: "error" });
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAssign = async (agentId: number) => {
    if (!ticket) return;
    setSubmittingAssign(true);
    try {
      await ticketService.assignTicket(ticket.id, { agentId });
      const agent = agents.find(a => a.id === agentId);
      setShowAssignDropdown(false);
      setToast({ message: `Assigné à ${agent?.fullName || "l'agent"}`, type: "success" });
      await loadTicket();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || "Erreur assignation", type: "error" });
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleUnassign = async () => {
    if (!ticket) return;
    setSubmittingAssign(true);
    try {
      await ticketService.unassignTicket(ticket.id);
      setToast({ message: "Agent désassigné", type: "success" });
      await loadTicket();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || "Erreur désassignation", type: "error" });
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ticket || !e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      await ticketService.addAttachment(ticket.id, file);
      setToast({ message: `"${file.name}" uploadé`, type: "success" });
      await loadTicket();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || "Erreur upload", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadAttachment = async (att: TicketAttachmentInfo) => {
    if (!ticket) return;
    try {
      const blob = await ticketService.downloadAttachment(ticket.id, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: "Erreur téléchargement", type: "error" });
    }
  };

  // ==========================================================================
  // HELPERS DISPLAY
  // ==========================================================================

  const getSlaColor = useCallback(() => {
    if (!ticket) return "text-ds-muted";
    if (ticket.overdue || ticket.breachedSla) return "text-red-600 dark:text-red-400";
    if (ticket.slaWarning) return "text-orange-500 dark:text-orange-400";
    return "text-green-600 dark:text-green-400";
  }, [ticket]);

  const getSlaBarColor = useCallback(() => {
    if (!ticket) return "bg-gray-300";
    if (ticket.breachedSla || ticket.overdue) return "bg-red-500";
    if (ticket.slaWarning) return "bg-orange-500";
    return "bg-green-500";
  }, [ticket]);

  // Merge comments + history for Activity timeline
  const getActivityTimeline = useCallback(() => {
    if (!ticket) return [];
    const items: Array<{
      id: string;
      type: "comment" | "event";
      date: string;
      content: string;
      author: string;
      authorRole?: string;
      isInternal?: boolean;
      action?: string;
      oldValue?: string;
      newValue?: string;
      details?: string;
    }> = [];

    comments.forEach(c => {
      items.push({
        id: `c-${c.id}`,
        type: "comment",
        date: c.createdAt,
        content: c.content,
        author: c.authorName,
        authorRole: c.authorRole,
        isInternal: c.isInternal,
      });
    });

    history.forEach(h => {
      items.push({
        id: `h-${h.id}`,
        type: "event",
        date: h.createdAt,
        content: h.actionLabel || h.action,
        author: h.userName || "Système",
        action: h.action,
        oldValue: h.oldValue,
        newValue: h.newValue,
        details: h.details,
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [ticket, comments, history]);

  // ==========================================================================
  // RENDER NULL GUARD
  // ==========================================================================

  if (!isOpen) return null;

  const pCfg = ticket ? (priorityConfig[ticket.priority] || priorityConfig.MEDIUM) : priorityConfig.MEDIUM;
  const sCfg = ticket ? (statusConfig[ticket.status] || statusConfig.NEW) : statusConfig.NEW;

  // ==========================================================================
  // TAB RENDERERS
  // ==========================================================================

  const renderDetailsTab = () => {
    if (!ticket) return null;
    return (
      <div className="space-y-5">
        {/* ---- Infos rapides en grille ---- */}
        <div className="grid grid-cols-2 gap-4">
          {/* Statut — dropdown inline */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ds-muted uppercase tracking-wider">Statut</label>
            {canChangeStatus && ticket.allowedTransitions && ticket.allowedTransitions.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-ds-border hover:border-primary-400 transition-colors ${sCfg.bg} ${sCfg.text}`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sCfg.dot}`} />
                    {sCfg.label}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {showStatusDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-ds-card border border-ds-border rounded-lg shadow-lg overflow-hidden">
                    {ticket.allowedTransitions.map(s => {
                      const cfg = statusConfig[s] || statusConfig.NEW;
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setNewStatus(s);
                            setShowStatusDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-ds-elevated transition-colors flex items-center gap-2"
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${sCfg.bg} ${sCfg.text} flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full ${sCfg.dot}`} />
                {sCfg.label}
              </div>
            )}
          </div>

          {/* Priorité — badge */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ds-muted uppercase tracking-wider">Priorité</label>
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${pCfg.bg} ${pCfg.text}`}>
              {pCfg.label}
            </div>
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ds-muted uppercase tracking-wider">Catégorie</label>
            <div className="px-3 py-2 rounded-lg text-sm bg-ds-elevated text-ds-primary">
              {ticket.categoryLabel || CategoryLabels[ticket.category] || ticket.category}
            </div>
          </div>

          {/* Assignation */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ds-muted uppercase tracking-wider">Assigné à</label>
            {canAssign ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAssignDropdown(!showAssignDropdown);
                    if (!showAssignDropdown && agents.length === 0) loadAgents();
                  }}
                  disabled={submittingAssign}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border border-ds-border hover:border-primary-400 transition-colors ${
                    ticket.assignedToName ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserPlus size={14} />
                    {ticket.assignedToName || "Non assigné"}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {showAssignDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-ds-card border border-ds-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {ticket.assignedToId && (
                      <button
                        onClick={() => {
                          handleUnassign();
                          setShowAssignDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 border-b border-ds-border"
                      >
                        <UserMinus size={14} />
                        Désassigner
                      </button>
                    )}
                    {loadingAgents ? (
                      <div className="px-3 py-4 text-center text-ds-muted text-sm">
                        <Loader2 size={16} className="animate-spin inline mr-2" />
                        Chargement...
                      </div>
                    ) : agents.length === 0 ? (
                      <div className="px-3 py-3 text-center text-ds-muted text-sm">Aucun agent</div>
                    ) : (
                      agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            handleAssign(agent.id);
                            setShowAssignDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-ds-elevated transition-colors flex items-center gap-2 ${
                            agent.id === ticket.assignedToId ? "bg-primary-50 dark:bg-primary-900/20 font-medium" : ""
                          }`}
                        >
                          <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {agent.fullName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="truncate">{agent.fullName}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={`px-3 py-2 rounded-lg text-sm ${
                ticket.assignedToName ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
              }`}>
                {ticket.assignedToName || "Non assigné"}
              </div>
            )}
          </div>
        </div>

        {/* ---- Informations client ---- */}
        <div className="bg-ds-elevated/50 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-semibold text-ds-muted uppercase tracking-wider mb-2">Informations</h4>
          <InfoRow label="Client" value={ticket.clientName || ticket.clientCompanyName || "—"} />
          <InfoRow label="Entreprise" value={ticket.clientCompanyName || "—"} />
          <InfoRow label="Service" value={ticket.serviceName || "—"} />
          <InfoRow label="Créé par" value={ticket.createdByName || "—"} />
          <InfoRow label="Créé le" value={formatDate(ticket.createdAt)} />
          {ticket.resolvedAt && <InfoRow label="Résolu le" value={formatDate(ticket.resolvedAt)} />}
          {ticket.closedAt && <InfoRow label="Fermé le" value={formatDate(ticket.closedAt)} />}
        </div>

        {/* ---- Description ---- */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-ds-muted uppercase tracking-wider">Description</h4>
          <div className="bg-ds-elevated/50 rounded-xl p-4">
            <p className="text-sm text-ds-primary whitespace-pre-wrap leading-relaxed">
              {ticket.description || <span className="text-ds-muted italic">Aucune description fournie.</span>}
            </p>
          </div>
        </div>

        {/* ---- Resolution ---- */}
        {ticket.resolution && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-600" />
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">Résolution</h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-400">{ticket.resolution}</p>
          </div>
        )}

        {/* ---- SLA mini card ---- */}
        <div className="bg-ds-elevated/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ds-muted uppercase tracking-wider">SLA</span>
            <span className={`text-sm font-semibold ${getSlaColor()}`}>
              {formatSlaRemaining(ticket.slaRemainingMinutes)}
            </span>
          </div>
          <div className="w-full bg-ds-page rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getSlaBarColor()}`}
              style={{ width: `${Math.min(100, ticket.slaPercentage || 0)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-ds-muted">
            <span>{ticket.slaHours}h accordées</span>
            <span>{(ticket.slaPercentage || 0).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // ACTIVITY TAB
  // --------------------------------------------------------------------------

  const renderActivityTab = () => {
    const timeline = getActivityTimeline();
    if (timeline.length === 0) {
      return (
        <div className="text-center py-12">
          <Activity size={36} className="text-ds-muted mx-auto mb-3" />
          <p className="text-ds-muted text-sm">Aucune activité enregistrée.</p>
        </div>
      );
    }
    return (
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-ds-border" />
        <div className="space-y-0">
          {timeline.map((item) => (
            <div key={item.id} className="relative pl-10 pb-6">
              {/* Dot */}
              <div className={`absolute left-[11px] top-1 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${
                item.type === "comment"
                  ? item.isInternal ? "bg-amber-400" : "bg-primary-500"
                  : "bg-gray-400 dark:bg-gray-500"
              }`} />
              
              <div className={`rounded-lg p-3 ${
                item.type === "comment"
                  ? item.isInternal
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                    : "bg-ds-elevated border border-ds-border"
                  : "bg-transparent"
              }`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ds-primary">{item.author}</span>
                    {item.type === "comment" && item.authorRole && roleConfig[item.authorRole] && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleConfig[item.authorRole].color}`}>
                        {roleConfig[item.authorRole].label}
                      </span>
                    )}
                    {item.isInternal && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                        <Shield size={9} /> Interne
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ds-muted flex-shrink-0">{formatDateShort(item.date)}</span>
                </div>

                {item.type === "comment" ? (
                  <p className="text-sm text-ds-primary whitespace-pre-wrap">{item.content}</p>
                ) : (
                  <div className="text-sm">
                    <p className="text-ds-secondary font-medium">{item.content}</p>
                    {item.oldValue && item.newValue && (
                      <p className="text-xs mt-0.5 text-ds-muted">
                        <span className="line-through text-red-400">{item.oldValue}</span>
                        {" → "}
                        <span className="text-green-600 dark:text-green-400 font-medium">{item.newValue}</span>
                      </p>
                    )}
                    {item.details && (
                      <p className="text-xs text-ds-muted italic mt-0.5">{item.details}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // COMMENTS TAB
  // --------------------------------------------------------------------------

  const renderCommentsTab = () => {
    if (!ticket) return null;

    const visibleComments = comments.filter(
      (c) => !c.isInternal || isStaff
    );

    return (
      <div className="space-y-4">
        {/* Comment list */}
        {visibleComments.length > 0 ? (
          <div className="space-y-3">
            {visibleComments.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border ${
                  c.isInternal
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-ds-elevated border-ds-border"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      c.authorRole === "ADMIN" ? "bg-red-500" :
                      c.authorRole === "MANAGER" ? "bg-purple-500" :
                      c.authorRole === "AGENT" ? "bg-green-500" : "bg-primary-500"
                    }`}>
                      {c.authorName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-ds-primary">{c.authorName}</span>
                      {c.authorRole && roleConfig[c.authorRole] && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleConfig[c.authorRole].color}`}>
                          {roleConfig[c.authorRole].label}
                        </span>
                      )}
                    </div>
                    {c.isInternal && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                        <Shield size={10} /> Note interne
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ds-muted">{formatDateShort(c.createdAt)}</span>
                </div>
                <p className="text-sm text-ds-primary whitespace-pre-wrap leading-relaxed pl-9">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Inbox size={32} className="text-ds-muted mx-auto mb-2" />
            <p className="text-ds-muted text-sm">Aucun commentaire pour le moment.</p>
          </div>
        )}

        {/* ---- Comment form ---- */}
        <form onSubmit={handleAddComment} className="border-t border-ds-border pt-4 space-y-3">
          {/* Internal/Reply toggle */}
          {isStaff && (
            <div className="flex items-center gap-1 bg-ds-elevated rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsInternal(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  !isInternal
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-ds-muted hover:text-ds-primary"
                }`}
              >
                <MessageSquare size={12} />
                Réponse client
              </button>
              <button
                type="button"
                onClick={() => setIsInternal(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isInternal
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-ds-muted hover:text-ds-primary"
                }`}
              >
                <Shield size={12} />
                Note interne
              </button>
            </div>
          )}

          {/* Quick replies */}
          <QuickReplies
            context={{
              client: ticket.clientName || "",
              ticketId: ticket.ticketNumber,
              service: ticket.serviceName || "",
            }}
            onSelect={(content) => setCommentText(prev => prev ? `${prev}\n${content}` : content)}
            userRole={userRole}
          />

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={isInternal ? "Écrire une note interne (invisible pour le client)..." : "Écrire une réponse au client..."}
            rows={3}
            className={`w-full px-4 py-3 border rounded-xl bg-ds-elevated text-ds-primary focus:ring-2 resize-none transition-colors ${
              isInternal
                ? "border-amber-300 dark:border-amber-700 focus:ring-amber-500/30 focus:border-amber-500"
                : "border-ds-border focus:ring-primary-500/30 focus:border-primary-500"
            }`}
          />

          <div className="flex justify-between items-center">
            {isInternal && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Shield size={12} />
                Cette note sera invisible pour le client
              </p>
            )}
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isInternal
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-primary-600 hover:bg-primary-700 text-white"
              }`}
            >
              {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submittingComment ? "Envoi..." : isInternal ? "Ajouter note" : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // SLA TAB
  // --------------------------------------------------------------------------

  const renderSlaTab = () => {
    if (!ticket) return null;
    return (
      <div className="space-y-6">
        {/* SLA Status Hero */}
        <div className={`rounded-xl p-6 text-center ${
          ticket.breachedSla || ticket.overdue
            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            : ticket.slaWarning
            ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
            : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
        }`}>
          {ticket.breachedSla || ticket.overdue ? (
            <AlertTriangle size={36} className="text-red-500 mx-auto mb-2" />
          ) : ticket.slaWarning ? (
            <AlertTriangle size={36} className="text-orange-500 mx-auto mb-2" />
          ) : (
            <CheckCircle size={36} className="text-green-500 mx-auto mb-2" />
          )}
          <h3 className={`text-lg font-bold ${getSlaColor()}`}>
            {ticket.breachedSla || ticket.overdue
              ? "SLA Dépassé"
              : ticket.slaWarning
              ? "Approche du SLA"
              : "Dans les délais"}
          </h3>
          <p className={`text-2xl font-mono font-bold mt-1 ${getSlaColor()}`}>
            {formatSlaRemaining(ticket.slaRemainingMinutes)}
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-ds-muted mb-1">
            <span>0%</span>
            <span className={`font-semibold ${getSlaColor()}`}>{(ticket.slaPercentage || 0).toFixed(0)}%</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-ds-elevated rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${getSlaBarColor()}`}
              style={{ width: `${Math.min(100, ticket.slaPercentage || 0)}%` }}
            />
          </div>
        </div>

        {/* Détails SLA */}
        <div className="bg-ds-elevated/50 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-ds-muted uppercase tracking-wider">Détails SLA</h4>
          <InfoRow label="Délai accordé" value={`${ticket.slaHours || 0}h`} />
          <InfoRow label="Deadline" value={formatDate(ticket.deadline)} highlight={ticket.breachedSla} />
          <InfoRow label="Temps restant" value={formatSlaRemaining(ticket.slaRemainingMinutes)} highlight={ticket.breachedSla} />
          <InfoRow label="Progression" value={`${(ticket.slaPercentage || 0).toFixed(1)}%`} />
          <InfoRow label="Dépassé" value={ticket.breachedSla ? "Oui" : "Non"} highlight={ticket.breachedSla} />
        </div>

        {/* Timestamps */}
        <div className="bg-ds-elevated/50 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-ds-muted uppercase tracking-wider">Chronologie</h4>
          <InfoRow label="Créé le" value={formatDate(ticket.createdAt)} />
          {ticket.resolvedAt && <InfoRow label="Résolu le" value={formatDate(ticket.resolvedAt)} />}
          {ticket.closedAt && <InfoRow label="Fermé le" value={formatDate(ticket.closedAt)} />}
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // ATTACHMENTS TAB
  // --------------------------------------------------------------------------

  const renderAttachmentsTab = () => {
    if (!ticket) return null;
    const attachments = ticket.attachments || [];

    return (
      <div className="space-y-4">
        {/* Upload button */}
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUploadAttachment}
            className="hidden"
            accept="*/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Upload en cours..." : "Ajouter un fichier"}
          </button>
        </div>

        {/* Attachment list */}
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-ds-elevated rounded-xl border border-ds-border hover:border-primary-300 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <File size={18} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ds-primary truncate">{att.fileName}</p>
                    <p className="text-xs text-ds-muted">
                      {formatFileSize(att.fileSize)} · {att.uploadedByName || "—"} · {formatDateShort(att.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadAttachment(att)}
                  className="p-2 text-ds-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Télécharger"
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Paperclip size={36} className="text-ds-muted mx-auto mb-3" />
            <p className="text-ds-muted text-sm">Aucune pièce jointe.</p>
            <p className="text-ds-muted text-xs mt-1">Cliquez sur « Ajouter un fichier » pour en ajouter.</p>
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // HISTORY TAB
  // --------------------------------------------------------------------------

  const renderHistoryTab = () => {
    if (!ticket) return null;

    if (history.length === 0) {
      return (
        <div className="text-center py-12">
          <History size={36} className="text-ds-muted mx-auto mb-3" />
          <p className="text-ds-muted text-sm">Aucun historique enregistré.</p>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-ds-border" />
        <div className="space-y-0">
          {[...history].reverse().map((h, idx) => (
            <div key={h.id || idx} className="relative pl-10 pb-5">
              {/* Dot */}
              <div className="absolute left-[11px] top-1.5 w-3 h-3 rounded-full bg-primary-500 ring-2 ring-white dark:ring-gray-900" />
              
              <div>
                <p className="text-sm font-medium text-ds-primary">
                  {h.actionLabel || h.action}
                </p>
                {h.oldValue && h.newValue && (
                  <p className="text-xs mt-0.5 text-ds-muted">
                    <span className="line-through text-red-400">{h.oldValue}</span>
                    {" → "}
                    <span className="text-green-600 dark:text-green-400 font-medium">{h.newValue}</span>
                  </p>
                )}
                {h.details && (
                  <p className="text-xs text-ds-secondary mt-0.5 italic">{h.details}</p>
                )}
                <p className="text-xs text-ds-muted mt-1">
                  {h.userName || "Système"} — {formatDate(h.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // STATUS CHANGE INLINE PANEL
  // ==========================================================================

  const renderStatusChangePanel = () => {
    if (!newStatus) return null;
    const cfg = statusConfig[newStatus] || statusConfig.NEW;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => { setNewStatus(""); setResolution(""); setStatusComment(""); }}>
        <div className="bg-ds-card rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-ds-primary">Changer le statut</h3>
            <button onClick={() => { setNewStatus(""); setResolution(""); setStatusComment(""); }} className="p-1 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-ds-elevated">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-sm font-medium text-ds-primary">{cfg.label}</span>
            </div>

            {newStatus === "RESOLVED" && (
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Résolution *</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                  placeholder="Décrire la résolution apportée..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Commentaire (optionnel)</label>
              <textarea
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                placeholder="Raison du changement..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setNewStatus(""); setResolution(""); setStatusComment(""); }}
              className="px-4 py-2 text-ds-primary bg-ds-elevated rounded-lg hover:bg-ds-border text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleStatusChange}
              disabled={submittingStatus || (newStatus === "RESOLVED" && !resolution.trim())}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm inline-flex items-center gap-2"
            >
              {submittingStatus && <Loader2 size={14} className="animate-spin" />}
              {submittingStatus ? "Enregistrement..." : "Confirmer"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} width="3xl">
        {/* ==== CUSTOM HEADER (replaces Drawer's title) ==== */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="mt-3 text-sm text-ds-muted">Chargement du ticket...</p>
            </div>
          </div>
        ) : ticket ? (
          <div className="flex flex-col h-full -m-4">
            {/* ---- Toast ---- */}
            {toast && (
              <div className={`mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                toast.type === "success"
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}>
                {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {toast.message}
                <button onClick={() => setToast(null)} className="ml-auto p-0.5 hover:opacity-70">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ---- Sticky header ---- */}
            <div className="px-5 pt-4 pb-3 border-b border-ds-border flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ds-muted">{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sCfg.bg} ${sCfg.text}`}>
                      {sCfg.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pCfg.bg} ${pCfg.text}`}>
                      {pCfg.label}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-ds-primary leading-tight truncate">
                    {ticket.title}
                  </h2>
                  <p className="text-xs text-ds-muted mt-0.5">
                    {ticket.clientCompanyName || ticket.clientName} · {ticket.serviceName || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-all"
                    title="Rafraîchir"
                  >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-all"
                    title="Fermer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* ---- Tabs bar ---- */}
            <div className="px-5 flex-shrink-0 overflow-x-auto">
              <Tabs
                tabs={buildTabs(ticket)}
                activeKey={activeTab}
                onChange={setActiveTab}
                variant="underline"
              />
            </div>

            {/* ---- Tab content (scrollable) ---- */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "details" && renderDetailsTab()}
              {activeTab === "activity" && renderActivityTab()}
              {activeTab === "comments" && renderCommentsTab()}
              {activeTab === "sla" && renderSlaTab()}
              {activeTab === "attachments" && renderAttachmentsTab()}
              {activeTab === "history" && renderHistoryTab()}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <AlertTriangle size={36} className="text-red-500 mx-auto mb-3" />
            <p className="text-ds-primary font-semibold">Ticket introuvable</p>
            <p className="text-ds-muted text-sm mt-1">Le ticket demandé n'existe pas ou vous n'y avez pas accès.</p>
          </div>
        )}
      </Drawer>

      {/* Status change modal (over drawer) */}
      {renderStatusChangePanel()}
    </>
  );
};

// =============================================================================
// SUB-COMPONENT
// =============================================================================

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex justify-between text-sm">
    <span className="text-ds-muted">{label}</span>
    <span className={`font-medium text-right max-w-[60%] truncate ${
      highlight ? "text-red-600 dark:text-red-400" : "text-ds-primary"
    }`}>
      {value}
    </span>
  </div>
);

export default TicketDrawer;
