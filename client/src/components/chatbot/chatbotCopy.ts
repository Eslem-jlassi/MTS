import { ChatLanguage } from "./chatbotLanguage";

export interface ChatbotCopy {
  title: string;
  subtitle: string;
  introTitle: string;
  introSubtitle: string;
  welcomeMessage: string;
  loadingLabel: string;
  statusAnalyzingLabel: string;
  inputPlaceholder: string;
  connectionIssueLabel: string;
  retryLabel: string;
  clearConversationLabel: string;
  clearConversationConfirm: string;
  cancelLabel: string;
  clearLabel: string;
  attachImageLabel: string;
  attachedContextLabel: string;
  invalidImageTypeLabel: string;
  imageReadErrorLabel: string;
  imageContextUserMessage: string;
  imageContextAssistantMessage: string;
  lowConfidenceHint: string;
  openLabel: string;
  closeLabel: string;
  minimizeLabel: string;
  removeAttachmentLabel: string;
  sendMessageLabel: string;
  introSectionLabel: string;
  quickPromptsAriaLabel: string;
  typingAriaLabel: string;
  draftFeedbackSuccessPrefix: string;
  draftFeedbackErrorPrefix: string;
  draftMissingDiagnostic: string;
  draftMissingService: string;
  draftMissingRequiredFields: string;
  draftInvalidService: string;
  draftNoActiveDraft: string;
  checkSimilarIncidentsPrompt: string;
  checkSimilarIncidentsWithRefsPrompt: string;
  checkSlaPrompt: string;
  consultDetectedServicePrompt: string;
  consultDetectedServiceMissingPrompt: string;
  rephraseDiagnosticPrompt: string;
  rephraseDiagnosticWithContextPrompt: string;
  prepareGlobalTicketUnavailable: string;
}

