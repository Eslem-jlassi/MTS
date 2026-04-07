import React from "react";
import { ChatbotTicketDraft } from "./chatbotTicketDraft";
import { ChatLanguage } from "./chatbotLanguage";

interface ChatbotTicketDraftPanelProps {
  draft: ChatbotTicketDraft;
  availableServices: Array<{ id: number; name: string }>;
  onChange: (draft: ChatbotTicketDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  submitBlockedReason?: string | null;
  feedbackMessage?: string | null;
  language?: ChatLanguage;
}

const ChatbotTicketDraftPanel: React.FC<ChatbotTicketDraftPanelProps> = ({
  draft,
  availableServices,
  onChange,
  onCancel,
  onConfirm,
  isSubmitting = false,
  canSubmit = false,
  submitBlockedReason = null,
  feedbackMessage = null,
  language = "fr",
}) => {
  const labels =
    language === "en"
      ? {
          section: "Ticket draft",
          subtitle:
            "Review the fields before validation. No production ticket is created without your confirmation, and no service is created automatically by the chatbot.",
          title: "Title",
          titlePlaceholder: "Ticket title",
          detectedService: "Detected service",
          servicePlaceholder: "Choose a service from the catalog",
          summary: "Summary",
          summaryPlaceholder: "Incident summary",
          impact: "Impact",
          impactPlaceholder: "Estimated impact on users or services",
          probableCause: "Probable cause",
          probableCausePlaceholder: "Probable cause (optional)",
          nextAction: "Suggested next action",
          infoToConfirm: "Information to confirm",
          cancel: "Cancel",
          creating: "Creating ticket...",
          confirm: "Validate and create ticket",
        }
      : {
          section: "Brouillon de ticket",
          subtitle:
            "Verifiez les champs avant validation. Aucun ticket de production n'est cree sans votre confirmation, et aucun service n'est cree automatiquement par le chatbot.",
          title: "Titre",
          titlePlaceholder: "Titre du ticket",
          detectedService: "Service detecte",
          servicePlaceholder: "Choisissez un service du catalogue",
          summary: "Resume",
          summaryPlaceholder: "Resume de l'incident",
          impact: "Impact",
          impactPlaceholder: "Impact estime sur les utilisateurs ou services",
          probableCause: "Cause probable",
          probableCausePlaceholder: "Cause probable (optionnel)",
          nextAction: "Action suivante suggeree",
          infoToConfirm: "Informations a confirmer",
          cancel: "Annuler",
          creating: "Creation en cours...",
          confirm: "Valider et creer le ticket",
        };

  return (
    <section className="chatbot-ticket-draft" aria-label={labels.section}>
      <div className="chatbot-ticket-draft-header chatbot-ticket-draft-header-elevated">
        <p className="chatbot-ticket-draft-title">{labels.section}</p>
        <p className="chatbot-ticket-draft-subtitle">{labels.subtitle}</p>
      </div>

      <div className="chatbot-ticket-draft-body">
        <div className="chatbot-ticket-draft-grid">
          <label className="chatbot-ticket-draft-field">
            <span>{labels.title}</span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className="chatbot-ticket-input"
              placeholder={labels.titlePlaceholder}
              disabled={isSubmitting}
            />
          </label>

          <label className="chatbot-ticket-draft-field">
            <span>{labels.detectedService}</span>
            <input
              list="chatbot-service-catalog"
              value={draft.detectedService}
              onChange={(event) => onChange({ ...draft, detectedService: event.target.value })}
              className="chatbot-ticket-input"
              placeholder={labels.servicePlaceholder}
              disabled={isSubmitting}
            />
            <datalist id="chatbot-service-catalog">
              {availableServices.map((service) => (
                <option key={service.id} value={service.name} />
              ))}
            </datalist>
          </label>

          <label className="chatbot-ticket-draft-field">
            <span>{labels.summary}</span>
            <textarea
              value={draft.summary}
              onChange={(event) => onChange({ ...draft, summary: event.target.value })}
              className="chatbot-ticket-textarea"
              rows={3}
              placeholder={labels.summaryPlaceholder}
              disabled={isSubmitting}
            />
          </label>

          <label className="chatbot-ticket-draft-field">
            <span>{labels.impact}</span>
            <textarea
              value={draft.impact}
              onChange={(event) => onChange({ ...draft, impact: event.target.value })}
              className="chatbot-ticket-textarea"
              rows={3}
              placeholder={labels.impactPlaceholder}
              disabled={isSubmitting}
            />
          </label>

          <label className="chatbot-ticket-draft-field">
            <span>{labels.probableCause}</span>
            <textarea
              value={draft.probableCause}
              onChange={(event) => onChange({ ...draft, probableCause: event.target.value })}
              className="chatbot-ticket-textarea"
              rows={3}
              placeholder={labels.probableCausePlaceholder}
              disabled={isSubmitting}
            />
          </label>
        </div>

        {draft.nextAction && (
          <p className="chatbot-ticket-draft-warning">
            {labels.nextAction}: {draft.nextAction}
          </p>
        )}
        {draft.clarificationNeeded && draft.missingInformation.length > 0 && (
          <p className="chatbot-ticket-draft-warning">
            {labels.infoToConfirm}: {draft.missingInformation.join(", ")}
          </p>
        )}
        {draft.caution && <p className="chatbot-ticket-draft-warning">{draft.caution}</p>}
        {submitBlockedReason && (
          <p className="chatbot-ticket-draft-warning">{submitBlockedReason}</p>
        )}
        {feedbackMessage && <p className="chatbot-ticket-draft-feedback">{feedbackMessage}</p>}
      </div>

      <div className="chatbot-ticket-draft-actions">
        <button
          type="button"
          className="chatbot-ticket-draft-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {labels.cancel}
        </button>
        <button
          type="button"
          className="chatbot-ticket-draft-confirm"
          onClick={onConfirm}
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? labels.creating : labels.confirm}
        </button>
      </div>
    </section>
  );
};

export default ChatbotTicketDraftPanel;
