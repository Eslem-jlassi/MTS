// =============================================================================
// MTS TELECOM - Création d'un incident (formulaire complet)
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Plus, X, Search } from "lucide-react";
import { incidentService } from "../api/incidentService";
import { telecomServiceService } from "../api/telecomServiceService";
import { ticketService } from "../api/ticketService";
import { RootState } from "../redux/store";
import type { IncidentRequest, TelecomService, Ticket } from "../types";
import { Severity, SeverityLabels, IncidentImpact, ImpactLabels } from "../types";
import { Card, Button } from "../components/ui";
import type { ManagerCopilotIncidentPrefillState } from "../components/manager-copilot/managerCopilotActions";
import { isManagerCopilotAllowedRole } from "../components/manager-copilot/managerCopilotUi";

export default function IncidentNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [services, setServices] = useState<TelecomService[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>(Severity.MAJOR);
  const [impact, setImpact] = useState<IncidentImpact>(IncidentImpact.LOCALIZED);
  const [serviceId, setServiceId] = useState<number>(0);
  const [affectedServiceIds, setAffectedServiceIds] = useState<number[]>([]);
  const [ticketIds, setTicketIds] = useState<number[]>([]);
  const [cause, setCause] = useState("");
  const [startedAt, setStartedAt] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
  });

  // Service/Ticket search
  const [serviceSearch, setServiceSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const currentUserRole = useSelector((state: RootState) => state.auth.user?.role);
  const isManagerCopilotContext = isManagerCopilotAllowedRole(currentUserRole);
  const prefillState = location.state as ManagerCopilotIncidentPrefillState | null;

  const loadReferenceData = useCallback(async () => {
    setLoadingRef(true);
    try {
      const [svcList, tktRes] = await Promise.all([
        telecomServiceService.getActiveServices(),
        ticketService.getTickets(),
      ]);
      setServices(svcList);
      // tickets: getAll may return Page or array
      const tktList = Array.isArray(tktRes) ? tktRes : ((tktRes as any)?.content ?? []);
      setTickets(tktList);
    } catch {
      // silent
    } finally {
      setLoadingRef(false);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (!isManagerCopilotContext || !prefillState || prefillState.source !== "allie") {
      return;
    }

    const { prefill } = prefillState;
    setTitle((current) => current || prefill.title || "");
    setDescription((current) => current || prefill.description || "");
    setSeverity(prefill.severity || Severity.MAJOR);
    setImpact(prefill.impact || IncidentImpact.LOCALIZED);
    setServiceId((current) => current || prefill.serviceId || 0);
    setAffectedServiceIds((current) =>
      current.length > 0 ? current : prefill.affectedServiceIds || [],
    );
    setTicketIds((current) => (current.length > 0 ? current : prefill.ticketIds || []));
    setCause((current) => current || prefill.cause || "");
  }, [isManagerCopilotContext, prefillState]);

  const filteredServices = services.filter(
    (s) =>
      !affectedServiceIds.includes(s.id) &&
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()),
  );

  const filteredTickets = tickets.filter(
    (t) =>
      !ticketIds.includes(t.id) &&
      (t.ticketNumber.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.title.toLowerCase().includes(ticketSearch.toLowerCase())),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      setError("Veuillez sélectionner un service principal.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const request: IncidentRequest = {
        title,
        description: description || undefined,
        severity,
        impact,
        serviceId,
        affectedServiceIds: affectedServiceIds.length > 0 ? affectedServiceIds : undefined,
        ticketIds: ticketIds.length > 0 ? ticketIds : undefined,
        startedAt: new Date(startedAt).toISOString(),
        cause: cause || undefined,
      };
      const created = await incidentService.create(request);
      navigate(`/incidents/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        icon={<ArrowLeft size={18} />}
        iconPosition="left"
        onClick={() => navigate("/incidents")}
      >
        Retour aux incidents
      </Button>

      <div>
        <h1 className="text-2xl font-semibold text-ds-primary flex items-center gap-2">
          <AlertTriangle size={24} className="text-red-500" />
          Déclarer un incident
        </h1>
        <p className="text-sm text-ds-secondary mt-1">
          Remplissez les informations pour créer un nouvel incident de supervision.
        </p>
      </div>

      {isManagerCopilotContext && prefillState?.source === "allie" && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 text-sm text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
          Contexte pre-rempli par ALLIE pour accelerer la qualification manager. Verifiez les champs
          avant validation.
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos principales */}
        <Card>
          <h2 className="text-lg font-semibold text-ds-primary mb-4">Informations principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ds-primary mb-1">Titre *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="Ex: Panne du système de facturation BSCS"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ds-primary mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Décrivez la situation, l'impact observé, les symptômes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Sévérité *</label>
              <select
                required
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className={inputClass}
              >
                {Object.values(Severity).map((s) => (
                  <option key={s} value={s}>
                    {SeverityLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Impact business
              </label>
              <select
                value={impact}
                onChange={(e) => setImpact(e.target.value as IncidentImpact)}
                className={inputClass}
              >
                {Object.values(IncidentImpact).map((i) => (
                  <option key={i} value={i}>
                    {ImpactLabels[i]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Date de début *
              </label>
              <input
                type="datetime-local"
                required
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Cause initiale
              </label>
              <input
                type="text"
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className={inputClass}
                placeholder="Cause identifiée (optionnel)"
              />
            </div>
          </div>
        </Card>

        {/* Service principal + services affectés */}
        <Card>
          <h2 className="text-lg font-semibold text-ds-primary mb-4">Services</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Service principal *
              </label>
              <select
                required
                value={serviceId}
                onChange={(e) => setServiceId(Number(e.target.value))}
                className={inputClass}
                disabled={loadingRef}
              >
                <option value={0}>— Sélectionner —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.categoryLabel ?? s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Services affectés (multi-sélection)
              </label>
              {affectedServiceIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {affectedServiceIds.map((sid) => {
                    const svc = services.find((s) => s.id === sid);
                    return (
                      <span
                        key={sid}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {svc?.name ?? `#${sid}`}
                        <button
                          type="button"
                          onClick={() =>
                            setAffectedServiceIds((prev) => prev.filter((id) => id !== sid))
                          }
                          className="hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-muted"
                />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                  placeholder="Rechercher un service à ajouter..."
                />
              </div>
              {serviceSearch && filteredServices.length > 0 && (
                <ul className="mt-1 max-h-32 overflow-y-auto border border-ds-border rounded-lg bg-ds-card divide-y divide-ds-border">
                  {filteredServices.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-ds-elevated text-ds-primary"
                        onClick={() => {
                          setAffectedServiceIds((prev) => [...prev, s.id]);
                          setServiceSearch("");
                        }}
                      >
                        <Plus size={12} className="inline mr-1 text-ds-muted" />
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Tickets liés */}
        <Card>
          <h2 className="text-lg font-semibold text-ds-primary mb-4">Tickets liés</h2>
          {ticketIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {ticketIds.map((tid) => {
                const tkt = tickets.find((t) => t.id === tid);
                return (
                  <span
                    key={tid}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs rounded-full"
                  >
                    {tkt?.ticketNumber ?? `#${tid}`}
                    <button
                      type="button"
                      onClick={() => setTicketIds((prev) => prev.filter((id) => id !== tid))}
                      className="hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-muted" />
            <input
              type="text"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className={`${inputClass} pl-9`}
              placeholder="Rechercher un ticket à lier..."
            />
          </div>
          {ticketSearch && filteredTickets.length > 0 && (
            <ul className="mt-1 max-h-32 overflow-y-auto border border-ds-border rounded-lg bg-ds-card divide-y divide-ds-border">
              {filteredTickets.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-ds-elevated text-ds-primary"
                    onClick={() => {
                      setTicketIds((prev) => [...prev, t.id]);
                      setTicketSearch("");
                    }}
                  >
                    <Plus size={12} className="inline mr-1 text-ds-muted" />
                    {t.ticketNumber} — {t.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate("/incidents")}>
            Annuler
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={submitting}
            icon={<AlertTriangle size={18} />}
            iconPosition="left"
          >
            Déclarer l'incident
          </Button>
        </div>
      </form>
    </div>
  );
}
