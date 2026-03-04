// =============================================================================
// MTS TELECOM - Modal de création d'un nouveau ticket
// =============================================================================

import React, { useEffect, useState } from "react";
import { ticketService, telecomServiceService } from "../../api";
import {
  CreateTicketRequest,
  TelecomService,
  TicketPriority,
  TicketCategory,
} from "../../types";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const priorityOptions: { value: TicketPriority; label: string; color: string }[] = [
  { value: TicketPriority.LOW, label: "Basse", color: "text-green-600" },
  { value: TicketPriority.MEDIUM, label: "Moyenne", color: "text-yellow-600" },
  { value: TicketPriority.HIGH, label: "Haute", color: "text-orange-600" },
  { value: TicketPriority.CRITICAL, label: "Critique", color: "text-red-600" },
];

const categoryOptions: { value: TicketCategory; label: string }[] = [
  { value: TicketCategory.PANNE, label: "Panne" },
  { value: TicketCategory.DEMANDE, label: "Demande" },
  { value: TicketCategory.EVOLUTION, label: "Évolution" },
  { value: TicketCategory.AUTRE, label: "Autre" },
];

const CreateTicketModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [services, setServices] = useState<TelecomService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.PANNE,
    serviceId: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadServices();
      setForm({ title: "", description: "", priority: TicketPriority.MEDIUM, category: TicketCategory.PANNE, serviceId: 0 });
      setError(null);
    }
  }, [isOpen]);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await telecomServiceService.getActiveServices();
      setServices(data);
      if (data.length > 0) {
        setForm((prev) => ({ ...prev, serviceId: data[0].id }));
      }
    } catch {
      setError("Impossible de charger les services");
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || form.serviceId === 0) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const request: CreateTicketRequest = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        category: form.category,
        serviceId: form.serviceId,
        clientId: user?.id || 0, // Backend uses currentUser anyway
      };
      await ticketService.createTicket(request);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la création du ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-ds-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ds-border">
          <h2 className="text-lg font-bold text-ds-primary">
            Nouveau ticket
          </h2>
          <button
            onClick={onClose}
            className="text-ds-muted hover:text-ds-secondary text-xl"
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Panne réseau sur le site de Tunis"
              className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Décrivez le problème en détail..."
              className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Service *
            </label>
            {loadingServices ? (
              <p className="text-sm text-ds-muted">Chargement des services...</p>
            ) : (
              <select
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary"
                required
              >
                <option value={0} disabled>-- Sélectionner un service --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.category ? `(${s.category})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Priorité
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary"
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-elevated text-ds-primary"
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-ds-primary bg-ds-elevated rounded-lg hover:bg-ds-elevated text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              {submitting ? "Création..." : "Créer le ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
