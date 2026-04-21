import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, MessageSquare, Minimize2, RefreshCw, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { getErrorMessage, telecomServiceService } from "../../api";
import { authStorage } from "../../api/authStorage";
import { TicketCategory, UserResponse, UserRole } from "../../types";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import ChatbotPromptChips from "./ChatbotPromptChips";
import ChatbotTicketDraftPanel from "./ChatbotTicketDraftPanel";
import {
  buildDraftFromAssistantMessage,
  buildDraftFromMassiveIncidentCandidate,
  ChatbotTicketDraft,
  isCreateTicketIntent,
  mapConfidenceToPriority,
} from "./chatbotTicketDraft";
import { defaultChatbotTicketDraftGateway } from "./chatbotTicketDraftGateway";
import { resolveChatbotServiceMatch } from "./chatbotServiceResolver";
import { getChatbotCopy } from "./chatbotCopy";
import { getTelecomQuickPrompts } from "./chatbotPrompts";
import { ChatbotSuggestedAction } from "./chatbotSuggestedActionsResolver";
import { useChatbotConversation } from "./useChatbotConversation";
import { resolveChatLanguage } from "./chatbotLanguage";
import ChatbotMascot from "./ChatbotMascot";
import "./ChatbotStyles.css";

const ChatbotWidgetContent: React.FC<{ authUser: UserResponse }> = ({ authUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftTicket, setDraftTicket] = useState<ChatbotTicketDraft | null>(null);
  const [activeServices, setActiveServices] = useState<Array<{ id: number; name: string }>>([]);
  const [isDraftSubmitting, setIsDraftSubmitting] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const initialLanguage = resolveChatLanguage(authUser.preferredLanguage, "fr");
  const mascotImageUrl = process.env.REACT_APP_CHATBOT_MASCOT_URL || "";

  const authenticatedUserId =
    authUser?.id !== undefined && authUser?.id !== null
      ? String(authUser.id)
      : authStorage.getStoredUserId();

  const {
    messages,
    isLoading,
    errorMessage,
    errorTone,
    canRetryLastMessage,
    isWelcomeState,
    currentLanguage,
    loadingMessage,
    sendMessage,
    retryLastMessage,
    resetConversation,
  } = useChatbotConversation(authenticatedUserId, initialLanguage);

  const copy = getChatbotCopy(currentLanguage);
  const quickPrompts = getTelecomQuickPrompts(currentLanguage);

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      try {
        const services = await telecomServiceService.getActiveServices();
        if (!cancelled) {
          setActiveServices(
            services.map((item) => ({
              id: item.id,
              name: item.name,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setActiveServices([]);
        }
      }
    };

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [isLoading, messages]);

  const handleClearConversation = () => {
    resetConversation();
    setDraftTicket(null);
    setDraftFeedback(null);
    setIsDraftSubmitting(false);
  };

  const latestAssistantMessage = [...messages]
    .reverse()
    .find(
      (item) =>
        item.role === "assistant" && !item.isLoading && !item.isError && item.id !== "welcome",
    );

  const latestUserMessage = [...messages].reverse().find((item) => item.role === "user");

  const lastKnownService =
    latestAssistantMessage?.serviceDetected && latestAssistantMessage.serviceDetected !== "N/A"
      ? latestAssistantMessage.serviceDetected
      : null;

  const topResultTitles = (latestAssistantMessage?.results || [])
    .slice(0, 3)
    .map((item) => item.title)
    .filter((title) => Boolean(title));

  const openTicketDraft = () => {
    if (!latestAssistantMessage) {
      setDraftFeedback(copy.draftMissingDiagnostic);
      setDraftTicket(null);
      return;
    }

    setDraftTicket(buildDraftFromAssistantMessage(latestAssistantMessage));
    setDraftFeedback(null);
  };

  const handlePromptSelection = (promptMessage: string) => {
    if (isCreateTicketIntent(promptMessage)) {
      openTicketDraft();
      return;
    }

    sendMessage(promptMessage);
  };

  const handleSuggestedAction = (action: ChatbotSuggestedAction) => {
    if (action.id === "prepare-global-ticket") {
      const globalDraft = buildDraftFromMassiveIncidentCandidate(latestAssistantMessage);
      if (!globalDraft) {
        setDraftFeedback(copy.prepareGlobalTicketUnavailable);
        return;
      }

      setDraftTicket(globalDraft);
      setDraftFeedback(null);
      return;
    }

    if (isCreateTicketIntent(action.message)) {
      openTicketDraft();
      return;
    }

    if (action.id === "check-similar-incidents") {
      const reference =
        topResultTitles.length > 0
          ? currentLanguage === "en"
            ? ` ${copy.checkSimilarIncidentsWithRefsPrompt}: ${topResultTitles.join(" | ")}.`
            : ` ${copy.checkSimilarIncidentsWithRefsPrompt} : ${topResultTitles.join(" | ")}.`
          : "";
      const service = lastKnownService
        ? currentLanguage === "en"
          ? ` for service ${lastKnownService}`
          : ` pour le service ${lastKnownService}`
        : "";
      sendMessage(`${copy.checkSimilarIncidentsPrompt}${service}.${reference}`);
      return;
    }

    if (action.id === "check-sla") {
      const service =
        lastKnownService && currentLanguage === "en"
          ? `Service: ${lastKnownService}. `
          : lastKnownService
            ? `Service : ${lastKnownService}. `
            : "";
      const confidence = latestAssistantMessage?.confidence
        ? currentLanguage === "en"
          ? `Current confidence: ${latestAssistantMessage.confidence}. `
          : `Confiance actuelle : ${latestAssistantMessage.confidence}. `
        : "";
      sendMessage(`${service}${confidence}${copy.checkSlaPrompt}`);
      return;
    }

    if (action.id === "consult-detected-service") {
      if (!lastKnownService) {
        sendMessage(copy.consultDetectedServiceMissingPrompt);
        return;
      }

      sendMessage(copy.consultDetectedServicePrompt.replace("{service}", lastKnownService));
      return;
    }

    if (action.id === "rephrase-request") {
      const userContext = latestUserMessage?.content
        ? `${copy.rephraseDiagnosticWithContextPrompt}: ${latestUserMessage.content}. `
        : "";

      sendMessage(`${userContext}${copy.rephraseDiagnosticPrompt}`);
      return;
    }

    sendMessage(action.message);
  };

  const matchedService = resolveChatbotServiceMatch(draftTicket?.detectedService, activeServices);
  const matchedServiceId = matchedService?.id ?? null;

  const draftBlockedReason = (() => {
    if (!draftTicket) {
      return null;
    }

    if (!matchedServiceId || matchedServiceId < 0) {
      return copy.draftMissingService;
    }

    if (!draftTicket.title.trim() || !draftTicket.summary.trim()) {
      return copy.draftMissingRequiredFields;
    }

    return null;
  })();

  const handleConfirmDraftTicket = async () => {
    if (!draftTicket) {
      setDraftFeedback(copy.draftNoActiveDraft);
      return;
    }

    if (draftBlockedReason) {
      setDraftFeedback(draftBlockedReason);
      return;
    }

    if (!matchedServiceId || matchedServiceId < 0) {
      setDraftFeedback(copy.draftInvalidService);
      return;
    }

    const description = [
      draftTicket.summary.trim(),
      "",
      currentLanguage === "en"
        ? "AI prefilled content manually validated by the user"
        : "Pre-remplissage IA valide manuellement par l'utilisateur",
      draftTicket.impact.trim()
        ? currentLanguage === "en"
          ? `Estimated impact (AI): ${draftTicket.impact.trim()}`
          : `Impact estime (IA) : ${draftTicket.impact.trim()}`
        : currentLanguage === "en"
          ? "Estimated impact (AI): To be confirmed"
          : "Impact estime (IA) : A confirmer",
      draftTicket.probableCause.trim()
        ? currentLanguage === "en"
          ? `Probable cause (AI): ${draftTicket.probableCause.trim()}`
          : `Cause probable (IA) : ${draftTicket.probableCause.trim()}`
        : currentLanguage === "en"
          ? "Probable cause (AI): Not specified"
          : "Cause probable (IA) : Non precisee",
      draftTicket.nextAction.trim()
        ? currentLanguage === "en"
          ? `Suggested next action (AI): ${draftTicket.nextAction.trim()}`
          : `Action suivante suggeree (IA) : ${draftTicket.nextAction.trim()}`
        : null,
      draftTicket.caution
        ? currentLanguage === "en"
          ? `Caution note (AI): ${draftTicket.caution}`
          : `Note de prudence (IA) : ${draftTicket.caution}`
        : null,
      draftTicket.missingInformation.length > 0
        ? currentLanguage === "en"
          ? `Information to confirm: ${draftTicket.missingInformation.join(", ")}`
          : `Informations a confirmer : ${draftTicket.missingInformation.join(", ")}`
        : null,
      currentLanguage === "en"
        ? `Detected service: ${draftTicket.detectedService.trim() || "N/A"}`
        : `Service detecte : ${draftTicket.detectedService.trim() || "N/A"}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");

    setIsDraftSubmitting(true);
    setDraftFeedback(null);

    try {
      const createdTicket = await defaultChatbotTicketDraftGateway.createDraftTicket({
        title: draftTicket.title.trim(),
        description,
        priority: mapConfidenceToPriority(latestAssistantMessage?.confidence),
        category: TicketCategory.PANNE,
        serviceId: matchedServiceId,
      });

      setDraftFeedback(`${copy.draftFeedbackSuccessPrefix}: ${createdTicket.ticketNumber}.`);
      setDraftTicket(null);
    } catch (error) {
      setDraftFeedback(`${copy.draftFeedbackErrorPrefix}: ${getErrorMessage(error)}`);
    } finally {
      setIsDraftSubmitting(false);
    }
  };

  return (
    <div className="chatbot-widget-container">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            className="chatbot-panel"
            aria-label={copy.title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <header className="chatbot-header">
              <div className="chatbot-header-left">
                <div className="chatbot-header-icon" aria-hidden>
                  <ChatbotMascot className="chatbot-mascot-sm" imageUrl={mascotImageUrl} />
                </div>
                <div>
                  <p className="chatbot-title">{copy.title}</p>
                  <p className="chatbot-subtitle">{copy.subtitle}</p>
                </div>
              </div>

              {isLoading && (
                <span className="chatbot-status-badge">{copy.statusAnalyzingLabel}</span>
              )}

              <div className="chatbot-header-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label={copy.minimizeLabel}
                  className="chatbot-icon-button"
                >
                  <Minimize2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleClearConversation}
                  aria-label={copy.clearConversationLabel}
                  className="chatbot-icon-button chatbot-icon-button-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </header>

            <div className="chatbot-body" ref={scrollContainerRef}>
              {isWelcomeState && (
                <section className="chatbot-intro-card" aria-label={copy.introSectionLabel}>
                  <div className="chatbot-intro-header">
                    <div className="chatbot-intro-avatar" aria-hidden>
                      <ChatbotMascot className="chatbot-mascot-md" imageUrl={mascotImageUrl} />
                    </div>
                    <div>
                      <p className="chatbot-intro-title">{copy.introTitle}</p>
                      <p className="chatbot-intro-subtitle">{copy.introSubtitle}</p>
                    </div>
                  </div>

                  <p className="chatbot-intro-content">{copy.welcomeMessage}</p>

                  <ChatbotPromptChips
                    prompts={quickPrompts}
                    onSelectPrompt={handlePromptSelection}
                    disabled={isLoading}
                    language={currentLanguage}
                  />
                </section>
              )}

              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onSelectSuggestedAction={handleSuggestedAction}
                  disableSuggestedActions={isLoading}
                />
              ))}
              {isLoading && (
                <ChatMessage
                  message={loadingMessage}
                  onSelectSuggestedAction={handleSuggestedAction}
                  disableSuggestedActions={isLoading}
                />
              )}
            </div>

            <footer className="chatbot-footer">
              {draftTicket && (
                <ChatbotTicketDraftPanel
                  draft={draftTicket}
                  availableServices={activeServices}
                  onChange={setDraftTicket}
                  onCancel={() => setDraftTicket(null)}
                  onConfirm={handleConfirmDraftTicket}
                  isSubmitting={isDraftSubmitting}
                  canSubmit={!draftBlockedReason}
                  submitBlockedReason={draftBlockedReason}
                  feedbackMessage={draftFeedback}
                  language={currentLanguage}
                />
              )}

              {!draftTicket && draftFeedback && (
                <p className="chatbot-ticket-draft-feedback">{draftFeedback}</p>
              )}

              {errorMessage && (
                <div
                  className={`chatbot-error-banner ${errorTone === "warning" ? "chatbot-warning-banner" : ""}`}
                  role="alert"
                >
                  <div className="chatbot-error-banner-content">
                    <AlertTriangle size={14} className="chatbot-error-icon" />
                    <span className="chatbot-error-text">
                      {errorMessage}
                    </span>
                  </div>
                  {canRetryLastMessage && (
                    <button
                      type="button"
                      className="chatbot-retry-button"
                      onClick={retryLastMessage}
                      disabled={isLoading}
                    >
                      <RefreshCw size={13} />
                      Reessayer
                    </button>
                  )}
                </div>
              )}
              <ChatInput onSend={sendMessage} disabled={isLoading} language={currentLanguage} />
            </footer>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="chatbot-floating-button"
        onClick={() => setIsOpen((previousState) => !previousState)}
        aria-label={isOpen ? copy.closeLabel : copy.openLabel}
        whileHover={{ y: -6, scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="chatbot-floating-button-glow" aria-hidden />
        <span
          className="chatbot-floating-button-orbit chatbot-floating-button-orbit-one"
          aria-hidden
        />
        <span
          className="chatbot-floating-button-orbit chatbot-floating-button-orbit-two"
          aria-hidden
        />
        <span className="chatbot-floating-button-core">
          {isOpen ? (
            <X size={20} />
          ) : (
            <ChatbotMascot className="chatbot-mascot-button" imageUrl={mascotImageUrl} />
          )}
        </span>
        {!isOpen && (
          <span className="chatbot-floating-button-badge">
            <MessageSquare size={12} />
          </span>
        )}
      </motion.button>
    </div>
  );
};

const ChatbotWidget: React.FC = () => {
  const authUser = useSelector((state: RootState) => state.auth.user);

  if (!authUser || authUser.role !== UserRole.CLIENT) {
    return null;
  }

  return <ChatbotWidgetContent authUser={authUser} />;
};

export default ChatbotWidget;
