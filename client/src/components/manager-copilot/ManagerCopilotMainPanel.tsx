import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Copy,
  FileText,
  Minimize2,
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
  ManagerCopilotLoadingState,
  ManagerCopilotSectionBlock,
  ManagerCopilotSignalCard,
  ManagerCopilotStatusBanner,
  ManagerCopilotWhyCardView,
} from "./ManagerCopilotPanelParts";
import { buildManagerSummaryDraft } from "./managerCopilotActions";
import {
  confidenceLabels,
  confidenceToBadgeVariant,
  formatManagerCopilotConfidenceScore,
  formatManagerCopilotDecisionAction,
  formatManagerCopilotUpdatedAt,
  getManagerCopilotInferenceModeLabel,
  getManagerCopilotPrimarySignal,
  MANAGER_COPILOT_TITLE,
  modeLabels,
  toneLabels,
  toneToBadgeVariant,
} from "./managerCopilotUi";
import "./ManagerCopilotStyles.css";

interface ManagerCopilotPanelProps {
  snapshot: ManagerCopilotSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (href: string, options?: { state?: unknown }) => void;
  onClose?: () => void;
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
            {copied ? "Synthèse copiée" : "Copier la synthèse"}
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
          Cette synthèse assemble les signaux déjà consolidés par ALLIE pour un point manager
          rapide.
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

function buildPrioritySignals(snapshot: ManagerCopilotSnapshot) {
  const toneOrder: Record<ManagerCopilotTone, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
    neutral: 4,
  };
  const confidenceOrder = { high: 0, medium: 1, low: 2 } as const;

  const aggregated: Array<ManagerCopilotSignal | ManagerCopilotAssignmentSignal> = [
    ...snapshot.priorityTickets,
    ...snapshot.slaAlerts,
    ...snapshot.probableIncidents,
    ...snapshot.assignments,
  ];
  const seen = new Set<string>();

  return aggregated
    .filter((signal) => {
      if (seen.has(signal.id)) {
        return false;
      }
      seen.add(signal.id);
      return true;
    })
    .sort(
      (left, right) =>
        toneOrder[left.tone] - toneOrder[right.tone] ||
        confidenceOrder[left.confidence] - confidenceOrder[right.confidence],
    )
    .slice(0, 4);
}

function renderSnapshotKnnSummary(snapshot: ManagerCopilotSnapshot) {
  const featureSummary = (snapshot.featureSummary ?? []).slice(0, 4);

  if (
    !snapshot.inferenceMode &&
    typeof snapshot.confidenceScore !== "number" &&
    !snapshot.modelVersion &&
    featureSummary.length === 0
  ) {
    return null;
  }

  return (
    <div className="manager-copilot-cockpit-knn-strip">
      <div className="manager-copilot-cockpit-knn-metric">
        <span>Copilote KNN</span>
        <strong>{getManagerCopilotInferenceModeLabel(snapshot.inferenceMode)}</strong>
      </div>
      <div className="manager-copilot-cockpit-knn-metric">
        <span>Confiance KNN</span>
        <strong>{formatManagerCopilotConfidenceScore(snapshot.confidenceScore)}</strong>
      </div>
      {snapshot.modelVersion && (
        <div className="manager-copilot-cockpit-knn-metric">
          <span>Version modele</span>
          <strong>{snapshot.modelVersion}</strong>
        </div>
      )}
      {featureSummary.length > 0 && (
        <p className="manager-copilot-cockpit-knn-summary">{featureSummary.join(" - ")}</p>
      )}
    </div>
  );
}

