import { useEffect, useMemo, useRef, useState } from "react";
import chatbotService from "../../api/chatbotService";
import { getErrorMessage, isNetworkError } from "../../api/client";
import { ChatAttachment, ChatMessageModel } from "../../types/chatbot";
import { chatbotHistoryStore } from "./chatbotHistoryStore";
import { localOnlyImageAnalysisGateway } from "./chatbotImageAnalysisGateway";
import { resolveLocalAssistantReplyForLanguage } from "./chatbotConversation";
import { ChatLanguage, detectPreferredChatLanguage, resolveChatLanguage } from "./chatbotLanguage";
import {
  createAssistantAttachmentContextMessageForLanguage,
  createAssistantMessage,
  createAssistantMessageFromResponse,
  createAttachmentOnlyUserMessage,
  createLoadingMessage,
  hasExploitableBusinessPayload,
  resolveAssistantUnavailableMessage,
  createUserMessage,
  createWelcomeMessage,
} from "./chatbotMessageFactory";

interface SendMessageOptions {
  appendUserMessage: boolean;
  attachments?: ChatAttachment[];
}

type ChatbotUiAlertTone = "warning" | "error";

const RETRY_OPTIONS: SendMessageOptions = { appendUserMessage: false };
const DEFAULT_SEND_OPTIONS: SendMessageOptions = { appendUserMessage: true };

const PARTIAL_RESPONSE_WARNING_MESSAGE =
  "Analyse partielle disponible. Certains composants IA sont temporairement indisponibles.";

const GENERIC_PROCESSING_ERROR_MESSAGE =
  "L'analyse IA a rencontre un probleme de format. Reformulez votre demande puis reessayez.";

const isRetryableFailure = (error: unknown, normalizedMessage: string): boolean => {
  if (isNetworkError(error)) {
    return true;
  }

  return /indisponible|reseau|connexion|serveur|expir|timeout|temporair/i.test(
    normalizedMessage,
  );
};

const buildMassiveCandidateFingerprint = (message: ChatMessageModel | undefined): string | null => {
  const candidate = message?.massiveIncidentCandidate;
  if (!candidate) {
    return null;
  }

  return [
    candidate.detectedService,
    candidate.likelyIncidentTitle,
    candidate.clusterStart,
    candidate.clusterEnd,
  ]
    .map((item) => (item || "").trim().toLowerCase())
    .join("|");
};

const removeConsecutiveMassiveIncidentDuplicate = (
  previousMessages: ChatMessageModel[],
  nextMessage: ChatMessageModel,
): ChatMessageModel => {
  const previousAssistantMessage = [...previousMessages]
    .reverse()
    .find((item) => item.role === "assistant" && !item.isLoading && !item.isError);

  const previousFingerprint = buildMassiveCandidateFingerprint(previousAssistantMessage);
  const nextFingerprint = buildMassiveCandidateFingerprint(nextMessage);

  if (!previousFingerprint || !nextFingerprint || previousFingerprint !== nextFingerprint) {
    return nextMessage;
  }

  return {
    ...nextMessage,
    massiveIncidentCandidate: null,
  };
};

export interface UseChatbotConversationResult {
  messages: ChatMessageModel[];
  isLoading: boolean;
  errorMessage: string | null;
  errorTone: ChatbotUiAlertTone | null;
  canRetryLastMessage: boolean;
  technicalMessage: string | null;
  isWelcomeState: boolean;
  currentLanguage: ChatLanguage;
  loadingMessage: ChatMessageModel;
  sendMessage: (question: string, attachments?: ChatAttachment[]) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  resetConversation: () => void;
}

