// =============================================================================
// MTS TELECOM - Chatbot Message component
// =============================================================================

import React from "react";
import { User } from "lucide-react";
import { motion } from "framer-motion";
import { ChatMessageModel } from "../../types/chatbot";
import ChatbotResponseSections from "./ChatbotResponseSections";
import { ChatbotSuggestedAction } from "./chatbotSuggestedActionsResolver";
import { getChatbotCopy } from "./chatbotCopy";
import { resolveChatLanguage } from "./chatbotLanguage";
import ChatbotMascot from "./ChatbotMascot";

interface ChatMessageProps {
  message: ChatMessageModel;
  onSelectSuggestedAction?: (action: ChatbotSuggestedAction) => void;
  disableSuggestedActions?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSelectSuggestedAction,
  disableSuggestedActions = false,
}) => {
  const isUser = message.role === "user";
  const language = resolveChatLanguage(message.responseLanguage, "fr");
  const copy = getChatbotCopy(language);
  const messageTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      className={`chatbot-message-row ${isUser ? "chatbot-message-user" : "chatbot-message-assistant"}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {!isUser && (
        <div className="chatbot-avatar chatbot-avatar-assistant" aria-hidden>
          <ChatbotMascot className="chatbot-mascot-sm" />
        </div>
      )}

      <div
        className={`chatbot-bubble ${isUser ? "chatbot-bubble-user" : "chatbot-bubble-assistant"} ${message.isError ? "chatbot-bubble-error" : ""}`}
      >
        {message.isLoading ? (
          <>
            <div className="chatbot-loading-dots" aria-label={copy.typingAriaLabel}>
              <span />
              <span />
              <span />
            </div>
            <p className="chatbot-typing-label">{copy.loadingLabel}</p>
          </>
        ) : (
          <>
            {isUser ? (
              <>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="chatbot-message-attachments">
                    {message.attachments.map((attachment) => (
                      <figure key={attachment.id} className="chatbot-message-attachment-item">
                        <img
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          className="chatbot-message-attachment-image"
                        />
                        {attachment.attachedContext && (
                          <figcaption className="chatbot-message-attachment-caption">
                            {copy.attachedContextLabel}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
                <p className="chatbot-message-content">{message.content}</p>
              </>
            ) : (
              <ChatbotResponseSections
                message={message}
                onSelectAction={onSelectSuggestedAction}
                disableActions={disableSuggestedActions}
              />
            )}

            <p className="chatbot-message-time">{messageTime}</p>
          </>
        )}
      </div>

      {isUser && (
        <div className="chatbot-avatar chatbot-avatar-user" aria-hidden>
          <User size={14} />
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;