export const ManagerCopilotPanel: React.FC<ManagerCopilotPanelProps> = ({
  snapshot,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onNavigate,
  onClose,
}) => {
  const [isSummaryPrepOpen, setIsSummaryPrepOpen] = useState(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [openSections, setOpenSections] =
    useState<Record<SignalGroupKey, boolean>>(DEFAULT_OPEN_SECTIONS);

  const focusSignal = useMemo(() => getManagerCopilotPrimarySignal(snapshot), [snapshot]);
  const summaryDraft = useMemo(
    () => (snapshot ? buildManagerSummaryDraft(snapshot) : null),
    [snapshot],
  );
  const prioritySignals = useMemo(
    () => (snapshot ? buildPrioritySignals(snapshot) : []),
    [snapshot],
  );

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
        <section className="manager-copilot-cockpit-block manager-copilot-cockpit-block-summary">
          <div className="manager-copilot-cockpit-block-head">
            <div>
              <span className="manager-copilot-cockpit-kicker">Resume du moment</span>
              <h2 className="manager-copilot-cockpit-title">Vue manager en un coup d'oeil</h2>
            </div>
            <div className="manager-copilot-cockpit-head-actions">
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
          </div>

          <p className="manager-copilot-cockpit-summary-text">{snapshot.summary}</p>
          <p className="manager-copilot-cockpit-helper-text">
            ALLIE consolide les signaux de supervision et rapproche chaque situation d'exemples
            similaires via une recommandation KNN.
          </p>
          {renderSnapshotKnnSummary(snapshot)}

          <div className="manager-copilot-cockpit-metric-row">
            {snapshot.metrics.map((metric) => (
              <div
                key={metric.label}
                className={`manager-copilot-cockpit-metric-chip manager-copilot-cockpit-metric-chip-${metric.tone}`}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          {(snapshot.mode !== "live" || Boolean(error)) && (
            <ManagerCopilotStatusBanner mode={snapshot.mode} error={error} />
          )}
        </section>

        <section className="manager-copilot-cockpit-block manager-copilot-cockpit-block-focus">
          <div className="manager-copilot-cockpit-block-head">
            <div>
              <span className="manager-copilot-cockpit-kicker">Action recommandée</span>
              <h3 className="manager-copilot-cockpit-subtitle">Prochaine decision a fort impact</h3>
            </div>
          </div>

          {focusSignal ? (
            <article
              className={`manager-copilot-cockpit-focus-card manager-copilot-cockpit-focus-card-${focusSignal.tone}`}
            >
              <div className="manager-copilot-cockpit-focus-topline">
                <div className="manager-copilot-signal-badges">
                  <Badge
                    size="sm"
                    variant={toneToBadgeVariant(focusSignal.tone)}
                    className="manager-copilot-badge"
                  >
                    {toneLabels[focusSignal.tone]}
                  </Badge>
                  <Badge
                    size="sm"
                    variant={confidenceToBadgeVariant(focusSignal.confidence)}
                    className="manager-copilot-badge"
                  >
                    {confidenceLabels[focusSignal.confidence]}
                  </Badge>
                </div>
                <span className="manager-copilot-cockpit-focus-meta">
                  {focusSignal.meta || focusSignal.eyebrow}
                </span>
              </div>
              <h4 className="manager-copilot-cockpit-focus-title">{focusSignal.title}</h4>
              <p className="manager-copilot-cockpit-focus-description">
                {focusSignal.recommendation || focusSignal.description}
              </p>
              {(focusSignal.inferenceMode ||
                focusSignal.predictedAction ||
                typeof focusSignal.confidenceScore === "number") && (
                <div className="manager-copilot-cockpit-focus-knn">
                  <div className="manager-copilot-cockpit-focus-knn-row">
                    <span className="manager-copilot-cockpit-focus-knn-label">
                      Recommandation KNN
                    </span>
                    <Badge size="sm" variant="ai" className="manager-copilot-badge">
                      {getManagerCopilotInferenceModeLabel(focusSignal.inferenceMode)}
                    </Badge>
                  </div>
                  <div className="manager-copilot-cockpit-focus-knn-grid">
                    <div>
                      <span className="manager-copilot-cockpit-focus-knn-label">
                        Action suggeree
                      </span>
                      <strong className="manager-copilot-cockpit-focus-knn-value">
                        {formatManagerCopilotDecisionAction(focusSignal.predictedAction)}
                      </strong>
                    </div>
                    <div>
                      <span className="manager-copilot-cockpit-focus-knn-label">Confiance KNN</span>
                      <strong className="manager-copilot-cockpit-focus-knn-value">
                        {formatManagerCopilotConfidenceScore(focusSignal.confidenceScore)}
                      </strong>
                    </div>
                  </div>
                  {focusSignal.nearestExamples && focusSignal.nearestExamples.length > 0 && (
                    <p className="manager-copilot-cockpit-focus-knn-neighbors">
                      Voisins similaires :{" "}
                      {focusSignal.nearestExamples
                        .slice(0, 2)
                        .map((example) => example.title)
                        .join(" - ")}
                    </p>
                  )}
                </div>
              )}
              {focusSignal.whyMatters && (
                <p className="manager-copilot-cockpit-focus-impact">
                  <strong>Impact prioritaire :</strong> {focusSignal.whyMatters}
                </p>
              )}
              <div className="manager-copilot-cockpit-focus-actions">
                <Button
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={() => onNavigate(focusSignal.href)}
                >
                  Ouvrir le dossier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={() => onNavigate("/reports")}
                >
                  Voir le reporting
                </Button>
              </div>
            </article>
          ) : (
            <div className="manager-copilot-empty-inline">
              ALLIE ne remonte pas d'action prioritaire supplementaire pour le moment.
            </div>
          )}
        </section>

        <section className="manager-copilot-cockpit-block manager-copilot-cockpit-block-signals">
          <div className="manager-copilot-cockpit-block-head">
            <div>
              <span className="manager-copilot-cockpit-kicker">Signaux prioritaires</span>
              <h3 className="manager-copilot-cockpit-subtitle">
                Les signaux a verifier en premier
              </h3>
            </div>
            <Badge size="sm" variant="info" className="manager-copilot-badge">
              {prioritySignals.length} signal(s)
            </Badge>
          </div>

          {prioritySignals.length > 0 ? (
            <div className="manager-copilot-cockpit-signal-list">
              {prioritySignals.map((signal) => {
                const assignmentSignal = "recommendedAgent" in signal ? signal : null;

                return (
                  <article
                    key={signal.id}
                    className={`manager-copilot-cockpit-signal manager-copilot-cockpit-signal-${signal.tone}`}
                  >
                    <div className="manager-copilot-cockpit-signal-head">
                      <span className="manager-copilot-cockpit-signal-eyebrow">
                        {signal.eyebrow}
                      </span>
                      <div className="manager-copilot-signal-badges">
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
                    <h4 className="manager-copilot-cockpit-signal-title">{signal.title}</h4>
                    <p className="manager-copilot-cockpit-signal-text">
                      {signal.recommendation || signal.description}
                    </p>
                    <div className="manager-copilot-cockpit-signal-meta-row">
                      {assignmentSignal?.recommendedAgent && (
                        <span className="manager-copilot-cockpit-signal-meta">
                          Agent recommandé : {assignmentSignal.recommendedAgent}
                        </span>
                      )}
                      {signal.meta && (
                        <span className="manager-copilot-cockpit-signal-meta">{signal.meta}</span>
                      )}
                    </div>
                    <div className="manager-copilot-cockpit-signal-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<ArrowRight size={14} />}
                        iconPosition="right"
                        onClick={() => onNavigate(signal.href)}
                      >
                        Ouvrir
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="manager-copilot-empty-inline">
              Aucun signal prioritaire n'est detecte actuellement.
            </div>
          )}
        </section>

        {renderQuickActions(snapshot.quickActions, onNavigate)}

        <section className="manager-copilot-cockpit-advanced">
          <button
            type="button"
            className="manager-copilot-cockpit-advanced-toggle"
            onClick={() => setShowAdvancedDetails((current) => !current)}
            aria-expanded={showAdvancedDetails}
          >
            {showAdvancedDetails
              ? "Masquer l'analyse detaillee ALLIE"
              : "Afficher l'analyse detaillee ALLIE"}
          </button>

          {showAdvancedDetails && (
            <div className="manager-copilot-cockpit-advanced-content">
              {snapshot.decisionAreas.length > 0 && (
                <section className="manager-copilot-content-group">
                  <div className="manager-copilot-subsection-heading">
                    <span className="manager-copilot-subsection-kicker">Lecture assistant</span>
                    <h3 className="manager-copilot-subsection-title">Axes de decision</h3>
                  </div>
                  <div className="manager-copilot-decision-grid">
                    {snapshot.decisionAreas.map((area) => (
                      <ManagerCopilotDecisionCard key={area.id} area={area} />
                    ))}
                  </div>
                </section>
              )}

              {snapshot.whyCards.length > 0 && (
                <section className="manager-copilot-content-group">
                  <div className="manager-copilot-subsection-heading">
                    <span className="manager-copilot-subsection-kicker">Justification</span>
                    <h3 className="manager-copilot-subsection-title">
                      Pourquoi ALLIE recommande cela
                    </h3>
                  </div>
                  <div className="manager-copilot-why-grid">
                    {snapshot.whyCards.map((card) => (
                      <ManagerCopilotWhyCardView key={card.id} card={card} />
                    ))}
                  </div>
                </section>
              )}

              <section className="manager-copilot-section-cluster">
                <div className="manager-copilot-cluster-heading">
                  <div>
                    <span className="manager-copilot-cluster-kicker">Details approfondis</span>
                    <h3 className="manager-copilot-cluster-title">
                      Dossiers a arbitrer et file de decision
                    </h3>
                  </div>
                  <p className="manager-copilot-cluster-text">
                    Vue complete des tickets, incidents, affectations et alertes SLA proposes par
                    ALLIE.
                  </p>
                </div>
                <div className="manager-copilot-sections-grid">
                  {SIGNAL_SECTION_CONFIGS.map((section) =>
                    renderSignalSection(
                      snapshot,
                      section,
                      onNavigate,
                      openSections[section.key],
                      () => toggleSection(section.key),
                    ),
                  )}
                </div>
              </section>
            </div>
          )}
        </section>

        <footer className="manager-copilot-panel-footer">
          <div className="manager-copilot-panel-footer-meta">
            <span className="manager-copilot-panel-footer-kicker">Actions cockpit</span>
            <span className="manager-copilot-panel-footer-updated">
              {formatManagerCopilotUpdatedAt(snapshot.generatedAt)}
            </span>
          </div>
          <div className="manager-copilot-panel-footer-actions">
            <Button
              size="sm"
              icon={<FileText size={14} />}
              onClick={() => setIsSummaryPrepOpen(true)}
            >
              Préparer la synthèse
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
            {onClose && (
              <Button variant="outline" size="sm" icon={<Minimize2 size={14} />} onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        </footer>
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
