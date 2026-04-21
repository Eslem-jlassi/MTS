import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minimize2, PanelRightClose } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserRole } from "../../types";
import ManagerCopilotAvatar from "./ManagerCopilotAvatar";
import ManagerCopilotHeader from "./ManagerCopilotHeader";
import ManagerCopilotPanel from "./ManagerCopilotMainPanel";
import { useManagerCopilot } from "./useManagerCopilot";
import {
  MANAGER_COPILOT_FULL_LABEL,
  isManagerCopilotAllowedRole,
  MANAGER_COPILOT_TITLE,
  MANAGER_COPILOT_WIDGET_SUBTITLE,
} from "./managerCopilotUi";

interface ManagerCopilotWidgetProps {
  role?: UserRole;
}

const ManagerCopilotWidget: React.FC<ManagerCopilotWidgetProps> = ({ role }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isAllowed = isManagerCopilotAllowedRole(role);
  const { snapshot, isLoading, isRefreshing, error, refresh } = useManagerCopilot({
    enabled: isAllowed,
    role,
  });

  const badgeCount = snapshot?.urgentCount || (isLoading ? null : 0);

  if (!isAllowed) {
    return null;
  }

  const handleNavigate = (href: string, options?: { state?: unknown }) => {
    navigate(href, options?.state ? { state: options.state } : undefined);
    setIsOpen(false);
  };

  return (
    <div
      className={`manager-copilot-widget-container ${
        isOpen ? "manager-copilot-widget-container-open" : ""
      }`}
      data-testid="manager-copilot-widget"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.section
            className="manager-copilot-panel"
            aria-label={MANAGER_COPILOT_FULL_LABEL}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ManagerCopilotHeader
              subtitle={MANAGER_COPILOT_WIDGET_SUBTITLE}
              snapshot={snapshot}
              isRefreshing={isRefreshing}
              mode={snapshot?.mode}
              modeDisplay="chip"
              variant="widget"
              actions={
                <button
                  type="button"
                  className="manager-copilot-icon-button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Reduire le copilote"
                >
                  <Minimize2 size={16} />
                </button>
              }
            />

            <ManagerCopilotPanel
              snapshot={snapshot}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              error={error}
              onRefresh={refresh}
              onNavigate={handleNavigate}
              onClose={() => setIsOpen(false)}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className={`manager-copilot-launcher ${isOpen ? "manager-copilot-launcher-open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={
          isOpen ? `Fermer ${MANAGER_COPILOT_FULL_LABEL}` : `Ouvrir ${MANAGER_COPILOT_FULL_LABEL}`
        }
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="manager-copilot-launcher-icon" aria-hidden>
          {isOpen ? (
            <PanelRightClose size={20} />
          ) : (
            <ManagerCopilotAvatar className="manager-copilot-launcher-avatar" />
          )}
        </span>
        <span className="manager-copilot-launcher-copy">
          <strong>
            {isOpen
              ? `Fermer le cockpit ${MANAGER_COPILOT_TITLE}`
              : `Ouvrir le cockpit ${MANAGER_COPILOT_TITLE}`}
          </strong>
          {!isOpen && (
            <small>
              {snapshot
                ? `${snapshot.priorityTickets.length} arbitrage(s) prioritaire(s)`
                : MANAGER_COPILOT_WIDGET_SUBTITLE}
            </small>
          )}
        </span>
        {badgeCount !== null && badgeCount > 0 && (
          <span className="manager-copilot-launcher-badge">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export default ManagerCopilotWidget;
