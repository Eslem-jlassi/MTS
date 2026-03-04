// =============================================================================
// MTS TELECOM - Hook WebSocket pour les notifications temps réel
// =============================================================================
/**
 * Se connecte au broker STOMP (SockJS) et s'abonne aux destinations de notifications.
 * Chaque message reçu est dispatché dans le slice Redux notifications.
 *
 * DESTINATIONS:
 * - /user/queue/notifications : notifications privées (ex: ticket assigné à moi)
 * - /topic/tickets : broadcast nouveau ticket (agents/managers)
 */

import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { AppDispatch } from "../redux/store";
import { pushNotification } from "../redux/slices/notificationsSlice";
import type { Notification } from "../types";

/** URL de base WebSocket (sans /api). Ex: http://localhost:8080 */
function getWsBaseUrl(): string {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
  return apiUrl.replace(/\/api\/?$/, "") || "http://localhost:8080";
}

/**
 * Hook qui établit la connexion WebSocket et envoie les notifications reçues au store.
 * À utiliser dans un composant parent (ex: MainLayout) une fois l'utilisateur connecté.
 *
 * @param dispatch - Redux dispatch
 * @param token - JWT (null si non connecté → pas de connexion)
 */
export function useWebSocketNotifications(
  dispatch: AppDispatch,
  token: string | null
): void {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!token || token.trim() === "") {
      // No token available, don't attempt connection
      return;
    }

    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/ws`;

    console.log("[WebSocket] Attempting to connect to:", wsUrl);

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl) as unknown as WebSocket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("[WebSocket] ✅ Connected successfully");
        // Notifications privées (assignation, commentaire, etc.)
        client.subscribe("/user/queue/notifications", (message) => {
          try {
            const body = JSON.parse(message.body);
            if (body && (body.id != null || body.title)) {
              dispatch(pushNotification(normalizeNotification(body)));
            }
          } catch {
            // ignore invalid payload
          }
        });

        // Broadcast nouveau ticket (agents / managers)
        client.subscribe("/topic/tickets", (message) => {
          try {
            const body = JSON.parse(message.body);
            if (body && (body.id != null || body.title)) {
              dispatch(pushNotification(normalizeNotification(body)));
            }
          } catch {
            // ignore
          }
        });
      },
      onStompError: (frame) => {
        console.warn("[WebSocket] ⚠️ STOMP error:", frame.headers?.message || frame.body);
      },
      onWebSocketError: (event) => {
        console.warn("[WebSocket] ⚠️ WebSocket error (will retry):", event);
      },
      onWebSocketClose: () => {
        console.log("[WebSocket] Connection closed (will reconnect)");
      },
    });

    try {
      client.activate();
      clientRef.current = client;
    } catch (error) {
      console.error("[WebSocket] ❌ Failed to activate:", error);
    }

    return () => {
      if (clientRef.current) {
        console.log("[WebSocket] Disconnecting...");
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [dispatch, token]);
}

/** Normalise un payload WebSocket brut vers l'interface Notification. */
function normalizeNotification(raw: Record<string, unknown>): Notification {
  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : raw.createdAt != null
        ? new Date(raw.createdAt as number).toISOString()
        : new Date().toISOString();
  return {
    id: (raw.id as number) ?? 0,
    title: (raw.title as string) ?? "Notification",
    message: (raw.message as string) ?? "",
    type: (raw.type as string) ?? "INFO",
    typeLabel: raw.typeLabel as string | undefined,
    referenceType: raw.referenceType as string | undefined,
    referenceId: raw.referenceId as number | undefined,
    referencePath: raw.referencePath as string | undefined,
    isRead: raw.isRead as boolean | undefined,
    readAt: raw.readAt as string | undefined,
    createdAt,
    isUrgent: raw.isUrgent as boolean | undefined,
  };
}

export default useWebSocketNotifications;
