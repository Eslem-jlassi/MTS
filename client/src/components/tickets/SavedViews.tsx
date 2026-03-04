// =============================================================================
// MTS TELECOM - SavedViews — Vues prédéfinies pour les tickets (Enterprise)
// =============================================================================
/**
 * Barre de vues rapides en tabs au-dessus de la liste des tickets.
 * 
 * VUES DISPONIBLES:
 * - Tous: aucun filtre
 * - Non assignés: status = NEW, pas d'assigné
 * - SLA dépassés: slaStatus = BREACHED
 * - Critiques: priority = CRITICAL
 * - En attente client: status = PENDING
 * - Escaladés: status = ESCALATED
 * 
 * Chaque vue peut afficher un badge de compteur.
 */

import React from "react";
import {
  Inbox,
  AlertTriangle,
  Clock,
  Flame,
  UserX,
  ArrowUpRight,
  List,
} from "lucide-react";
import {
  TicketFilterParams,
  TicketStatus,
  TicketPriority,
  SavedView,
} from "../../types";

// =============================================================================
// VUES PRÉDÉFINIES
// =============================================================================

export const SAVED_VIEWS: SavedView[] = [
  {
    key: "all",
    label: "Tous",
    filters: {},
  },
  {
    key: "unassigned",
    label: "Non assignés",
    filters: { status: TicketStatus.NEW },
  },
  {
    key: "sla_breached",
    label: "SLA dépassés",
    filters: { slaStatus: "BREACHED" },
  },
  {
    key: "critical",
    label: "Critiques",
    filters: { priority: TicketPriority.CRITICAL },
  },
  {
    key: "pending",
    label: "En attente",
    filters: { status: TicketStatus.PENDING },
  },
  {
    key: "escalated",
    label: "Escaladés",
    filters: { status: TicketStatus.ESCALATED },
  },
];

/** Icônes par clé de vue */
const VIEW_ICONS: Record<string, React.ReactNode> = {
  all: <List size={14} />,
  unassigned: <UserX size={14} />,
  sla_breached: <AlertTriangle size={14} />,
  critical: <Flame size={14} />,
  pending: <Clock size={14} />,
  escalated: <ArrowUpRight size={14} />,
};

// =============================================================================
// COMPOSANT
// =============================================================================

interface SavedViewsProps {
  /** Clé de la vue active */
  activeView: string;
  /** Callback quand une vue est sélectionnée */
  onViewChange: (viewKey: string, filters: TicketFilterParams) => void;
  /** Compteurs optionnels par clé de vue */
  viewCounts?: Record<string, number>;
}

const SavedViews: React.FC<SavedViewsProps> = ({
  activeView,
  onViewChange,
  viewCounts,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin" role="tablist">
      {SAVED_VIEWS.map((view) => {
        const isActive = view.key === activeView;
        const count = viewCounts?.[view.key];
        const icon = VIEW_ICONS[view.key] || <Inbox size={14} />;

        return (
          <button
            key={view.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onViewChange(view.key, view.filters)}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
              whitespace-nowrap transition-all duration-200
              ${isActive
                ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shadow-sm"
                : "text-ds-muted hover:text-ds-primary hover:bg-ds-elevated"
              }
            `}
          >
            <span className={isActive ? "text-primary-500 dark:text-primary-400" : "text-ds-muted"}>
              {icon}
            </span>
            {view.label}
            {count !== undefined && count > 0 && (
              <span
                className={`
                  ml-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center
                  text-[10px] font-bold rounded-full
                  ${isActive
                    ? "bg-primary-200 text-primary-800 dark:bg-primary-800 dark:text-primary-200"
                    : "bg-ds-elevated text-ds-muted"
                  }
                `}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SavedViews;
