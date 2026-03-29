// =============================================================================
// MTS TELECOM - BulkActions — Barre d'actions en masse (Enterprise)
// =============================================================================
/**
 * Barre contextuelle flottante affichée quand des tickets sont sélectionnés.
 *
 * ACTIONS DISPONIBLES:
 * - Assigner en masse → ticketService.bulkAssign
 * - Changer le statut en masse → ticketService.bulkStatus
 * - Changer la priorité en masse → ticketService.bulkPriority
 * - Exporter la sélection (CSV/Excel/PDF)
 *
 * ANIMATION: slide-up depuis le bas, avec un compteur de sélection.
 */

import React, { useState } from "react";
import { UserPlus, ArrowRightLeft, AlertCircle, X } from "lucide-react";
import { Button, Badge } from "../ui";
import { TicketStatus, TicketPriority, StatusLabels, PriorityLabels } from "../../types";
import { ticketService, BulkResult } from "../../api/ticketService";

interface BulkActionsProps {
  /** IDs des tickets sélectionnés */
  selectedIds: number[];
  /** Callback pour désélectionner tout */
  onClearSelection: () => void;
  /** Callback après une action réussie (pour rafraîchir la liste) */
  onActionComplete: (result: BulkResult) => void;
  /** Agents disponibles pour l'assignation (MANAGER/ADMIN) */
  agents?: { id: number; fullName: string }[];
  /** L'utilisateur peut-il assigner? */
  canAssign?: boolean;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedIds,
  onClearSelection,
  onActionComplete,
  agents = [],
  canAssign = false,
}) => {
  const [action, setAction] = useState<"assign" | "status" | "priority" | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");

  if (selectedIds.length === 0) return null;

  const selectClass =
    "px-2 py-1.5 text-sm border border-ds-border rounded-lg bg-ds-surface text-ds-primary focus:ring-2 focus:ring-primary/30";

  const handleExecute = async () => {
    setLoading(true);
    try {
      let result: BulkResult;
      if (action === "assign" && selectedAgentId > 0) {
        result = await ticketService.bulkAssign(selectedIds, selectedAgentId);
      } else if (action === "status" && selectedStatus) {
        result = await ticketService.bulkStatus(selectedIds, selectedStatus);
      } else if (action === "priority" && selectedPriority) {
        result = await ticketService.bulkPriority(selectedIds, selectedPriority);
      } else {
        return;
      }
      onActionComplete(result);
      setAction(null);
      setSelectedAgentId(0);
      setSelectedStatus("");
      setSelectedPriority("");
    } catch {
      // Silencieux — le parent gère les erreurs via toast
    } finally {
      setLoading(false);
    }
  };

  const canExecute =
    (action === "assign" && selectedAgentId > 0) ||
    (action === "status" && selectedStatus) ||
    (action === "priority" && selectedPriority);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-5 py-3 bg-ds-card rounded-2xl border border-ds-border shadow-dropdown backdrop-blur-md">
        {/* Compteur */}
        <div className="flex items-center gap-2">
          <Badge variant="default" className="!text-sm !px-3 !py-1">
            {selectedIds.length}
          </Badge>
          <span className="text-sm font-medium text-ds-primary whitespace-nowrap">
            ticket{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="w-px h-6 bg-ds-border" />

        {/* Actions rapides */}
        {!action && (
          <div className="flex items-center gap-2">
            {canAssign && (
              <Button
                variant="outline"
                size="sm"
                icon={<UserPlus size={14} />}
                onClick={() => setAction("assign")}
              >
                Assigner
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRightLeft size={14} />}
              onClick={() => setAction("status")}
            >
              Statut
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<AlertCircle size={14} />}
              onClick={() => setAction("priority")}
            >
              Priorité
            </Button>
          </div>
        )}

        {/* Formulaire inline d'action */}
        {action === "assign" && (
          <div className="flex items-center gap-2">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0}>Choisir un agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              disabled={!canExecute || loading}
              loading={loading}
              onClick={handleExecute}
            >
              Appliquer
            </Button>
          </div>
        )}

        {action === "status" && (
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={selectClass}
            >
              <option value="">Choisir un statut</option>
              {Object.values(TicketStatus).map((s) => (
                <option key={s} value={s}>
                  {StatusLabels[s]}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              disabled={!canExecute || loading}
              loading={loading}
              onClick={handleExecute}
            >
              Appliquer
            </Button>
          </div>
        )}

        {action === "priority" && (
          <div className="flex items-center gap-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={selectClass}
            >
              <option value="">Choisir une priorité</option>
              {Object.values(TicketPriority).map((p) => (
                <option key={p} value={p}>
                  {PriorityLabels[p]}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              disabled={!canExecute || loading}
              loading={loading}
              onClick={handleExecute}
            >
              Appliquer
            </Button>
          </div>
        )}

        {action && (
          <button
            onClick={() => {
              setAction(null);
              setSelectedAgentId(0);
              setSelectedStatus("");
              setSelectedPriority("");
            }}
            className="p-1 text-ds-muted hover:text-ds-primary transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <div className="w-px h-6 bg-ds-border" />

        {/* Désélectionner */}
        <button
          onClick={onClearSelection}
          className="p-1.5 text-ds-muted hover:text-error-500 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
          title="Désélectionner tout"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default BulkActions;
