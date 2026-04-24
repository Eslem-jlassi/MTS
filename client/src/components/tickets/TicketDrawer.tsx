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
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { RootState } from "../../redux/store";
import { Tabs, Tab, Card, Badge } from "../ui";
import Drawer from "../ui/Drawer";
import QuickReplies from "./QuickReplies";
import { getErrorMessage } from "../../api/client";
import { ticketService } from "../../api/ticketService";
import { userService } from "../../api/userService";
import { sentimentService, SentimentResponse } from "../../api/sentimentService";
import { duplicateService, DuplicateResponse, RecentTicket } from "../../api/duplicateService";
import { incidentService } from "../../api/incidentService";
import { telecomServiceService } from "../../api/telecomServiceService";
import {
  Ticket,
  TicketStatus,
  TicketComment as TicketCommentType,
  TicketHistory,
  TicketAttachmentInfo,
  UserRole,
  UserResponse,
  CategoryLabels,
  TicketCategory,
  type Incident,
  type TelecomService,
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
  Lock,
  UserPlus,
  UserCheck,
  UserMinus,
  Upload,
  Download,
  File,
  Inbox,
  RefreshCw,
  ChevronDown,
  X,
  Trash2,
  Brain,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Copy,
  Link2,
} from "lucide-react";
import {
  formatDateTime as formatDateTimeValue,
  formatDurationMinutes,
  formatFileSize as formatFileSizeValue,
  formatHours,
  formatNumberValue,
  formatPercent,
  formatSlaRemaining as formatSlaRemainingValue,
} from "../../utils/formatters";
import {
  getSlaTone,
  roleVisuals,
  ticketPriorityTone,
  ticketPriorityVisuals,
  ticketStatusVisuals,
  toneBadgeVariant,
  toneDotClass,
  type SemanticTone,
  toneSoftPanelClass,
  toneTextClass,
} from "../../utils/uiSemantics";
import ManagerCopilotTicketCard from "../manager-copilot/ManagerCopilotTicketCard";
import {
  buildManagerCopilotTicketContext,
  type ManagerCopilotTicketActionId,
} from "../manager-copilot/managerCopilotTicketContext";
import { isManagerCopilotAllowedRole } from "../manager-copilot/managerCopilotUi";
import { useManagerCopilot } from "../manager-copilot/useManagerCopilot";

// =============================================================================
// TYPES & PROPS
// =============================================================================

interface TicketDrawerProps {
  ticketId: number | null;
  isOpen: boolean;
  requestedTab?: string;
  actionContext?: string;
  onClose: () => void;
  onRequestHardDelete?: (ticket: Ticket) => void;
  onTicketUpdated?: () => void; // callback pour rafraîchir la liste
}

// =============================================================================
// CONFIG BADGES
// =============================================================================

const legacyPriorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-200",
    label: "Critique",
  },
  HIGH: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-800 dark:text-orange-200",
    label: "Haute",
  },
  MEDIUM: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Moyenne",
  },
  LOW: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-200",
    label: "Basse",
  },
};

const legacyStatusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  NEW: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-200",
    label: "Nouveau",
    dot: "bg-blue-500",
  },
  ASSIGNED: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-200",
    label: "Assigné",
    dot: "bg-indigo-500",
  },
  IN_PROGRESS: {
    bg: "bg-primary-100 dark:bg-primary-900/30",
    text: "text-primary-800 dark:text-primary-200",
    label: "En cours",
    dot: "bg-primary-500",
  },
  PENDING: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "En attente client",
    dot: "bg-yellow-500",
  },
  PENDING_THIRD_PARTY: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-200",
    label: "En attente tiers",
    dot: "bg-amber-500",
  },
  ESCALATED: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-200",
    label: "Escaladé",
    dot: "bg-purple-500",
  },
  RESOLVED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-200",
    label: "Résolu",
    dot: "bg-green-500",
  },
  CLOSED: {
    bg: "bg-gray-100 dark:bg-gray-700/30",
    text: "text-gray-800 dark:text-gray-200",
    label: "Fermé",
    dot: "bg-gray-500",
  },
  CANCELLED: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-300",
    label: "Annulé",
    dot: "bg-red-400",
  },
};

