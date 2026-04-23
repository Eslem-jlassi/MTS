// =============================================================================
// MTS TELECOM - Manager Dashboard (Enterprise-Grade)
// ---------------------------------------------------------------------------
// Widgets : KPI row (SLA compliance, MTTR, backlog, escalations, critiques)
//           Filtres globaux (période, service, équipe, client)
//           2 charts cliquables → drill-down vers /tickets?...
//           Section "Top services à risque"
//           Performance équipe (bar chart)
//           Trend 7j (area chart)
// DS tokens · Skeleton + Empty state · Code commenté (chart config)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  // Recharts components for interactive charts
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  ShieldCheck,
  Timer,
  Inbox,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  CalendarClock,
  Filter,
  ArrowRight,
  Wifi,
  WifiOff,
  Sparkles,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button, Card, Select, SkeletonCard, EmptyState } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import Skeleton from "../../components/ui/Skeleton";
import { ManagerCopilotDashboardSection } from "../../components/manager-copilot";
import {
  MANAGER_COPILOT_PRODUCT_LABEL,
  MANAGER_COPILOT_SUBTITLE,
  MANAGER_COPILOT_TITLE,
} from "../../components/manager-copilot/managerCopilotUi";
import type { DashboardStats, TelecomService } from "../../types";
import { ServiceStatus, ServiceStatusLabels, ServiceStatusColors } from "../../types";
import type { DashboardFilters } from "../../api/dashboardService";
import {
  buildManagerDashboardData,
  type ManagerDashboardData,
  type ManagerKpis,
  type ServiceAtRisk,
} from "../../api/managerDashboardAdapter";
import { formatDateDayMonth, formatHours, formatPercent, formatTime } from "../../utils/formatters";
import { designTokens } from "../../theme";

// =============================================================================
// TYPES
// =============================================================================

interface ManagerDashboardProps {
  stats: DashboardStats;
  services?: TelecomService[];
  clients?: { id: number; companyName?: string }[];
  lastUpdated?: string;
  onRefresh?: (filters?: DashboardFilters) => void;
  isLoadingRefresh?: boolean;
  isLoading?: boolean;
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const SectionLead: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  supporting?: React.ReactNode;
}> = ({ eyebrow, title, description, icon, supporting }) => (
  <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
        {eyebrow}
      </span>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ds-primary">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ds-muted">{description}</p>
    </div>
    <div className="flex items-center gap-3">
      {supporting}
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-info-500/15 bg-gradient-to-br from-info-500/12 to-ai-500/10 text-info-500 shadow-sm">
        {icon}
      </div>
    </div>
  </motion.div>
);

const StageChip: React.FC<{
  label: string;
  value?: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-ds-border/70 bg-ds-surface/75 px-3 py-1.5">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">{label}</p>
    {value && <p className="mt-0.5 text-sm font-semibold text-ds-primary">{value}</p>}
  </div>
);

// =============================================================================
// FILTER BAR — période, service, équipe, client
// =============================================================================

interface FiltersBarProps {
  period: string;
  setPeriod: (v: string) => void;
  serviceId: string;
  setServiceId: (v: string) => void;
  teamId: string;
  setTeamId: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  serviceOptions: SelectOption[];
  teamOptions: SelectOption[];
  clientOptions: SelectOption[];
  embedded?: boolean;
}

