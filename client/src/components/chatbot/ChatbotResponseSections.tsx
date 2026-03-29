import React from "react";
import { ChatMessageModel } from "../../types/chatbot";
import ChatbotSuggestedActions from "./chatbotSuggestedActions";
import { buildAnswerSections } from "./chatbotAnswerQuality";
import { ChatbotSuggestedAction, resolveSuggestedActions } from "./chatbotSuggestedActionsResolver";
import { ChatLanguage, resolveChatLanguage } from "./chatbotLanguage";

interface ChatbotResponseSectionsProps {
  message: ChatMessageModel;
  onSelectAction?: (action: ChatbotSuggestedAction) => void;
  disableActions?: boolean;
}

const CONFIDENCE_LABELS: Record<ChatLanguage, Record<string, string>> = {
  fr: {
    high: "Confiance elevee",
    medium: "Confiance moyenne",
    low: "Confiance faible",
  },
  en: {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  },
};

const UI_LABELS: Record<
  ChatLanguage,
  {
    summary: string;
    probableCause: string;
    knownResolution: string;
    workaround: string;
    impact: string;
    nextAction: string;
    infoToConfirm: string;
    caution: string;
    detectedService: string;
    serviceDetectionReliability: string;
    confidenceLevel: string;
    similarCases: string;
    found: string;
    massiveIncidentCandidate: string;
    service: string;
    candidate: string;
    why: string;
    recommendation: string;
    clusterSize: string;
    timeWindow: string;
    noValue: string;
    unspecifiedConfidence: string;
    unspecifiedReliability: string;
  }
> = {
  fr: {
    summary: "Resume",
    probableCause: "Cause probable",
    knownResolution: "Resolution connue",
    workaround: "Contournement",
    impact: "Impact",
    nextAction: "Action suivante",
    infoToConfirm: "Informations a confirmer",
    caution: "Prudence",
    detectedService: "Service detecte",
    serviceDetectionReliability: "Fiabilite detection service",
    confidenceLevel: "Niveau de confiance",
    similarCases: "Incidents ou tickets similaires",
    found: "trouves",
    massiveIncidentCandidate: "Candidat incident massif",
    service: "Service",
    candidate: "Candidat",
    why: "Pourquoi",
    recommendation: "Recommandation",
    clusterSize: "Taille cluster",
    timeWindow: "Fenetre",
    noValue: "N/A",
    unspecifiedConfidence: "Confiance non precisee",
    unspecifiedReliability: "Fiabilite non precisee",
  },
  en: {
    summary: "Summary",
    probableCause: "Probable cause",
    knownResolution: "Known resolution",
    workaround: "Workaround",
    impact: "Impact",
    nextAction: "Next action",
    infoToConfirm: "Information to confirm",
    caution: "Caution",
    detectedService: "Detected service",
    serviceDetectionReliability: "Service detection reliability",
    confidenceLevel: "Confidence level",
    similarCases: "Similar incidents or tickets",
    found: "found",
    massiveIncidentCandidate: "Potential widespread incident",
    service: "Service",
    candidate: "Candidate",
    why: "Why",
    recommendation: "Recommendation",
    clusterSize: "Cluster size",
    timeWindow: "Window",
    noValue: "N/A",
    unspecifiedConfidence: "Confidence not specified",
    unspecifiedReliability: "Reliability not specified",
  },
};

