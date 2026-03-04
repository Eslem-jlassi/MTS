// =============================================================================
// MTS TELECOM - Détail d'un incident (timeline, notes, post-mortem, linking)
// =============================================================================

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquarePlus,
  FileText,
  Send,
  Link2,
  Unlink,
  XCircle,
  Activity,
  Shield,
} from "lucide-react";
import { incidentService } from "../api/incidentService";
import type { Incident, IncidentTimelineEntry } from "../types";
import {
  IncidentStatus,
  IncidentStatusLabels,
  IncidentStatusColors,
  Severity,
  SeverityLabels,
  SeverityColors,
  ImpactLabels,
  IncidentTimelineEventType,
} from "../types";
import { Card, Button, Badge } from "../components/ui";

function formatDate(s: string | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const severityBadge: Record<Severity, "danger" | "warning" | "neutral" | "success"> = {
  [Severity.CRITICAL]: "danger",
  [Severity.MAJOR]: "warning",
  [Severity.MINOR]: "neutral",
  [Severity.LOW]: "success",
};

const statusBadge: Record<IncidentStatus, "danger" | "warning" | "success" | "neutral"> = {
  [IncidentStatus.OPEN]: "danger",
  [IncidentStatus.IN_PROGRESS]: "warning",
  [IncidentStatus.RESOLVED]: "success",
  [IncidentStatus.CLOSED]: "neutral",
};

const timelineIcon: Record<string, React.ReactNode> = {
  [IncidentTimelineEventType.STATUS_CHANGE]: <Activity size={16} />,
  [IncidentTimelineEventType.NOTE]: <MessageSquarePlus size={16} />,
  [IncidentTimelineEventType.UPDATE]: <Clock size={16} />,
  [IncidentTimelineEventType.POST_MORTEM]: <FileText size={16} />,
  [IncidentTimelineEventType.TICKET_LINKED]: <Link2 size={16} />,
  [IncidentTimelineEventType.TICKET_UNLINKED]: <Unlink size={16} />,
  [IncidentTimelineEventType.SERVICE_ADDED]: <Link2 size={16} />,
  [IncidentTimelineEventType.SERVICE_REMOVED]: <Unlink size={16} />,
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Note form
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Post-mortem form
  const [showPmForm, setShowPmForm] = useState(false);
  const [pmText, setPmText] = useState("");
  const [savingPm, setSavingPm] = useState(false);

  // Status change
  const [changingStatus, setChangingStatus] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inc, tl] = await Promise.all([
        incidentService.getById(Number(id)),
        incidentService.getTimeline(Number(id)),
      ]);
      setIncident(inc);
      setTimeline(tl);
    } catch {
      setIncident(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!incident) return;
    setChangingStatus(true);
    try {
      if (newStatus === IncidentStatus.CLOSED) {
        await incidentService.close(incident.id);
      } else {
        await incidentService.changeStatus(incident.id, newStatus);
      }
      await reload();
    } catch {
      // silent
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!incident || !noteText.trim()) return;
    setAddingNote(true);
    try {
      await incidentService.addNote(incident.id, noteText.trim());
      setNoteText("");
      await reload();
    } catch {
      // silent
    } finally {
      setAddingNote(false);
    }
  };

  const handleSavePostMortem = async () => {
    if (!incident || !pmText.trim()) return;
    setSavingPm(true);
    try {
      await incidentService.savePostMortem(incident.id, pmText.trim());
      setShowPmForm(false);
      setPmText("");
      await reload();
    } catch {
      // silent
    } finally {
      setSavingPm(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} iconPosition="left" onClick={() => navigate(-1)}>
          Retour
        </Button>
        <Card><p className="text-ds-secondary py-8 text-center">Chargement…</p></Card>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} iconPosition="left" onClick={() => navigate(-1)}>
          Retour
        </Button>
        <Card><p className="text-ds-secondary py-8 text-center">Incident introuvable.</p></Card>
      </div>
    );
  }

  const isActive = incident.status === IncidentStatus.OPEN || incident.status === IncidentStatus.IN_PROGRESS;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" icon={<ArrowLeft size={18} />} iconPosition="left" onClick={() => navigate("/incidents")}>
        Retour aux incidents
      </Button>

      {/* Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {incident.incidentNumber && (
                <span className="text-xs font-mono text-ds-muted bg-ds-elevated px-2 py-0.5 rounded">
                  {incident.incidentNumber}
                </span>
              )}
              <Badge variant={statusBadge[incident.status]}>
                {IncidentStatusLabels[incident.status]}
              </Badge>
              <Badge variant={severityBadge[incident.severity]}>
                {SeverityLabels[incident.severity]}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold text-ds-primary">{incident.title}</h1>
            {incident.description && (
              <p className="text-sm text-ds-secondary mt-2">{incident.description}</p>
            )}
          </div>

          {/* Status actions */}
          {isActive && (
            <div className="flex flex-wrap gap-2">
              {incident.status === IncidentStatus.OPEN && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusChange(IncidentStatus.IN_PROGRESS)}
                  loading={changingStatus}
                  icon={<Activity size={16} />}
                  iconPosition="left"
                >
                  Prendre en charge
                </Button>
              )}
              {isActive && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange(IncidentStatus.RESOLVED)}
                  loading={changingStatus}
                  icon={<CheckCircle2 size={16} />}
                  iconPosition="left"
                >
                  Résoudre
                </Button>
              )}
              {incident.status === IncidentStatus.RESOLVED && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusChange(IncidentStatus.CLOSED)}
                  loading={changingStatus}
                  icon={<XCircle size={16} />}
                  iconPosition="left"
                >
                  Clôturer
                </Button>
              )}
            </div>
          )}
          {incident.status === IncidentStatus.RESOLVED && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange(IncidentStatus.CLOSED)}
              loading={changingStatus}
              icon={<XCircle size={16} />}
              iconPosition="left"
            >
              Clôturer
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details + post-mortem */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info grid */}
          <Card>
            <h2 className="text-lg font-semibold text-ds-primary mb-4">Détails</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-ds-muted">Service principal</dt>
                <dd className="font-medium text-ds-primary">{incident.serviceName ?? `Service #${incident.serviceId}`}</dd>
              </div>
              {incident.impact && (
                <div>
                  <dt className="text-ds-muted">Impact</dt>
                  <dd className="font-medium text-ds-primary">{incident.impactLabel ?? ImpactLabels[incident.impact]}</dd>
                </div>
              )}
              <div>
                <dt className="text-ds-muted">Début</dt>
                <dd className="text-ds-primary">{formatDate(incident.startedAt)}</dd>
              </div>
              {incident.resolvedAt && (
                <div>
                  <dt className="text-ds-muted">Résolu le</dt>
                  <dd className="text-ds-primary">{formatDate(incident.resolvedAt)}</dd>
                </div>
              )}
              {incident.commanderName && (
                <div>
                  <dt className="text-ds-muted">Commandant</dt>
                  <dd className="text-ds-primary">{incident.commanderName}</dd>
                </div>
              )}
              {incident.cause && (
                <div className="col-span-2">
                  <dt className="text-ds-muted">Cause</dt>
                  <dd className="text-ds-primary">{incident.cause}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Affected services */}
          {incident.affectedServiceNames && incident.affectedServiceNames.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-ds-primary mb-3">Services affectés</h2>
              <div className="flex flex-wrap gap-2">
                {incident.affectedServiceNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <AlertTriangle size={14} />
                    {name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Linked tickets */}
          {incident.ticketNumbers && incident.ticketNumbers.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-ds-primary mb-3">Tickets liés</h2>
              <div className="flex flex-wrap gap-2">
                {incident.ticketNumbers.map((num, idx) => (
                  <Link
                    key={idx}
                    to={`/tickets/${incident.ticketIds?.[idx]}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Link2 size={14} />
                    {num}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Post-mortem */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ds-primary flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                Post-mortem (RCA)
              </h2>
              {!incident.hasPostMortem && !showPmForm && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPmForm(true)}
                  icon={<FileText size={16} />}
                  iconPosition="left"
                >
                  Rédiger
                </Button>
              )}
            </div>
            {incident.hasPostMortem && incident.postMortem ? (
              <div className="space-y-2">
                <div className="prose prose-sm dark:prose-invert max-w-none bg-ds-elevated p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-ds-primary font-sans">{incident.postMortem}</pre>
                </div>
                {incident.postMortemAt && (
                  <p className="text-xs text-ds-muted">Rédigé le {formatDate(incident.postMortemAt)}</p>
                )}
              </div>
            ) : showPmForm ? (
              <div className="space-y-3">
                <textarea
                  rows={8}
                  value={pmText}
                  onChange={(e) => setPmText(e.target.value)}
                  className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="Analyse de la cause racine, chronologie des événements, actions correctives, mesures préventives..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowPmForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSavePostMortem}
                    loading={savingPm}
                    disabled={!pmText.trim()}
                    icon={<FileText size={16} />}
                    iconPosition="left"
                  >
                    Enregistrer le post-mortem
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ds-muted italic">Aucun post-mortem rédigé.</p>
            )}
          </Card>
        </div>

        {/* Right sidebar: Timeline + Notes */}
        <div className="space-y-6">
          {/* Add note */}
          <Card>
            <h2 className="text-sm font-semibold text-ds-primary mb-3 flex items-center gap-2">
              <MessageSquarePlus size={16} className="text-primary" />
              Ajouter une note
            </h2>
            <div className="space-y-2">
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary text-sm focus:ring-2 focus:ring-primary/30"
                placeholder="Note, observation, mise à jour…"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNote}
                loading={addingNote}
                disabled={!noteText.trim()}
                icon={<Send size={14} />}
                iconPosition="left"
                className="w-full"
              >
                Publier
              </Button>
            </div>
          </Card>

          {/* Timeline */}
          <Card>
            <h2 className="text-sm font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Chronologie ({timeline.length})
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-ds-muted italic">Aucun événement.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-ds-border" />
                <ul className="space-y-4">
                  {timeline.map((entry) => (
                    <li key={entry.id} className="relative pl-8">
                      <div className="absolute left-1 top-1 w-5 h-5 rounded-full bg-ds-elevated border-2 border-ds-border flex items-center justify-center text-ds-muted">
                        {timelineIcon[entry.eventType] ?? <Clock size={12} />}
                      </div>
                      <div>
                        <p className="text-sm text-ds-primary">
                          <span className="font-medium">{entry.eventTypeLabel ?? entry.eventType}</span>
                          {entry.authorName && (
                            <span className="text-ds-muted"> — {entry.authorName}</span>
                          )}
                        </p>
                        {entry.content && (
                          <p className="text-sm text-ds-secondary mt-0.5">{entry.content}</p>
                        )}
                        {entry.oldValue && entry.newValue && (
                          <p className="text-xs text-ds-muted mt-0.5">
                            {entry.oldValue} → {entry.newValue}
                          </p>
                        )}
                        <p className="text-xs text-ds-muted mt-1">{formatDate(entry.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
