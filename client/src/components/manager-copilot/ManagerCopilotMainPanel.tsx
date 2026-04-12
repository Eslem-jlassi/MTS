import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  FileText,
  RefreshCw,
  ShieldAlert,
  Ticket,
  Zap,
} from "lucide-react";
import { Badge, Button, EmptyState, Modal } from "../ui";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotQuickAction,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
  ManagerCopilotTone,
} from "./types";
import {
  ManagerCopilotDecisionCard,
  ManagerCopilotFocusCard,
  ManagerCopilotLoadingState,
  ManagerCopilotSectionBlock,
  ManagerCopilotSignalCard,
  ManagerCopilotStatusBanner,
  ManagerCopilotWhyCardView,
} from "./ManagerCopilotPanelParts";
import { buildManagerSummaryDraft } from "./managerCopilotActions";
import {
  formatManagerCopilotUpdatedAt,
  getManagerCopilotPrimarySignal,
  MANAGER_COPILOT_TITLE,
  modeLabels,
} from "./managerCopilotUi";
import "./ManagerCopilotStyles.css";

interface ManagerCopilotPanelProps {
  snapshot: ManagerCopilotSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (href: string, options?: { state?: unknown }) => void;
}

type SignalGroupKey = "priorityTickets" | "probableIncidents" | "assignments" | "slaAlerts";

interface SignalSectionConfig {
  key: SignalGroupKey;
  title: string;
  subtitle: string;
  eyebrow: string;
  tone: ManagerCopilotTone;
  icon: React.ReactNode;
  emptyLabel: string;
}

const SIGNAL_SECTION_CONFIGS: SignalSectionConfig[] = [
  {
    key: "priorityTickets",
    title: "Tickets a arbitrer",
    subtitle: "Les dossiers qui meritent une priorisation explicite.",
    eyebrow: "Decision immediate",
    tone: "critical",
    icon: <Ticket size={16} />,
    emptyLabel: "Aucun ticket ne ressort au-dessus du bruit operationnel.",
  },
  {
    key: "probableIncidents",
    title: "Incidents probables",
    subtitle: "Les signaux qui suggerent une cause commune ou un impact global.",
    eyebrow: "Lecture transverse",
    tone: "warning",
    icon: <AlertTriangle size={16} />,
    emptyLabel: "Aucun incident transverse n'est suggere a ce stade.",
  },
  {
    key: "assignments",
    title: "Repartition de charge",
    subtitle: "Les pre-affectations utiles pour lisser la charge equipe.",
    eyebrow: "Capacite equipe",
    tone: "info",
    icon: <BriefcaseBusiness size={16} />,
    emptyLabel: "Aucune reallocation prioritaire n'est proposee pour le moment.",
  },
  {
    key: "slaAlerts",
    title: "Prevention SLA",
    subtitle: "Les dossiers a securiser avant rupture ou escalation.",
    eyebrow: "Protection engagement",
    tone: "warning",
    icon: <Clock3 size={16} />,
    emptyLabel: "Aucune alerte SLA ne necessite d'arbitrage immediat.",
  },
];

const DEFAULT_OPEN_SECTIONS: Record<SignalGroupKey, boolean> = {
  priorityTickets: true,
  probableIncidents: false,
  assignments: false,
  slaAlerts: true,
};

