// =============================================================================
// MTS TELECOM - Notification Center (cloche dropdown dans le header)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../../api/notificationService";
import type { Notification } from "../../types";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../api/client";
import { formatRelativeTime } from "../../utils/formatters";

/**
 * NotificationCenter - Centre de notifications in-app avec dropdown.
 *
 * FONCTIONNALITÉS :
 * - Badge avec count de notifications non lues
 * - Dropdown animé avec liste des notifications récentes
 * - "Marquer toutes comme lues"
 * - Click sur notification → marquer comme lu + navigate to referencePath
 * - Lien vers page /notifications complète
 * - Auto-refresh count toutes les 30s
 */
export default function NotificationCenter() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // État
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // ==========================================================================
  // API CALLS
  // ==========================================================================

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Erreur silencieuse (pas de toast pour polling)
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  const fetchUnreadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getUnread();
      setNotifications(data.slice(0, 10)); // Max 10 notifications dans le dropdown
    } catch (error) {
      addToast("error", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // ==========================================================================
  // CHARGEMENT INITIAL + POLLING
  // ==========================================================================

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchUnreadNotifications();
    }
  }, [isOpen, fetchUnreadNotifications]);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead();
      addToast("success", `${result.markedCount} notification(s) marquée(s) comme lue(s)`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      addToast("error", getErrorMessage(error));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // Navigation si referencePath existe
    if (notification.referencePath) {
      navigate(notification.referencePath);
      setIsOpen(false);
    }
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getNotificationIcon = (type: string) => {
    // Icônes selon type
    if (type.includes("TICKET")) return "🎫";
    if (type.includes("SLA")) return "⏱️";
    if (type.includes("ESCALATION")) return "🚨";
    if (type.includes("SERVICE")) return "📡";
    if (type.includes("REPORT")) return "📊";
    if (type.includes("SUCCESS")) return "✅";
    if (type.includes("WARNING")) return "⚠️";
    if (type.includes("ERROR")) return "❌";
    return "🔔";
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="app-header-control app-toolbar-surface relative p-2 rounded-xl text-ds-secondary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-error-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-soft">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="app-user-menu-panel absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] border border-ds-border rounded-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-ds-border">
              <h3 className="text-sm font-semibold text-ds-primary flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full border border-ds-border bg-ds-elevated text-primary text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Check size={14} />
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {/* Liste notifications */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-ds-muted text-sm">Chargement...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-ds-muted opacity-30" />
                  <p className="text-sm text-ds-muted">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-ds-border">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`app-notification-item w-full text-left p-4 transition-colors ${
                        !notif.isRead ? "bg-[rgb(var(--sidebar-active-bg))]" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-2xl shrink-0">{getNotificationIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-ds-primary line-clamp-1">
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-ds-secondary line-clamp-2 mt-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-ds-muted mt-2">
                            {formatRelativeTime(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-ds-border">
              <button
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                className="app-dropdown-link w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary rounded-xl transition-colors"
              >
                Voir toutes les notifications
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
