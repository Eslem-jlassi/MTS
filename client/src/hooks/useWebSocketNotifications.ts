import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { AppDispatch } from "../redux/store";
import { pushNotification } from "../redux/slices/notificationsSlice";
import type { Notification } from "../types";

function getWsBaseUrl(): string {
  const apiUrl = process.env.REACT_APP_API_URL || `${window.location.origin}/api`;
  return apiUrl.replace(/\/api\/?$/, "") || window.location.origin;
}

export function useWebSocketNotifications(dispatch: AppDispatch, enabled: boolean): void {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/ws`;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl) as unknown as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", (message) => {
          try {
            const body = JSON.parse(message.body);
            if (body && (body.id != null || body.title)) {
              dispatch(pushNotification(normalizeNotification(body)));
            }
          } catch {
            // Ignore invalid payloads.
          }
        });

        client.subscribe("/topic/tickets", (message) => {
          try {
            const body = JSON.parse(message.body);
            if (body && (body.id != null || body.title)) {
              dispatch(pushNotification(normalizeNotification(body)));
            }
          } catch {
            // Ignore invalid payloads.
          }
        });
      },
      onStompError: (frame) => {
        console.warn("[WebSocket] STOMP error:", frame.headers?.message || frame.body);
      },
      onWebSocketError: (event) => {
        console.warn("[WebSocket] WebSocket error:", event);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [dispatch, enabled]);
}

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
