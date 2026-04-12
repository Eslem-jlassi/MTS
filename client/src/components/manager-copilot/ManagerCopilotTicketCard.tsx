import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock3, Copy, Radar, UserPlus } from "lucide-react";
import { Badge, Button } from "../ui";
import ManagerCopilotAvatar from "./ManagerCopilotAvatar";
import {
  MANAGER_COPILOT_NAME,
  MANAGER_COPILOT_PRODUCT_LABEL,
  MANAGER_COPILOT_SUBTITLE,
  confidenceLabels,
  confidenceToBadgeVariant,
  toneLabels,
  toneToBadgeVariant,
} from "./managerCopilotUi";
import type {
  ManagerCopilotTicketActionId,
  ManagerCopilotTicketContext,
} from "./managerCopilotTicketContext";
import "./ManagerCopilotStyles.css";

interface ManagerCopilotTicketCardProps {
  context: ManagerCopilotTicketContext;
  isBusy?: boolean;
  onAction: (actionId: ManagerCopilotTicketActionId) => void;
}

const ManagerCopilotTicketCard: React.FC<ManagerCopilotTicketCardProps> = ({
  context,
  isBusy = false,
  onAction,
}) => {
  const [showWhy, setShowWhy] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const secondaryActions = context.secondaryActions.filter(
    (action) => action.id !== context.primaryAction.id,
  );
  const visibleFacts = showContext ? context.facts : context.facts.slice(0, 2);

  return (
    <section
      className={`manager-copilot-ticket-card manager-copilot-ticket-card-${context.tone}`}
      aria-label={`${MANAGER_COPILOT_NAME} ticket insight`}
    >
      <div className="manager-copilot-ticket-head">
        <div className="manager-copilot-ticket-title-row">
          <ManagerCopilotAvatar
            className="manager-copilot-ticket-avatar"
            alt={MANAGER_COPILOT_NAME}
          />
          <div className="min-w-0">
            <p className="manager-copilot-ticket-kicker">
              <strong>{MANAGER_COPILOT_NAME}</strong>
              <span>{MANAGER_COPILOT_PRODUCT_LABEL}</span>
            </p>
            <h3 className="manager-copilot-ticket-title">Priorite manager sur ce ticket</h3>
            <p className="manager-copilot-ticket-subtitle">{MANAGER_COPILOT_SUBTITLE}</p>
          </div>
        </div>

        <div className="manager-copilot-ticket-chip-row">
          <Badge variant={toneToBadgeVariant(context.tone)} size="sm">
            {toneLabels[context.tone]}
          </Badge>
          <Badge variant={confidenceToBadgeVariant(context.confidence)} size="sm">
            {confidenceLabels[context.confidence]}
          </Badge>
        </div>
      </div>

      <p className="manager-copilot-ticket-summary">{context.situation}</p>

      <div className="manager-copilot-ticket-brief-grid">
        <div className="manager-copilot-ticket-brief">
          <span className="manager-copilot-ticket-brief-label">Action immediate</span>
          <p className="manager-copilot-ticket-brief-text">{context.immediateAction}</p>
        </div>
        <div className="manager-copilot-ticket-brief">
          <span className="manager-copilot-ticket-brief-label">Risque evite</span>
          <p className="manager-copilot-ticket-brief-text">{context.avoidedRisk}</p>
        </div>
      </div>

      {context.badges.length > 0 && (
        <div className="manager-copilot-ticket-chip-row">
          {context.badges.map((badge) => (
            <Badge key={badge.id} variant={toneToBadgeVariant(badge.tone)} size="sm">
              {badge.label}
            </Badge>
          ))}
        </div>
      )}

      {context.facts.length > 0 && (
        <div className="manager-copilot-ticket-facts">
          {visibleFacts.map((fact) => (
            <div key={fact.id} className="manager-copilot-ticket-fact">
              <span className="manager-copilot-ticket-fact-label">{fact.label}</span>
              <p className="manager-copilot-ticket-fact-value">{fact.value}</p>
            </div>
          ))}
        </div>
      )}

      {context.facts.length > 2 && (
        <button
          type="button"
          className="manager-copilot-tertiary-action"
          onClick={() => setShowContext((current) => !current)}
          aria-expanded={showContext}
        >
          {showContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showContext ? "Masquer le contexte" : "Voir le contexte"}
        </button>
      )}

      <div className="manager-copilot-ticket-actions">
        <Button
          size="sm"
          variant="primary"
          icon={resolveActionIcon(context.primaryAction.id)}
          onClick={() => onAction(context.primaryAction.id)}
          disabled={isBusy}
        >
          {context.primaryAction.label}
        </Button>
        {secondaryActions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant="outline"
            icon={resolveActionIcon(action.id)}
            onClick={() => onAction(action.id)}
            disabled={isBusy}
          >
            {action.label}
          </Button>
        ))}
        <button
          type="button"
          className="manager-copilot-tertiary-action"
          onClick={() => setShowWhy((current) => !current)}
          aria-expanded={showWhy}
        >
          {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showWhy ? "Masquer la justification" : "Voir la justification"}
        </button>
      </div>

      {showWhy && (
        <div className="manager-copilot-ticket-rationale">
          <div className="manager-copilot-rationale-panel">
            <div>
              <span className="manager-copilot-rationale-label">
                Pourquoi ALLIE remonte ce ticket
              </span>
              <p className="manager-copilot-rationale-text">{context.justification}</p>
            </div>

            {context.rationalePoints.length > 0 && (
              <div className="manager-copilot-ticket-rationale-list">
                {context.rationalePoints.map((item) => (
                  <p key={item} className="manager-copilot-ticket-rationale-item">
                    {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

function resolveActionIcon(actionId: ManagerCopilotTicketActionId) {
  switch (actionId) {
    case "assign-recommended":
    case "open-assignment":
      return <UserPlus size={14} />;
    case "open-sla":
      return <Clock3 size={14} />;
    case "open-service-health":
      return <Radar size={14} />;
    case "open-incidents":
    case "prepare-incident":
      return <AlertTriangle size={14} />;
    case "view-similar":
      return <Copy size={14} />;
    default:
      return undefined;
  }
}

export default ManagerCopilotTicketCard;
