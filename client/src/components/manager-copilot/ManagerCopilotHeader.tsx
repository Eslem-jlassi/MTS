import React from "react";
import { Clock3, Radar, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "../ui";
import type { ManagerCopilotMode, ManagerCopilotSnapshot } from "./types";
import ManagerCopilotAvatar from "./ManagerCopilotAvatar";
import {
  formatManagerCopilotUpdatedLabel,
  getManagerCopilotMoment,
  getManagerCopilotTelemetryLabel,
  MANAGER_COPILOT_PRODUCT_LABEL,
  MANAGER_COPILOT_TITLE,
} from "./managerCopilotUi";

interface ManagerCopilotHeaderProps {
  subtitle: string;
  snapshot?: ManagerCopilotSnapshot | null;
  isRefreshing?: boolean;
  mode?: ManagerCopilotMode;
  actions?: React.ReactNode;
  showDecisionBadge?: boolean;
  modeDisplay?: "badge" | "chip" | "none";
  variant?: "dashboard" | "widget";
}

const ManagerCopilotHeader: React.FC<ManagerCopilotHeaderProps> = ({
  subtitle,
  snapshot,
  isRefreshing = false,
  mode,
  actions,
  showDecisionBadge = false,
  modeDisplay = "none",
  variant = "dashboard",
}) => {
  const currentMode = snapshot?.mode ?? mode;
  const moment = getManagerCopilotMoment(snapshot);
  const isWidgetVariant = variant === "widget";
  const showInlineDegradedBadge = modeDisplay === "badge" && currentMode === "degraded";
  const showHeaderActions =
    Boolean(actions) || (modeDisplay === "chip" && currentMode === "degraded");
  const telemetryLabel = getManagerCopilotTelemetryLabel(snapshot);
  const updatedLabel = isRefreshing
    ? "Actualisation..."
    : formatManagerCopilotUpdatedLabel(snapshot?.generatedAt);

  return (
    <div className={`manager-copilot-header manager-copilot-header-${variant}`}>
      <div className="manager-copilot-header-backdrop" aria-hidden />
      <div className="manager-copilot-header-main">
        <div className="manager-copilot-header-identity">
          <div className="manager-copilot-header-avatar-shell">
            <ManagerCopilotAvatar className="manager-copilot-header-avatar" />
          </div>
          <div className="manager-copilot-header-copy">
            <div className="manager-copilot-header-kicker-row">
              <span className="manager-copilot-header-kicker">{MANAGER_COPILOT_PRODUCT_LABEL}</span>
              {showDecisionBadge && (
                <Badge
                  size="sm"
                  variant="ai"
                  icon={<Sparkles size={12} />}
                  className="manager-copilot-badge"
                >
                  Pilotage IA
                </Badge>
              )}
              {showInlineDegradedBadge && (
                <Badge
                  size="sm"
                  variant="warning"
                  icon={<ShieldAlert size={12} />}
                  className="manager-copilot-badge"
                >
                  Mode dégradé
                </Badge>
              )}
            </div>
            <p className="manager-copilot-title">{MANAGER_COPILOT_TITLE}</p>
            <p className="manager-copilot-subtitle">{subtitle}</p>
            <div className="manager-copilot-header-meta">
              <span
                className={`manager-copilot-presence-pill manager-copilot-presence-pill-${moment.tone}`}
              >
                <Radar size={12} />
                {moment.title}
              </span>
              {!isWidgetVariant && (
                <span className="manager-copilot-presence-pill">
                  <ShieldCheck size={12} />
                  {telemetryLabel}
                </span>
              )}
              <span className="manager-copilot-presence-pill">
                <Clock3 size={12} />
                {updatedLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="manager-copilot-header-aside">
          {!isWidgetVariant && (
            <div
              className={`manager-copilot-header-status-card manager-copilot-header-status-card-${moment.tone}`}
            >
              <span className="manager-copilot-header-status-label">Signal du moment</span>
              <strong className="manager-copilot-header-status-title">{moment.title}</strong>
              <span className="manager-copilot-header-status-text">{moment.detail}</span>
            </div>
          )}

          {showHeaderActions && (
            <div className="manager-copilot-header-actions">
              {modeDisplay === "chip" && currentMode === "degraded" && (
                <span className="manager-copilot-status-chip">
                  <ShieldAlert size={13} />
                  Vue degradee
                </span>
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerCopilotHeader;
