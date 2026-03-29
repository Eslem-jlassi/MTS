// =============================================================================
// MTS TELECOM - Chatbot conversation persistence abstraction
// =============================================================================

import { ChatMessageModel } from "../../types/chatbot";

/**
 * Storage contract for chatbot history.
 *
 * This allows replacing localStorage with backend persistence later
 * without changing widget logic.
 */
export interface ChatbotHistoryStore {
  load(userId: string): ChatMessageModel[];
  save(userId: string, messages: ChatMessageModel[]): void;
  clear(userId: string): void;
}

const STORAGE_KEY_PREFIX = "mts_chatbot_history_v2_";

class LocalStorageChatbotHistoryStore implements ChatbotHistoryStore {
  load(userId: string): ChatMessageModel[] {
    if (!userId) {
      return [];
    }

    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (message) =>
          message &&
          typeof message.id === "string" &&
          typeof message.role === "string" &&
          typeof message.content === "string" &&
          typeof message.timestamp === "string",
      ) as ChatMessageModel[];
    } catch {
      return [];
    }
  }

  save(userId: string, messages: ChatMessageModel[]): void {
    if (!userId) {
      return;
    }

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(messages));
    } catch {
      // Storage quota or privacy mode can fail silently.
    }
  }

  clear(userId: string): void {
    if (!userId) {
      return;
    }

    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    } catch {
      // No-op
    }
  }
}

export const chatbotHistoryStore: ChatbotHistoryStore = new LocalStorageChatbotHistoryStore();
