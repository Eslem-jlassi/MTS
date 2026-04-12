import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Badge, Button, Skeleton } from "../ui";
import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotDecisionArea,
  ManagerCopilotSignal,
  ManagerCopilotSnapshot,
  ManagerCopilotTone,
  ManagerCopilotWhyCard,
} from "./types";
import {
  buildSignalActionPack,
  inferManagerCopilotSectionKey,
  type ManagerCopilotSectionKey,
} from "./managerCopilotActions";
import {
  confidenceLabels,
  confidenceToBadgeVariant,
  toneLabels,
  toneToBadgeVariant,
} from "./managerCopilotUi";

type DisplaySignal = ManagerCopilotSignal | ManagerCopilotAssignmentSignal;

const DECISION_AREA_ICONS: Record<string, React.ReactNode> = {
  priority: <Ticket size={16} />,
  "load-balancing": <BriefcaseBusiness size={16} />,
  "incident-watch": <AlertTriangle size={16} />,
  "sla-prevention": <Clock3 size={16} />,
  "executive-brief": <Sparkles size={16} />,
};

const WHY_CARD_ICONS: Record<string, React.ReactNode> = {
  "why-now": <Clock3 size={16} />,
  "why-balance": <BriefcaseBusiness size={16} />,
  "why-correlate": <Sparkles size={16} />,
};

function getRationaleTitle(sectionKey: ManagerCopilotSectionKey) {
  switch (sectionKey) {
    case "priorityTickets":
      return "Pourquoi ce dossier remonte";
    case "probableIncidents":
      return "Pourquoi un incident est suggere";
    case "assignments":
      return "Pourquoi cette affectation aide";
    case "slaAlerts":
      return "Pourquoi agir maintenant";
    default:
      return "Justification ALLIE";
  }
}

