// =============================================================================
// MTS TELECOM - Agent Dashboard (Enterprise-Grade)
// Widgets: KPI row · SLA urgency · Quick actions · Assigned tickets table
// Skeleton + Empty State · DS tokens · No backend breakage
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Headphones,
  AlertTriangle,
  Clock,
  Timer,
  ArrowRight,
  UserPlus,
  MessageSquare,
  StickyNote,
  LayoutGrid,
  RefreshCw,
  Inbox,
  CalendarClock,
} from "lucide-react";
import { Card, EmptyState, SkeletonCard } from "../../components/ui";
import Skeleton from "../../components/ui/Skeleton";
import type { DashboardStats, Ticket as TicketType } from "../../types";
import {
  TicketStatus,
  PriorityLabels,
  PriorityColors,
  StatusLabels,
  StatusColors,
} from "../../types";

// =============================================================================
// TYPES
// =============================================================================
interface AgentDashboardProps {
  stats: DashboardStats;
  recentTickets: TicketType[];
  assignedToMeCount?: number;
  slaAtRiskCount?: number;
  lastUpdated?: string;
  onRefresh: () => void;
  isLoadingRefresh: boolean;
  isLoading?: boolean;
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** KPI metric card */
const AgentKpi: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  suffix?: string;
  alert?: boolean;
}> = ({ icon, iconBg, label, value, suffix, alert }) => (
  <motion.div variants={fadeUp}>
    <Card className={`relative overflow-hidden group hover:shadow-card-hover transition-shadow duration-300 ${alert ? "ring-2 ring-error/30" : ""}`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ds-muted">{label}</p>
          <p className="text-3xl font-extrabold text-ds-primary tabular-nums mt-0.5">
            {value}
            {suffix && <span className="text-base font-semibold text-ds-muted ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500 bg-gradient-to-br from-primary-500 to-accent-500" />
    </Card>
  </motion.div>
);

/** Skeleton placeholder for the KPI row */
const KpiSkeletonRow: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/** Quick actions panel */
const QuickActionsPanel: React.FC<{ newTicketsCount: number }> = ({ newTicketsCount }) => (
  <motion.div variants={fadeUp}>
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-ds-border">
        <h3 className="text-base font-bold text-ds-primary">Actions rapides</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-ds-border">
        <Link
          to="/tickets?status=NEW"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors group"
        >
          <div className="relative p-3 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
            <UserPlus size={22} />
            {newTicketsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-error rounded-full">
                {newTicketsCount}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-ds-primary">Prendre un ticket</span>
          <span className="text-xs text-ds-muted text-center">Tickets non assignés</span>
        </Link>
        <Link
          to="/tickets?assignedToMe=1&status=IN_PROGRESS"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-accent-50 dark:hover:bg-accent-900/10 transition-colors group"
        >
          <div className="p-3 rounded-2xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 group-hover:scale-110 transition-transform">
            <MessageSquare size={22} />
          </div>
          <span className="text-sm font-semibold text-ds-primary">Répondre</span>
          <span className="text-xs text-ds-muted text-center">Mes tickets en cours</span>
        </Link>
        <Link
          to="/tickets?assignedToMe=1"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-info-50 dark:hover:bg-info-900/10 transition-colors group"
        >
          <div className="p-3 rounded-2xl bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400 group-hover:scale-110 transition-transform">
            <StickyNote size={22} />
          </div>
          <span className="text-sm font-semibold text-ds-primary">Note interne</span>
          <span className="text-xs text-ds-muted text-center">Ajouter une note</span>
        </Link>
        <Link
          to="/tickets/kanban"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-success-50 dark:hover:bg-success-900/10 transition-colors group"
        >
          <div className="p-3 rounded-2xl bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 group-hover:scale-110 transition-transform">
            <LayoutGrid size={22} />
          </div>
          <span className="text-sm font-semibold text-ds-primary">Vue Kanban</span>
          <span className="text-xs text-ds-muted text-center">Vue tableau</span>
        </Link>
      </div>
    </Card>
  </motion.div>
);

/** SLA urgency badge inline */
const SlaBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    CRITICAL: { bg: "bg-error/10", text: "text-error", label: "Critique" },
    HIGH: { bg: "bg-warning/10", text: "text-warning", label: "Haute" },
    MEDIUM: { bg: "bg-info/10", text: "text-info-600", label: "Moyenne" },
    LOW: { bg: "bg-ds-elevated", text: "text-ds-muted", label: "Basse" },
  };
  const s = map[priority] || map.LOW;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {(priority === "CRITICAL" || priority === "HIGH") && <AlertTriangle size={11} />}
      {s.label}
    </span>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  stats,
  recentTickets,
  assignedToMeCount = 0,
  slaAtRiskCount = 0,
  lastUpdated,
  onRefresh,
  isLoadingRefresh,
  isLoading = false,
}) => {
  const pendingClient = useMemo(
    () => (stats.ticketsByStatus ?? {})[TicketStatus.PENDING] ?? 0,
    [stats.ticketsByStatus],
  );

  const avgResolution = stats.averageResolutionTimeHours ?? 0;
  const newTickets = (stats.ticketsByStatus ?? {})[TicketStatus.NEW] ?? 0;

  // Sort tickets: CRITICAL > HIGH > MEDIUM > LOW
  const sortedTickets = useMemo(() => {
    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...recentTickets].sort(
      (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9),
    );
  }, [recentTickets]);

  // --- Skeleton ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <KpiSkeletonRow />
        <Skeleton height={140} className="rounded-xl" />
        <Skeleton height={320} className="rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Header + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ds-primary tracking-tight">Espace Agent</h1>
          <p className="text-sm text-ds-muted mt-0.5">Vue d'ensemble de vos tickets et performances</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-ds-muted font-medium hidden sm:inline">
              <CalendarClock size={13} className="inline mr-1 -mt-px" />
              MAJ {new Date(lastUpdated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-ds-border bg-ds-card hover:bg-ds-elevated text-ds-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingRefresh ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI row */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={stagger}>
        <AgentKpi
          icon={<Headphones size={22} className="text-primary-600 dark:text-primary-400" />}
          iconBg="bg-primary-50 dark:bg-primary-900/30"
          label="Assignés à moi"
          value={assignedToMeCount}
        />
        <AgentKpi
          icon={<AlertTriangle size={22} className="text-error-600 dark:text-error-400" />}
          iconBg="bg-error-50 dark:bg-error-900/30"
          label="SLA à risque"
          value={slaAtRiskCount}
          alert={slaAtRiskCount > 0}
        />
        <AgentKpi
          icon={<Clock size={22} className="text-warning-600 dark:text-warning-400" />}
          iconBg="bg-warning-50 dark:bg-warning-900/30"
          label="En attente client"
          value={pendingClient}
        />
        <AgentKpi
          icon={<Timer size={22} className="text-success-600 dark:text-success-400" />}
          iconBg="bg-success-50 dark:bg-success-900/30"
          label="Résolution moy."
          value={avgResolution > 0 ? avgResolution.toFixed(1) : "—"}
          suffix={avgResolution > 0 ? "h" : undefined}
        />
      </motion.div>

      {/* Quick actions panel */}
      <QuickActionsPanel newTicketsCount={newTickets} />

      {/* Assigned tickets table — sorted by priority/SLA */}
      <motion.div variants={fadeUp}>
        <Card padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-ds-border flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
              <Headphones size={18} className="text-primary-500" />
              Mes tickets assignés
              {assignedToMeCount > 0 && (
                <span className="ml-1 text-xs font-semibold text-ds-muted bg-ds-elevated px-2 py-0.5 rounded-full">
                  {assignedToMeCount}
                </span>
              )}
            </h3>
            <Link
              to="/tickets?assignedToMe=1"
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
            >
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>

          {sortedTickets.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Inbox size={40} />}
                title="Aucun ticket assigné"
                description="Prenez un ticket non assigné pour commencer à travailler."
                action={
                  <Link
                    to="/tickets?status=NEW"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
                  >
                    <UserPlus size={16} /> Prendre un ticket
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ds-elevated border-b border-ds-border">
                  <tr>
                    <th className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">Numéro</th>
                    <th className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">Titre</th>
                    <th className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">Priorité</th>
                    <th className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">Statut</th>
                    <th className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-border">
                  {sortedTickets.slice(0, 8).map((t, idx) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-ds-elevated/60 transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-3.5">
                        <Link to={`/tickets/${t.id}`} className="text-primary-500 hover:text-primary-600 font-medium text-sm">
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-sm text-ds-primary max-w-xs truncate">{t.title}</td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <SlaBadge priority={t.priority} />
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                          style={{ backgroundColor: `${StatusColors[t.status]}18`, color: StatusColors[t.status] }}
                        >
                          {StatusLabels[t.status]}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-sm text-ds-muted hidden md:table-cell">
                        {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
};
