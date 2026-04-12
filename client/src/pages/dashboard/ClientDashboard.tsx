// =============================================================================
// MTS TELECOM - Client Dashboard (Enterprise-Grade)
// Widgets: KPI cards · Activity timeline · Services health · CTA panel
// Skeleton + Empty State · DS tokens · No backend breakage
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Ticket,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Bot,
  BookOpen,
  RefreshCw,
  Inbox,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { Card, EmptyState, SkeletonCard } from "../../components/ui";
import Skeleton from "../../components/ui/Skeleton";
import type { DashboardStats, Ticket as TicketType, TelecomService } from "../../types";
import {
  TicketStatus,
  StatusLabels,
  StatusColors,
  ServiceStatus,
  ServiceStatusLabels,
  ServiceStatusColors,
  ServiceStatusBgColors,
} from "../../types";
import { formatRelativeTime, formatTime } from "../../utils/formatters";

// =============================================================================
// TYPES
// =============================================================================
interface ClientDashboardProps {
  stats: DashboardStats;
  recentTickets: TicketType[];
  services?: TelecomService[];
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

/** KPI stat card with icon, value, label */
const KpiStat: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
}> = ({ icon, iconBg, label, value }) => (
  <motion.div variants={fadeUp}>
    <Card className="relative overflow-hidden group hover:shadow-card-hover transition-shadow duration-300">
      <div className="flex items-center gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ds-muted">{label}</p>
          <p className="text-3xl font-extrabold text-ds-primary tabular-nums mt-0.5">{value}</p>
        </div>
      </div>
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500 bg-gradient-to-br from-primary-500 to-accent-500" />
    </Card>
  </motion.div>
);

