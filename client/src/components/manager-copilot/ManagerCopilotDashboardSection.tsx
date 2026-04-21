import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Badge, Button, Card, EmptyState, Skeleton } from "../ui";
import type { DashboardFilters } from "../../api/dashboardService";
import { RootState } from "../../redux/store";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotQuickAction,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
} from "./types";
import ManagerCopilotAvatar from "./ManagerCopilotAvatar";
import ManagerCopilotHeader from "./ManagerCopilotHeader";
import ManagerCopilotPanel from "./ManagerCopilotMainPanel";
import { useManagerCopilot } from "./useManagerCopilot";
import { buildCompactContextAction } from "./managerCopilotActions";
import {
  confidenceLabels,
  confidenceToBadgeVariant,
  formatManagerCopilotUpdatedAt,
  getManagerCopilotMoment,
  getManagerCopilotPreviewSignals,
  getManagerCopilotPrimarySignal,
  MANAGER_COPILOT_DASHBOARD_SUBTITLE,
  MANAGER_COPILOT_PRODUCT_LABEL,
  MANAGER_COPILOT_TITLE,
  isManagerCopilotAllowedRole,
  modeLabels,
  toneLabels,
  toneToBadgeVariant,
} from "./managerCopilotUi";

interface ManagerCopilotDashboardSectionProps {
  filters?: DashboardFilters;
}

type DisplaySignal = ManagerCopilotSignal | ManagerCopilotAssignmentSignal;

interface RecommendedAction {
  label: string;
  description: string;
  href: string;
  tone: DisplaySignal["tone"] | ManagerCopilotQuickAction["tone"];
}

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
} as const;

function getRecommendedAction(snapshot: ManagerCopilotSnapshot): RecommendedAction | null {
  const primarySignal = getManagerCopilotPrimarySignal(snapshot);

  if (primarySignal) {
    return {
      label: primarySignal.ctaLabel || "Ouvrir le dossier recommande",
      description: primarySignal.recommendation || primarySignal.description,
      href: primarySignal.href,
      tone: primarySignal.tone,
    };
  }

  const fallbackAction = snapshot.quickActions[0];

  if (!fallbackAction) {
    return null;
  }

  return {
    label: fallbackAction.label,
    description: fallbackAction.description,
    href: fallbackAction.href,
    tone: fallbackAction.tone,
  };
}

const CompactCopilotLoadingState: React.FC = () => (
  <Card className="manager-copilot-compact-card overflow-hidden border border-ds-border bg-ds-card/95">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton height={56} width={56} className="rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} width={120} className="rounded-full" />
            <Skeleton height={24} width={180} className="rounded-xl" />
            <Skeleton height={40} className="rounded-2xl" />
          </div>
        </div>
        <Skeleton height={70} className="rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton height={40} className="rounded-xl" />
          <Skeleton height={40} className="rounded-xl" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} height={132} className="rounded-2xl" />
        ))}
      </div>
    </div>
  </Card>
);

