// =============================================================================
// MTS TELECOM - Reusable quick prompt chips
// =============================================================================

import React from "react";
import { ChatbotPrompt } from "./chatbotPrompts";
import { ChatLanguage } from "./chatbotLanguage";
import { getChatbotCopy } from "./chatbotCopy";

interface ChatbotPromptChipsProps {
  prompts: ChatbotPrompt[];
  onSelectPrompt: (message: string) => void;
  disabled?: boolean;
  language?: ChatLanguage;
}

const ChatbotPromptChips: React.FC<ChatbotPromptChipsProps> = ({
  prompts,
  onSelectPrompt,
  disabled = false,
  language = "fr",
}) => {
  const copy = getChatbotCopy(language);

  return (
    <ul className="chatbot-suggestions" aria-label={copy.quickPromptsAriaLabel}>
      {prompts.map((prompt) => (
        <li key={prompt.id} className="chatbot-suggestion-item">
          <button
            type="button"
            className="chatbot-suggestion-chip"
            onClick={() => onSelectPrompt(prompt.message)}
            disabled={disabled}
          >
            {prompt.label}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ChatbotPromptChips;
