import React from "react";
import { ChatbotSuggestedAction } from "./chatbotSuggestedActionsResolver";
import { ChatLanguage } from "./chatbotLanguage";

interface ChatbotSuggestedActionsProps {
  actions: ChatbotSuggestedAction[];
  onSelectAction: (action: ChatbotSuggestedAction) => void;
  disabled?: boolean;
  language?: ChatLanguage;
}

const ChatbotSuggestedActionsView: React.FC<ChatbotSuggestedActionsProps> = ({
  actions,
  onSelectAction,
  disabled = false,
  language = "fr",
}) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="chatbot-response-section chatbot-actions-suggested">
      <div className="chatbot-actions-header">
        <p className="chatbot-results-title">
          {language === "en" ? "Suggested actions" : "Actions suggerees"}
        </p>
        <p className="chatbot-actions-subtitle">
          {language === "en"
            ? "Quick execution of the next recommended steps"
            : "Execution rapide des prochaines etapes"}
        </p>
      </div>
      <ul
        className="chatbot-actions-chips"
        aria-label={language === "en" ? "Suggested actions" : "Actions suggerees"}
      >
        {actions.map((action) => (
          <li key={action.id} className="chatbot-action-item">
            <button
              type="button"
              className="chatbot-action-chip"
              onClick={() => onSelectAction(action)}
              disabled={disabled}
              title={action.message}
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ChatbotSuggestedActionsView;