const ManagerCopilotSummaryPrepModal: React.FC<{
  draft: ReturnType<typeof buildManagerSummaryDraft>;
  isOpen: boolean;
  onClose: () => void;
  onOpenReports: () => void;
}> = ({ draft, isOpen, onClose, onOpenReports }) => {
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopied(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Synthese manager preparee"
      description="Version exploitable immediatement pour un point manager ou une bascule vers le reporting."
    >
      <div className="manager-copilot-summary-draft">
        <div className="manager-copilot-summary-draft-grid">
          {draft.highlights.map((highlight) => (
            <div key={highlight} className="manager-copilot-summary-draft-highlight">
              {highlight}
            </div>
          ))}
        </div>

        <div className="manager-copilot-summary-draft-sheet">
          <p className="manager-copilot-summary-draft-title">{draft.title}</p>
          <textarea
            readOnly
            value={draft.text}
            className="manager-copilot-summary-draft-textarea"
          />
        </div>

        <div className="manager-copilot-summary-draft-actions">
          <Button size="sm" icon={<Copy size={14} />} onClick={handleCopy}>
            {copied ? "Synthese copiee" : "Copier la synthese"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            onClick={onOpenReports}
          >
            Ouvrir le reporting
          </Button>
        </div>

        <p className="manager-copilot-summary-draft-note">
          Cette synthese est preparee cote front a partir des signaux deja consolides par ALLIE.
        </p>
      </div>
    </Modal>
  );
};

function buildSectionSummary(
  signals: Array<ManagerCopilotSignal | ManagerCopilotAssignmentSignal>,
  emptyLabel: string,
) {
  if (signals.length === 0) {
    return <div className="manager-copilot-empty-inline">{emptyLabel}</div>;
  }

  const leadSignal = signals[0];
  const remaining = signals.length - 1;

  return (
    <div className="manager-copilot-section-summary-card">
      <span className="manager-copilot-section-summary-kicker">Priorite visible</span>
      <strong className="manager-copilot-section-summary-title">{leadSignal.title}</strong>
      <p className="manager-copilot-section-summary-text">
        {leadSignal.recommendation || leadSignal.description}
      </p>
      <div className="manager-copilot-section-summary-meta">
        {leadSignal.meta && <span>{leadSignal.meta}</span>}
        {remaining > 0 && <span>{remaining} signal(s) supplementaire(s)</span>}
      </div>
    </div>
  );
}

function renderSignalSection(
  snapshot: ManagerCopilotSnapshot,
  section: SignalSectionConfig,
  onNavigate: (href: string, options?: { state?: unknown }) => void,
  isOpen: boolean,
  onToggle: () => void,
) {
  const signals = snapshot[section.key] as Array<
    ManagerCopilotSignal | ManagerCopilotAssignmentSignal
  >;

  return (
    <ManagerCopilotSectionBlock
      key={section.key}
      title={section.title}
      subtitle={section.subtitle}
      eyebrow={section.eyebrow}
      tone={section.tone}
      icon={section.icon}
      count={signals.length}
      emptyLabel={section.emptyLabel}
      collapsible
      isOpen={isOpen}
      onToggle={onToggle}
      summary={buildSectionSummary(signals, section.emptyLabel)}
    >
      <div className="manager-copilot-section-list">
        {signals.length > 0 ? (
          signals.map((signal) => (
            <ManagerCopilotSignalCard
              key={signal.id}
              signal={signal}
              sectionKey={section.key}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <div className="manager-copilot-empty-inline">{section.emptyLabel}</div>
        )}
      </div>
    </ManagerCopilotSectionBlock>
  );
}

function renderQuickActions(
  actions: ManagerCopilotQuickAction[],
  onNavigate: (href: string, options?: { state?: unknown }) => void,
) {
  return (
    <ManagerCopilotSectionBlock
      title="Actions rapides"
      subtitle="Les raccourcis vers la prochaine action utile."
      eyebrow="Execution manager"
      tone="neutral"
      icon={<Zap size={16} />}
      count={actions.length}
      emptyLabel="Aucune action rapide suggeree."
    >
      {actions.length > 0 ? (
        <div className="manager-copilot-actions-grid">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`manager-copilot-action-card manager-copilot-action-card-${action.tone}`}
              onClick={() => onNavigate(action.href)}
            >
              <div>
                <strong className="manager-copilot-action-title">{action.label}</strong>
                <p className="manager-copilot-action-description">{action.description}</p>
              </div>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      ) : (
        <div className="manager-copilot-empty-inline">Aucune action rapide suggeree.</div>
      )}
    </ManagerCopilotSectionBlock>
  );
}

export const ManagerCopilotPanel: React.FC<ManagerCopilotPanelProps> = ({
  snapshot,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onNavigate,
}) => {
  const [isSummaryPrepOpen, setIsSummaryPrepOpen] = useState(false);
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [showAllDecisionAreas, setShowAllDecisionAreas] = useState(false);
  const [openSections, setOpenSections] =
    useState<Record<SignalGroupKey, boolean>>(DEFAULT_OPEN_SECTIONS);

  const focusSignal = useMemo(() => getManagerCopilotPrimarySignal(snapshot), [snapshot]);
  const summaryDraft = useMemo(
    () => (snapshot ? buildManagerSummaryDraft(snapshot) : null),
    [snapshot],
  );
  const visibleDecisionAreas = useMemo(
    () =>
      snapshot
        ? showAllDecisionAreas
          ? snapshot.decisionAreas
          : snapshot.decisionAreas.slice(0, 3)
        : [],
    [showAllDecisionAreas, snapshot],
  );
  const whyPreview = useMemo(() => snapshot?.whyCards.slice(0, 2) ?? [], [snapshot]);

  const toggleSection = (key: SignalGroupKey) =>
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));

  if (isLoading) {
    return <ManagerCopilotLoadingState />;
  }

  if (!snapshot) {
    return (
      <EmptyState
        icon={<ShieldAlert size={34} />}
        title={`${MANAGER_COPILOT_TITLE} temporairement indisponible`}
        description={error || "Les signaux manager n'ont pas pu etre consolides pour le moment."}
        action={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={onRefresh}>
            Reessayer
          </Button>
        }
        className="manager-copilot-empty-state"
      />
    );
  }

  return (
    <>
      <div className="manager-copilot-panel-body">
        <section className="manager-copilot-summary-card">
          <div className="manager-copilot-summary-topline">
            <Badge
              size="sm"
              variant={snapshot.mode === "live" ? "success" : "warning"}
              className="manager-copilot-badge"
            >
              {modeLabels[snapshot.mode]}
            </Badge>
            <button
              type="button"
              className="manager-copilot-refresh-button"
              onClick={onRefresh}
              aria-label="Actualiser le copilote manager"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              {formatManagerCopilotUpdatedAt(snapshot.generatedAt)}
            </button>
          </div>

          <div className="manager-copilot-summary-board">
            <div className="manager-copilot-summary-primary">
              <div className="manager-copilot-summary-header">
                <div className="manager-copilot-summary-copy">
                  <span className="manager-copilot-summary-kicker">Situation du jour</span>
                  <h2 className="manager-copilot-summary-title">Brief executif manager</h2>
                </div>
              </div>

              <p className="manager-copilot-summary-text">{snapshot.summary}</p>

              <div className="manager-copilot-summary-cta-row">
                <Button
                  size="sm"
                  icon={<FileText size={14} />}
                  onClick={() => setIsSummaryPrepOpen(true)}
                >
                  Preparer la synthese
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={() => onNavigate("/reports")}
                >
                  Ouvrir le reporting
                </Button>
              </div>

              {(snapshot.mode !== "live" || Boolean(error)) && (
                <ManagerCopilotStatusBanner mode={snapshot.mode} error={error} />
              )}

              {focusSignal && (
                <ManagerCopilotFocusCard signal={focusSignal} onNavigate={onNavigate} />
              )}
            </div>

            <aside className="manager-copilot-summary-aside">
              <div className="manager-copilot-content-group manager-copilot-content-group-tight">
                <div className="manager-copilot-subsection-heading">
                  <span className="manager-copilot-subsection-kicker">Tableau de bord IA</span>
                  <h3 className="manager-copilot-subsection-title">Lecture immediate</h3>
                </div>
                <div className="manager-copilot-summary-grid">
                  {snapshot.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className={`manager-copilot-metric-card manager-copilot-metric-card-${metric.tone}`}
                    >
                      <span className="manager-copilot-metric-label">{metric.label}</span>
                      <div className="manager-copilot-metric-value-row">
                        <strong className="manager-copilot-metric-value">{metric.value}</strong>
                        <span
                          className={`manager-copilot-metric-dot manager-copilot-metric-dot-${metric.tone}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="manager-copilot-content-group">
            <div className="manager-copilot-subsection-heading manager-copilot-subsection-heading-inline">
              <div>
                <span className="manager-copilot-subsection-kicker">Axes prioritaires</span>
                <h3 className="manager-copilot-subsection-title">Decisions cles</h3>
              </div>
              {snapshot.decisionAreas.length > 3 && (
                <button
                  type="button"
                  className="manager-copilot-section-toggle"
                  onClick={() => setShowAllDecisionAreas((current) => !current)}
                  aria-expanded={showAllDecisionAreas}
                >
                  {showAllDecisionAreas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showAllDecisionAreas ? "Replier" : "Voir plus"}
                </button>
              )}
            </div>
            <div className="manager-copilot-decision-grid">
              {visibleDecisionAreas.map((area) => (
                <ManagerCopilotDecisionCard key={area.id} area={area} />
              ))}
            </div>
          </div>

          <div className="manager-copilot-content-group">
            <div className="manager-copilot-subsection-heading manager-copilot-subsection-heading-inline">
              <div>
                <span className="manager-copilot-subsection-kicker">Lecture assistant</span>
                <h3 className="manager-copilot-subsection-title">Justifications detaillees</h3>
              </div>
              <button
                type="button"
                className="manager-copilot-section-toggle"
                onClick={() => setIsWhyOpen((current) => !current)}
                aria-expanded={isWhyOpen}
              >
                {isWhyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {isWhyOpen ? "Replier" : "Afficher"}
              </button>
            </div>

            {isWhyOpen ? (
              <div className="manager-copilot-why-grid">
                {snapshot.whyCards.map((card) => (
                  <ManagerCopilotWhyCardView key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <div className="manager-copilot-why-summary">
                {whyPreview.map((card) => (
                  <div key={card.id} className="manager-copilot-why-summary-pill">
                    {card.title}
                  </div>
                ))}
                {snapshot.whyCards.length > whyPreview.length && (
                  <div className="manager-copilot-why-summary-pill">
                    {snapshot.whyCards.length - whyPreview.length} lecture(s) supplementaire(s)
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {renderQuickActions(snapshot.quickActions, onNavigate)}

        <section className="manager-copilot-section-cluster">
          <div className="manager-copilot-cluster-heading">
            <div>
              <span className="manager-copilot-cluster-kicker">Details approfondis</span>
              <h3 className="manager-copilot-cluster-title">
                Dossiers a arbitrer et file de decision
              </h3>
            </div>
            <p className="manager-copilot-cluster-text">
              Les sections detaillent l'operationnel sans ecraser la lecture initiale: priorite du
              moment d'abord, details complets sur demande.
            </p>
          </div>
          <div className="manager-copilot-sections-grid">
            {SIGNAL_SECTION_CONFIGS.map((section) =>
              renderSignalSection(snapshot, section, onNavigate, openSections[section.key], () =>
                toggleSection(section.key),
              ),
            )}
          </div>
        </section>
      </div>

      <ManagerCopilotSummaryPrepModal
        draft={summaryDraft ?? buildManagerSummaryDraft(snapshot)}
        isOpen={isSummaryPrepOpen}
        onClose={() => setIsSummaryPrepOpen(false)}
        onOpenReports={() => {
          setIsSummaryPrepOpen(false);
          onNavigate("/reports");
        }}
      />
    </>
  );
};

export default ManagerCopilotPanel;