/** Barre de filtres globaux — appliqués à toute la page */
const FiltersBar: React.FC<FiltersBarProps> = ({
  period,
  setPeriod,
  serviceId,
  setServiceId,
  teamId,
  setTeamId,
  clientId,
  setClientId,
  serviceOptions,
  teamOptions,
  clientOptions,
  embedded = false,
}) => {
  const periodOptions: SelectOption[] = [
    { value: "", label: "Toute période" },
    { value: "DAY", label: "Aujourd'hui" },
    { value: "WEEK", label: "Cette semaine" },
    { value: "MONTH", label: "Ce mois" },
  ];

  return (
    <motion.div variants={fadeUp}>
      <div
        className={
          embedded ? "rounded-2xl border border-ds-border/70 bg-ds-surface/70 px-4 py-3" : ""
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-ds-muted">
            <Filter size={15} />
            <span className="text-xs font-semibold uppercase tracking-wider">Filtres</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <div className="w-36">
              <Select
                options={periodOptions}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Période"
              />
            </div>
            {serviceOptions.length > 0 && (
              <div className="w-44">
                <Select
                  options={[{ value: "", label: "Tous les services" }, ...serviceOptions]}
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  placeholder="Service"
                />
              </div>
            )}
            {teamOptions.length > 0 && (
              <div className="w-40">
                <Select
                  options={[{ value: "", label: "Toute l'équipe" }, ...teamOptions]}
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="Agent"
                />
              </div>
            )}
            {clientOptions.length > 0 && (
              <div className="w-40">
                <Select
                  options={[{ value: "", label: "Tous les clients" }, ...clientOptions]}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// KPI ROW (5 cards)
// =============================================================================

const KpiCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  suffix?: string;
  alert?: boolean;
  /** Lien drill-down au clic */
  to?: string;
}> = ({ icon, iconBg, label, value, suffix, alert, to }) => {
  const inner = (
    <Card
      className={`h-full min-h-[6.9rem] overflow-hidden border border-ds-border/80 bg-gradient-to-br from-ds-card to-ds-surface group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover
      ${alert ? "ring-1 ring-error/30" : ""} ${to ? "cursor-pointer" : ""}
    `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ds-muted">{label}</p>
          <p className="mt-1 text-3xl font-extrabold text-ds-primary tabular-nums">
            {value}
            {suffix && <span className="text-base font-semibold text-ds-muted ml-1">{suffix}</span>}
          </p>
        </div>
        {to && (
          <ArrowRight
            size={16}
            className="text-ds-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
          />
        )}
      </div>
    </Card>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return inner;
};

const KpiRow: React.FC<{ kpis: ManagerKpis }> = ({ kpis }) => (
  <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" variants={stagger}>
    <motion.div variants={fadeUp}>
      <KpiCard
        icon={<ShieldCheck size={22} className="text-success-600 dark:text-success-400" />}
        iconBg="bg-success-50 dark:bg-success-900/30"
        label="Conformité SLA"
        value={formatPercent(kpis.slaCompliance)}
        alert={kpis.slaCompliance < 80}
      />
    </motion.div>
    <motion.div variants={fadeUp}>
      <KpiCard
        icon={<Timer size={22} className="text-primary-600 dark:text-primary-400" />}
        iconBg="bg-primary-50 dark:bg-primary-900/30"
        label="MTTR"
        value={kpis.mttr > 0 ? formatHours(kpis.mttr) : "--"}
      />
    </motion.div>
    <motion.div variants={fadeUp}>
      <KpiCard
        icon={<Inbox size={22} className="text-warning-600 dark:text-warning-400" />}
        iconBg="bg-warning-50 dark:bg-warning-900/30"
        label="Backlog"
        value={kpis.backlog}
        to="/tickets?status=IN_PROGRESS"
      />
    </motion.div>
    <motion.div variants={fadeUp}>
      <KpiCard
        icon={<ArrowUpRight size={22} className="text-error-600 dark:text-error-400" />}
        iconBg="bg-error-50 dark:bg-error-900/30"
        label="Escalades"
        value={kpis.escalations}
        alert={kpis.escalations > 0}
        to="/tickets?status=ESCALATED"
      />
    </motion.div>
    <motion.div variants={fadeUp}>
      <KpiCard
        icon={<AlertTriangle size={22} className="text-error-600 dark:text-error-400" />}
        iconBg="bg-error-50 dark:bg-error-900/30"
        label="Critiques"
        value={kpis.criticalTickets}
        alert={kpis.criticalTickets > 0}
        to="/tickets?priority=CRITICAL"
      />
    </motion.div>
  </motion.div>
);

// =============================================================================
// CLICKABLE CHARTS — drill-down vers /tickets?status=XXX ou ?priority=XXX
// =============================================================================

/**
 * Tooltip personnalisé pour Recharts — style DS.
 * Utilisé dans tous les charts du Manager dashboard.
 */
const ChartTooltipStyle = {
  backgroundColor: "var(--ds-card, #fff)",
  border: "1px solid var(--ds-border, #e2e8f0)",
  borderRadius: "10px",
  fontSize: "12px",
  boxShadow: designTokens.shadows.md,
};

/** Chart statut — clic → /tickets?status=KEY */
const StatusChart: React.FC<{
  data: ManagerDashboardData["statusChartData"];
  navigate: ReturnType<typeof useNavigate>;
}> = ({ data, navigate }) => {
  if (data.length === 0) return <ChartEmpty label="Aucune donnée statut" />;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {/* ---------- BAR CHART : répartition par statut ----------
             – Chaque barre = un statut (Nouveau, En cours, Escaladé…)
             – Couleur = StatusColors du DS
             – onClick → navigation drill-down vers /tickets?status=KEY
        */}
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border, #e2e8f0)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--ds-muted, #64748b)" }}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--ds-muted, #64748b)" }} allowDecimals={false} />
          <RTooltip contentStyle={ChartTooltipStyle} />
          <Bar
            dataKey="value"
            name="Tickets"
            radius={[6, 6, 0, 0]}
            cursor="pointer"
            onClick={(_data: unknown, _index: number, _event: React.MouseEvent) => {
              // Drill-down : retrouver la clé de statut originale
              // _data contient { name, value, color, ... }
              const d = _data as { name?: string };
              const key = statusNameToKey(d.name ?? "");
              if (key) navigate(`/tickets?status=${key}`);
            }}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Chart priorité — clic → /tickets?priority=KEY */
const PriorityChart: React.FC<{
  data: ManagerDashboardData["priorityChartData"];
  navigate: ReturnType<typeof useNavigate>;
}> = ({ data, navigate }) => {
  if (data.length === 0) return <ChartEmpty label="Aucune donnée priorité" />;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {/* ---------- PIE CHART : répartition par priorité ----------
             – 4 slices : Critique / Haute / Moyenne / Basse
             – Couleur = PriorityColors du DS
             – onClick → navigation drill-down vers /tickets?priority=KEY
        */}
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }: { name?: string; value?: number }) =>
              `${name ?? ""}: ${value ?? 0}`
            }
            cursor="pointer"
            onClick={(d: unknown) => {
              const entry = d as { name?: string };
              const key = priorityNameToKey(entry.name ?? "");
              if (key) navigate(`/tickets?priority=${key}`);
            }}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <RTooltip contentStyle={ChartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Chart performance équipe (bar horizontal) */
const TeamPerformanceChart: React.FC<{ data: ManagerDashboardData["agentPerformance"] }> = ({
  data,
}) => {
  if (data.length === 0) return <ChartEmpty label="Aucune donnée de performance" />;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {/* ---------- STACKED BAR : performance agents ----------
             – Axe X = agent name
             – Barres empilées : résolus (vert) / assignés total (bleu)
             – Permet de comparer la charge et la vélocité par agent
        */}
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border, #e2e8f0)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--ds-muted, #64748b)" }}
            angle={-15}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--ds-muted, #64748b)" }} allowDecimals={false} />
          <RTooltip contentStyle={ChartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar
            dataKey="resolved"
            name="Résolus"
            fill={designTokens.colors.success}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="assigned"
            name="Assignés"
            fill={designTokens.colors.info}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Chart tendances 7j (area) */
const TrendChart: React.FC<{ data: ManagerDashboardData["trend7d"] }> = ({ data }) => {
  if (data.length === 0) return <ChartEmpty label="Aucune tendance disponible" />;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {/* ---------- AREA CHART : tendances 7 jours ----------
             – 2 courbes : tickets créés (orange) vs résolus (vert)
             – Permet de voir l'évolution du flux entrant/sortant
        */}
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={designTokens.colors.warning} stopOpacity={0.3} />
              <stop offset="100%" stopColor={designTokens.colors.warning} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={designTokens.colors.success} stopOpacity={0.3} />
              <stop offset="100%" stopColor={designTokens.colors.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border, #e2e8f0)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--ds-muted, #64748b)" }}
            tickFormatter={(v: string) => {
              try {
                return formatDateDayMonth(v);
              } catch {
                return v;
              }
            }}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--ds-muted, #64748b)" }} allowDecimals={false} />
          <RTooltip contentStyle={ChartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area
            type="monotone"
            dataKey="created"
            name="Créés"
            stroke={designTokens.colors.warning}
            strokeWidth={2}
            fill="url(#gradCreated)"
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Résolus"
            stroke={designTokens.colors.success}
            strokeWidth={2}
            fill="url(#gradResolved)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Placeholder vide pour un chart */
const ChartEmpty: React.FC<{ label: string }> = ({ label }) => (
  <div className="h-72 flex items-center justify-center">
    <p className="text-sm text-ds-muted">{label}</p>
  </div>
);

// =============================================================================
// SERVICES AT RISK TABLE
// =============================================================================

const ServicesAtRiskSection: React.FC<{ data: ServiceAtRisk[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Wifi size={40} />}
        title="Aucun service à risque"
        description="Tous les services fonctionnent dans les paramètres SLA."
      />
    );
  }

  return (
    <div className="max-h-[24rem] overflow-auto">
      <table className="ds-table-raw w-full">
        <thead className="bg-ds-elevated border-b border-ds-border">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
              Service
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
              Catégorie
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-ds-muted uppercase tracking-wider">
              État
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-ds-muted uppercase tracking-wider">
              Tickets
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-ds-muted uppercase tracking-wider">
              SLA dépassé
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-ds-muted uppercase tracking-wider">
              Taux SLA
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ds-border">
          {data.map((s, idx) => {
            const status = s.status as ServiceStatus;
            const isDown = status === ServiceStatus.DOWN || status === ServiceStatus.DEGRADED;
            return (
              <motion.tr
                key={s.id || idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="hover:bg-ds-elevated/60 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <Link
                    to={`/tickets?serviceId=${s.id}`}
                    className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-sm text-ds-secondary">{s.category}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${ServiceStatusColors[status] || "text-ds-muted"}`}
                  >
                    {isDown ? <WifiOff size={13} /> : <Wifi size={13} />}
                    {ServiceStatusLabels[status] || s.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold text-ds-primary tabular-nums">
                  {s.openTickets}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`text-sm font-semibold tabular-nums ${s.slaBreached > 0 ? "text-error" : "text-ds-muted"}`}
                  >
                    {s.slaBreached}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                      s.slaRate >= 90
                        ? "bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                        : s.slaRate >= 75
                          ? "bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                          : "bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                    }`}
                  >
                    {formatPercent(s.slaRate)}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// UTILITY: reverse label → enum key for drill-down
// =============================================================================

const STATUS_LABEL_TO_KEY: Record<string, string> = {
  Nouveau: "NEW",
  Assigné: "ASSIGNED",
  "En cours": "IN_PROGRESS",
  "En attente": "PENDING",
  "Att. tiers": "PENDING_THIRD_PARTY",
  Escaladé: "ESCALATED",
  Résolu: "RESOLVED",
  Fermé: "CLOSED",
  Annulé: "CANCELLED",
};
const PRIORITY_LABEL_TO_KEY: Record<string, string> = {
  Critique: "CRITICAL",
  Haute: "HIGH",
  Moyenne: "MEDIUM",
  Basse: "LOW",
};
function statusNameToKey(name: string): string | undefined {
  return STATUS_LABEL_TO_KEY[name];
}
function priorityNameToKey(name: string): string | undefined {
  return PRIORITY_LABEL_TO_KEY[name];
}

// =============================================================================
// SKELETON
// =============================================================================

const ManagerSkeleton: React.FC = () => (
  <div className="space-y-5">
    <Skeleton height={48} className="rounded-xl" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Skeleton height={340} className="rounded-xl" />
      <Skeleton height={340} className="rounded-xl" />
    </div>
    <Skeleton height={260} className="rounded-xl" />
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  stats,
  services = [],
  clients = [],
  lastUpdated,
  onRefresh,
  isLoadingRefresh = false,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // -- Local filter state ---------------------------------------------------
  const [period, setPeriod] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [clientId, setClientId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>({});
  const selectedFilterCount = [period, serviceId, clientId].filter(Boolean).length;

  // -- Build adapted data ---------------------------------------------------
  const data: ManagerDashboardData = useMemo(
    () => buildManagerDashboardData(stats, services, clients),
    [stats, services, clients],
  );

  // -- Build filter options from adapted data --------------------------------
  const serviceOptions: SelectOption[] = useMemo(
    () => services.map((s) => ({ value: String(s.id), label: s.name })),
    [services],
  );
  const clientOptions: SelectOption[] = useMemo(
    () => data.clientOptions.map((c) => ({ value: String(c.id), label: c.label })),
    [data.clientOptions],
  );

  // -- Refresh with filters -------------------------------------------------
  const handleRefresh = useCallback(() => {
    const filters: DashboardFilters = {};
    if (period) filters.period = period as DashboardFilters["period"];
    if (serviceId) filters.serviceId = Number(serviceId);
    if (clientId) filters.clientId = Number(clientId);
    // TODO BACKEND: support teamId (agentId) filter in dashboard stats endpoint
    setAppliedFilters(filters);
    onRefresh?.(filters);
  }, [period, serviceId, clientId, onRefresh]);

  // -- Skeleton state -------------------------------------------------------
  if (isLoading) return <ManagerSkeleton />;

  return (
    <motion.div
      className="space-y-8 xl:space-y-10"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ─── Header + refresh ────────────────────────────────────────── */}
      <motion.section variants={fadeUp}>
        <Card className="overflow-hidden rounded-[1.75rem] border border-ds-border/80 bg-gradient-to-br from-ds-card to-ds-surface shadow-card">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 xl:items-end">
              <div className="max-w-3xl">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
                  Poste de pilotage manager
                </span>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ds-primary">
                  Cockpit manager
                </h1>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <StageChip label="Lecture" value="KPI, analyses puis ALLIE" />
                  <StageChip
                    label="Filtres"
                    value={
                      selectedFilterCount > 0 ? `${selectedFilterCount} actif(s)` : "Aucun filtre"
                    }
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-ds-muted">
                  Vue consolidée des KPI, des engagements SLA et de la performance équipe.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {lastUpdated && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-border bg-ds-surface px-3 py-1.5 text-xs font-medium text-ds-secondary">
                    <CalendarClock size={13} />
                    Mise à jour {formatTime(lastUpdated)}
                  </span>
                )}
                <Button
                  variant={showFilters ? "primary" : "outline"}
                  size="sm"
                  icon={<Filter size={14} />}
                  onClick={() => setShowFilters((current) => !current)}
                >
                  {selectedFilterCount > 0 ? `Filtres (${selectedFilterCount})` : "Filtres"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={14} className={isLoadingRefresh ? "animate-spin" : ""} />}
                  onClick={handleRefresh}
                  disabled={isLoadingRefresh}
                >
                  Actualiser
                </Button>
              </div>
            </div>

            {/* ─── Filtres globaux ─────────────────────────────────────────── */}
            {(showFilters || selectedFilterCount > 0) && (
              <FiltersBar
                period={period}
                setPeriod={(v) => {
                  setPeriod(v);
                }}
                serviceId={serviceId}
                setServiceId={(v) => {
                  setServiceId(v);
                }}
                teamId={teamId}
                setTeamId={(v) => {
                  setTeamId(v);
                }}
                clientId={clientId}
                setClientId={(v) => {
                  setClientId(v);
                }}
                serviceOptions={serviceOptions}
                teamOptions={[]}
                clientOptions={clientOptions}
                embedded
              />
            )}
          </div>
        </Card>
      </motion.section>

      {/* ─── KPI row (5 cards) ───────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionLead
          eyebrow="Etat global"
          title="KPI manager"
          description="Première lecture de situation : engagement SLA, rythme de résolution, backlog et urgences."
          icon={<ShieldCheck size={20} />}
        />
        <KpiRow kpis={data.kpis} />
      </section>

      <section className="space-y-4">
        <SectionLead
          eyebrow="Lecture analytique"
          title="Analyses de supervision"
          description="Les analyses classiques restent la base de lecture avant les recommandations d'ALLIE."
          icon={<TrendingUp size={20} />}
        />

        {/* ─── Charts row: Statut + Priorité (clickable → drill-down) ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <motion.div variants={fadeUp}>
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-ds-border px-5 py-3.5">
                <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
                  Répartition par statut
                </h3>
                <span className="text-[10px] text-ds-muted font-medium uppercase">
                  Cliquer pour drill-down
                </span>
              </div>
              <div className="p-4">
                <StatusChart data={data.statusChartData} navigate={navigate} />
              </div>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-ds-border px-5 py-3.5">
                <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
                  Répartition par priorité
                </h3>
                <span className="text-[10px] text-ds-muted font-medium uppercase">
                  Cliquer pour drill-down
                </span>
              </div>
              <div className="p-4">
                <PriorityChart data={data.priorityChartData} navigate={navigate} />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ─── Top services à risque ───────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ds-border px-5 py-3.5">
              <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning-500" />
                Top services à risque
              </h3>
              <Link
                to="/services"
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
              >
                Tous les services <ArrowRight size={14} />
              </Link>
            </div>
            <ServicesAtRiskSection data={data.servicesAtRisk} />
          </Card>
        </motion.div>

        {/* ─── Charts row: Performance équipe + Tendances 7j ───────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <motion.div variants={fadeUp}>
            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-ds-border px-5 py-3.5">
                <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
                  <Users size={18} className="text-primary-500" />
                  Performance équipe
                </h3>
              </div>
              <div className="p-4">
                <TeamPerformanceChart data={data.agentPerformance} />
              </div>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-ds-border px-5 py-3.5">
                <h3 className="text-base font-bold text-ds-primary flex items-center gap-2">
                  <TrendingUp size={18} className="text-accent-500" />
                  Tendances 7 jours
                </h3>
              </div>
              <div className="p-4">
                <TrendChart data={data.trend7d} />
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionLead
          eyebrow={MANAGER_COPILOT_PRODUCT_LABEL}
          title={MANAGER_COPILOT_TITLE}
          description={`${MANAGER_COPILOT_SUBTITLE}. L&apos;IA intervient apres la lecture analytique pour aider a decider, sans ecraser la lecture manager classique.`}
          icon={<Sparkles size={20} />}
        />

        <ManagerCopilotDashboardSection filters={appliedFilters} />
      </section>
    </motion.div>
  );
};

export default ManagerDashboard;
