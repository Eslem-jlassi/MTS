// =============================================================================
// MTS TELECOM - Chatbot Input component
// =============================================================================

import React, { useState } from "react";
import { Paperclip, SendHorizonal, X } from "lucide-react";
import { ChatAttachment } from "../../types/chatbot";
import { buildImageAttachment, isSupportedChatbotImage } from "./chatbotAttachmentUtils";
import { getChatbotCopy } from "./chatbotCopy";
import { ChatLanguage } from "./chatbotLanguage";

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
  language?: ChatLanguage;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, language = "fr" }) => {
  const copy = getChatbotCopy(language);
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const openFilePicker = () => {
    const input = document.getElementById("chatbot-image-input") as HTMLInputElement | null;
    input?.click();
  };

  const onImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!isSupportedChatbotImage(selectedFile)) {
      setUploadError(copy.invalidImageTypeLabel);
      return;
    }

    try {
      const attachment = await buildImageAttachment(selectedFile);
      setAttachments([attachment]);
      setUploadError(null);
    } catch {
      setUploadError(copy.imageReadErrorLabel);
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    const hasAttachments = attachments.length > 0;

    if ((!trimmed && !hasAttachments) || disabled) {
      return;
    }

    onSend(trimmed, attachments);
    setValue("");
    setAttachments([]);
    setUploadError(null);
  };

  return (
    <div className="chatbot-input-composer">
      {attachments.length > 0 && (
        <div className="chatbot-input-attachments">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="chatbot-input-attachment-card">
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="chatbot-input-attachment-preview"
              />
              <div className="chatbot-input-attachment-meta">
                <span className="chatbot-input-attachment-name">{attachment.name}</span>
                <span className="chatbot-input-attachment-badge">{copy.attachedContextLabel}</span>
              </div>
              <button
                type="button"
                className="chatbot-input-attachment-remove"
                onClick={() => setAttachments([])}
                aria-label={copy.removeAttachmentLabel}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && <p className="chatbot-input-upload-error">{uploadError}</p>}

      <div className="chatbot-input-wrapper">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          className="chatbot-input"
          placeholder={copy.inputPlaceholder}
          disabled={disabled}
          aria-label={copy.inputPlaceholder}
        />

        <button
          type="button"
          className="chatbot-attach-button"
          onClick={openFilePicker}
          disabled={disabled}
          aria-label={copy.attachImageLabel}
        >
          <Paperclip size={15} />
        </button>

        <button
          type="button"
          className="chatbot-send-button"
          onClick={submit}
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          aria-label={copy.sendMessageLabel}
        >
          <SendHorizonal size={16} />
        </button>
      </div>

      <input
        id="chatbot-image-input"
        type="file"
        accept="image/png,image/jpeg"
        onChange={onImageSelected}
        className="chatbot-hidden-file-input"
      />
    </div>
  );
};

export default ChatInput;