const legacyRoleConfig: Record<string, { label: string; color: string }> = {
  CLIENT: {
    label: "Client",
    color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  },
  AGENT: {
    label: "Agent",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  MANAGER: {
    label: "Manager",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  ADMIN: { label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const priorityConfig = (ticketPriorityVisuals || legacyPriorityConfig) as Record<
  string,
  (typeof ticketPriorityVisuals)[keyof typeof ticketPriorityVisuals]
>;
const statusConfig = (ticketStatusVisuals || legacyStatusConfig) as Record<
  string,
  (typeof ticketStatusVisuals)[TicketStatus]
>;
const roleConfig = (roleVisuals || legacyRoleConfig) as Record<
  string,
  (typeof roleVisuals)[UserRole]
>;

const normalizeInsightValue = (value?: string | null) => (value || "").trim().toUpperCase();

const getConfidenceTone = (score?: number | null): SemanticTone => {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "neutral";
  }

  if (score >= 0.85) {
    return "success";
  }

  if (score >= 0.6) {
    return "warning";
  }

  return "neutral";
};

const getSentimentTone = (sentiment?: string | null): SemanticTone => {
  const normalized = normalizeInsightValue(sentiment);

  if (normalized === "NEGATIF" || normalized === "NEGATIVE") {
    return "danger";
  }

  if (normalized === "POSITIF" || normalized === "POSITIVE") {
    return "success";
  }

  return "warning";
};

const getDuplicateTone = (result?: DuplicateResponse | null): SemanticTone => {
  if (!result) {
    return "neutral";
  }

  if (result.is_duplicate) {
    return "danger";
  }

  if (result.possible_mass_incident || result.matched_tickets.length > 0) {
    return "warning";
  }

  return "success";
};

const getDuplicateLevelTone = (level?: string | null): SemanticTone => {
  const normalized = normalizeInsightValue(level);

  if (normalized === "HIGH") {
    return "danger";
  }

  if (normalized === "MEDIUM") {
    return "warning";
  }

  return "neutral";
};

// =============================================================================
// TABS DEFINITION
// =============================================================================

const buildTabs = (ticket: Ticket | null): Tab[] => [
  { key: "details", label: "Détails", icon: <FileText size={14} /> },
  {
    key: "activity",
    label: "Activité",
    icon: <Activity size={14} />,
    badge: (ticket?.comments?.length || 0) + (ticket?.history?.length || 0),
  },
  {
    key: "comments",
    label: "Commentaires",
    icon: <MessageSquare size={14} />,
    badge: ticket?.commentCount || 0,
  },
  { key: "sla", label: "SLA", icon: <Clock size={14} /> },
  {
    key: "attachments",
    label: "Pièces jointes",
    icon: <Paperclip size={14} />,
    badge: ticket?.attachments?.length || 0,
  },
  {
    key: "history",
    label: "Historique",
    icon: <History size={14} />,
    badge: ticket?.history?.length || 0,
  },
];

// =============================================================================
// HELPERS
// =============================================================================

const dedupeIncidents = (items: Incident[]): Incident[] => {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};

const normalizeAiFallbackMessage = (message: string, defaultMessage: string): string => {
  const cleaned = message
    .replace(/\s*V[eé]rifiez que le service Python tourne sur\s+https?:\/\/\S+\.?/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) {
    return defaultMessage;
  }

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
};

const buildSentimentFallback = (message: string): SentimentResponse => {
  const normalizedMessage = normalizeAiFallbackMessage(
    message,
    "Analyse IA temporairement indisponible.",
  );

  return {
    available: true,
    message: normalizedMessage,
    category: "N/A",
    priority: "LOW",
    service: "N/A",
    urgency: "NORMAL",
    sentiment: "NEUTRE",
    criticality: "NORMAL",
    confidence: 0,
    reasoning: normalizedMessage,
    score: 0,
    label: "SERVICE_UNAVAILABLE",
    details: normalizedMessage,
    stars: 0,
    is_angry: false,
    priority_flag: "NORMAL",
    model_version: "sentiment-hybrid-2.1.0",
    fallback_mode: "service_unavailable",
    reasoning_steps: ["Service IA indisponible, qualification manuelle recommandée."],
    recommended_actions: [
      "Poursuivre la qualification manuelle et relancer l'analyse IA plus tard.",
    ],
    risk_flags: ["SERVICE_UNAVAILABLE"],
    missing_information: [],
    sources: ["ui-fallback"],
    latency_ms: 0,
  };
};

const buildDuplicateFallback = (message: string): DuplicateResponse => {
  const normalizedMessage = normalizeAiFallbackMessage(
    message,
    "Detection de doublons temporairement indisponible.",
  );

  return {
    available: true,
    message: normalizedMessage,
    is_duplicate: false,
    possible_mass_incident: false,
    duplicate_confidence: 0,
    confidence: 0,
    matched_tickets: [],
    reasoning: normalizedMessage,
    recommendation:
      "Aucun rapprochement automatique disponible. Poursuivre la vérification manuelle.",
    model_version: "duplicate-detector-1.1.0",
    fallback_mode: "service_unavailable",
    reasoning_steps: ["Service IA indisponible, vérification manuelle nécessaire."],
    recommended_actions: ["Comparer manuellement avec les tickets recents."],
    risk_flags: ["SERVICE_UNAVAILABLE"],
    missing_information: [],
    sources: ["ui-fallback"],
    latency_ms: 0,
  };
};

const resolveUserDisplayName = (
  user: Pick<UserResponse, "fullName" | "firstName" | "lastName" | "email"> | null | undefined,
): string => {
  if (!user) {
    return "Agent";
  }

  const fullName = user.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const composedName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (composedName) {
    return composedName;
  }

  const email = user.email?.trim();
  return email || "Agent";
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TicketDrawer: React.FC<TicketDrawerProps> = ({
  ticketId,
  isOpen,
  requestedTab,
  actionContext,
  onClose,
  onRequestHardDelete,
  onTicketUpdated,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role as UserRole | undefined;
  const isAdmin = userRole === UserRole.ADMIN;
  const isStaff = Boolean(userRole && ["ADMIN", "MANAGER", "AGENT"].includes(userRole));
  const canAssign = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
  const canChangeStatus = isStaff;
  const isManagerContext = userRole === UserRole.MANAGER && isManagerCopilotAllowedRole(userRole);

  // --- Core state ---
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const canTakeOwnership = Boolean(userRole === UserRole.AGENT && ticket?.canTakeOwnership);
  const [activeTab, setActiveTab] = useState("details");
  const [entryTab, setEntryTab] = useState<string | undefined>(undefined);
  const [entryActionContext, setEntryActionContext] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [relatedService, setRelatedService] = useState<TelecomService | null>(null);
  const [relatedIncidents, setRelatedIncidents] = useState<Incident[]>([]);

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
  const [rootCause, setRootCause] = useState("");
  const [finalCategory, setFinalCategory] = useState<TicketCategory | "">("");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState("");
  const [impact, setImpact] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // --- Assignment ---
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [agents, setAgents] = useState<UserResponse[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignDropdownStyle, setAssignDropdownStyle] = useState<React.CSSProperties>({});

  // --- Attachments ---
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignmentPanelRef = useRef<HTMLDivElement>(null);
  const assignmentButtonRef = useRef<HTMLButtonElement>(null);
  const assignmentDropdownRef = useRef<HTMLDivElement>(null);

  // --- Sentiment Analysis ---
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  // --- Duplicate Detection ---
  const [duplicates, setDuplicates] = useState<DuplicateResponse | null>(null);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicatesError, setDuplicatesError] = useState<string | null>(null);
  const canRequestHardDelete = Boolean(isAdmin && ticket);
  const { snapshot: managerCopilotSnapshot } = useManagerCopilot({
    enabled: Boolean(isOpen && isManagerContext && ticket?.serviceId),
    filters: ticket?.serviceId ? { serviceId: ticket.serviceId } : undefined,
    role: userRole,
  });

  useEffect(() => {
    if (!isOpen) return;

    setEntryTab(requestedTab);
    setEntryActionContext(actionContext);

    const nextTab =
      requestedTab &&
      ["details", "activity", "comments", "sla", "attachments", "history"].includes(requestedTab)
        ? requestedTab
        : "details";

    setActiveTab(nextTab);
  }, [actionContext, isOpen, requestedTab, ticketId]);

  useEffect(() => {
    if (!isOpen || (!requestedTab && !actionContext)) {
      return;
    }

    const params = new URLSearchParams(location.search);
    params.delete("drawerTab");
    params.delete("drawerFocus");
    const cleanedSearch = params.toString();

    navigate(
      {
        pathname: location.pathname,
        search: cleanedSearch ? `?${cleanedSearch}` : "",
      },
      { replace: true },
    );
  }, [actionContext, isOpen, location.pathname, location.search, navigate, requestedTab]);

  // Auto-analyse IA quand le ticket est chargé
  useEffect(() => {
    if (!ticket || !isOpen) return;
    // Reset quand on change de ticket
    setSentiment(null);
    setSentimentError(null);
    // Lancer l'analyse automatiquement
    const runAnalysis = async () => {
      setSentimentLoading(true);
      try {
        const result = await sentimentService.analyze(
          ticket.title,
          ticket.description || undefined,
        );
        setSentiment(result);
      } catch (error) {
        setSentiment(buildSentimentFallback(getErrorMessage(error)));
        setSentimentError(null);
      } finally {
        setSentimentLoading(false);
      }
    };
    runAnalysis();
  }, [ticket, isOpen]);

  // Auto-détection de doublons quand le ticket est chargé
  useEffect(() => {
    if (!ticket || !isOpen) return;
    setDuplicates(null);
    setDuplicatesError(null);

    const runDuplicateCheck = async () => {
      setDuplicatesLoading(true);
      try {
        // Récupérer les 20 tickets récents pour comparaison
        const page = await ticketService.getTickets(undefined, {
          page: 0,
          size: 20,
          sort: "createdAt",
          direction: "DESC",
        });
        const recentTickets: RecentTicket[] = page.content
          .filter((t) => t.id !== ticket.id)
          .map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description || undefined,
            service: t.serviceName || undefined,
            status: t.status,
            created_at: t.createdAt,
          }));

        if (recentTickets.length === 0) return;

        const result = await duplicateService.detectDuplicates(
          {
            title: ticket.title,
            description: ticket.description || undefined,
            service: ticket.serviceName || undefined,
            client_id: ticket.clientId,
            created_at: ticket.createdAt,
          },
          recentTickets,
        );
        setDuplicates(result);
      } catch (error) {
        setDuplicates(buildDuplicateFallback(getErrorMessage(error)));
        setDuplicatesError(null);
      } finally {
        setDuplicatesLoading(false);
      }
    };
    runDuplicateCheck();
  }, [ticket, isOpen]);

  useEffect(() => {
    if (!ticket?.serviceId || !isOpen || !isManagerContext) {
      setRelatedService(null);
      setRelatedIncidents([]);
      return;
    }

    let isCancelled = false;

    const loadManagerContext = async () => {
      const [serviceResult, primaryIncidentsResult, affectedIncidentsResult] =
        await Promise.allSettled([
          telecomServiceService.getServiceById(ticket.serviceId),
          incidentService.getByService(ticket.serviceId),
          incidentService.getByAffectedService(ticket.serviceId),
        ]);

      if (isCancelled) {
        return;
      }

      setRelatedService(serviceResult.status === "fulfilled" ? serviceResult.value : null);

      const mergedIncidents = dedupeIncidents([
        ...(primaryIncidentsResult.status === "fulfilled" ? primaryIncidentsResult.value : []),
        ...(affectedIncidentsResult.status === "fulfilled" ? affectedIncidentsResult.value : []),
      ]);
      setRelatedIncidents(mergedIncidents);
    };

    void loadManagerContext();

    return () => {
      isCancelled = true;
    };
  }, [ticket?.id, ticket?.serviceId, isOpen, isManagerContext]);

  // --- Toast ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const resetStatusForm = useCallback(() => {
    setNewStatus("");
    setResolution("");
    setRootCause("");
    setFinalCategory("");
    setTimeSpentMinutes("");
    setImpact("");
    setStatusComment("");
  }, []);

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
    setShowStatusDropdown(false);
    setShowAssignDropdown(false);
    setEntryTab(undefined);
    setEntryActionContext(undefined);
    setNewStatus("");
    setResolution("");
    setRootCause("");
    setFinalCategory("");
    setTimeSpentMinutes("");
    setImpact("");
    setStatusComment("");
    loadTicket().finally(() => setLoading(false));
  }, [ticketId, isOpen, loadTicket]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setShowStatusDropdown(false);
    setShowAssignDropdown(false);
    setNewStatus("");
    setResolution("");
    setRootCause("");
    setFinalCategory("");
    setTimeSpentMinutes("");
    setImpact("");
    setStatusComment("");
  }, [isOpen]);

  // Load separate comments & history when switching to those tabs
  const loadComments = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await ticketService.getComments(ticketId);
      setComments(data);
    } catch {
      /* silent */
    }
  }, [ticketId]);

  const loadHistory = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await ticketService.getHistory(ticketId);
      setHistory(data);
    } catch {
      /* silent */
    }
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
      setToast({
        message: isInternal ? "Note interne ajoutée" : "Commentaire ajouté",
        type: "success",
      });
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
        rootCause: rootCause || undefined,
        finalCategory: finalCategory || undefined,
        timeSpentMinutes: timeSpentMinutes ? Number(timeSpentMinutes) : undefined,
        impact: impact || undefined,
        comment: statusComment || undefined,
      });
      setShowStatusDropdown(false);
      resetStatusForm();
      const label = statusConfig[newStatus]?.label || newStatus;
      setToast({ message: `Statut → "${label}"`, type: "success" });
      await loadTicket();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || "Erreur changement statut",
        type: "error",
      });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const list = await userService.getAgents();
      setAgents(list);
      return list;
    } catch {
      setToast({ message: "Erreur chargement agents", type: "error" });
      return [];
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  const closeAssignDropdown = useCallback((restoreFocus = false) => {
    setShowAssignDropdown(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        assignmentButtonRef.current?.focus();
      });
    }
  }, []);

  const updateAssignDropdownPosition = useCallback(() => {
    const trigger = assignmentButtonRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const gap = 8;
    const minMenuHeight = 160;
    const preferredMenuHeight = 280;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
    const availableAbove = rect.top - viewportPadding - gap;
    const openAbove = availableBelow < minMenuHeight && availableAbove > availableBelow;
    const usableHeight = openAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(144, Math.min(preferredMenuHeight, usableHeight));
    const minDropdownWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const width = Math.min(
      Math.max(rect.width, minDropdownWidth),
      window.innerWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - viewportPadding - width,
    );
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - gap - maxHeight)
      : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap);

    setAssignDropdownStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight,
      zIndex: 140,
    });
  }, []);

  const openAssignDropdown = useCallback(() => {
    if (!canAssign) {
      return;
    }
    setShowAssignDropdown(true);
    if (agents.length === 0) {
      void loadAgents();
    }
  }, [agents.length, canAssign, loadAgents]);

  const toggleAssignDropdown = useCallback(() => {
    if (!canAssign) {
      return;
    }
    if (showAssignDropdown) {
      closeAssignDropdown();
      return;
    }
    openAssignDropdown();
  }, [canAssign, closeAssignDropdown, openAssignDropdown, showAssignDropdown]);

  useEffect(() => {
    if (!showAssignDropdown) {
      return;
    }

    updateAssignDropdownPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (assignmentDropdownRef.current?.contains(target)) {
        return;
      }
      if (assignmentButtonRef.current?.contains(target)) {
        return;
      }
      closeAssignDropdown();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAssignDropdown(true);
      }
    };

    const handleViewportChange = () => {
      updateAssignDropdownPosition();
    };

    const focusFirstOption = window.requestAnimationFrame(() => {
      updateAssignDropdownPosition();
      assignmentDropdownRef.current
        ?.querySelector<HTMLButtonElement>("[data-assign-option]")
        ?.focus();
    });

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(focusFirstOption);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeAssignDropdown, showAssignDropdown, updateAssignDropdownPosition]);

  const handleAssign = async (agentId: number) => {
    if (!ticket) return;
    setSubmittingAssign(true);
    try {
      await ticketService.assignTicket(ticket.id, { agentId });
      const agent = agents.find((a) => a.id === agentId);
      setShowAssignDropdown(false);
      setToast({
        message: `Assigne a ${resolveUserDisplayName(agent)}`,
        type: "success",
      });
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

  const handleTakeOwnership = async () => {
    if (!ticket) return;
    setSubmittingAssign(true);
    try {
      await ticketService.takeTicket(ticket.id);
      setToast({ message: "Ticket pris en charge", type: "success" });
      await loadTicket();
      onTicketUpdated?.();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || "Erreur prise en charge", type: "error" });
    } finally {
      setSubmittingAssign(false);
    }
  };

  const renderAssignDropdownPortal = () => {
    if (!showAssignDropdown || !ticket) {
      return null;
    }

    const currentAssignmentLabel = ticket.assignedToName || "Non assigné";

    return createPortal(
      <div
        ref={assignmentDropdownRef}
        id={`ticket-assignment-menu-${ticket.id}`}
        role="menu"
        aria-label="Menu d'assignation du ticket"
        data-testid="ticket-assignment-menu"
        className="flex flex-col overflow-hidden rounded-xl border border-ds-border bg-ds-card shadow-dropdown backdrop-blur-sm"
        style={assignDropdownStyle}
      >
        <div className="border-b border-ds-border bg-ds-elevated/55 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">
            Affectation actuelle
          </p>
          <p className="truncate text-sm font-semibold text-ds-primary">{currentAssignmentLabel}</p>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto py-1"
          style={{ scrollbarWidth: "thin", overscrollBehavior: "contain" }}
        >
          {ticket.assignedToId && (
            <button
              type="button"
              data-assign-option
              role="menuitem"
              onClick={() => {
                void handleUnassign();
                closeAssignDropdown();
              }}
              className="flex w-full items-center gap-2 border-b border-ds-border px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <UserMinus size={14} />
              Désassigner
            </button>
          )}
          {loadingAgents ? (
            <div className="px-3 py-4 text-center text-sm text-ds-muted">
              <Loader2 size={16} className="mr-2 inline animate-spin" />
              Chargement...
            </div>
          ) : agents.length === 0 ? (
            <div className="px-3 py-3 text-center text-sm text-ds-muted">Aucun agent</div>
          ) : (
            agents.map((agent) => {
              const displayName = resolveUserDisplayName(agent);
              const isCurrentAssignee = agent.id === ticket.assignedToId;

              return (
                <button
                  key={agent.id}
                  type="button"
                  data-assign-option
                  role="menuitem"
                  disabled={isCurrentAssignee}
                  onClick={() => {
                    void handleAssign(agent.id);
                    closeAssignDropdown();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ds-elevated disabled:cursor-default disabled:opacity-100 ${
                    isCurrentAssignee ? "bg-primary-50 dark:bg-primary-900/20" : ""
                  }`}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {displayName.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ds-primary">{displayName}</p>
                    {agent.email && <p className="truncate text-xs text-ds-muted">{agent.email}</p>}
                  </div>
                  {isCurrentAssignee && (
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                      Actuel
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>,
      document.body,
    );
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
    return toneTextClass(getSlaTone(ticket));
  }, [ticket]);

  const getSlaBarColor = useCallback(() => {
    return toneDotClass(getSlaTone(ticket));
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

    comments.forEach((c) => {
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

    history.forEach((h) => {
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

  const pCfg = ticket
    ? priorityConfig[ticket.priority] || priorityConfig.MEDIUM
    : priorityConfig.MEDIUM;
  const sCfg = ticket ? statusConfig[ticket.status] || statusConfig.NEW : statusConfig.NEW;
  const isCollaborationLocked =
    ticket?.status === TicketStatus.CLOSED || ticket?.status === TicketStatus.CANCELLED;
  const isAssignmentLocked =
    ticket !== null &&
    [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(ticket.status);
  const visibleCommentsCount = comments.filter((c) => !c.isInternal || isStaff).length;
  const activityCount = comments.length + history.length;
  const attachmentCount = ticket?.attachments?.length || 0;
  const headerMetrics = ticket
    ? [
        {
          label: "SLA",
          value: formatSlaRemainingValue(ticket.slaRemainingMinutes),
          helper: formatPercent(ticket.slaPercentage || 0),
          tone:
            ticket.breachedSla || ticket.overdue
              ? "danger"
              : ticket.slaWarning
                ? "warning"
                : "success",
          icon: <Clock size={16} />,
        },
        {
          label: "Assignation",
          value: ticket.assignedToName || "Non assigné",
          helper:
            canAssign && isAssignmentLocked
              ? "Verrouillée"
              : ticket.assignedToId
                ? "En cours"
                : "À traiter",
          tone: ticket.assignedToId ? "info" : "neutral",
          icon: <UserPlus size={16} />,
        },
        {
          label: "Activité",
          value: `${activityCount}`,
          helper: `${visibleCommentsCount} commentaire(s) visibles`,
          tone: activityCount > 0 ? "default" : "neutral",
          icon: <Activity size={16} />,
        },
        {
          label: "Pièces jointes",
          value: `${attachmentCount}`,
          helper: attachmentCount > 0 ? "Disponibles" : "Aucune",
          tone: attachmentCount > 0 ? "info" : "neutral",
          icon: <Paperclip size={16} />,
        },
      ]
    : [];
  const allieTicketContext =
    ticket && isManagerContext
      ? buildManagerCopilotTicketContext({
          ticket,
          duplicates,
          service: relatedService,
          incidents: relatedIncidents,
          snapshot: managerCopilotSnapshot,
          canAssign: Boolean(canAssign),
          isAssignmentLocked,
        })
      : null;

  const focusAssignmentPanel = useCallback(() => {
    setActiveTab("details");
    setShowAssignDropdown(true);

    if (agents.length === 0) {
      void loadAgents();
    }

    window.requestAnimationFrame(() => {
      assignmentPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [agents.length, loadAgents]);

  useEffect(() => {
    if (!isOpen || !ticket || entryActionContext !== "assign" || showAssignDropdown) {
      return;
    }

    focusAssignmentPanel();
  }, [entryActionContext, focusAssignmentPanel, isOpen, showAssignDropdown, ticket]);

  // ==========================================================================
  // RENDER NULL GUARD
  // ==========================================================================

  if (!isOpen) return null;

  const handleAllieAction = (actionId: ManagerCopilotTicketActionId) => {
    if (!allieTicketContext) {
      return;
    }

    switch (actionId) {
      case "assign-recommended":
        if (allieTicketContext.recommendedAgentId) {
          void handleAssign(allieTicketContext.recommendedAgentId);
          return;
        }

        focusAssignmentPanel();
        return;

      case "open-assignment":
        focusAssignmentPanel();
        return;

      case "open-sla":
        setActiveTab("sla");
        return;

      case "open-service-health":
        if (allieTicketContext.serviceHealthHref) {
          navigate(allieTicketContext.serviceHealthHref);
        }
        return;

      case "open-incidents":
        if (allieTicketContext.incidentsHref) {
          navigate(allieTicketContext.incidentsHref);
        }
        return;

      case "prepare-incident":
        navigate("/incidents/new", {
          state: allieTicketContext.incidentDraftState,
        });
        return;

      case "view-similar":
        if (allieTicketContext.similarTicketsHref) {
          navigate(allieTicketContext.similarTicketsHref);
        }
        return;

      default:
        return;
    }
  };

  // ==========================================================================
  // TAB RENDERERS
  // ==========================================================================

  const renderDetailsTab = () => {
    if (!ticket) return null;
    const assignmentStateLabel = isAssignmentLocked
      ? "Assignation verrouillée"
      : ticket.assignedToId
        ? "Ticket assigné"
        : "Ticket non assigné";
    const assignmentStateTone = isAssignmentLocked
      ? toneSoftPanelClass("neutral")
      : ticket.assignedToId
        ? toneSoftPanelClass("success")
        : toneSoftPanelClass("warning");
    return (
      <div className="space-y-6">
        {isManagerContext && entryActionContext === "assign" && (
          <div className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 text-sm text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
            ALLIE a préparé ce ticket pour une décision d'affectation. Vérifiez ici l'agent
            recommandé puis validez l'assignation si le contexte vous convient.
          </div>
        )}

        {isAdmin && onRequestHardDelete && (
          <SectionCard
            icon={<Shield size={18} />}
            title="Action définitive admin"
            subtitle="Suppression physique avec re-authentification et audit."
            className="overflow-visible"
          >
            {canRequestHardDelete && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Cette action est irreversible, tracee dans l'audit et declenche le nettoyage
                  backend associe.
                </p>
                <button
                  type="button"
                  onClick={() => onRequestHardDelete(ticket)}
                  data-testid="ticket-hard-delete-action"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
                >
                  <Trash2 size={15} />
                  Supprimer définitivement
                </button>
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard
          icon={<FileText size={18} />}
          title="Pilotage du ticket"
          subtitle="Statut, priorité, catégorie et assignation."
          className="overflow-visible"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Statut — dropdown inline */}
            <FieldPanel
              label="Statut"
              helper="Transitions disponibles sans quitter le drawer."
              className="h-full"
            >
              {canChangeStatus &&
              ticket.allowedTransitions &&
              ticket.allowedTransitions.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg border border-ds-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary-400 ${sCfg.bg} ${sCfg.text}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${sCfg.dot}`} />
                      {sCfg.label}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-ds-border bg-ds-card shadow-lg">
                      {ticket.allowedTransitions.map((s) => {
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
                <div
                  className={`flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${sCfg.bg} ${sCfg.text}`}
                >
                  <span className={`w-2 h-2 rounded-full ${sCfg.dot}`} />
                  {sCfg.label}
                </div>
              )}
            </FieldPanel>

            {/* Priorité — badge */}
            <FieldPanel label="Priorité" helper="Niveau de traitement attendu." className="h-full">
              <div
                className={`flex min-h-[40px] items-center rounded-lg px-3 py-2 text-sm font-medium ${pCfg.bg} ${pCfg.text}`}
              >
                {pCfg.label}
              </div>
            </FieldPanel>

            {/* Catégorie */}
            <FieldPanel
              label="Catégorie"
              helper="Classification métier du ticket."
              className="h-full"
            >
              <div className="flex min-h-[40px] items-center rounded-lg bg-ds-elevated px-3 py-2 text-sm text-ds-primary">
                {ticket.categoryLabel || CategoryLabels[ticket.category] || ticket.category}
              </div>
            </FieldPanel>

            {/* Assignation */}
            <div ref={assignmentPanelRef}>
              <FieldPanel
                label="Assignation"
                helper={
                  canAssign
                    ? "Modification réservée admin/manager tant que le ticket n'est pas résolu, fermé ou annulé."
                    : "Lecture seule pour votre rôle."
                }
                className="h-full"
              >
                {canAssign ? (
                  <div className="relative space-y-2">
                    <button
                      ref={assignmentButtonRef}
                      type="button"
                      onClick={toggleAssignDropdown}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" && !showAssignDropdown) {
                          event.preventDefault();
                          openAssignDropdown();
                        }
                      }}
                      disabled={submittingAssign || isAssignmentLocked}
                      aria-expanded={showAssignDropdown}
                      aria-haspopup="menu"
                      aria-controls={ticket ? `ticket-assignment-menu-${ticket.id}` : undefined}
                      data-testid="ticket-assignment-trigger"
                      className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${assignmentStateTone} ${
                        !isAssignmentLocked ? "hover:border-primary-400" : ""
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {ticket.assignedToId ? (
                          <UserCheck size={14} className="flex-shrink-0" />
                        ) : (
                          <UserPlus size={14} className="flex-shrink-0" />
                        )}
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-xs uppercase tracking-[0.14em] opacity-80">
                            {assignmentStateLabel}
                          </span>
                          <span className="block truncate font-semibold text-ds-primary">
                            {ticket.assignedToName || "Non assigné"}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-ds-muted">
                        {isAssignmentLocked && <Lock size={13} />}
                        <ChevronDown size={14} className="flex-shrink-0" />
                      </span>
                    </button>
                    {renderAssignDropdownPortal()}
                    {isAssignmentLocked && (
                      <p className="mt-2 text-xs text-ds-muted">
                        L'assignation est verrouillée après résolution, clôture ou annulation.
                      </p>
                    )}
                  </div>
                ) : canTakeOwnership ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleTakeOwnership();
                      }}
                      disabled={submittingAssign || isAssignmentLocked}
                      data-testid="ticket-take-ownership-trigger"
                      className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${assignmentStateTone} ${
                        !isAssignmentLocked ? "hover:border-primary-400" : ""
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <UserPlus size={14} className="flex-shrink-0" />
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-xs uppercase tracking-[0.14em] opacity-80">
                            Ticket disponible
                          </span>
                          <span className="block truncate font-semibold text-ds-primary">
                            Prendre le ticket
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-ds-muted">
                        {isAssignmentLocked && <Lock size={13} />}
                        <UserCheck size={14} className="flex-shrink-0" />
                      </span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex min-h-[40px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${assignmentStateTone}`}
                  >
                    <span className="truncate font-semibold text-ds-primary">
                      {ticket.assignedToName || "Non assigné"}
                    </span>
                    <span className="rounded-full bg-ds-card/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-muted">
                      Lecture seule
                    </span>
                  </div>
                )}
              </FieldPanel>
            </div>
          </div>
        </SectionCard>

        {/* ---- Informations client ---- */}
        <SectionCard
          icon={<Inbox size={18} />}
          title="Contexte support"
          subtitle="Client, service et horodatages utiles."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <InlineFact
              label="Client"
              value={ticket.clientName || ticket.clientCompanyName || "-"}
            />
            <InlineFact label="Entreprise" value={ticket.clientCompanyName || "-"} />
            <InlineFact label="Service" value={ticket.serviceName || "-"} />
            <InlineFact label="Créé par" value={ticket.createdByName || "-"} />
            <InlineFact
              label="Assignation"
              value={ticket.assignedToName || "Non assigné"}
              tone={ticket.assignedToId ? "success" : "default"}
            />
            <InlineFact label="Statut actuel" value={sCfg.label} />
            <InlineFact label="Créé le" value={formatDateTimeValue(ticket.createdAt)} />
            {ticket.resolvedAt && (
              <InlineFact label="Résolu le" value={formatDateTimeValue(ticket.resolvedAt)} />
            )}
            {ticket.closedAt && (
              <InlineFact label="Fermé le" value={formatDateTimeValue(ticket.closedAt)} />
            )}
          </div>
        </SectionCard>

        {/* ---- Description ---- */}
        <SectionCard
          icon={<MessageSquare size={18} />}
          title="Signalement"
          subtitle="Description initiale du besoin ou de l'incident."
        >
          <div className="rounded-2xl border border-ds-border/70 bg-ds-elevated/45 p-4">
            <p className="text-sm text-ds-primary whitespace-pre-wrap leading-relaxed">
              {ticket.description || (
                <span className="text-ds-muted italic">Aucune description fournie.</span>
              )}
            </p>
          </div>
        </SectionCard>

        {/* ---- Classification IA (auto-chargée) ---- */}
        <SectionCard
          icon={<Brain size={18} />}
          title="Proposition IA"
          subtitle="Synthèse automatique pour accélérer la qualification du ticket."
          action={
            sentiment ? (
              <button
                onClick={async () => {
                  setSentimentLoading(true);
                  setSentimentError(null);
                  try {
                    const result = await sentimentService.analyze(
                      ticket.title,
                      ticket.description || undefined,
                    );
                    setSentiment(result);
                  } catch (error) {
                    setSentiment(buildSentimentFallback(getErrorMessage(error)));
                    setSentimentError(null);
                  } finally {
                    setSentimentLoading(false);
                  }
                }}
                disabled={sentimentLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-ai-200 bg-ai-50 px-3 py-2 text-xs font-semibold text-ai-700 transition-colors hover:bg-ai-100 disabled:opacity-50 dark:border-ai-500/20 dark:bg-ai-500/10 dark:text-ai-200 dark:hover:bg-ai-500/16"
              >
                {sentimentLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Zap size={12} />
                )}
                Ré-analyser
              </button>
            ) : undefined
          }
        >
          {/* Loading state */}
          {sentimentLoading && !sentiment && (
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${toneSoftPanelClass("ai")}`}>
              <Loader2 size={16} className={`animate-spin ${toneTextClass("ai")}`} />
              <span className={`text-sm ${toneTextClass("ai")}`}>
                Analyse IA en cours...
              </span>
            </div>
          )}

          {sentimentError && !sentiment && (
            <div className={`rounded-xl border p-3 ${toneSoftPanelClass("danger")}`}>
              <p className={`flex items-center gap-1 text-xs ${toneTextClass("danger")}`}>
                <AlertTriangle size={12} /> {sentimentError}
              </p>
            </div>
          )}

          {sentiment && (
            <div
              className={`space-y-3 rounded-xl border p-4 ${toneSoftPanelClass(getSentimentTone(sentiment.sentiment))}`}
            >
              {/* Alerte criticité */}
              {sentiment.criticality === "HIGH" && (
                <Badge variant={toneBadgeVariant("danger")} size="sm" icon={<AlertTriangle size={12} />}>
                  Criticité haute
                </Badge>
              )}

              {/* Ligne 1 : Sentiment + Confiance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sentiment.sentiment === "NEGATIF" || sentiment.sentiment === "NEGATIVE" ? (
                    <ThumbsDown size={18} className={toneTextClass("danger")} />
                  ) : sentiment.sentiment === "POSITIF" || sentiment.sentiment === "POSITIVE" ? (
                    <ThumbsUp size={18} className={toneTextClass("success")} />
                  ) : (
                    <Meh size={18} className={toneTextClass("warning")} />
                  )}
                  <span className={`text-sm font-bold ${toneTextClass(getSentimentTone(sentiment.sentiment))}`}>
                    Sentiment : {sentiment.sentiment}
                  </span>
                </div>
                <Badge
                  variant={toneBadgeVariant(getConfidenceTone(sentiment.confidence))}
                  size="sm"
                  className="font-mono"
                >
                  Confiance : {formatPercent(sentiment.confidence * 100)}
                </Badge>
              </div>

              {/* Ligne 2 : Badges Catégorie / Service / Priorité / Urgence */}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={toneBadgeVariant("info")} size="sm">
                  Catégorie : {sentiment.category}
                </Badge>
                <Badge variant={toneBadgeVariant("ai")} size="sm">
                  Service : {sentiment.service}
                </Badge>
                <Badge
                  variant={toneBadgeVariant(ticketPriorityTone[sentiment.priority as keyof typeof ticketPriorityTone] || "neutral")}
                  size="sm"
                >
                  Priorité : {sentiment.priority}
                </Badge>
                <Badge variant={toneBadgeVariant("neutral")} size="sm">
                  Urgence : {sentiment.urgency}
                </Badge>
              </div>

              {/* Ligne 3 : Raisonnement */}
              <p className="text-xs text-ds-muted italic leading-relaxed">{sentiment.reasoning}</p>

              {(sentiment.reasoning_steps?.length || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-ds-secondary uppercase tracking-wide">
                    Etapes explicables
                  </p>
                  <ul className="space-y-1">
                    {sentiment.reasoning_steps?.slice(0, 4).map((step, index) => (
                      <li key={`sentiment-step-${index}`} className="text-xs text-ds-primary">
                        • {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(sentiment.recommended_actions?.length || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-ds-secondary uppercase tracking-wide">
                    Actions recommandées
                  </p>
                  <ul className="space-y-1">
                    {sentiment.recommended_actions?.slice(0, 3).map((action, index) => (
                      <li key={`sentiment-action-${index}`} className="text-xs text-ds-primary">
                        • {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(sentiment.risk_flags?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sentiment.risk_flags?.map((flag) => (
                    <span
                      key={flag}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}

              {(sentiment.missing_information?.length || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-ds-secondary uppercase tracking-wide">
                    Informations manquantes
                  </p>
                  <ul className="space-y-1">
                    {sentiment.missing_information?.map((item) => (
                      <li key={item} className="text-xs text-ds-primary">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 text-[11px] text-ds-muted">
                {sentiment.model_version && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    modele: {sentiment.model_version}
                  </span>
                )}
                {sentiment.fallback_mode && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    mode: {sentiment.fallback_mode}
                  </span>
                )}
                {typeof sentiment.latency_ms === "number" && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    latence: {formatNumberValue(sentiment.latency_ms, { maximumFractionDigits: 1 })}{" "}
                    ms
                  </span>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ---- Détection de Doublons IA ---- */}
        <SectionCard
          icon={<Copy size={18} />}
          title="Doublons IA"
          subtitle="Recherche de tickets proches pour qualifier un doublon ou un incident de masse."
        >
          {/* Loading */}
          {duplicatesLoading && (
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${toneSoftPanelClass("ai")}`}>
              <Loader2 size={16} className={`animate-spin ${toneTextClass("ai")}`} />
              <span className={`text-sm ${toneTextClass("ai")}`}>
                Recherche de doublons...
              </span>
            </div>
          )}

          {/* Erreur */}
          {duplicatesError && !duplicates && (
            <div className={`rounded-xl border p-3 ${toneSoftPanelClass("danger")}`}>
              <p className={`flex items-center gap-1 text-xs ${toneTextClass("danger")}`}>
                <AlertTriangle size={12} /> {duplicatesError}
              </p>
            </div>
          )}

          {/* Résultat */}
          {duplicates && !duplicatesLoading && (
            <div
              className={`space-y-3 rounded-xl border p-4 ${toneSoftPanelClass(getDuplicateTone(duplicates))}`}
            >
              {/* Alerte incident de masse */}
              {duplicates.possible_mass_incident && (
                <Badge variant={toneBadgeVariant("warning")} size="sm" icon={<AlertTriangle size={12} />}>
                  Incident de masse probable
                </Badge>
              )}

              {/* Alerte doublon */}
              {duplicates.is_duplicate && !duplicates.possible_mass_incident && (
                <Badge variant={toneBadgeVariant("danger")} size="sm" icon={<Copy size={12} />}>
                  Doublon probable détecté
                </Badge>
              )}

              {/* Badge résumé */}
              <div className="flex items-center gap-2">
                {duplicates.matched_tickets.length === 0 ? (
                  <Badge variant={toneBadgeVariant("success")} size="sm" icon={<CheckCircle size={10} />}>
                    Aucun doublon
                  </Badge>
                ) : (
                  <Badge
                    variant={toneBadgeVariant(duplicates.is_duplicate ? "danger" : "warning")}
                    size="sm"
                  >
                    {duplicates.matched_tickets.length} ticket(s) similaire(s)
                  </Badge>
                )}
                {duplicates.duplicate_confidence > 0 && (
                  <Badge
                    variant={toneBadgeVariant(getConfidenceTone(duplicates.duplicate_confidence))}
                    size="sm"
                    className="font-mono"
                  >
                    Score max : {formatPercent(duplicates.duplicate_confidence * 100)}
                  </Badge>
                )}
              </div>

              {/* Liste des tickets similaires */}
              {duplicates.matched_tickets.length > 0 && (
                <div className="space-y-1.5">
                  {duplicates.matched_tickets.map((match) => (
                    <div
                      key={match.ticket_id}
                      className="flex items-center justify-between bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Link2 size={12} className="text-ds-muted flex-shrink-0" />
                        <span className="text-xs text-ds-primary truncate">
                          #{match.ticket_id} — {match.title}
                        </span>
                      </div>
                      <Badge
                        variant={toneBadgeVariant(getDuplicateLevelTone(match.duplicate_level))}
                        size="sm"
                        className="ml-2 flex-shrink-0 font-bold"
                      >
                        {formatPercent(match.similarity_score * 100)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommandation */}
              <p className="text-xs text-ds-muted italic leading-relaxed">
                {duplicates.recommendation}
              </p>

              {(duplicates.reasoning_steps?.length || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-ds-secondary uppercase tracking-wide">
                    Etapes explicables
                  </p>
                  <ul className="space-y-1">
                    {duplicates.reasoning_steps?.slice(0, 4).map((step, index) => (
                      <li key={`duplicate-step-${index}`} className="text-xs text-ds-primary">
                        • {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(duplicates.recommended_actions?.length || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-ds-secondary uppercase tracking-wide">
                    Actions recommandées
                  </p>
                  <ul className="space-y-1">
                    {duplicates.recommended_actions?.slice(0, 3).map((action, index) => (
                      <li key={`duplicate-action-${index}`} className="text-xs text-ds-primary">
                        • {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(duplicates.risk_flags?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {duplicates.risk_flags?.map((flag) => (
                    <span
                      key={flag}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}

              {(duplicates.missing_information?.length || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-ds-secondary uppercase tracking-wide">
                    Informations manquantes
                  </p>
                  <ul className="space-y-1">
                    {duplicates.missing_information?.map((item) => (
                      <li key={item} className="text-xs text-ds-primary">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 text-[11px] text-ds-muted">
                {duplicates.model_version && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    modele: {duplicates.model_version}
                  </span>
                )}
                {duplicates.fallback_mode && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    mode: {duplicates.fallback_mode}
                  </span>
                )}
                {typeof duplicates.latency_ms === "number" && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    latence:{" "}
                    {formatNumberValue(duplicates.latency_ms, { maximumFractionDigits: 1 })} ms
                  </span>
                )}
                {(duplicates.sources?.length || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                    sources: {duplicates.sources?.slice(0, 2).join(" | ")}
                  </span>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ---- Resolution ---- */}
        {ticket.resolution &&
          [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status) && (
            <div className={`rounded-xl border p-4 ${toneSoftPanelClass("success")}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className={toneTextClass("success")} />
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Résolution
                </h4>
              </div>
              <p className={`text-sm ${toneTextClass("success")}`}>{ticket.resolution}</p>
              {(ticket.rootCause ||
                ticket.finalCategory ||
                ticket.timeSpentMinutes !== undefined ||
                ticket.impact) && (
                <div
                  className={`mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 ${toneTextClass("success")}`}
                >
                  {ticket.rootCause && (
                    <span>
                      <strong>Cause racine :</strong> {ticket.rootCause}
                    </span>
                  )}
                  {ticket.finalCategory && (
                    <span>
                      <strong>Catégorie finale :</strong>{" "}
                      {CategoryLabels[ticket.finalCategory] || ticket.finalCategory}
                    </span>
                  )}
                  {ticket.timeSpentMinutes !== undefined && (
                    <span>
                      <strong>Temps passé :</strong>{" "}
                      {formatDurationMinutes(ticket.timeSpentMinutes)}
                    </span>
                  )}
                  {ticket.impact && (
                    <span>
                      <strong>Impact :</strong> {ticket.impact}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        {/* ---- SLA mini card ---- */}
        <div className="bg-ds-elevated/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ds-muted uppercase tracking-wider">
              SLA
            </span>
            <span className={`text-sm font-semibold ${getSlaColor()}`}>
              {formatSlaRemainingValue(ticket.slaRemainingMinutes)}
            </span>
          </div>
          <div className="w-full bg-ds-page rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getSlaBarColor()}`}
              style={{ width: `${Math.min(100, ticket.slaPercentage || 0)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-ds-muted">
            <span>{formatHours(ticket.slaHours)} accordées</span>
            <span>{formatPercent(ticket.slaPercentage || 0)}</span>
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
              <div
                className={`absolute left-[11px] top-1 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${
                  item.type === "comment"
                    ? item.isInternal
                      ? "bg-amber-400"
                      : "bg-primary-500"
                    : "bg-gray-400 dark:bg-gray-500"
                }`}
              />

              <div
                className={`rounded-lg p-3 ${
                  item.type === "comment"
                    ? item.isInternal
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                      : "bg-ds-elevated border border-ds-border"
                    : "bg-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ds-primary">{item.author}</span>
                    {item.type === "comment" && item.authorRole && roleConfig[item.authorRole] && (
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${roleConfig[item.authorRole].bg} ${roleConfig[item.authorRole].text} ${roleConfig[item.authorRole].border}`}
                      >
                        {roleConfig[item.authorRole].label}
                      </span>
                    )}
                    {item.isInternal && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                        <Shield size={9} /> Interne
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ds-muted flex-shrink-0">
                    {formatDateTimeValue(item.date)}
                  </span>
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
                        <span className="font-medium text-success-600 dark:text-success-400">
                          {item.newValue}
                        </span>
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

    const visibleComments = comments.filter((c) => !c.isInternal || isStaff);

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
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        c.authorRole === "ADMIN"
                          ? "bg-red-500"
                          : c.authorRole === "MANAGER"
                            ? "bg-purple-500"
                            : c.authorRole === "AGENT"
                              ? "bg-green-500"
                              : "bg-primary-500"
                      }`}
                    >
                      {c.authorName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-ds-primary">{c.authorName}</span>
                      {c.authorRole && roleConfig[c.authorRole] && (
                        <span
                          className={`ml-1.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${roleConfig[c.authorRole].bg} ${roleConfig[c.authorRole].text} ${roleConfig[c.authorRole].border}`}
                        >
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
                  <span className="text-xs text-ds-muted">{formatDateTimeValue(c.createdAt)}</span>
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
          {isCollaborationLocked && (
            <div className="rounded-lg border border-ds-border bg-ds-elevated px-4 py-3 text-sm text-ds-muted">
              Les commentaires et notes internes sont verrouillés sur un ticket clos ou annulé.
            </div>
          )}
          {/* Internal/Reply toggle */}
          {isStaff && (
            <div className="flex items-center gap-1 bg-ds-elevated rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsInternal(false)}
                disabled={isCollaborationLocked}
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
                disabled={isCollaborationLocked}
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
            onSelect={(content) =>
              setCommentText((prev) => (prev ? `${prev}\n${content}` : content))
            }
            userRole={userRole}
          />

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isCollaborationLocked}
            placeholder={
              isInternal
                ? "Écrire une note interne (invisible pour le client)..."
                : "Écrire une réponse au client..."
            }
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
              disabled={isCollaborationLocked || submittingComment || !commentText.trim()}
              className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isInternal
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-primary-600 hover:bg-primary-700 text-white"
              }`}
            >
              {submittingComment ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
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
        {isManagerContext && (entryActionContext === "sla" || entryTab === "sla") && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
            ALLIE a ouvert directement la vue SLA pour accelerer l'arbitrage manager sur ce dossier.
          </div>
        )}

        {/* SLA Status Hero */}
        <div
          className={`rounded-xl p-6 text-center ${
            ticket.breachedSla || ticket.overdue
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              : ticket.slaWarning
                ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          }`}
        >
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
            {formatSlaRemainingValue(ticket.slaRemainingMinutes)}
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-ds-muted mb-1">
            <span>0%</span>
            <span className={`font-semibold ${getSlaColor()}`}>
              {formatPercent(ticket.slaPercentage || 0)}
            </span>
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
          <h4 className="text-xs font-semibold text-ds-muted uppercase tracking-wider">
            Détails SLA
          </h4>
          <InfoRow label="Délai accordé" value={formatHours(ticket.slaHours || 0)} />
          <InfoRow
            label="Deadline"
            value={formatDateTimeValue(ticket.deadline)}
            highlight={ticket.breachedSla}
          />
          <InfoRow
            label="Temps restant"
            value={formatSlaRemainingValue(ticket.slaRemainingMinutes)}
            highlight={ticket.breachedSla}
          />
          <InfoRow label="Progression" value={formatPercent(ticket.slaPercentage || 0)} />
          <InfoRow
            label="Dépassé"
            value={ticket.breachedSla ? "Oui" : "Non"}
            highlight={ticket.breachedSla}
          />
        </div>

        {/* Timestamps */}
        <div className="bg-ds-elevated/50 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-ds-muted uppercase tracking-wider">
            Chronologie
          </h4>
          <InfoRow label="Créé le" value={formatDateTimeValue(ticket.createdAt)} />
          {ticket.resolvedAt && (
            <InfoRow label="Résolu le" value={formatDateTimeValue(ticket.resolvedAt)} />
          )}
          {ticket.closedAt && (
            <InfoRow label="Fermé le" value={formatDateTimeValue(ticket.closedAt)} />
          )}
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
        {isCollaborationLocked && (
          <div className="rounded-lg border border-ds-border bg-ds-elevated px-4 py-3 text-sm text-ds-muted">
            Les pièces jointes sont verrouillées sur un ticket clos ou annulé.
          </div>
        )}
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
            disabled={uploading || isCollaborationLocked}
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
                      {formatFileSizeValue(att.fileSize)} · {att.uploadedByName || "—"} ·{" "}
                      {formatDateTimeValue(att.createdAt)}
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
            <p className="text-ds-muted text-xs mt-1">
              Cliquez sur « Ajouter un fichier » pour en ajouter.
            </p>
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
          {history.map((h, idx) => (
            <div key={h.id || idx} className="relative pl-10 pb-5">
              {/* Dot */}
              <div className="absolute left-[11px] top-1.5 w-3 h-3 rounded-full bg-primary-500 ring-2 ring-white dark:ring-gray-900" />

              <div>
                <p className="text-sm font-medium text-ds-primary">{h.actionLabel || h.action}</p>
                {h.oldValue && h.newValue && (
                  <p className="text-xs mt-0.5 text-ds-muted">
                    <span className="line-through text-red-400">{h.oldValue}</span>
                    {" → "}
                    <span className="font-medium text-success-600 dark:text-success-400">
                      {h.newValue}
                    </span>
                  </p>
                )}
                {h.details && (
                  <p className="text-xs text-ds-secondary mt-0.5 italic">{h.details}</p>
                )}
                <p className="text-xs text-ds-muted mt-1">
                  {h.userName || "Système"} — {formatDateTimeValue(h.createdAt)}
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
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        onClick={resetStatusForm}
      >
        <div
          className="bg-ds-card rounded-xl shadow-xl w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-ds-primary">Changer le statut</h3>
            <button
              onClick={resetStatusForm}
              className="p-1 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated"
            >
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
                <label className="block text-sm font-medium text-ds-primary mb-1">
                  Résolution *
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                  placeholder="Décrire la résolution apportée..."
                />
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ds-primary mb-1">
                      Cause racine
                    </label>
                    <input
                      type="text"
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: saturation réseau, incident fournisseur..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ds-primary mb-1">
                        Catégorie finale
                      </label>
                      <select
                        value={finalCategory}
                        onChange={(e) => setFinalCategory(e.target.value as TicketCategory | "")}
                        className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Conserver la catégorie actuelle</option>
                        {Object.values(TicketCategory).map((category) => (
                          <option key={category} value={category}>
                            {CategoryLabels[category]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ds-primary mb-1">
                        Temps passé (min)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={timeSpentMinutes}
                        onChange={(e) => setTimeSpentMinutes(e.target.value)}
                        className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: 45"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ds-primary mb-1">
                      Impact métier
                    </label>
                    <input
                      type="text"
                      value={impact}
                      onChange={(e) => setImpact(e.target.value)}
                      className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: impact localisé, partiel, critique..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Commentaire (optionnel)
              </label>
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
              onClick={resetStatusForm}
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
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        width="3xl"
        contentClassName="flex-1 min-h-0 overflow-hidden p-0"
      >
        {/* ==== CUSTOM HEADER (replaces Drawer's title) ==== */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="mt-3 text-sm text-ds-muted">Chargement du ticket...</p>
            </div>
          </div>
        ) : ticket ? (
          <div className="flex h-full flex-col">
            {/* ---- Toast ---- */}
            {toast && (
              <div
                className={`mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  toast.type === "success"
                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                }`}
              >
                {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {toast.message}
                <button onClick={() => setToast(null)} className="ml-auto p-0.5 hover:opacity-70">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ---- Sticky header ---- */}
            <div className="px-5 pt-4 pb-4 border-b border-ds-border flex-shrink-0 bg-gradient-to-b from-primary-50/60 via-ds-card to-ds-card dark:from-primary-950/10 dark:via-ds-card dark:to-ds-card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="neutral" size="sm">
                      {ticket.ticketNumber}
                    </Badge>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${sCfg.bg} ${sCfg.text}`}
                    >
                      {sCfg.label}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${pCfg.bg} ${pCfg.text}`}
                    >
                      {pCfg.label}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ds-primary leading-tight">
                    {ticket.title}
                  </h2>
                  <p className="text-sm text-ds-secondary mt-1 leading-6">
                    {ticket.clientCompanyName || ticket.clientName} · {ticket.serviceName || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2.5 rounded-xl border border-ds-border text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-all"
                    title="Rafraîchir"
                  >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl border border-ds-border text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-all"
                    title="Fermer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {headerMetrics.map((metric) => (
                  <MetricTile
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    helper={metric.helper}
                    icon={metric.icon}
                    tone={
                      metric.tone as
                        | "default"
                        | "success"
                        | "warning"
                        | "danger"
                        | "info"
                        | "neutral"
                    }
                  />
                ))}
              </div>
            </div>

            {/* ---- Tabs bar ---- */}
            <div className="px-5 pt-2 flex-shrink-0 overflow-x-auto bg-ds-card/95">
              <Tabs
                tabs={buildTabs(ticket)}
                activeKey={activeTab}
                onChange={setActiveTab}
                variant="underline"
              />
            </div>

            {/* ---- Tab content (scrollable) ---- */}
            <div className="flex-1 overflow-y-auto px-5 py-5 pb-8">
              {allieTicketContext && (
                <ManagerCopilotTicketCard
                  context={allieTicketContext}
                  isBusy={submittingAssign || loadingAgents}
                  onAction={handleAllieAction}
                />
              )}
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
            <p className="text-ds-muted text-sm mt-1">
              Le ticket demandé n'existe pas ou vous n'y avez pas accès.
            </p>
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

const SectionCard: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "success";
}> = ({ icon, title, subtitle, action, children, className = "", tone = "default" }) => (
  <Card
    className={`overflow-hidden border ${
      tone === "success"
        ? "border-green-200 dark:border-green-800 bg-green-50/70 dark:bg-green-900/15"
        : "border-ds-border/80 bg-ds-card/92 shadow-card"
    } ${className}`}
  >
    <div className="flex items-start justify-between gap-4 border-b border-ds-border/70 pb-5">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="ds-icon-shell flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-primary-600 dark:text-primary-300">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ds-primary">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-ds-secondary">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
    <div className="mt-4">{children}</div>
  </Card>
);

const FieldPanel: React.FC<{
  label: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, helper, children, className = "" }) => (
  <div
    className={`rounded-2xl border border-ds-border/70 bg-ds-surface/70 p-3.5 space-y-2.5 ${className}`}
  >
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">{label}</p>
      {helper && <p className="mt-1 text-xs text-ds-secondary">{helper}</p>}
    </div>
    {children}
  </div>
);

const MetricTile: React.FC<{
  label: string;
  value: string;
  helper?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
}> = ({ label, value, helper, icon, tone = "default" }) => {
  const toneClasses: Record<string, string> = {
    default:
      "border-primary-200/70 bg-primary-50/80 dark:border-primary-500/20 dark:bg-primary-500/10",
    success: "border-green-200/70 bg-green-50/80 dark:border-green-500/20 dark:bg-green-500/10",
    warning: "border-orange-200/70 bg-orange-50/80 dark:border-orange-500/20 dark:bg-orange-500/10",
    danger: "border-red-200/70 bg-red-50/80 dark:border-red-500/20 dark:bg-red-500/10",
    info: "border-sky-200/70 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10",
    neutral: "border-ds-border/80 bg-ds-elevated/70",
  };

  return (
    <div className={`rounded-2xl border p-3 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
            {label}
          </p>
          <p className="mt-2 text-base font-semibold text-ds-primary break-words">{value}</p>
          {helper && <p className="mt-1 text-xs text-ds-secondary">{helper}</p>}
        </div>
        {icon && <div className="text-ds-muted flex-shrink-0">{icon}</div>}
      </div>
    </div>
  );
};

const InlineFact: React.FC<{
  label: string;
  value: string;
  tone?: "default" | "success";
}> = ({ label, value, tone = "default" }) => (
  <div
    className={`rounded-2xl border px-3.5 py-3 ${
      tone === "success"
        ? "border-green-200/70 bg-white/70 dark:border-green-700/60 dark:bg-green-950/20"
        : "border-ds-border/70 bg-ds-surface/70"
    }`}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ds-muted">{label}</p>
    <p className="mt-1 text-sm font-medium text-ds-primary break-words">{value}</p>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-3 text-sm items-start">
    <span className="text-ds-muted">{label}</span>
    <span
      className={`font-medium text-right break-words ${highlight ? "text-red-600 dark:text-red-400" : "text-ds-primary"}`}
    >
      {value}
    </span>
  </div>
);

export default TicketDrawer;
