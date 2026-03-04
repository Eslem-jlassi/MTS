// =============================================================================
// MTS TELECOM - TicketFilters — Barre de filtres avancée (Enterprise)
// =============================================================================
/**
 * Composant de filtrage avancé pour la liste des tickets.
 * 
 * FILTRES DISPONIBLES:
 * - Statut (9 valeurs)
 * - Priorité (4 valeurs)
 * - Catégorie (4 valeurs)
 * - SLA (OK / À risque / Dépassé)
 * - Plage de dates (du / au)
 * 
 * CARACTÉRISTIQUES:
 * - Collapsible (toggle show/hide)
 * - Compteur de filtres actifs dans le badge
 * - Boutons Appliquer / Réinitialiser
 * - Utilise les composants DS (Select, Button, Input)
 */

import React from "react";
import { Filter, X, RotateCcw } from "lucide-react";
import { Button, Badge } from "../ui";
import {
  TicketFilterParams,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  StatusLabels,
  PriorityLabels,
  CategoryLabels,
  SlaStatusFilter,
} from "../../types";

// Labels SLA en français
const SLA_OPTIONS: { value: SlaStatusFilter | ""; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "OK", label: "Dans les délais" },
  { value: "AT_RISK", label: "À risque" },
  { value: "BREACHED", label: "Dépassé" },
];

interface TicketFiltersProps {
  /** Filtres courants */
  filters: TicketFilterParams;
  /** Callback quand un filtre change */
  onChange: (filters: TicketFilterParams) => void;
  /** Callback pour appliquer les filtres */
  onApply: () => void;
  /** Callback pour réinitialiser */
  onReset: () => void;
  /** Affiché ou masqué */
  isOpen: boolean;
  /** Toggle show/hide */
  onToggle: () => void;
}

/** Compte le nombre de filtres actifs */
function countActiveFilters(filters: TicketFilterParams): number {
  let count = 0;
  if (filters.status) count++;
  if (filters.priority) count++;
  if (filters.category) count++;
  if (filters.slaStatus) count++;
  if (filters.fromDate) count++;
  if (filters.toDate) count++;
  if (filters.assignedToId) count++;
  return count;
}

const TicketFilters: React.FC<TicketFiltersProps> = ({
  filters,
  onChange,
  onApply,
  onReset,
  isOpen,
  onToggle,
}) => {
  const activeCount = countActiveFilters(filters);

  const handleChange = (key: keyof TicketFilterParams, value: string | undefined) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  // Style commun pour les selects natifs
  const selectClass =
    "w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-surface text-ds-primary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <>
      {/* Bouton toggle */}
      <Button
        variant={isOpen || activeCount > 0 ? "primary" : "outline"}
        size="sm"
        icon={<Filter size={16} />}
        onClick={onToggle}
      >
        Filtres
        {activeCount > 0 && (
          <Badge variant="danger" className="ml-1.5 !text-[10px] !px-1.5">
            {activeCount}
          </Badge>
        )}
      </Button>

      {/* Panneau de filtres (collapsible) */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-ds-border animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Statut */}
            <div>
              <label className="block text-xs font-semibold text-ds-muted uppercase tracking-wider mb-1.5">
                Statut
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => handleChange("status", e.target.value)}
                className={selectClass}
              >
                <option value="">Tous</option>
                {Object.values(TicketStatus).map((s) => (
                  <option key={s} value={s}>{StatusLabels[s]}</option>
                ))}
              </select>
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-xs font-semibold text-ds-muted uppercase tracking-wider mb-1.5">
                Priorité
              </label>
              <select
                value={filters.priority || ""}
                onChange={(e) => handleChange("priority", e.target.value)}
                className={selectClass}
              >
                <option value="">Toutes</option>
                {Object.values(TicketPriority).map((p) => (
                  <option key={p} value={p}>{PriorityLabels[p]}</option>
                ))}
              </select>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-xs font-semibold text-ds-muted uppercase tracking-wider mb-1.5">
                Catégorie
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) => handleChange("category", e.target.value)}
                className={selectClass}
              >
                <option value="">Toutes</option>
                {Object.values(TicketCategory).map((c) => (
                  <option key={c} value={c}>{CategoryLabels[c]}</option>
                ))}
              </select>
            </div>

            {/* SLA */}
            <div>
              <label className="block text-xs font-semibold text-ds-muted uppercase tracking-wider mb-1.5">
                SLA
              </label>
              <select
                value={(filters.slaStatus as string) || ""}
                onChange={(e) => handleChange("slaStatus", e.target.value || undefined)}
                className={selectClass}
              >
                {SLA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Date début */}
            <div>
              <label className="block text-xs font-semibold text-ds-muted uppercase tracking-wider mb-1.5">
                Du
              </label>
              <input
                type="date"
                value={filters.fromDate || ""}
                onChange={(e) => handleChange("fromDate", e.target.value)}
                className={selectClass}
              />
            </div>

            {/* Date fin */}
            <div>
              <label className="block text-xs font-semibold text-ds-muted uppercase tracking-wider mb-1.5">
                Au
              </label>
              <input
                type="date"
                value={filters.toDate || ""}
                onChange={(e) => handleChange("toDate", e.target.value)}
                className={selectClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            {activeCount > 0 && (
              <button
                onClick={onReset}
                className="text-sm text-ds-muted hover:text-error-500 flex items-center gap-1.5 transition-colors"
              >
                <X size={14} />
                Effacer les {activeCount} filtre{activeCount > 1 ? "s" : ""}
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={onReset}>
                Réinitialiser
              </Button>
              <Button variant="primary" size="sm" onClick={onApply}>
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TicketFilters;