const CHATBOT_COPY_BY_LANGUAGE: Record<ChatLanguage, ChatbotCopy> = {
  fr: {
    title: "Assistant IA Telecom",
    subtitle: "Analyse incidents, tickets et risques SLA",
    introTitle: "Assistant IA Telecom",
    introSubtitle: "Support intelligent pour la supervision operateur",
    welcomeMessage:
      "Bonjour, je suis votre assistant IA Telecom. Je peux vous aider a analyser un incident, retrouver des tickets similaires, verifier un risque SLA et preparer un brouillon de ticket valide humainement. Decrivez simplement votre probleme.",
    loadingLabel: "Analyse des incidents telecom en cours...",
    statusAnalyzingLabel: "Analyse en cours...",
    inputPlaceholder: "Decrivez un incident, un ticket, un service ou un risque SLA...",
    connectionIssueLabel: "Probleme de connexion",
    retryLabel: "Reessayer",
    clearConversationLabel: "Effacer la conversation",
    clearConversationConfirm:
      "Cette action supprimera definitivement les messages de cette session pour votre compte. Voulez-vous continuer ?",
    cancelLabel: "Annuler",
    clearLabel: "Effacer",
    attachImageLabel: "Joindre une capture",
    attachedContextLabel: "Contexte joint",
    invalidImageTypeLabel: "Format invalide. Utilisez PNG ou JPG/JPEG.",
    imageReadErrorLabel: "Impossible de lire cette image. Veuillez reessayer.",
    imageContextUserMessage: "Capture d'ecran jointe pour contexte.",
    imageContextAssistantMessage:
      "Capture bien recue comme contexte joint. Decrivez le symptome telecom pour que je lance l'analyse textuelle.",
    lowConfidenceHint:
      "Le niveau de confiance reste insuffisant pour un diagnostic ferme. Precisez le service concerne, les symptomes observes, le debut du probleme et l'impact utilisateur.",
    openLabel: "Ouvrir le chatbot",
    closeLabel: "Fermer le chatbot",
    minimizeLabel: "Reduire le chatbot",
    removeAttachmentLabel: "Retirer la capture",
    sendMessageLabel: "Envoyer le message",
    introSectionLabel: "Introduction assistant",
    quickPromptsAriaLabel: "Suggestions rapides du chatbot",
    typingAriaLabel: "Assistant en train d'ecrire",
    draftFeedbackSuccessPrefix: "Brouillon valide. Ticket cree",
    draftFeedbackErrorPrefix: "Echec de creation du ticket",
    draftMissingDiagnostic:
      "Impossible d'ouvrir un brouillon de ticket : aucun diagnostic exploitable n'est disponible dans cette conversation.",
    draftMissingService:
      "Selectionnez un service existant du catalogue avant validation du brouillon.",
    draftMissingRequiredFields: "Renseignez au minimum le titre et le resume avant validation.",
    draftInvalidService:
      "Creation impossible : service manquant ou non reconnu dans le catalogue. Verifiez le brouillon.",
    draftNoActiveDraft: "Aucun brouillon actif a confirmer.",
    checkSimilarIncidentsPrompt: "Analyse les incidents et tickets similaires",
    checkSimilarIncidentsWithRefsPrompt: "References proches",
    checkSlaPrompt:
      "Donne une evaluation orientee SLA : impact, urgence, delai restant et actions prioritaires.",
    consultDetectedServicePrompt:
      "Consulte le contexte du service {service} : etat, incidents recents correles et composant potentiellement en defaut.",
    consultDetectedServiceMissingPrompt:
      "Je n'ai pas encore de service detecte suffisamment fiable. Aide-moi a identifier le service impacte a partir du dernier incident.",
    rephraseDiagnosticPrompt:
      "Reformule le diagnostic en francais simple et precise les informations manquantes si le niveau de confiance reste prudent.",
    rephraseDiagnosticWithContextPrompt: "Demande initiale utilisateur",
    prepareGlobalTicketUnavailable:
      "Impossible de preparer un ticket global : aucun candidat incident massif n'est disponible.",
  },
  en: {
    title: "Telecom AI Assistant",
    subtitle: "Analyze incidents, tickets and SLA risk",
    introTitle: "Telecom AI Assistant",
    introSubtitle: "Smart support for telecom service supervision",
    welcomeMessage:
      "Hello, I am your Telecom AI Assistant. I can help you analyze an incident, find similar tickets, assess SLA risk and prepare a human-validated ticket draft. Just describe the issue.",
    loadingLabel: "Analyzing telecom incidents...",
    statusAnalyzingLabel: "Analysis in progress...",
    inputPlaceholder: "Describe an incident, ticket, service issue or SLA risk...",
    connectionIssueLabel: "Connection issue",
    retryLabel: "Retry",
    clearConversationLabel: "Clear conversation",
    clearConversationConfirm:
      "This action permanently removes the messages from this session for your account. Do you want to continue?",
    cancelLabel: "Cancel",
    clearLabel: "Clear",
    attachImageLabel: "Attach screenshot",
    attachedContextLabel: "Attached context",
    invalidImageTypeLabel: "Invalid format. Please use PNG or JPG/JPEG.",
    imageReadErrorLabel: "Unable to read this image. Please try again.",
    imageContextUserMessage: "Screenshot attached for context.",
    imageContextAssistantMessage:
      "Screenshot received as context. Describe the telecom symptom so I can start the text analysis.",
    lowConfidenceHint:
      "The confidence level is still too low for a firm diagnosis. Please specify the impacted service, the observed symptoms, when the issue started and the user impact.",
    openLabel: "Open chatbot",
    closeLabel: "Close chatbot",
    minimizeLabel: "Minimize chatbot",
    removeAttachmentLabel: "Remove screenshot",
    sendMessageLabel: "Send message",
    introSectionLabel: "Assistant introduction",
    quickPromptsAriaLabel: "Chatbot quick prompts",
    typingAriaLabel: "Assistant is typing",
    draftFeedbackSuccessPrefix: "Draft validated. Ticket created",
    draftFeedbackErrorPrefix: "Ticket creation failed",
    draftMissingDiagnostic:
      "Unable to open a ticket draft: no actionable diagnosis is available in this conversation.",
    draftMissingService: "Select an existing catalog service before validating the draft.",
    draftMissingRequiredFields: "Please provide at least the title and summary before validation.",
    draftInvalidService:
      "Creation failed: missing service or service not recognized in the catalog. Review the draft.",
    draftNoActiveDraft: "No active draft to confirm.",
    checkSimilarIncidentsPrompt: "Analyze similar incidents and tickets",
    checkSimilarIncidentsWithRefsPrompt: "Closest references",
    checkSlaPrompt:
      "Give me an SLA-oriented assessment: impact, urgency, remaining time and priority actions.",
    consultDetectedServicePrompt:
      "Review the context for service {service}: current state, recent correlated incidents and the most likely failing component.",
    consultDetectedServiceMissingPrompt:
      "I do not have a reliable detected service yet. Help me identify the impacted service from the latest incident.",
    rephraseDiagnosticPrompt:
      "Rephrase the diagnosis in clear English and list the missing information if the confidence level remains cautious.",
    rephraseDiagnosticWithContextPrompt: "Initial user request",
    prepareGlobalTicketUnavailable:
      "Unable to prepare a global ticket: no widespread incident candidate is available.",
  },
};

export const getChatbotCopy = (language: ChatLanguage = "fr"): ChatbotCopy =>
  CHATBOT_COPY_BY_LANGUAGE[language] || CHATBOT_COPY_BY_LANGUAGE.fr;

export const CHATBOT_COPY = getChatbotCopy("fr");
