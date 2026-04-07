import React, { useEffect, useState } from "react";
import { ticketService, telecomServiceService } from "../../api";
import { CreateTicketRequest, TelecomService, TicketCategory, TicketPriority } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY_SERVICE_ID = 0;

const priorityOptions: { value: TicketPriority; label: string }[] = [
  { value: TicketPriority.LOW, label: "Basse" },
  { value: TicketPriority.MEDIUM, label: "Moyenne" },
  { value: TicketPriority.HIGH, label: "Haute" },
  { value: TicketPriority.CRITICAL, label: "Critique" },
];

const categoryOptions: { value: TicketCategory; label: string }[] = [
  { value: TicketCategory.PANNE, label: "Panne" },
  { value: TicketCategory.DEMANDE, label: "Demande" },
  { value: TicketCategory.EVOLUTION, label: "Evolution" },
  { value: TicketCategory.AUTRE, label: "Autre" },
];

const CreateTicketModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [services, setServices] = useState<TelecomService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.PANNE,
    serviceId: EMPTY_SERVICE_ID,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm({
      title: "",
      description: "",
      priority: TicketPriority.MEDIUM,
      category: TicketCategory.PANNE,
      serviceId: EMPTY_SERVICE_ID,
    });
    setError(null);
    void loadServices();
  }, [isOpen]);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await telecomServiceService.getActiveServices();
      setServices(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        setForm((previous) => ({ ...previous, serviceId: data[0].id }));
      } else {
        setForm((previous) => ({ ...previous, serviceId: EMPTY_SERVICE_ID }));
      }
    } catch {
      setError("Impossible de charger les services actifs.");
      setServices([]);
      setForm((previous) => ({ ...previous, serviceId: EMPTY_SERVICE_ID }));
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Veuillez saisir un titre de ticket.");
      return;
    }

    if (!Number.isFinite(form.serviceId) || form.serviceId === EMPTY_SERVICE_ID) {
      setError("Veuillez selectionner un service.");
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
      };

      await ticketService.createTicket(request);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la creation du ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const hasServices = services.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-ds-card shadow-xl">
        <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
          <h2 className="text-lg font-bold text-ds-primary">Nouveau ticket</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-xl text-ds-muted hover:text-ds-secondary"
          >
            x
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="create-ticket-title" className="mb-1 block text-sm font-medium text-ds-primary">
              Titre *
            </label>
            <input
              id="create-ticket-title"
              type="text"
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              placeholder="Ex: Panne reseau sur le site de Rabat"
              className="w-full rounded-lg border border-ds-border bg-ds-elevated px-3 py-2 text-ds-primary focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="create-ticket-description"
              className="mb-1 block text-sm font-medium text-ds-primary"
            >
              Description
            </label>
            <textarea
              id="create-ticket-description"
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={4}
              placeholder="Decrivez le probleme, le site impacte et l'heure de debut..."
              className="w-full rounded-lg border border-ds-border bg-ds-elevated px-3 py-2 text-ds-primary focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="create-ticket-service" className="mb-1 block text-sm font-medium text-ds-primary">
              Service *
            </label>
            {loadingServices ? (
              <p className="text-sm text-ds-muted">Chargement des services...</p>
            ) : (
              <>
                <select
                  id="create-ticket-service"
                  value={form.serviceId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      serviceId: Number(event.target.value) || EMPTY_SERVICE_ID,
                    }))
                  }
                  className="w-full rounded-lg border border-ds-border bg-ds-elevated px-3 py-2 text-ds-primary"
                  required
                >
                  <option value={EMPTY_SERVICE_ID} disabled>
                    -- Selectionner un service --
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} {service.category ? `(${service.category})` : ""}
                    </option>
                  ))}
                </select>
                {!hasServices && (
                  <p className="mt-2 text-sm text-ds-muted">
                    Aucun service actif n'est disponible pour le moment.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="create-ticket-priority"
                className="mb-1 block text-sm font-medium text-ds-primary"
              >
                Priorite
              </label>
              <select
                id="create-ticket-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    priority: event.target.value as TicketPriority,
                  }))
                }
                className="w-full rounded-lg border border-ds-border bg-ds-elevated px-3 py-2 text-ds-primary"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="create-ticket-category"
                className="mb-1 block text-sm font-medium text-ds-primary"
              >
                Categorie
              </label>
              <select
                id="create-ticket-category"
                value={form.category}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    category: event.target.value as TicketCategory,
                  }))
                }
                className="w-full rounded-lg border border-ds-border bg-ds-elevated px-3 py-2 text-ds-primary"
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-ds-elevated px-4 py-2 text-sm text-ds-primary hover:bg-ds-border"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || loadingServices || !hasServices}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? "Creation..." : "Creer le ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
