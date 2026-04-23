/**
 * Admin Dashboard - Vue d'ensemble système, accès rapide, audit
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Server,
  Settings,
  Activity,
  ArrowRight,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  UserCog,
  Tag,
  Clock,
} from "lucide-react";
import { Card, Button, Skeleton, Badge } from "../../components/ui";
import type { DashboardStats, AuditLog } from "../../types";
import type { TelecomService } from "../../types";
import { slaService } from "../../api/slaService";
import { auditService } from "../../api/auditService";
import api from "../../api/client";
import {
  formatDateTime,
  formatRelativeTime as formatRelativeTimeValue,
} from "../../utils/formatters";
import { auditEntityTone, toneBadgeVariant, toneIconClass } from "../../utils/uiSemantics";

interface AdminDashboardProps {
  stats: DashboardStats;
  services?: TelecomService[];
  lastUpdated?: string;
  onRefresh?: () => void;
  isLoadingRefresh?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  services = [],
  lastUpdated,
  onRefresh,
  isLoadingRefresh = false,
}) => {
  const [slaPolicyCount, setSlaPolicyCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  const openIncidents = stats.activeTickets;

  useEffect(() => {
    slaService
      .count()
      .then(setSlaPolicyCount)
      .catch(() => setSlaPolicyCount(0));
  }, []);

  useEffect(() => {
    api
      .get<{ count: number }>("/users/count")
      .then((res) => setUsersCount(res.data.count))
      .catch(() => setUsersCount(0));
  }, []);

  useEffect(() => {
    setLoadingAudit(true);
    auditService
      .getRecentActivity(10)
      .then(setRecentAudit)
      .catch(() => setRecentAudit([]))
      .finally(() => setLoadingAudit(false));
  }, []);

  const operationalCount = services.filter(
    (s) => s.status === "OPERATIONNEL" || s.status === "UP",
  ).length;
  const degradedOrDown = services.length - operationalCount;

  /**
   * Retourne le badge pour le type d'entité
   */
  const getEntityBadge = (entityType: string) => {
    return (
      <Badge
        size="sm"
        variant={toneBadgeVariant(auditEntityTone[entityType] || "neutral")}
        className="shadow-none"
      >
        {entityType}
      </Badge>
    );
  };

  return (
    <>
      {/* Header with refresh */}
      {onRefresh && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-ds-primary">Tableau de bord Admin</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoadingRefresh}
            className="flex items-center gap-2 text-ds-muted hover:text-ds-primary"
          >
            <RefreshCw size={16} className={isLoadingRefresh ? "animate-spin" : ""} />
            Actualiser
          </Button>
        </div>
      )}

      {/* ============================================ */}
      {/* RÉSUMÉ - 4 KPI Cards */}
      {/* ============================================ */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-ds-primary mb-3">Résumé</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Utilisateurs */}
          <Card padding="md" className="border-ds-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-3 ${toneIconClass("info")}`}>
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm text-ds-secondary">Utilisateurs</p>
                  {usersCount === null ? (
                    <Skeleton variant="text" width={48} height={28} />
                  ) : (
                    <p className="text-2xl font-bold text-ds-primary">{usersCount}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Services */}
          <Card padding="md" className="border-ds-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-3 ${toneIconClass("neutral")}`}>
                  <Server size={24} />
                </div>
                <div>
                  <p className="text-sm text-ds-secondary">Services</p>
                  <p className="text-2xl font-bold text-ds-primary">{services.length}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* SLA Policies */}
          <Card padding="md" className="border-ds-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-3 ${toneIconClass("warning")}`}>
                  <FileCheck size={24} />
                </div>
                <div>
                  <p className="text-sm text-ds-secondary">Politiques SLA</p>
                  {slaPolicyCount === null ? (
                    <Skeleton variant="text" width={48} height={28} />
                  ) : (
                    <p className="text-2xl font-bold text-ds-primary">{slaPolicyCount}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Incidents ouverts */}
          <Card padding="md" className="border-ds-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-3 ${toneIconClass("danger")}`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-sm text-ds-secondary">Incidents ouverts</p>
                  <p className="text-2xl font-bold text-ds-primary">{openIncidents}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ============================================ */}
      {/* ACCÈS RAPIDE - 6 Cards */}
      {/* ============================================ */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-ds-primary mb-3">Accès rapide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Utilisateurs */}
          <Link to="/users">
            <Card
              padding="md"
              className="h-full border-primary/20 hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Users size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-ds-secondary">Gérer</p>
                    <p className="text-lg font-bold text-ds-primary">Utilisateurs</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ds-muted group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          </Link>

          {/* Rôles */}
          <Link to="/users?tab=roles">
            <Card
              padding="md"
              className="h-full border-primary/20 hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <UserCog size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-ds-secondary">Gérer</p>
                    <p className="text-lg font-bold text-ds-primary">Rôles</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ds-muted group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          </Link>

          {/* Services */}
          <Link to="/services">
            <Card
              padding="md"
              className="h-full border-primary/20 hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Server size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-ds-secondary">Gérer</p>
                    <p className="text-lg font-bold text-ds-primary">Services</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ds-muted group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          </Link>

          {/* SLA Policies */}
          <Link to="/sla-policies">
            <Card
              padding="md"
              className="h-full border-primary/20 hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <FileCheck size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-ds-secondary">Gérer</p>
                    <p className="text-lg font-bold text-ds-primary">SLA</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ds-muted group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          </Link>

          {/* Catégories */}
          <Link to="/categories">
            <Card
              padding="md"
              className="h-full border-primary/20 hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Tag size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-ds-secondary">Gérer</p>
                    <p className="text-lg font-bold text-ds-primary">Catégories</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ds-muted group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          </Link>

          {/* Settings */}
          <Link to="/settings">
            <Card
              padding="md"
              className="h-full border-ds-border hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-ds-elevated text-ds-secondary">
                    <Settings size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-ds-secondary">Gérer</p>
                    <p className="text-lg font-bold text-ds-primary">Paramètres</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ds-muted group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* ============================================ */}
      {/* SANTÉ DES SERVICES */}
      {/* ============================================ */}
      {services.length > 0 && (
        <Card padding="md" className="mb-6">
          <h3 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
            <Activity size={20} className="text-success" />
            Santé des services
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success">
              <span className="font-semibold">{operationalCount}</span>
              <span className="text-sm">Opérationnels</span>
            </div>
            {degradedOrDown > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warning/10 text-warning">
                <span className="font-semibold">{degradedOrDown}</span>
                <span className="text-sm">Dégradés / Panne</span>
              </div>
            )}
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            Voir tous les services <ArrowRight size={14} />
          </Link>
        </Card>
      )}

      {/* ============================================ */}
      {/* AUDIT LOG - 10 dernières actions */}
      {/* ============================================ */}
      <Card padding="md" className="border-ds-border">
        <h3 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
          <Activity size={20} className="text-ds-muted" />
          Journal d'audit
        </h3>

        {loadingAudit ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw size={20} className="animate-spin text-ds-muted" />
            <span className="ml-2 text-ds-muted">Chargement...</span>
          </div>
        ) : recentAudit.length === 0 ? (
          <p className="text-sm text-ds-muted py-4">Aucune activité récente</p>
        ) : (
          <div className="space-y-3">
            {recentAudit.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-ds-elevated hover:bg-ds-border/30 transition-colors"
              >
                {/* Icon + Entity badge */}
                <div className="flex-shrink-0 mt-0.5">
                  <Clock size={16} className="text-ds-muted" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getEntityBadge(entry.entityType)}
                    <span className="text-xs text-ds-muted">
                      {formatRelativeTimeValue(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-ds-primary font-medium">
                    {entry.actionLabel || entry.action}
                  </p>
                  {entry.description && (
                    <p className="text-xs text-ds-secondary mt-1">{entry.description}</p>
                  )}
                  {entry.userEmail && (
                    <p className="text-xs text-ds-muted mt-1">
                      Par : <span className="font-medium">{entry.userEmail}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          to="/audit"
          className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary-500 hover:text-primary-600"
        >
          Voir tout le journal <ArrowRight size={14} />
        </Link>

        {lastUpdated && (
          <p className="text-xs text-ds-muted mt-4 pt-4 border-t border-ds-border">
            Dernière mise à jour : {formatDateTime(lastUpdated)}
          </p>
        )}
      </Card>
    </>
  );
};