const resolveConversationLanguage = (
  messages: ChatMessageModel[],
  fallback: ChatLanguage,
): ChatLanguage => {
  const lastLocalizedMessage = [...messages]
    .reverse()
    .find((message) => message.responseLanguage === "fr" || message.responseLanguage === "en");

  if (lastLocalizedMessage?.responseLanguage) {
    return resolveChatLanguage(lastLocalizedMessage.responseLanguage, fallback);
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (lastUserMessage?.content) {
    return detectPreferredChatLanguage(lastUserMessage.content, fallback);
  }

  return fallback;
};

export const useChatbotConversation = (
  userId: string | null,
  initialLanguage: ChatLanguage = "fr",
): UseChatbotConversationResult => {
  const [historyReady, setHistoryReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTone, setErrorTone] = useState<ChatbotUiAlertTone | null>(null);
  const [canRetryLastMessage, setCanRetryLastMessage] = useState(false);
  const [technicalMessage, setTechnicalMessage] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<ChatLanguage>(initialLanguage);
  const [messages, setMessages] = useState<ChatMessageModel[]>([
    createWelcomeMessage(initialLanguage),
  ]);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setCurrentLanguage(initialLanguage);
      setMessages([createWelcomeMessage(initialLanguage)]);
      setHistoryReady(false);
      return;
    }

    const storedHistory = chatbotHistoryStore.load(userId);
    const resolvedLanguage = resolveConversationLanguage(storedHistory, initialLanguage);
    setCurrentLanguage(resolvedLanguage);
    setMessages(
      storedHistory.length > 0 ? storedHistory : [createWelcomeMessage(resolvedLanguage)],
    );
    setHistoryReady(true);
  }, [initialLanguage, userId]);

  useEffect(() => {
    if (!userId || !historyReady) {
      return;
    }

    chatbotHistoryStore.save(userId, messages);
  }, [historyReady, messages, userId]);

  const loadingMessage = useMemo(() => createLoadingMessage(currentLanguage), [currentLanguage]);
  const isWelcomeState = messages.length === 1 && messages[0]?.id === "welcome";

  const resetConversation = () => {
    requestVersionRef.current += 1;
    setMessages([createWelcomeMessage(currentLanguage)]);
    setIsLoading(false);
    setErrorMessage(null);
    setErrorTone(null);
    setCanRetryLastMessage(false);
    setTechnicalMessage(null);
    setLastQuestion(null);

    if (userId) {
      chatbotHistoryStore.clear(userId);
    }
  };

  const submitQuestion = async (question: string, options: SendMessageOptions): Promise<void> => {
    const normalizedQuestion = question.trim();
    const attachments = options.attachments ?? [];
    const hasAttachments = attachments.length > 0;
    const responseLanguage = normalizedQuestion
      ? detectPreferredChatLanguage(normalizedQuestion, currentLanguage)
      : currentLanguage;

    setErrorMessage(null);
    setErrorTone(null);
    setCanRetryLastMessage(false);
    setTechnicalMessage(null);
    setLastQuestion(normalizedQuestion || null);
    setCurrentLanguage(responseLanguage);

    if (options.appendUserMessage) {
      setMessages((previousMessages) => {
        const nextMessages =
          previousMessages[0]?.id === "welcome"
            ? [createWelcomeMessage(responseLanguage), ...previousMessages.slice(1)]
            : previousMessages;

        if (hasAttachments && !normalizedQuestion) {
          return [...nextMessages, createAttachmentOnlyUserMessage(attachments, responseLanguage)];
        }

        return [
          ...nextMessages,
          createUserMessage(normalizedQuestion || question, attachments, responseLanguage),
        ];
      });
    } else {
      setMessages((previousMessages) => {
        const lastMessage = previousMessages[previousMessages.length - 1];
        if (lastMessage?.isError) {
          return previousMessages.slice(0, -1);
        }
        return previousMessages;
      });
    }

    if (hasAttachments && !normalizedQuestion) {
      await Promise.all(attachments.map(localOnlyImageAnalysisGateway.analyzeAttachedContext));
      setMessages((previousMessages) => [
        ...previousMessages,
        createAssistantAttachmentContextMessageForLanguage(responseLanguage),
      ]);
      return;
    }

    const localReply = resolveLocalAssistantReplyForLanguage(normalizedQuestion, responseLanguage);
    if (localReply) {
      setMessages((previousMessages) => [
        ...previousMessages,
        createAssistantMessage(localReply, responseLanguage),
      ]);
      return;
    }

    setIsLoading(true);
    const requestVersion = ++requestVersionRef.current;

    try {
      const response = await chatbotService.ask(normalizedQuestion, responseLanguage);

      if (requestVersion !== requestVersionRef.current) {
        return;
      }

      const resolvedResponseLanguage = resolveChatLanguage(
        response.responseLanguage,
        responseLanguage,
      );
      setCurrentLanguage(resolvedResponseLanguage);

      const hasUsefulPayload = hasExploitableBusinessPayload(response);

      if (response.available === false) {
        setCanRetryLastMessage(true);
        setTechnicalMessage((response.message || response.answer || "").trim() || null);

        if (hasUsefulPayload) {
          setErrorMessage(PARTIAL_RESPONSE_WARNING_MESSAGE);
          setErrorTone("warning");
        } else {
          setErrorMessage(resolveAssistantUnavailableMessage("fr"));
          setErrorTone("error");
        }
      }

      const shouldAppendAssistantMessage = !(
        response.available === false && !hasUsefulPayload
      );

      if (shouldAppendAssistantMessage) {
        setMessages((previousMessages) => [
          ...previousMessages,
          removeConsecutiveMassiveIncidentDuplicate(
            previousMessages,
            createAssistantMessageFromResponse(response, resolvedResponseLanguage),
          ),
        ]);
      }
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) {
        return;
      }

      const handledError = getErrorMessage(error);
      const retryableFailure = isRetryableFailure(error, handledError);
      const userFacingMessage = retryableFailure
        ? resolveAssistantUnavailableMessage("fr")
        : GENERIC_PROCESSING_ERROR_MESSAGE;

      setErrorMessage(userFacingMessage);
      setErrorTone("error");
      setCanRetryLastMessage(retryableFailure);
      setTechnicalMessage(handledError);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setIsLoading(false);
      }
    }
  };

  return {
    messages,
    isLoading,
    errorMessage,
    errorTone,
    canRetryLastMessage,
    technicalMessage,
    isWelcomeState,
    currentLanguage,
    loadingMessage,
    sendMessage: (question: string, attachments?: ChatAttachment[]) =>
      submitQuestion(question, { ...DEFAULT_SEND_OPTIONS, attachments }),
    retryLastMessage: async () => {
      if (!lastQuestion || isLoading) {
        return;
      }
      await submitQuestion(lastQuestion, RETRY_OPTIONS);
    },
    resetConversation,
  };
};
