// =============================================================================
// MTS TELECOM - SLA & Escalade - Page complète de gestion SLA et escalade auto
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  Settings,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Activity,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Play,
} from "lucide-react";
import { escalationService } from "../api/escalationService";
import { businessHoursService } from "../api/businessHoursService";
import { dashboardService } from "../api/dashboardService";
import { slaService } from "../api/slaService";
import type {
  DashboardStats,
  SlaEscalationStats,
  EscalationRule,
  EscalationRuleRequest,
  SlaPolicy,
  BusinessHours,
} from "../types";
import { Card, Button, Badge, Tabs, Modal, Input, Select } from "../components/ui";
import type { Tab } from "../components/ui";
import { useToast } from "../context/ToastContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COMPLIANCE_COLOR = (rate: number): string => {
  if (rate >= 95) return "bg-emerald-500";
  if (rate >= 80) return "bg-emerald-400";
  if (rate >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const DAYS_LABELS: Record<string, string> = {
  "1": "Lun",
  "2": "Mar",
  "3": "Mer",
  "4": "Jeu",
  "5": "Ven",
  "6": "Sam",
  "7": "Dim",
};

function formatWorkDays(workDays: string): string {
  return workDays
    .split(",")
    .map((d) => DAYS_LABELS[d.trim()] ?? d.trim())
    .join(", ");
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** KPI Cards Row */
function KpiCards({
  stats,
  escalation,
  loading,
}: {
  stats: DashboardStats | null;
  escalation: SlaEscalationStats | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="md" className="animate-pulse h-24 bg-ds-elevated">
            <span className="sr-only">Chargement</span>
          </Card>
        ))}
      </div>
    );
  }

  const complianceRate = escalation?.complianceRate ?? stats?.slaComplianceRate ?? 0;
  const atRiskCount = escalation?.atRiskCount ?? 0;
  const breachedCount = escalation?.breachedCount ?? stats?.slaBreachedCount ?? 0;
  const escalatedCount = escalation?.escalatedCount ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card padding="md" className="border-l-4 border-l-emerald-500 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-ds-secondary uppercase tracking-wider">Respect SLA</p>
            <p className="text-2xl font-bold text-ds-primary">{complianceRate}%</p>
          </div>
        </div>
      </Card>
      <Card padding="md" className="border-l-4 border-l-amber-500 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-ds-secondary uppercase tracking-wider">SLA à risque</p>
            <p className="text-2xl font-bold text-ds-primary">{atRiskCount}</p>
          </div>
        </div>
      </Card>
      <Card padding="md" className="border-l-4 border-l-red-500 bg-red-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-ds-secondary uppercase tracking-wider">SLA dépassés</p>
            <p className="text-2xl font-bold text-ds-primary">{breachedCount}</p>
          </div>
        </div>
      </Card>
      <Card padding="md" className="border-l-4 border-l-orange-500 bg-orange-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs text-ds-secondary uppercase tracking-wider">Escaladés</p>
            <p className="text-2xl font-bold text-ds-primary">{escalatedCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Quick Links */
function QuickLinks() {
  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-ds-primary mb-4">Actions rapides</h3>
      <div className="flex flex-wrap gap-4">
        <Link
          to="/tickets?slaStatus=AT_RISK"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium"
        >
          Tickets SLA à risque <ArrowRight size={18} />
        </Link>
        <Link
          to="/tickets?slaStatus=BREACHED"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium"
        >
          Tickets SLA dépassés <ArrowRight size={18} />
        </Link>
        <Link
          to="/tickets?status=ESCALATED"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium"
        >
          Tickets escaladés <ArrowRight size={18} />
        </Link>
      </div>
    </Card>
  );
}