const ManagerCopilotSignalActions: React.FC<{
  sectionKey: ManagerCopilotSectionKey;
  signal: DisplaySignal;
  onNavigate: (href: string, options?: { state?: unknown }) => void;
}> = ({ sectionKey, signal, onNavigate }) => {
  const [isRationaleOpen, setIsRationaleOpen] = useState(false);
  const actionPack = buildSignalActionPack(signal, sectionKey);

  return (
    <div className="manager-copilot-action-stack">
      <div className="manager-copilot-action-brief-grid">
        <div className="manager-copilot-action-brief">
          <span className="manager-copilot-action-brief-label">Action immediate</span>
          <p className="manager-copilot-action-brief-text">
            {signal.recommendation || actionPack.primary.description}
          </p>
        </div>
        {signal.whyMatters && (
          <div className="manager-copilot-action-brief">
            <span className="manager-copilot-action-brief-label">Impact manager evite</span>
            <p className="manager-copilot-action-brief-text">{signal.whyMatters}</p>
          </div>
        )}
      </div>

      <div className="manager-copilot-action-row">
        <Button
          size="sm"
          icon={<ArrowRight size={14} />}
          iconPosition="right"
          disabled={!actionPack.primary.href}
          onClick={() =>
            actionPack.primary.href &&
            onNavigate(
              actionPack.primary.href,
              actionPack.primary.state ? { state: actionPack.primary.state } : undefined,
            )
          }
        >
          {actionPack.primary.label}
        </Button>

        {actionPack.secondary && actionPack.secondary.href && (
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            disabled={!actionPack.secondary.href}
            onClick={() =>
              onNavigate(
                actionPack.secondary?.href || "/",
                actionPack.secondary?.state ? { state: actionPack.secondary.state } : undefined,
              )
            }
          >
            {actionPack.secondary.label}
          </Button>
        )}

        <button
          type="button"
          className="manager-copilot-tertiary-action"
          onClick={() => setIsRationaleOpen((current) => !current)}
        >
          {isRationaleOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {getRationaleTitle(sectionKey)}
        </button>
      </div>

      {isRationaleOpen && (
        <div className="manager-copilot-rationale-panel">
          <div>
            <span className="manager-copilot-rationale-label">Contexte</span>
            <p className="manager-copilot-rationale-text">{signal.description}</p>
          </div>
          {signal.whyMatters && (
            <div>
              <span className="manager-copilot-rationale-label">Impact manager</span>
              <p className="manager-copilot-rationale-text">{signal.whyMatters}</p>
            </div>
          )}
          <div>
            <span className="manager-copilot-rationale-label">Action suggeree</span>
            <p className="manager-copilot-rationale-text">
              {signal.recommendation || actionPack.primary.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface ManagerCopilotSectionBlockProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  eyebrow?: string;
  tone?: ManagerCopilotTone;
  count?: number;
  emptyLabel: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  summary?: React.ReactNode;
  children?: React.ReactNode;
}

export const ManagerCopilotSectionBlock: React.FC<ManagerCopilotSectionBlockProps> = ({
  title,
  subtitle,
  icon,
  eyebrow,
  tone = "neutral",
  count,
  emptyLabel,
  collapsible = false,
  isOpen = true,
  onToggle,
  summary,
  children,
}) => (
  <section className={`manager-copilot-section manager-copilot-section-${tone}`}>
    <div className="manager-copilot-section-header">
      <div className="manager-copilot-section-title-wrap">
        <span className={`manager-copilot-section-icon manager-copilot-section-icon-${tone}`}>
          {icon}
        </span>
        <div className="manager-copilot-section-copy">
          {eyebrow && <span className="manager-copilot-section-eyebrow">{eyebrow}</span>}
          <h3 className="manager-copilot-section-title">{title}</h3>
          <p className="manager-copilot-section-subtitle">{subtitle}</p>
        </div>
      </div>
      {typeof count === "number" && (
        <div className="manager-copilot-section-header-meta">
          <Badge
            size="sm"
            variant={count > 0 ? "info" : "neutral"}
            className="manager-copilot-badge"
          >
            {count} signal(s)
          </Badge>
          {collapsible && onToggle && (
            <button
              type="button"
              className="manager-copilot-section-toggle"
              onClick={onToggle}
              aria-expanded={isOpen}
            >
              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isOpen ? "Replier" : "Afficher"}
            </button>
          )}
        </div>
      )}
    </div>
    {collapsible && !isOpen ? (
      <div className="manager-copilot-section-summary">
        {summary || <div className="manager-copilot-empty-inline">{emptyLabel}</div>}
      </div>
    ) : (
      children || <div className="manager-copilot-empty-inline">{emptyLabel}</div>
    )}
  </section>
);

export const ManagerCopilotDecisionCard: React.FC<{
  area: ManagerCopilotDecisionArea;
}> = ({ area }) => {
  const icon = DECISION_AREA_ICONS[area.id] || <Sparkles size={16} />;

  return (
    <article className={`manager-copilot-decision-card manager-copilot-decision-card-${area.tone}`}>
      <div className="manager-copilot-decision-heading">
        <span
          className={`manager-copilot-decision-icon manager-copilot-decision-icon-${area.tone}`}
        >
          {icon}
        </span>
        <div className="manager-copilot-decision-topline">
          <span className="manager-copilot-decision-title">{area.title}</span>
          <Badge
            size="sm"
            variant={toneToBadgeVariant(area.tone)}
            className="manager-copilot-badge"
          >
            {toneLabels[area.tone]}
          </Badge>
        </div>
      </div>
      <h3 className="manager-copilot-decision-headline">{area.headline}</h3>
      <p className="manager-copilot-decision-description">{area.description}</p>
      <div className="manager-copilot-decision-footer">
        <span className="manager-copilot-decision-helper">Point de decision manager</span>
        <Badge
          size="sm"
          variant={confidenceToBadgeVariant(area.confidence)}
          className="manager-copilot-badge"
        >
          {confidenceLabels[area.confidence]}
        </Badge>
      </div>
    </article>
  );
};

export const ManagerCopilotWhyCardView: React.FC<{
  card: ManagerCopilotWhyCard;
}> = ({ card }) => {
  const icon = WHY_CARD_ICONS[card.id] || <Sparkles size={16} />;

  return (
    <article className={`manager-copilot-why-card manager-copilot-why-card-${card.tone}`}>
      <div className="manager-copilot-why-topline">
        <span className={`manager-copilot-why-icon manager-copilot-why-icon-${card.tone}`}>
          {icon}
        </span>
        <span className="manager-copilot-why-title">Lecture assistant</span>
      </div>
      <strong className="manager-copilot-why-heading">{card.title}</strong>
      <p className="manager-copilot-why-description">{card.description}</p>
    </article>
  );
};

export const ManagerCopilotFocusCard: React.FC<{
  signal: DisplaySignal;
  onNavigate: (href: string, options?: { state?: unknown }) => void;
}> = ({ signal, onNavigate }) => (
  <article className={`manager-copilot-focus-card manager-copilot-focus-card-${signal.tone}`}>
    <div className="manager-copilot-focus-topline">
      <span className="manager-copilot-focus-kicker">Action recommandee</span>
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
    <h3 className="manager-copilot-focus-title">{signal.title}</h3>
    <p className="manager-copilot-focus-description">{signal.description}</p>
    <div className="manager-copilot-focus-meta-row">
      <span className="manager-copilot-focus-meta">{signal.eyebrow}</span>
      {signal.meta && <span className="manager-copilot-focus-meta">{signal.meta}</span>}
    </div>
    <ManagerCopilotSignalActions
      signal={signal}
      sectionKey={inferManagerCopilotSectionKey(signal)}
      onNavigate={onNavigate}
    />
  </article>
);

export const ManagerCopilotStatusBanner: React.FC<{
  mode: ManagerCopilotSnapshot["mode"];
  error: string | null;
}> = ({ mode, error }) => {
  if (mode !== "degraded" && !error) {
    return null;
  }

  return (
    <div className="manager-copilot-status-banner">
      <div className="manager-copilot-status-banner-copy">
        <strong className="manager-copilot-status-banner-title">
          Lecture assistee en mode degrade
        </strong>
        <p className="manager-copilot-status-banner-text">
          {error ||
            "Certaines sources sont temporairement indisponibles. Le copilote continue a partir des signaux les plus fiables deja consolides."}
        </p>
      </div>
      <ShieldAlert size={16} className="manager-copilot-status-banner-icon" />
    </div>
  );
};

export const ManagerCopilotSignalCard: React.FC<{
  signal: DisplaySignal;
  sectionKey: ManagerCopilotSectionKey;
  onNavigate: (href: string, options?: { state?: unknown }) => void;
}> = ({ signal, sectionKey, onNavigate }) => {
  const assignmentSignal = "recommendedAgent" in signal ? signal : null;

  return (
    <article className={`manager-copilot-signal-card manager-copilot-signal-card-${signal.tone}`}>
      <div className="manager-copilot-signal-topline">
        <span className="manager-copilot-signal-eyebrow">{signal.eyebrow}</span>
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

      <h4 className="manager-copilot-signal-title">{signal.title}</h4>
      {signal.meta && <p className="manager-copilot-signal-meta">{signal.meta}</p>}

      {assignmentSignal && (
        <div className="manager-copilot-signal-highlight">
          <span className="manager-copilot-signal-highlight-label">Agent recommande</span>
          <strong className="manager-copilot-signal-highlight-value">
            {assignmentSignal.recommendedAgent}
          </strong>
        </div>
      )}

      <p className="manager-copilot-signal-description">{signal.description}</p>

      <div className="manager-copilot-signal-footer">
        {signal.tags && signal.tags.length > 0 ? (
          <div className="manager-copilot-tag-row">
            {signal.tags.map((tag) => (
              <span key={`${signal.id}-${tag}`} className="manager-copilot-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div />
        )}
      </div>

      <ManagerCopilotSignalActions
        signal={signal}
        sectionKey={sectionKey}
        onNavigate={onNavigate}
      />
    </article>
  );
};

export const ManagerCopilotLoadingState: React.FC = () => (
  <div className="manager-copilot-loading">
    <div className="manager-copilot-summary-card">
      <Skeleton height={16} className="rounded-full w-40" />
      <Skeleton height={28} className="rounded-xl mt-4 w-64" />
      <Skeleton height={54} className="rounded-2xl mt-3" />
      <div className="grid grid-cols-2 gap-3 mt-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height={72} className="rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height={132} className="rounded-2xl" />
        ))}
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="manager-copilot-section">
        <Skeleton height={18} className="rounded-full w-44" />
        <Skeleton height={174} className="rounded-2xl mt-4" />
      </div>
    ))}
  </div>
);