/** Skeleton placeholder for the KPI row */
const KpiSkeletonRow: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/** Activity timeline — last 5 ticket events */
const ActivityTimeline: React.FC<{ tickets: TicketType[] }> = ({ tickets }) => {
  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={40} />}
        title="Aucune activité récente"
        description="Vos dernières actions sur les tickets apparaîtront ici."
        action={
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus size={16} /> Créer un ticket
          </Link>
        }
      />
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-ds-border flex items-center justify-between">
        <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
          <Activity size={18} className="text-primary-500" />
          Dernières activités
        </h3>
        <Link
          to="/tickets"
          className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
        >
          Voir tout <ArrowRight size={14} />
        </Link>
      </div>
      <ul className="divide-y divide-ds-border">
        {tickets.slice(0, 5).map((t, idx) => (
          <motion.li
            key={t.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-3 px-5 py-3.5 hover:bg-ds-elevated/60 transition-colors"
          >
            <div className="relative mt-1.5 flex-shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full ring-2 ring-ds-card"
                style={{ backgroundColor: StatusColors[t.status] }}
              />
              {idx < tickets.slice(0, 5).length - 1 && (
                <div className="absolute top-3 left-1 w-px h-[calc(100%+0.5rem)] bg-ds-border" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to={`/tickets/${t.id}`}
                className="text-sm font-medium text-ds-primary hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate block"
              >
                {t.title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${StatusColors[t.status]}18`,
                    color: StatusColors[t.status],
                  }}
                >
                  {StatusLabels[t.status]}
                </span>
                <span className="text-xs text-ds-muted">{t.ticketNumber}</span>
              </div>
            </div>
            <span className="flex-shrink-0 text-xs text-ds-muted whitespace-nowrap mt-0.5">
              {formatRelativeTime(t.updatedAt || t.createdAt)}
            </span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
};

/** Service health card */
const ServicesHealth: React.FC<{ services: TelecomService[] }> = ({ services }) => {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Wifi size={40} />}
        title="Aucun service suivi"
        description="Les services télécom associés à votre compte s'afficheront ici."
      />
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-ds-border">
        <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
          <Wifi size={18} className="text-success-500" />
          Services suivis
        </h3>
      </div>
      <ul className="divide-y divide-ds-border">
        {services.slice(0, 6).map((s) => {
          const status = (s.status as ServiceStatus) || ServiceStatus.UP;
          const iconMap: Record<string, React.ReactNode> = {
            [ServiceStatus.UP]: <Wifi size={16} />,
            [ServiceStatus.DEGRADED]: <AlertTriangle size={16} />,
            [ServiceStatus.DOWN]: <WifiOff size={16} />,
            [ServiceStatus.MAINTENANCE]: <WifiOff size={16} />,
          };
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-ds-elevated/60 transition-colors"
            >
              <div
                className={`flex-shrink-0 p-1.5 rounded-lg ${ServiceStatusBgColors[status] || "bg-ds-elevated"}`}
              >
                <span className={ServiceStatusColors[status] || "text-ds-muted"}>
                  {iconMap[status] || <Wifi size={16} />}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ds-primary truncate">{s.name}</p>
                <p className="text-xs text-ds-muted">{s.categoryLabel || s.category}</p>
              </div>
              <span
                className={`text-xs font-semibold ${ServiceStatusColors[status] || "text-ds-muted"}`}
              >
                {ServiceStatusLabels[status] || "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

/** CTA panel — quick actions for client */
const CtaPanel: React.FC = () => (
  <motion.div variants={fadeUp}>
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-ds-border">
        <h3 className="text-base font-bold text-ds-primary">Actions rapides</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-ds-border">
        <Link
          to="/tickets/new"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors group"
        >
          <div className="p-3 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
            <Plus size={22} />
          </div>
          <span className="text-sm font-semibold text-ds-primary">Nouveau ticket</span>
          <span className="text-xs text-ds-muted text-center">
            Signaler un problème ou une demande
          </span>
        </Link>
        <Link
          to="/dashboard"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-accent-50 dark:hover:bg-accent-900/10 transition-colors group"
        >
          <div className="p-3 rounded-2xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 group-hover:scale-110 transition-transform">
            <Bot size={22} />
          </div>
          <span className="text-sm font-semibold text-ds-primary">Chatbot IA</span>
          <span className="text-xs text-ds-muted text-center">Obtenir une aide instantanée</span>
        </Link>
        <Link
          to="/knowledge-base"
          className="flex flex-col items-center gap-2.5 py-6 px-4 hover:bg-info-50 dark:hover:bg-info-900/10 transition-colors group"
        >
          <div className="p-3 rounded-2xl bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400 group-hover:scale-110 transition-transform">
            <BookOpen size={22} />
          </div>
          <span className="text-sm font-semibold text-ds-primary">Base de connaissances</span>
          <span className="text-xs text-ds-muted text-center">FAQ et guides de dépannage</span>
        </Link>
      </div>
    </Card>
  </motion.div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  stats,
  recentTickets,
  services = [],
  lastUpdated,
  onRefresh,
  isLoadingRefresh,
  isLoading = false,
}) => {
  const openCount = useMemo(() => {
    const byStatus = stats.ticketsByStatus ?? {};
    return (
      (byStatus[TicketStatus.NEW] ?? 0) +
      (byStatus[TicketStatus.ASSIGNED] ?? 0) +
      (byStatus[TicketStatus.IN_PROGRESS] ?? 0) +
      (byStatus[TicketStatus.ESCALATED] ?? 0)
    );
  }, [stats.ticketsByStatus]);

  const pendingClient = useMemo(
    () => (stats.ticketsByStatus ?? {})[TicketStatus.PENDING] ?? 0,
    [stats.ticketsByStatus],
  );

  const resolvedMonth = stats.resolvedThisMonth ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <KpiSkeletonRow />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height={260} className="rounded-xl" />
          <Skeleton height={260} className="rounded-xl" />
        </div>
        <Skeleton height={140} className="rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Header + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ds-primary tracking-tight">
            Mon tableau de bord
          </h1>
          <p className="text-sm text-ds-muted mt-0.5">Vue d'ensemble de vos tickets et services</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-ds-muted font-medium hidden sm:inline">
              <CalendarClock size={13} className="inline mr-1 -mt-px" />
              MAJ {formatTime(lastUpdated)}
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
      <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={stagger}>
        <KpiStat
          icon={<Ticket size={22} className="text-primary-600 dark:text-primary-400" />}
          iconBg="bg-primary-50 dark:bg-primary-900/30"
          label="Tickets ouverts"
          value={openCount}
        />
        <KpiStat
          icon={<Clock size={22} className="text-warning-600 dark:text-warning-400" />}
          iconBg="bg-warning-50 dark:bg-warning-900/30"
          label="En attente client"
          value={pendingClient}
        />
        <KpiStat
          icon={<CheckCircle size={22} className="text-success-600 dark:text-success-400" />}
          iconBg="bg-success-50 dark:bg-success-900/30"
          label="Résolus ce mois"
          value={resolvedMonth}
        />
      </motion.div>

      {/* Two-column: Timeline + Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp}>
          <ActivityTimeline tickets={recentTickets} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <ServicesHealth services={services} />
        </motion.div>
      </div>

      {/* CTA panel */}
      <CtaPanel />
    </motion.div>
  );
};
