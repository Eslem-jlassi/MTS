// =============================================================================
// MTS TELECOM - Page de détail d'un ticket (VERSION AMÉLIORÉE)
// =============================================================================
/**
 * ============================================================================
 * TicketDetail.tsx - Vue détaillée d'un ticket
 * ============================================================================
 *
 * RÔLE:
 * Affiche toutes les informations d'un ticket:
 * - Description et résolution
 * - Commentaires (publics + notes internes pour le staff)
 * - Historique/Timeline de toutes les actions
 * - Informations SLA (barre de progression, temps restant)
 * - Panel d'actions (changer statut, assigner/désassigner)
 *
 * AMÉLIORATIONS PAR RAPPORT À LA VERSION PRÉCÉDENTE:
 * ✅ Ajout du panel d'assignation (MANAGER/ADMIN)
 * ✅ Bouton de désassignation
 * ✅ Toast notifications au lieu de alert()
 * ✅ Affichage du temps SLA restant (heures:minutes)
 * ✅ Badge de rôle sur les commentaires
 * ✅ Meilleure gestion des états vides
 * ✅ Code mieux structuré et commenté
 *
 * FLUX DE DONNÉES:
 * 1. useParams() extrait l'ID du ticket depuis l'URL (/tickets/:id)
 * 2. useEffect() appelle l'API pour charger le ticket
 * 3. Le ticket est stocké dans le state local (pas Redux, car c'est une vue unitaire)
 * 4. Les actions (commentaire, statut, assignation) font des appels API directs
 * 5. Après chaque action, on recharge le ticket pour avoir les données fraîches
 *
 * ============================================================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { ticketService } from "../api";
import { userService } from "../api";
import {
  formatDateTime as formatDateTimeValue,
  formatDurationMinutes,
  formatHours,
  formatPercent,
  formatSlaRemaining as formatSlaRemainingValue,
} from "../utils/formatters";
import {
  getSlaTone,
  roleVisuals,
  ticketPriorityVisuals,
  ticketStatusVisuals,
  toneBadgeVariant,
  toneDotClass,
  toneSolidClass,
  toneSoftPanelClass,
  toneTextClass,
} from "../utils/uiSemantics";
import {
  Ticket,
  TicketStatus,
  TicketComment as TicketCommentType,
  TicketHistory,
  UserRole,
  UserResponse,
  TicketCategory,
  CategoryLabels,
} from "../types";
import Toast, { ToastMessage } from "../components/tickets/Toast";
import { Badge } from "../components/ui";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  History,
  UserPlus,
  UserMinus,
  Shield,
  Send,
  Loader2,
  FileText,
  Inbox,
} from "lucide-react";

// =============================================================================
// CONFIGURATION DES BADGES (priorité et statut)
// =============================================================================

const priorityConfig = ticketPriorityVisuals;

const legacyStatusConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  NEW: {
    bg: "bg-primary-100 dark:bg-primary-900/30",
    text: "text-primary-800 dark:text-primary-200",
    label: "Nouveau",
    icon: "inbox",
  },
  ASSIGNED: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-200",
    label: "Assigné",
    icon: "user-check",
  },
  IN_PROGRESS: {
    bg: "bg-primary-100 dark:bg-primary-900/30",
    text: "text-primary-800 dark:text-primary-200",
    label: "En cours",
    icon: "loader",
  },
  PENDING: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "En attente client",
    icon: "pause",
  },
  PENDING_THIRD_PARTY: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-200",
    label: "En attente tiers",
    icon: "clock",
  },
  ESCALATED: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-200",
    label: "Escaladé",
    icon: "alert-triangle",
  },
  RESOLVED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-200",
    label: "Résolu",
    icon: "check-circle",
  },
  CLOSED: { bg: "bg-ds-elevated", text: "text-ds-primary", label: "Fermé", icon: "archive" },
  CANCELLED: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-300",
    label: "Annulé",
    icon: "x-circle",
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

const statusConfig = (ticketStatusVisuals || legacyStatusConfig) as Record<
  string,
  (typeof ticketStatusVisuals)[TicketStatus]
>;
const roleConfig = (roleVisuals || legacyRoleConfig) as Record<
  string,
  (typeof roleVisuals)[UserRole]
>;

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TicketDetail: React.FC = () => {
  // ========== Hooks de navigation et paramètres ==========
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  // ========== État du ticket ==========
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========== État du formulaire de commentaire ==========
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== État du modal de changement de statut ==========
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<TicketStatus | "">("");
  const [resolution, setResolution] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [finalCategory, setFinalCategory] = useState<TicketCategory | "">("");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState("");
  const [impact, setImpact] = useState("");
  const [statusComment, setStatusComment] = useState("");

  // ========== État du panel d'assignation ==========
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [agents, setAgents] = useState<UserResponse[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [assignComment, setAssignComment] = useState("");

  // ========== Toast notifications ==========
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const userRole = user?.role as UserRole | undefined;
  const isStaff = userRole && ["ADMIN", "MANAGER", "AGENT"].includes(userRole);
  const canAssign = userRole && ["ADMIN", "MANAGER"].includes(userRole);
  const canChangeStatus = isStaff;
  const canTakeOwnership = Boolean(userRole === UserRole.AGENT && ticket?.canTakeOwnership);

  const resetStatusForm = useCallback(() => {
    setShowStatusModal(false);
    setNewStatus("");
    setResolution("");
    setRootCause("");
    setFinalCategory("");
    setTimeSpentMinutes("");
    setImpact("");
    setStatusComment("");
  }, []);

  // ==========================================================================
  // CHARGEMENT DU TICKET
  // ==========================================================================
  /**
   * Charge le ticket depuis l'API.
   *
   * POURQUOI useCallback?
   * → Empêche la re-création de la fonction à chaque rendu
   * → Nécessaire car loadTicket est une dépendance de useEffect
   */
  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await ticketService.getTicketById(Number(id));
      setTicket(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Impossible de charger le ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Ajoute un commentaire au ticket.
   *
   * FLUX:
   * 1. Valide que le texte n'est pas vide
   * 2. Envoie POST /api/tickets/{id}/comments
   * 3. Affiche un toast de succès
   * 4. Recharge le ticket pour voir le nouveau commentaire
   */
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText.trim()) return;
    setSubmitting(true);
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
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || "Erreur lors de l'ajout du commentaire",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Change le statut du ticket.
   *
   * FLUX:
   * 1. Valide qu'un statut est sélectionné
   * 2. Si RESOLVED → résolution obligatoire
   * 3. Envoie POST /api/tickets/{id}/status
   * 4. Ferme le modal et affiche un toast
   * 5. Recharge le ticket
   */
  const handleStatusChange = async () => {
    if (!ticket || !newStatus) return;
    setSubmitting(true);
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
      resetStatusForm();
      const statusLabel = statusConfig[newStatus]?.label || newStatus;
      setToast({ message: `Statut changé vers "${statusLabel}"`, type: "success" });
      await loadTicket();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || "Erreur lors du changement de statut",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Charge la liste des agents disponibles pour l'assignation.
   * Appelé quand le manager ouvre le panel d'assignation.
   */
  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const agentList = await userService.getAgents();
      setAgents(agentList);
    } catch (err: any) {
      setToast({ message: "Erreur de chargement des agents", type: "error" });
    } finally {
      setLoadingAgents(false);
    }
  };

  /**
   * Assigne le ticket à un agent.
   *
   * FLUX:
   * 1. Manager sélectionne un agent dans la liste déroulante
   * 2. Envoie POST /api/tickets/{id}/assign
   * 3. Ferme le panel et affiche un toast de succès
   * 4. Recharge le ticket
   */
  const handleAssign = async () => {
    if (!ticket || selectedAgentId === 0) return;
    setSubmitting(true);
    try {
      await ticketService.assignTicket(ticket.id, {
        agentId: selectedAgentId,
        comment: assignComment || undefined,
      });
      const agent = agents.find((a) => a.id === selectedAgentId);
      setShowAssignPanel(false);
      setSelectedAgentId(0);
      setAssignComment("");
      setToast({
        message: `Ticket assigné à ${agent?.fullName || "l'agent"}`,
        type: "success",
      });
      await loadTicket();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || "Erreur lors de l'assignation",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Désassigne le ticket (retire l'agent).
   *
   * FLUX:
   * 1. Manager clique sur "Désassigner"
   * 2. Envoie DELETE /api/tickets/{id}/assign
   * 3. Le ticket revient dans le pool non assigné
   */
  const handleTakeOwnership = async () => {
    if (!ticket) return;
    setSubmitting(true);
    try {
      await ticketService.takeTicket(ticket.id);
      setToast({ message: "Ticket pris en charge", type: "success" });
      await loadTicket();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || "Erreur lors de la prise en charge",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (!ticket) return;
    setSubmitting(true);
    try {
      await ticketService.unassignTicket(ticket.id);
      setToast({ message: "Agent désassigné du ticket", type: "success" });
      await loadTicket();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || "Erreur lors de la désassignation",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================================
  // HELPERS D'AFFICHAGE
  // ==========================================================================

  const getSlaColor = () => {
    return toneTextClass(getSlaTone(ticket));
  };

  const getSlaBarColor = () => {
    return toneDotClass(getSlaTone(ticket));
  };

  // ==========================================================================
  // ÉTATS DE CHARGEMENT ET D'ERREUR
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={36} className="animate-spin text-primary-600" />
        <p className="text-ds-muted">Chargement du ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-8">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ds-primary mb-2">Ticket introuvable</h2>
          <p className="text-ds-secondary mb-6">
            {error || "Le ticket demandé n'existe pas ou vous n'y avez pas accès."}
          </p>
          <button
            onClick={() => navigate("/tickets")}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Retour aux tickets
          </button>
        </div>
      </div>
    );
  }

  const pCfg = priorityConfig[ticket.priority] || priorityConfig.MEDIUM;
  const sCfg = statusConfig[ticket.status] || statusConfig.NEW;
  const isCollaborationLocked =
    ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED;
  const isAssignmentLocked = [
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
    TicketStatus.CANCELLED,
  ].includes(ticket.status);

  // ==========================================================================
  // RENDU PRINCIPAL
  // ==========================================================================
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* === HEADER === */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate("/tickets")}
            className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Retour aux tickets
          </button>
          <h1 className="text-2xl font-bold text-ds-primary">{ticket.ticketNumber}</h1>
          <h2 className="text-lg text-ds-primary mt-1">{ticket.title}</h2>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0">
          <Badge variant={toneBadgeVariant(pCfg.tone)} size="md">
            {pCfg.label}
          </Badge>
          <Badge variant={toneBadgeVariant(sCfg.tone)} size="md">
            {sCfg.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === CONTENU PRINCIPAL (2/3) === */}
        <div className="lg:col-span-2 space-y-6">
          {/* --- Description --- */}
          <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-ds-muted" />
              <h3 className="font-semibold text-ds-primary">Description</h3>
            </div>
            <p className="text-ds-primary whitespace-pre-wrap leading-relaxed">
              {ticket.description || (
                <span className="text-ds-muted italic">Aucune description fournie.</span>
              )}
            </p>
            {ticket.resolution &&
              [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status) && (
                <div className={`mt-4 rounded-lg border p-4 ${toneSoftPanelClass("success")}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className={toneTextClass("success")} />
                    <h4 className={`font-semibold ${toneTextClass("success")}`}>Résolution</h4>
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
          </div>

          {/* --- Commentaires --- */}
          <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-ds-muted" />
              <h3 className="font-semibold text-ds-primary">
                Commentaires ({ticket.commentCount || 0})
              </h3>
            </div>

            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4 mb-6">
                {ticket.comments
                  .filter(
                    (c: TicketCommentType) =>
                      // Les clients ne voient pas les notes internes
                      !c.isInternal || isStaff,
                  )
                  .map((c: TicketCommentType) => (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-4 ${
                        c.isInternal ? toneSoftPanelClass("warning") : "bg-ds-page border-ds-border"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-ds-primary">
                            {c.authorName}
                          </span>
                          {/* Badge de rôle */}
                          {c.authorRole && roleConfig[c.authorRole] && (
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${roleConfig[c.authorRole].bg} ${roleConfig[c.authorRole].text} ${roleConfig[c.authorRole].border}`}
                            >
                              {roleConfig[c.authorRole].label}
                            </span>
                          )}
                          {c.isInternal && (
                            <span
                              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${toneSoftPanelClass("warning")}`}
                            >
                              <Shield size={10} />
                              Note interne
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-ds-muted">
                          {formatDateTimeValue(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-ds-primary text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 mb-6">
                <Inbox size={32} className="text-ds-secondary mx-auto mb-2" />
                <p className="text-ds-muted text-sm">Aucun commentaire pour le moment.</p>
              </div>
            )}

            {/* Formulaire d'ajout de commentaire */}
            <form onSubmit={handleAddComment} className="border-t border-ds-border pt-4">
              {isCollaborationLocked && (
                <div className="mb-3 rounded-lg border border-ds-border bg-ds-elevated px-4 py-3 text-sm text-ds-muted">
                  Les commentaires et notes internes sont verrouilles sur un ticket clos ou annule.
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isCollaborationLocked}
                placeholder="Écrire un commentaire..."
                rows={3}
                className="w-full px-4 py-3 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                {isStaff && (
                  <label className="flex items-center gap-2 text-sm text-ds-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      disabled={isCollaborationLocked}
                      className="rounded border-ds-border text-amber-500 focus:ring-amber-500"
                    />
                    <Shield size={14} className="text-amber-500" />
                    Note interne (invisible pour le client)
                  </label>
                )}
                <button
                  type="submit"
                  disabled={isCollaborationLocked || submitting || !commentText.trim()}
                  className="ml-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>

          {/* --- Historique / Timeline --- */}
          <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-ds-muted" />
              <h3 className="font-semibold text-ds-primary">
                Historique ({ticket.history?.length || 0})
              </h3>
            </div>
            {ticket.history && ticket.history.length > 0 ? (
              <div className="relative border-l-2 border-ds-border ml-4">
                {ticket.history.map((h: TicketHistory, idx: number) => (
                  <div key={h.id || idx} className="mb-6 ml-6 relative">
                    <span className="absolute -left-[33px] flex items-center justify-center w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full ring-4 ring-white dark:ring-gray-800">
                      <span className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full" />
                    </span>
                    <div className="text-sm">
                      <p className="font-medium text-ds-primary">{h.actionLabel || h.action}</p>
                      {h.oldValue && h.newValue && (
                        <p className="text-ds-muted text-xs mt-0.5">
                          <span className="line-through text-red-400">{h.oldValue}</span>
                          {" → "}
                          <span className="font-medium text-success-600 dark:text-success-400">
                            {h.newValue}
                          </span>
                        </p>
                      )}
                      {h.details && (
                        <p className="text-ds-secondary text-xs mt-0.5 italic">{h.details}</p>
                      )}
                      <p className="text-ds-muted text-xs mt-1">
                        {h.userName || "Système"} — {formatDateTimeValue(h.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <History size={32} className="text-ds-secondary mx-auto mb-2" />
                <p className="text-ds-muted text-sm">Aucun historique enregistré.</p>
              </div>
            )}
          </div>
        </div>

        {/* === SIDEBAR (1/3) === */}
        <div className="space-y-6">
          {/* --- Carte d'informations --- */}
          <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-5 space-y-3">
            <h3 className="font-semibold text-ds-primary">Informations</h3>
            <InfoRow label="Client" value={ticket.clientName || ticket.clientCompanyName || "—"} />
            <InfoRow label="Entreprise" value={ticket.clientCompanyName || "—"} />
            <InfoRow label="Service" value={ticket.serviceName || "—"} />
            <InfoRow label="Catégorie" value={ticket.categoryLabel || ticket.category || "—"} />
            <InfoRow
              label="Assigné à"
              value={ticket.assignedToName || "Non assigné"}
              highlight={!ticket.assignedToName}
            />
            <InfoRow label="Créé par" value={ticket.createdByName || "—"} />
            <InfoRow label="Créé le" value={formatDateTimeValue(ticket.createdAt)} />
            {ticket.resolvedAt && (
              <InfoRow label="Résolu le" value={formatDateTimeValue(ticket.resolvedAt)} />
            )}
            {ticket.closedAt && (
              <InfoRow label="Fermé le" value={formatDateTimeValue(ticket.closedAt)} />
            )}
          </div>

          {/* --- Carte SLA --- */}
          <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-ds-muted" />
              <h3 className="font-semibold text-ds-primary">SLA</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ds-muted">Délai accordé</span>
                <span className="font-medium text-ds-primary">{formatHours(ticket.slaHours)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ds-muted">Deadline</span>
                <span className={`font-medium ${getSlaColor()}`}>
                  {formatDateTimeValue(ticket.deadline)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ds-muted">Temps restant</span>
                <span className={`font-medium ${getSlaColor()}`}>
                  {formatSlaRemainingValue(ticket.slaRemainingMinutes)}
                </span>
              </div>

              {/* Barre de progression SLA */}
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ds-muted">0%</span>
                  <span className={getSlaColor()}>{formatPercent(ticket.slaPercentage || 0)}</span>
                  <span className="text-ds-muted">100%</span>
                </div>
                <div className="w-full bg-ds-elevated rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getSlaBarColor()}`}
                    style={{ width: `${Math.min(100, ticket.slaPercentage || 0)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1.5 font-medium ${getSlaColor()}`}>
                  {ticket.overdue || ticket.breachedSla ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      SLA dépassé
                    </span>
                  ) : ticket.slaWarning ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Approche du SLA ({">"} 75%)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} />
                      Dans les délais
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* --- Carte Actions: Changer le statut --- */}
          {canChangeStatus && ticket.allowedTransitions && ticket.allowedTransitions.length > 0 && (
            <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-5">
              <h3 className="font-semibold text-ds-primary mb-3">Actions</h3>
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
              >
                Changer le statut
              </button>
            </div>
          )}

          {/* --- Carte Assignation / Prise en charge --- */}
          {(canAssign || canTakeOwnership) && (
            <div className="bg-ds-card rounded-xl shadow-sm border border-ds-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={16} className="text-ds-muted" />
                <h3 className="font-semibold text-ds-primary">
                  {canAssign ? "Assignation" : "Prise en charge"}
                </h3>
              </div>

              {canAssign && ticket.assignedToName ? (
                // Ticket déjà assigné → afficher agent + bouton désassigner
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 rounded-lg border p-3 ${toneSoftPanelClass("success")}`}>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${toneSolidClass("success")}`}
                    >
                      {ticket.assignedToName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ds-primary">{ticket.assignedToName}</p>
                      <p className={`text-xs ${toneTextClass("success")}`}>Agent assigné</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAssignPanel(true);
                        loadAgents();
                      }}
                      disabled={isAssignmentLocked}
                      className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm inline-flex items-center justify-center gap-1"
                    >
                      <UserPlus size={14} />
                      Réassigner
                    </button>
                    <button
                      onClick={handleUnassign}
                      disabled={submitting || isAssignmentLocked}
                      className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-sm inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <UserMinus size={14} />
                      Désassigner
                    </button>
                  </div>
                  {isAssignmentLocked && (
                    <p className="text-xs text-ds-muted text-center">
                      L'assignation est verrouillee apres resolution, cloture ou annulation.
                    </p>
                  )}
                </div>
              ) : canAssign ? (
                // Ticket non assigné → bouton assigner
                <div className="space-y-3">
                  <p
                    className={`rounded-lg border p-2 text-center text-sm ${toneSoftPanelClass("warning")}`}
                  >
                    Ce ticket n'est pas encore assigné
                  </p>
                  <button
                    onClick={() => {
                      setShowAssignPanel(true);
                      loadAgents();
                    }}
                    disabled={isAssignmentLocked}
                    className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} />
                    Assigner un agent
                  </button>
                  {isAssignmentLocked && (
                    <p className="text-xs text-ds-muted text-center">
                      L'assignation est verrouillee apres resolution, cloture ou annulation.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p
                    className={`rounded-lg border p-2 text-center text-sm ${toneSoftPanelClass("warning")}`}
                  >
                    Ce ticket est disponible dans le pool non assignÃ©
                  </p>
                  <button
                    onClick={handleTakeOwnership}
                    disabled={submitting || isAssignmentLocked}
                    className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                    {submitting ? "Prise en charge..." : "Prendre le ticket"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODAL: Changement de statut                                        */}
      {/* ================================================================== */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ds-card rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-ds-primary mb-4">Changer le statut</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ticket-status-select"
                  className="block text-sm font-medium text-ds-primary mb-1"
                >
                  Nouveau statut *
                </label>
                <select
                  id="ticket-status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                  className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Sélectionner --</option>
                  {ticket.allowedTransitions?.map((s) => (
                    <option key={s} value={s}>
                      {statusConfig[s]?.label || s}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === "RESOLVED" && (
                <div>
                  <label
                    htmlFor="ticket-resolution-input"
                    className="block text-sm font-medium text-ds-primary mb-1"
                  >
                    Résolution *
                  </label>
                  <textarea
                    id="ticket-resolution-input"
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
                disabled={
                  !newStatus || submitting || (newStatus === "RESOLVED" && !resolution.trim())
                }
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Enregistrement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Assignation d'un agent                                      */}
      {/* ================================================================== */}
      {showAssignPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ds-card rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={20} className="text-primary-600" />
              <h3 className="text-lg font-bold text-ds-primary">Assigner un agent</h3>
            </div>

            {loadingAgents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary-600" />
                <span className="ml-2 text-ds-muted">Chargement des agents...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-primary mb-1">
                    Sélectionner un agent *
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={0}>-- Choisir un agent --</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.fullName} ({agent.email})
                      </option>
                    ))}
                  </select>
                  {agents.length === 0 && (
                    <p className={`mt-1 text-xs ${toneTextClass("danger")}`}>Aucun agent disponible</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ds-primary mb-1">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={assignComment}
                    onChange={(e) => setAssignComment(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
                    placeholder="Raison de l'assignation..."
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignPanel(false);
                  setSelectedAgentId(0);
                  setAssignComment("");
                }}
                className="px-4 py-2 text-ds-primary bg-ds-elevated rounded-lg hover:bg-ds-border text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedAgentId === 0 || submitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Assignation..." : "Assigner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

/**
 * InfoRow - Ligne d'information dans la sidebar.
 *
 * Affiche un label et une valeur côte à côte.
 * Si highlight=true, la valeur est affichée en jaune (ex: "Non assigné").
 */
const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex justify-between text-sm">
    <span className="text-ds-muted">{label}</span>
    <span
      className={`font-medium text-right max-w-[60%] truncate ${
        highlight ? "text-yellow-600 dark:text-yellow-400" : "text-ds-primary"
      }`}
    >
      {value}
    </span>
  </div>
);

export default TicketDetail;
