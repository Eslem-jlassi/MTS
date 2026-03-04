// =============================================================================
// MTS TELECOM - Notification API Service
// =============================================================================
/**
 * Service REST pour les notifications utilisateur.
 * Utilisé pour la liste, le compteur et le marquage lu.
 * Les messages temps réel arrivent via WebSocket (voir useWebSocketNotifications).
 */

import api from "./client";
import type { Notification } from "../types";
import type { PageResponse } from "../types";

const NOTIFICATIONS_PREFIX = "/notifications";

export const notificationService = {
  /**
   * Liste paginée des notifications.
   */
  getNotifications: async (page = 0, size = 20): Promise<PageResponse<Notification>> => {
    const response = await api.get<PageResponse<Notification>>(NOTIFICATIONS_PREFIX, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Notifications non lues (pour le dropdown header).
   */
  getUnread: async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>(`${NOTIFICATIONS_PREFIX}/unread`);
    return response.data;
  },

  /**
   * Compteur de notifications non lues.
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>(`${NOTIFICATIONS_PREFIX}/count`);
    return response.data.count;
  },

  /**
   * Marquer une notification comme lue.
   */
  markAsRead: async (id: number): Promise<void> => {
    await api.put(`${NOTIFICATIONS_PREFIX}/${id}/read`);
  },

  /**
   * Marquer toutes les notifications comme lues.
   */
  markAllAsRead: async (): Promise<{ markedCount: number }> => {
    const response = await api.put<{ markedCount: number }>(
      `${NOTIFICATIONS_PREFIX}/read-all`
    );
    return response.data;
  },
};

export default notificationService;
