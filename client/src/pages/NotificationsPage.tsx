// =============================================================================
// MTS TELECOM - Notifications Page (page complète /notifications)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  Filter,
  Inbox,
  Mail,
  MailOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../api/notificationService";
import type { Notification } from "../types";
import { Card, Button, Badge } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../api/client";

type FilterType = "all" | "unread" | "read";
type NotificationCategory = "all" | "tickets" | "sla" | "services" | "rapports";

/**
 * NotificationsPage - Page complète de gestion des notifications.
 *
 * FONCTIONNALITÉS :
 * - Stats cards (Total, Non lues, Aujourd'hui)
 * - Filtres : Toutes / Non lues / Lues
 * - Filtre par catégorie : Tickets / SLA / Services / Rapports
 * - Liste paginée des notifications
 * - Click sur notification → marquer comme lu + navigate
 * - "Marquer toutes comme lues"
 * - Empty state
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // État
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0,
  });

  // ==========================================================================
  // API CALLS
  // ==========================================================================

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications(page, 20);
      let filtered = response.content;

      // Filtrer par read/unread
      if (filter === "unread") {
        filtered = filtered.filter((n) => !n.isRead);
      } else if (filter === "read") {
        filtered = filtered.filter((n) => n.isRead);
      }

      // Filtrer par catégorie
      if (category !== "all") {
        filtered = filtered.filter((n) => {
          const type = n.type.toLowerCase();
          if (category === "tickets") return type.includes("ticket");
          if (category === "sla") return type.includes("sla") || type.includes("escalation");
          if (category === "services") return type.includes("service");
          if (category === "rapports") return type.includes("report");
          return true;
        });
      }

      setNotifications(filtered);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      addToast("error", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, filter, category, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const [unreadCount, allResponse] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getNotifications(0, 1), // juste pour totalElements
      ]);
      // Calcul "aujourd'hui" : filtrer sur la date du jour côté client
      // À terme, un endpoint dédié /api/notifications/stats serait mieux
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayResponse = await notificationService.getNotifications(0, 100);
      const todayCount = todayResponse.content.filter(
        (n) => n.createdAt && n.createdAt.slice(0, 10) === todayStr,
      ).length;
      setStats({
        total: allResponse.totalElements,
        unread: unreadCount,
        today: todayCount,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // ==========================================================================
  // CHARGEMENT INITIAL + REFRESH
  // ==========================================================================

  useEffect(() => {
    fetchNotifications();
  }, [page, filter, category, fetchNotifications]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead();
      addToast("success", `${result.markedCount} notification(s) marquée(s) comme lue(s)`);
      fetchNotifications();
      fetchStats();
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
        fetchStats();
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // Navigation si referencePath existe
    if (notification.referencePath) {
      navigate(notification.referencePath);
    }
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getNotificationIcon = (type: string) => {
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
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ds-primary flex items-center gap-2">
          <Bell className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          Notifications
        </h1>
        <p className="text-ds-muted mt-1">Suivez tous les événements importants du système</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ds-muted">Total</p>
              <p className="text-2xl font-bold text-ds-primary mt-1">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Inbox className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ds-muted">Non lues</p>
              <p className="text-2xl font-bold text-ds-primary mt-1">{stats.unread}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ds-muted">Aujourd'hui</p>
              <p className="text-2xl font-bold text-ds-primary mt-1">{stats.today}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Bell className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et Actions */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Filtres read/unread */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Toutes
            </Button>
            <Button
              variant={filter === "unread" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("unread")}
              icon={<Mail size={16} />}
            >
              Non lues
            </Button>
            <Button
              variant={filter === "read" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("read")}
              icon={<MailOpen size={16} />}
            >
              Lues
            </Button>
          </div>

          {/* Filtre par catégorie */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ds-muted" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationCategory)}
              className="px-3 py-1.5 text-sm border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Toutes les catégories</option>
              <option value="tickets">Tickets</option>
              <option value="sla">SLA & Escalades</option>
              <option value="services">Services</option>
              <option value="rapports">Rapports</option>
            </select>
          </div>

          {/* Marquer toutes comme lues */}
          {stats.unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={<Check size={16} />}
              onClick={handleMarkAllAsRead}
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </Card>

      {/* Liste des notifications */}
      <Card padding="none">
        {loading ? (
          <div className="p-12 text-center text-ds-muted">Chargement des notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-ds-muted opacity-30" />
            <p className="text-lg font-medium text-ds-primary mb-1">Aucune notification</p>
            <p className="text-sm text-ds-muted">
              {filter === "unread"
                ? "Vous n'avez aucune notification non lue"
                : "Aucune notification à afficher"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-ds-border">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-4 hover:bg-ds-elevated transition-colors ${
                    !notif.isRead ? "bg-primary-50/30 dark:bg-primary-900/10" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="text-3xl shrink-0">{getNotificationIcon(notif.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="text-sm font-semibold text-ds-primary">{notif.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {isToday(notif.createdAt) && <Badge variant="success">Aujourd'hui</Badge>}
                          {!notif.isRead && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary-600 dark:text-primary-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-ds-secondary mb-2">{notif.message}</p>
                      <div className="flex items-center gap-3 text-xs text-ds-muted">
                        <span>{getTimeAgo(notif.createdAt)}</span>
                        {notif.typeLabel && (
                          <>
                            <span>•</span>
                            <span className="text-primary-600 dark:text-primary-400 font-medium">
                              {notif.typeLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-ds-border">
                <p className="text-sm text-ds-muted">
                  Page {page + 1} sur {totalPages} • {totalElements} notification(s)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ChevronLeft size={16} />}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ChevronRight size={16} />}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
