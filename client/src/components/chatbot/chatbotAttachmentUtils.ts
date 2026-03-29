// =============================================================================
// MTS TELECOM - Chatbot attachment utilities (frontend display context)
// =============================================================================

import { ChatAttachment } from "../../types/chatbot";

export const CHATBOT_ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;

export const isSupportedChatbotImage = (file: File): boolean =>
  CHATBOT_ALLOWED_IMAGE_TYPES.includes(file.type as (typeof CHATBOT_ALLOWED_IMAGE_TYPES)[number]);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Invalid file reader result."));
    };

    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });

const createAttachmentId = (): string =>
  `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildImageAttachment = async (file: File): Promise<ChatAttachment> => {
  const dataUrl = await readFileAsDataUrl(file);

  return {
    id: createAttachmentId(),
    kind: "image",
    name: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl,
    attachedContext: true,
  };
};