const CompactCopilotOverview: React.FC<{
  snapshot: ManagerCopilotSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (href: string, options?: { state?: unknown }) => void;
  onOpenCockpit: () => void;
}> = ({ snapshot, isLoading, isRefreshing, error, onRefresh, onNavigate, onOpenCockpit }) => {
  const moment = getManagerCopilotMoment(snapshot);
  const previewSignals = useMemo(() => getManagerCopilotPreviewSignals(snapshot, 3), [snapshot]);
  const primarySignal = useMemo(() => getManagerCopilotPrimarySignal(snapshot), [snapshot]);
  const recommendedAction = useMemo(
    () => (snapshot ? getRecommendedAction(snapshot) : null),
    [snapshot],
  );
  const contextAction = useMemo(() => buildCompactContextAction(primarySignal), [primarySignal]);

  if (isLoading) {
    return <CompactCopilotLoadingState />;
  }

  if (!snapshot) {
    return (
      <Card className="manager-copilot-compact-card overflow-hidden border border-ds-border bg-ds-card/95">
        <EmptyState
          icon={<ShieldAlert size={32} />}
          title={`${MANAGER_COPILOT_TITLE} temporairement indisponible`}
          description={error || "Les signaux d'aide a la decision n'ont pas pu etre consolides."}
          action={
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={onRefresh}>
              Reessayer
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="manager-copilot-compact-card overflow-hidden border border-ds-border bg-ds-card/95 shadow-card">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="manager-copilot-compact-avatar-shell flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm">
                <ManagerCopilotAvatar className="h-9 w-9" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
                    {MANAGER_COPILOT_PRODUCT_LABEL}
                  </span>
                  <Badge
                    size="sm"
                    variant={snapshot.mode === "live" ? "success" : "warning"}
                    className="manager-copilot-badge"
                  >
                    {modeLabels[snapshot.mode]}
                  </Badge>
                </div>
                <h3 className="mt-1 text-lg font-extrabold tracking-tight text-ds-primary">
                  {MANAGER_COPILOT_TITLE}
                </h3>
                <p className="mt-1 text-sm leading-6 text-ds-muted">
                  {MANAGER_COPILOT_DASHBOARD_SUBTITLE}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />}
              onClick={onRefresh}
            >
              {isRefreshing
                ? "Actualisation..."
                : formatManagerCopilotUpdatedAt(snapshot.generatedAt)}
            </Button>
          </div>

          <div className="manager-copilot-compact-summary rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                size="sm"
                variant={toneToBadgeVariant(moment.tone)}
                className="manager-copilot-badge"
              >
                {moment.title}
              </Badge>
              {snapshot.urgentCount > 0 && (
                <Badge size="sm" variant="danger" className="manager-copilot-badge">
                  {snapshot.urgentCount} critique(s)
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-ds-secondary">{snapshot.summary}</p>
          </div>

          {recommendedAction && (
            <div className="manager-copilot-compact-recommendation rounded-2xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
                Action recommandee
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  size="sm"
                  variant={toneToBadgeVariant(recommendedAction.tone)}
                  className="manager-copilot-badge"
                >
                  {toneLabels[recommendedAction.tone]}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-ds-primary">
                {recommendedAction.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-ds-muted">
                {recommendedAction.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" icon={<Sparkles size={14} />} onClick={onOpenCockpit}>
                  Ouvrir le cockpit
                </Button>
                {(contextAction || recommendedAction) && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowRight size={14} />}
                    iconPosition="right"
                    onClick={() =>
                      onNavigate(
                        contextAction?.href || recommendedAction.href,
                        contextAction?.state ? { state: contextAction.state } : undefined,
                      )
                    }
                  >
                    {contextAction?.label || recommendedAction.label}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
                Signaux prioritaires
              </span>
              <h4 className="mt-1 text-base font-bold text-ds-primary">3 signaux a retenir</h4>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {previewSignals.length > 0 ? (
              previewSignals.map((signal) => (
                <article
                  key={signal.id}
                  className="manager-copilot-compact-signal-card rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ds-muted">
                      {signal.eyebrow}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge
                        size="sm"
                        variant={toneToBadgeVariant(signal.tone)}
                        className="manager-copilot-badge"
                      >
                        {toneLabels[signal.tone]}
                      </Badge>
                      <Badge
                        size="sm"
                        variant={confidenceToBadgeVariant(signal.confidence)}
                        className="manager-copilot-badge"
                      >
                        {confidenceLabels[signal.confidence]}
                      </Badge>
                    </div>
                  </div>
                  <h5 className="mt-3 text-sm font-bold leading-6 text-ds-primary">
                    {signal.title}
                  </h5>
                  <p className="mt-1 text-xs leading-5 text-ds-muted">
                    {signal.recommendation || signal.description}
                  </p>
                  {signal.meta && (
                    <p className="manager-copilot-compact-meta mt-3 text-xs font-medium">
                      {signal.meta}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-ds-border bg-ds-surface p-4 text-sm text-ds-muted md:col-span-2 xl:col-span-3">
                Aucun signal prioritaire ne ressort pour le moment. Le cockpit detaille reste
                disponible pour explorer l'ensemble des sections.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const ManagerCopilotDashboardSection: React.FC<ManagerCopilotDashboardSectionProps> = ({
  filters,
}) => {
  const navigate = useNavigate();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isManagerContext = isManagerCopilotAllowedRole(userRole);
  const detailRef = useRef<HTMLElement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { snapshot, isLoading, isRefreshing, error, refresh } = useManagerCopilot({
    enabled: isManagerContext,
    filters,
    role: userRole,
  });

  if (!isManagerContext) {
    return null;
  }

  const handleNavigate = (href: string, options?: { state?: unknown }) =>
    navigate(href, options?.state ? { state: options.state } : undefined);
  const handleOpenCockpit = () => {
    setIsDetailOpen(true);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const detailSummary = snapshot
    ? `${snapshot.priorityTickets.length} tickets, ${snapshot.probableIncidents.length} incidents probables, ${snapshot.slaAlerts.length} alertes SLA`
    : "Consolidation des arbitrages en cours";

  if (!isLoading && !snapshot) {
    return (
      <motion.section {...sectionMotion}>
        <CompactCopilotOverview
          snapshot={snapshot}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          onRefresh={refresh}
          onNavigate={handleNavigate}
          onOpenCockpit={handleOpenCockpit}
        />
      </motion.section>
    );
  }

  return (
    <div className="space-y-6">
      <motion.section {...sectionMotion}>
        <CompactCopilotOverview
          snapshot={snapshot}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          onRefresh={refresh}
          onNavigate={handleNavigate}
          onOpenCockpit={handleOpenCockpit}
        />
      </motion.section>

      <motion.section ref={detailRef} {...sectionMotion}>
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ds-border px-5 py-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ds-muted">
                {MANAGER_COPILOT_PRODUCT_LABEL}
              </span>
              <h3 className="mt-1 text-lg font-extrabold tracking-tight text-ds-primary">
                {MANAGER_COPILOT_TITLE}
              </h3>
              <p className="mt-1 text-sm text-ds-muted">{detailSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />}
                onClick={refresh}
              >
                Actualiser
              </Button>
              <Button
                variant={isDetailOpen ? "outline" : "primary"}
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => setIsDetailOpen((current) => !current)}
              >
                {isDetailOpen ? "Replier le cockpit" : "Afficher le cockpit"}
              </Button>
            </div>
          </div>

          {isDetailOpen && (
            <>
              <ManagerCopilotHeader
                subtitle={MANAGER_COPILOT_DASHBOARD_SUBTITLE}
                snapshot={snapshot}
                isRefreshing={isRefreshing}
                mode={snapshot?.mode}
                showDecisionBadge
                modeDisplay="badge"
                variant="dashboard"
              />

              <ManagerCopilotPanel
                snapshot={snapshot}
                isLoading={isLoading}
                isRefreshing={isRefreshing}
                error={error}
                onRefresh={refresh}
                onNavigate={handleNavigate}
              />
            </>
          )}
        </Card>
      </motion.section>
    </div>
  );
};

export default ManagerCopilotDashboardSection;