/** SLA Trend heatmap (last 7 days) */
function SlaTrendCard({ trend7 }: { trend7: DashboardStats["trendLast7Days"] }) {
  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-ds-primary mb-4">
        <TrendingUp size={20} className="inline mr-2 -mt-0.5" />
        Respect SLA (7 derniers jours)
      </h3>
      <div className="flex flex-wrap gap-3">
        {trend7 && trend7.length > 0
          ? trend7.map((day, i) => {
              const total = (day.created ?? 0) + (day.resolved ?? 0) || 1;
              const rate = total ? Math.round(((day.resolved ?? 0) / total) * 100) : 0;
              return (
                <div
                  key={day.date ?? i}
                  className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl ${COMPLIANCE_COLOR(rate)}/20 border border-ds-border`}
                >
                  <span className="text-lg font-bold text-ds-primary">{rate}%</span>
                  <span className="text-xs text-ds-secondary">
                    {day.date
                      ? new Date(day.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })
                      : `J${i + 1}`}
                  </span>
                </div>
              );
            })
          : Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-amber-500/10 border border-amber-500/30"
              >
                <span className="text-lg font-bold text-ds-primary">—</span>
                <span className="text-xs text-ds-secondary">J{7 - i}</span>
              </div>
            ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-ds-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" /> &gt;95%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400" /> 80-95%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" /> 60-80%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" /> &lt;60%
        </span>
      </div>
    </Card>
  );
}

/** Escalation Rules Panel */
function EscalationRulesPanel() {
  const { addToast } = useToast();
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState<EscalationRuleRequest>({
    name: "",
    triggerType: "AT_RISK",
    thresholdPercent: 80,
    escalationLevel: 1,
    notifyRoles: "MANAGER",
    enabled: true,
    sortOrder: 0,
  });

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await escalationService.listRules();
      setRules(data);
    } catch {
      addToast("error", "Erreur chargement des règles d'escalade");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const openCreate = () => {
    setEditingRule(null);
    setForm({
      name: "",
      triggerType: "AT_RISK",
      thresholdPercent: 80,
      escalationLevel: 1,
      notifyRoles: "MANAGER",
      enabled: true,
      sortOrder: rules.length,
    });
    setShowModal(true);
  };

  const openEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      triggerType: rule.triggerType,
      thresholdPercent: rule.thresholdPercent,
      escalationLevel: rule.escalationLevel,
      notifyRoles: rule.notifyRoles,
      changePriority: rule.changePriority,
      enabled: rule.enabled,
      priorityFilter: rule.priorityFilter,
      sortOrder: rule.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        await escalationService.updateRule(editingRule.id, form);
        addToast("success", "Règle d'escalade mise à jour");
      } else {
        await escalationService.createRule(form);
        addToast("success", "Règle d'escalade créée");
      }
      setShowModal(false);
      loadRules();
    } catch {
      addToast("error", "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette règle d'escalade ?")) return;
    try {
      await escalationService.deleteRule(id);
      addToast("success", "Règle supprimée");
      loadRules();
    } catch {
      addToast("error", "Erreur lors de la suppression");
    }
  };

  const handleToggle = async (rule: EscalationRule) => {
    try {
      await escalationService.updateRule(rule.id, {
        ...rule,
        enabled: !rule.enabled,
      });
      loadRules();
    } catch {
      addToast("error", "Erreur de mise à jour");
    }
  };

  const handleForceEvaluate = async () => {
    setEvaluating(true);
    try {
      const count = await escalationService.forceEvaluate();
      addToast("success", `Évaluation terminée : ${count} ticket(s) escaladé(s)`);
      loadRules();
    } catch {
      addToast("error", "Erreur d'évaluation");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ds-primary">
            <Shield size={20} className="inline mr-2 -mt-0.5" />
            Règles d'escalade automatique
          </h3>
          <p className="text-sm text-ds-secondary mt-0.5">
            {rules.filter((r) => r.enabled).length} règle(s) active(s) — évaluation toutes les 5 min
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Play size={16} />}
            iconPosition="left"
            onClick={handleForceEvaluate}
            disabled={evaluating}
          >
            {evaluating ? "Évaluation…" : "Évaluer maintenant"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            iconPosition="left"
            onClick={openCreate}
          >
            Nouvelle règle
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} padding="md" className="animate-pulse h-20 bg-ds-elevated">
              <span className="sr-only">Chargement</span>
            </Card>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Shield size={40} className="mx-auto text-ds-secondary mb-3" />
          <p className="text-ds-secondary">Aucune règle d'escalade configurée</p>
          <Button variant="primary" size="sm" className="mt-3" onClick={openCreate}>
            Créer une règle
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              padding="md"
              className={`transition-all ${!rule.enabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(rule)}
                    className="flex-shrink-0 text-ds-secondary hover:text-primary transition-colors"
                    title={rule.enabled ? "Désactiver" : "Activer"}
                  >
                    {rule.enabled ? (
                      <ToggleRight size={24} className="text-primary" />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ds-primary truncate">{rule.name}</span>
                      <Badge variant={rule.triggerType === "BREACHED" ? "danger" : "warning"}>
                        {rule.triggerType === "BREACHED" ? "SLA dépassé" : "SLA à risque"}
                      </Badge>
                      <Badge variant="default">Niveau {rule.escalationLevel}</Badge>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-ds-secondary mt-0.5 truncate">
                        {rule.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button
                    onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                    className="p-1.5 rounded-lg hover:bg-ds-elevated text-ds-secondary transition-colors"
                    title="Détails"
                  >
                    {expandedId === rule.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-1.5 rounded-lg hover:bg-ds-elevated text-ds-secondary hover:text-primary transition-colors"
                    title="Modifier"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 rounded-lg hover:bg-ds-elevated text-ds-secondary hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === rule.id && (
                <div className="mt-3 pt-3 border-t border-ds-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-ds-secondary">Seuil</span>
                    <p className="font-medium text-ds-primary">{rule.thresholdPercent}%</p>
                  </div>
                  <div>
                    <span className="text-ds-secondary">Notifier</span>
                    <p className="font-medium text-ds-primary">{rule.notifyRoles || "—"}</p>
                  </div>
                  <div>
                    <span className="text-ds-secondary">Priorité cible</span>
                    <p className="font-medium text-ds-primary">
                      {rule.changePriority || "Inchangée"}
                    </p>
                  </div>
                  <div>
                    <span className="text-ds-secondary">Filtre priorité</span>
                    <p className="font-medium text-ds-primary">{rule.priorityFilter || "Toutes"}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRule ? "Modifier la règle" : "Nouvelle règle d'escalade"}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la règle"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: SLA à risque → Niveau 1"
            required
          />
          <Input
            label="Description"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description optionnelle"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type de déclencheur"
              value={form.triggerType}
              onChange={(e) =>
                setForm({ ...form, triggerType: e.target.value as "AT_RISK" | "BREACHED" })
              }
              options={[
                { value: "AT_RISK", label: "SLA à risque" },
                { value: "BREACHED", label: "SLA dépassé" },
              ]}
            />
            <Input
              label="Seuil (%)"
              type="number"
              value={String(form.thresholdPercent)}
              onChange={(e) =>
                setForm({ ...form, thresholdPercent: parseInt(e.target.value) || 0 })
              }
              min={1}
              max={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Niveau d'escalade"
              type="number"
              value={String(form.escalationLevel)}
              onChange={(e) => setForm({ ...form, escalationLevel: parseInt(e.target.value) || 1 })}
              min={1}
              max={5}
            />
            <Input
              label="Rôles à notifier"
              value={form.notifyRoles ?? ""}
              onChange={(e) => setForm({ ...form, notifyRoles: e.target.value })}
              placeholder="MANAGER,ADMIN"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Changer la priorité en"
              value={form.changePriority ?? ""}
              onChange={(e) => setForm({ ...form, changePriority: e.target.value || undefined })}
              options={[
                { value: "", label: "Ne pas changer" },
                { value: "CRITICAL", label: "Critique" },
                { value: "HIGH", label: "Haute" },
                { value: "MEDIUM", label: "Moyenne" },
                { value: "LOW", label: "Basse" },
              ]}
            />
            <Select
              label="Filtre priorité"
              value={form.priorityFilter ?? ""}
              onChange={(e) => setForm({ ...form, priorityFilter: e.target.value || undefined })}
              options={[
                { value: "", label: "Toutes les priorités" },
                { value: "CRITICAL", label: "Critique uniquement" },
                { value: "CRITICAL,HIGH", label: "Critique + Haute" },
                { value: "MEDIUM,LOW", label: "Moyenne + Basse" },
              ]}
            />
          </div>
          <Input
            label="Ordre de tri"
            type="number"
            value={String(form.sortOrder ?? 0)}
            onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
            min={0}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!form.name.trim()}>
              {editingRule ? "Enregistrer" : "Créer la règle"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Business Hours Panel */
function BusinessHoursPanel() {
  const { addToast } = useToast();
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHours = useCallback(async () => {
    setLoading(true);
    try {
      const data = await businessHoursService.list();
      setHours(data);
    } catch {
      addToast("error", "Erreur chargement des horaires ouvrés");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-ds-primary">
          <Timer size={20} className="inline mr-2 -mt-0.5" />
          Horaires ouvrés
        </h3>
        <p className="text-sm text-ds-secondary mt-0.5">
          Configuration des plages horaires pour le calcul SLA en heures ouvrées
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1].map((i) => (
            <Card key={i} padding="md" className="animate-pulse h-20 bg-ds-elevated">
              <span className="sr-only">Chargement</span>
            </Card>
          ))}
        </div>
      ) : hours.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Timer size={40} className="mx-auto text-ds-secondary mb-3" />
          <p className="text-ds-secondary">Aucun horaire ouvrés configuré (mode 24/7)</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {hours.map((bh) => (
            <Card key={bh.id} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ds-primary">{bh.name}</span>
                      {bh.isDefault && <Badge variant="info">Par défaut</Badge>}
                      <Badge variant={bh.active ? "success" : "default"}>
                        {bh.active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-sm text-ds-secondary mt-0.5">
                      {bh.startHour}h — {bh.endHour}h · {formatWorkDays(bh.workDays)} ·{" "}
                      {bh.timezone}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-ds-secondary">{bh.endHour - bh.startHour}h/jour</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** SLA Policies mini-list */
function SlaPoliciesList() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    slaService
      .list()
      .then(setPolicies)
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card padding="md" className="animate-pulse h-32 bg-ds-elevated">
        <span className="sr-only">Chargement</span>
      </Card>
    );
  }

  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...policies].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 9) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 9),
  );

  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-ds-primary mb-4">
        <Activity size={20} className="inline mr-2 -mt-0.5" />
        Politiques SLA actives
      </h3>
      {sorted.length === 0 ? (
        <p className="text-ds-secondary text-sm">Aucune politique SLA configurée</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="ds-table-raw w-full text-sm">
            <thead>
              <tr className="border-b border-ds-border text-ds-secondary text-left">
                <th className="py-2 pr-4">Politique</th>
                <th className="py-2 pr-4">Priorité</th>
                <th className="py-2 pr-4">Réponse</th>
                <th className="py-2 pr-4">Résolution</th>
                <th className="py-2 pr-4">Horaires</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-ds-border/50 last:border-b-0">
                  <td className="py-2.5 pr-4 font-medium text-ds-primary">{p.name}</td>
                  <td className="py-2.5 pr-4">
                    <Badge
                      variant={
                        p.priority === "CRITICAL"
                          ? "danger"
                          : p.priority === "HIGH"
                            ? "warning"
                            : p.priority === "MEDIUM"
                              ? "info"
                              : "default"
                      }
                    >
                      {p.priority}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-ds-secondary">{p.responseTimeHours ?? "—"}h</td>
                  <td className="py-2.5 pr-4 text-ds-secondary">{p.resolutionTimeHours}h</td>
                  <td className="py-2.5 pr-4 text-ds-secondary">{p.businessHoursName ?? "24/7"}</td>
                  <td className="py-2.5">
                    <Badge variant={p.active ? "success" : "default"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const SLA_TABS: Tab[] = [
  { key: "overview", label: "Vue d'ensemble", icon: <BarChart3 size={16} /> },
  { key: "escalation", label: "Escalade", icon: <Zap size={16} /> },
  { key: "config", label: "Configuration", icon: <Settings size={16} /> },
];

export default function SlaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [escalation, setEscalation] = useState<SlaEscalationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getStats().catch(() => null),
      escalationService.getStats().catch(() => null),
    ]).then(([dashStats, escStats]) => {
      setStats(dashStats);
      setEscalation(escStats);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab && SLA_TABS.some((tab) => tab.key === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const currentTab = searchParams.get("tab") || "overview";
    if (currentTab === activeTab) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    if (activeTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", activeTab);
    }
    setSearchParams(params, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ds-primary">SLA & Escalade</h1>
          <p className="text-sm text-ds-secondary mt-0.5">
            Suivi des niveaux de service, escalade automatique et configuration
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={18} className={loading ? "animate-spin" : ""} />}
          iconPosition="left"
          onClick={load}
          disabled={loading}
        >
          Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <KpiCards stats={stats} escalation={escalation} loading={loading} />

      {/* Tabs */}
      <Tabs tabs={SLA_TABS} activeKey={activeTab} onChange={setActiveTab} variant="pills" />

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <QuickLinks />
          <SlaTrendCard trend7={stats?.trendLast7Days ?? []} />

          {/* Extra stats from escalation */}
          {escalation && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card padding="md" className="text-center">
                <p className="text-xs text-ds-secondary uppercase tracking-wider mb-1">
                  Règles actives
                </p>
                <p className="text-3xl font-bold text-ds-primary">{escalation.activeRulesCount}</p>
              </Card>
              <Card padding="md" className="text-center">
                <p className="text-xs text-ds-secondary uppercase tracking-wider mb-1">
                  Tickets actifs
                </p>
                <p className="text-3xl font-bold text-ds-primary">{escalation.activeCount}</p>
              </Card>
              <Card padding="md" className="text-center">
                <p className="text-xs text-ds-secondary uppercase tracking-wider mb-1">
                  Résolution moy.
                </p>
                <p className="text-3xl font-bold text-ds-primary">
                  {escalation.averageResolutionHours > 0
                    ? `${escalation.averageResolutionHours}h`
                    : "—"}
                </p>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === "escalation" && <EscalationRulesPanel />}

      {activeTab === "config" && (
        <div className="space-y-6">
          <BusinessHoursPanel />
          <SlaPoliciesList />
        </div>
      )}
    </div>
  );
}