const ChatbotResponseSections: React.FC<ChatbotResponseSectionsProps> = ({
  message,
  onSelectAction,
  disableActions = false,
}) => {
  const language = resolveChatLanguage(message.responseLanguage, "fr");
  const labels = UI_LABELS[language];
  const normalizedConfidence = (message.confidence || "").toLowerCase();
  const confidenceLabel =
    CONFIDENCE_LABELS[language][normalizedConfidence] || labels.unspecifiedConfidence;
  const serviceDetectionConfidenceLabel =
    CONFIDENCE_LABELS[language][(message.serviceDetectionConfidence || "").toLowerCase()] ||
    labels.unspecifiedReliability;
  const hasResults = Array.isArray(message.results) && message.results.length > 0;
  const hasService = Boolean(message.serviceDetected && message.serviceDetected !== "N/A");
  const suggestedActions = resolveSuggestedActions(message);
  const massiveIncidentCandidate = message.massiveIncidentCandidate;
  const hasMassiveIncidentCandidate = Boolean(massiveIncidentCandidate);
  const sections = buildAnswerSections(message.content, language, message.analysis);

  return (
    <div className="chatbot-response-layout">
      <section className="chatbot-response-section chatbot-response-summary">
        <p className="chatbot-section-title">{labels.summary}</p>
        <p className="chatbot-message-content">{sections.summary}</p>
      </section>

      {(sections.probableCause ||
        sections.knownResolution ||
        sections.workaround ||
        sections.impact) && (
        <section className="chatbot-response-section chatbot-response-meta-grid">
          {sections.probableCause && (
            <div className="chatbot-meta-card chatbot-meta-card-service">
              <p className="chatbot-section-title">{labels.probableCause}</p>
              <p className="chatbot-meta-value">{sections.probableCause}</p>
            </div>
          )}

          {sections.knownResolution && (
            <div className="chatbot-meta-card chatbot-meta-card-confidence">
              <p className="chatbot-section-title">{labels.knownResolution}</p>
              <p className="chatbot-meta-value">{sections.knownResolution}</p>
            </div>
          )}

          {sections.workaround && (
            <div className="chatbot-meta-card chatbot-meta-card-service">
              <p className="chatbot-section-title">{labels.workaround}</p>
              <p className="chatbot-meta-value">{sections.workaround}</p>
            </div>
          )}

          {sections.impact && (
            <div className="chatbot-meta-card chatbot-meta-card-confidence">
              <p className="chatbot-section-title">{labels.impact}</p>
              <p className="chatbot-meta-value">{sections.impact}</p>
            </div>
          )}
        </section>
      )}

      {sections.nextActions.length > 0 && (
        <section className="chatbot-response-section chatbot-response-summary">
          <p className="chatbot-section-title">{labels.nextAction}</p>
          <ul className="chatbot-results-list">
            {sections.nextActions.map((item, index) => (
              <li key={`next-action-${index}`} className="chatbot-results-item">
                <div className="chatbot-results-main">
                  <span className="chatbot-doc-title">{item}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.clarificationNeeded && sections.missingInformation.length > 0 && (
        <section className="chatbot-response-section chatbot-response-summary">
          <p className="chatbot-section-title">{labels.infoToConfirm}</p>
          <ul className="chatbot-results-list">
            {sections.missingInformation.map((item) => (
              <li key={item} className="chatbot-results-item">
                <div className="chatbot-results-main">
                  <span className="chatbot-doc-title">{item}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.caution && (
        <section className="chatbot-response-section chatbot-response-summary">
          <p className="chatbot-section-title">{labels.caution}</p>
          <p className="chatbot-message-content">{sections.caution}</p>
        </section>
      )}

      {(hasService || normalizedConfidence) && (
        <section className="chatbot-response-section chatbot-response-meta-grid">
          {hasService && (
            <div className="chatbot-meta-card chatbot-meta-card-service">
              <p className="chatbot-section-title">{labels.detectedService}</p>
              <p className="chatbot-meta-value">{message.serviceDetected}</p>
            </div>
          )}

          {hasService && message.serviceDetectionConfidence && (
            <div className="chatbot-meta-card chatbot-meta-card-confidence">
              <p className="chatbot-section-title">{labels.serviceDetectionReliability}</p>
              <span
                className={`chatbot-chip chatbot-chip-confidence chatbot-conf-${(message.serviceDetectionConfidence || "low").toLowerCase()}`}
              >
                {serviceDetectionConfidenceLabel}
              </span>
            </div>
          )}

          {normalizedConfidence && (
            <div className="chatbot-meta-card chatbot-meta-card-confidence">
              <p className="chatbot-section-title">{labels.confidenceLevel}</p>
              <span
                className={`chatbot-chip chatbot-chip-confidence chatbot-conf-${normalizedConfidence || "low"}`}
              >
                {confidenceLabel}
              </span>
            </div>
          )}
        </section>
      )}

      {hasResults && (
        <section className="chatbot-response-section chatbot-results">
          <div className="chatbot-results-header">
            <p className="chatbot-results-title">{labels.similarCases}</p>
            <span className="chatbot-results-count">
              {message.results?.length} {labels.found}
            </span>
          </div>

          <ul className="chatbot-results-list">
            {message.results?.slice(0, 5).map((item) => (
              <li key={`${item.docId}-${item.title}`} className="chatbot-results-item">
                <div className="chatbot-results-main">
                  <span className="chatbot-doc-type">{item.docType}</span>
                  <span className="chatbot-doc-title">{item.title}</span>
                </div>
                <div className="chatbot-results-sub">
                  <span>{item.serviceName || labels.noValue}</span>
                  <span className="chatbot-score-badge">score {Number(item.score).toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasMassiveIncidentCandidate && massiveIncidentCandidate && (
        <section
          className="chatbot-response-section chatbot-massive-incident-card"
          aria-live="polite"
        >
          <div className="chatbot-massive-incident-header">
            <p className="chatbot-results-title">{labels.massiveIncidentCandidate}</p>
            <span className="chatbot-chip chatbot-chip-confidence chatbot-conf-medium">
              {CONFIDENCE_LABELS[language][
                massiveIncidentCandidate.confidenceLevel.toLowerCase()
              ] || massiveIncidentCandidate.confidenceLevel}{" "}
              ({massiveIncidentCandidate.confidenceScore.toFixed(2)})
            </span>
          </div>

          <p className="chatbot-message-content chatbot-inline-metric">
            <strong className="chatbot-inline-label">{labels.service}:</strong>{" "}
            {massiveIncidentCandidate.detectedService}
          </p>
          <p className="chatbot-message-content chatbot-inline-metric">
            <strong className="chatbot-inline-label">{labels.candidate}:</strong>{" "}
            {massiveIncidentCandidate.likelyIncidentTitle}
          </p>
          <p className="chatbot-message-content chatbot-inline-metric">
            <strong className="chatbot-inline-label">{labels.why}:</strong>{" "}
            {massiveIncidentCandidate.detectionReason}
          </p>
          <p className="chatbot-message-content chatbot-inline-metric">
            <strong className="chatbot-inline-label">{labels.recommendation}:</strong>{" "}
            {massiveIncidentCandidate.recommendation}
          </p>

          <div className="chatbot-massive-incident-meta">
            <span>
              {labels.clusterSize}: {massiveIncidentCandidate.clusterSize}
            </span>
            <span>
              {labels.timeWindow}: {massiveIncidentCandidate.clusterStart}
              {" -> "}
              {massiveIncidentCandidate.clusterEnd}
            </span>
          </div>

          {massiveIncidentCandidate.ticketIds.length > 0 && (
            <ul className="chatbot-massive-incident-tickets">
              {massiveIncidentCandidate.ticketIds.slice(0, 8).map((ticketId) => (
                <li key={ticketId} className="chatbot-massive-incident-ticket-item">
                  #{ticketId}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {onSelectAction && (
        <ChatbotSuggestedActions
          actions={suggestedActions}
          onSelectAction={onSelectAction}
          disabled={disableActions}
          language={language}
        />
      )}
    </div>
  );
};

export default ChatbotResponseSections;
