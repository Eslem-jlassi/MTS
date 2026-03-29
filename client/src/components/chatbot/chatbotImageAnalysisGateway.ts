// =============================================================================
// MTS TELECOM - Chatbot image analysis gateway (future backend extension)
// =============================================================================

import { ChatAttachment } from "../../types/chatbot";

export interface ChatbotImageAnalysisGateway {
  analyzeAttachedContext: (attachment: ChatAttachment) => Promise<string | null>;
}

/**
 * Current default gateway: no OCR/image backend yet.
 * Returns null so attachment is handled as local contextual information only.
 */
export const localOnlyImageAnalysisGateway: ChatbotImageAnalysisGateway = {
  analyzeAttachedContext: async () => null,
};
