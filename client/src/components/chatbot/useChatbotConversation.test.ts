import { act, renderHook, waitFor } from "@testing-library/react";
import chatbotService from "../../api/chatbotService";
import { ChatAttachment, ChatbotResponse } from "../../types/chatbot";
import { useChatbotConversation } from "./useChatbotConversation";

jest.mock("../../api/chatbotService", () => ({
  __esModule: true,
  default: {
    ask: jest.fn(),
  },
}));

const askMock = chatbotService.ask as jest.MockedFunction<typeof chatbotService.ask>;

const createDeferred = <T>() => {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason?: unknown) => void = () => undefined;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
};

const buildApiResponse = (): ChatbotResponse => ({
  available: true,
  answer: "Resume : Diagnostic incident BSCS en cours.",
  confidence: "high",
  topScore: 0.91,
  serviceDetected: "BSCS Billing System",
  responseLanguage: "fr",
  analysis: {
    summary: "Diagnostic incident BSCS en cours.",
    impact: "Impact probable sur le service.",
    nextAction: "Verifier les incidents similaires.",
    clarificationNeeded: false,
    missingInformation: [],
  },
  results: [
    {
      docType: "ticket",
      title: "Erreur de rating BSCS",
      serviceName: "BSCS Billing System",
      language: "fr",
      score: 0.91,
      docId: "ticket-123",
    },
  ],
});

const buildMassiveCandidateResponse = (): ChatbotResponse => ({
  ...buildApiResponse(),
  massiveIncidentCandidate: {
    detectedService: "BSCS Billing System",
    likelyIncidentTitle: "Panne massive mediation BSCS",
    clusterSize: 6,
    confidenceLevel: "high",
    confidenceScore: 0.88,
    clusterStart: "2026-03-19T09:00:00",
    clusterEnd: "2026-03-19T10:00:00",
    ticketIds: ["101", "102", "103", "104", "105", "106"],
    detectionReason: "6 tickets similaires detectes en 1h.",
    recommendation: "Preparer un ticket global avant validation.",
  },
});

const buildImageAttachment = (): ChatAttachment => ({
  id: "att-1",
  kind: "image",
  name: "incident.png",
  mimeType: "image/png",
  size: 1024,
  dataUrl: "data:image/png;base64,abc123",
  attachedContext: true,
});

describe("useChatbotConversation persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    askMock.mockReset();
  });

  it("restores stored history for the logged-in user", async () => {
    const storageKey = "mts_chatbot_history_v2_user-1";

    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome",
          timestamp: new Date().toISOString(),
        },
        {
          id: "user-1-msg",
          role: "user",
          content: "Analyse incident VoIP",
          timestamp: new Date().toISOString(),
        },
      ]),
    );

    const { result } = renderHook(() => useChatbotConversation("user-1"));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[1]?.content).toBe("Analyse incident VoIP");
  });

  it("persists new messages and restores them after remount", async () => {
    askMock.mockResolvedValue(buildApiResponse());

    const { result, unmount } = renderHook(() => useChatbotConversation("user-2"));

    await act(async () => {
      await result.current.sendMessage("Analyse incident BSCS avec erreur de rating");
    });

    await waitFor(() => {
      expect(result.current.messages.some((message) => message.role === "user")).toBe(true);
    });
    expect(
      result.current.messages.some((message) => message.role === "assistant" && !message.isLoading),
    ).toBe(true);

    const storageKey = "mts_chatbot_history_v2_user-2";
    const persistedRaw = localStorage.getItem(storageKey);

    expect(persistedRaw).not.toBeNull();
    expect(persistedRaw).toContain("Analyse incident BSCS avec erreur de rating");

    unmount();

    const { result: remountedResult } = renderHook(() => useChatbotConversation("user-2"));

    await waitFor(() => {
      expect(
        remountedResult.current.messages.some(
          (message) => message.content === "Analyse incident BSCS avec erreur de rating",
        ),
      ).toBe(true);
    });
  });

  it("keeps history isolated per user", async () => {
    localStorage.setItem(
      "mts_chatbot_history_v2_user-a",
      JSON.stringify([
        {
          id: "a-msg",
          role: "user",
          content: "Incident user A",
          timestamp: new Date().toISOString(),
        },
      ]),
    );

    localStorage.setItem(
      "mts_chatbot_history_v2_user-b",
      JSON.stringify([
        {
          id: "b-msg",
          role: "user",
          content: "Incident user B",
          timestamp: new Date().toISOString(),
        },
      ]),
    );

    const { result, rerender } = renderHook(({ userId }) => useChatbotConversation(userId), {
      initialProps: { userId: "user-a" as string | null },
    });

    await waitFor(() => {
      expect(result.current.messages.some((message) => message.content === "Incident user A")).toBe(
        true,
      );
    });

    rerender({ userId: "user-b" as string | null });

    await waitFor(() => {
      expect(result.current.messages.some((message) => message.content === "Incident user B")).toBe(
        true,
      );
    });

    expect(result.current.messages.some((message) => message.content === "Incident user A")).toBe(
      false,
    );
  });

  it("clears UI history and storage while keeping welcome message", async () => {
    askMock.mockResolvedValue(buildApiResponse());

    const { result } = renderHook(() => useChatbotConversation("user-clear"));

    await act(async () => {
      await result.current.sendMessage("Diagnostic CRM outage");
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(1);
    });

    await act(async () => {
      result.current.resetConversation();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.id).toBe("welcome");

    const persistedRaw = localStorage.getItem("mts_chatbot_history_v2_user-clear");
    expect(persistedRaw).not.toBeNull();

    const persistedMessages = JSON.parse(persistedRaw as string);
    expect(Array.isArray(persistedMessages)).toBe(true);
    expect(persistedMessages).toHaveLength(1);
    expect(persistedMessages[0]?.id).toBe("welcome");
  });

  it("ignores in-flight backend response after conversation reset", async () => {
    const deferred = createDeferred<ChatbotResponse>();
    askMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useChatbotConversation("user-reset-race"));

    await act(async () => {
      void result.current.sendMessage("Incident critique BSCS");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    act(() => {
      result.current.resetConversation();
    });

    await act(async () => {
      deferred.resolve(buildApiResponse());
      await deferred.promise;
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.id).toBe("welcome");
    expect(
      result.current.messages.some((message) =>
        message.content.includes("Diagnostic incident BSCS"),
      ),
    ).toBe(false);
  });

  it("handles image-only message locally without calling backend ask", async () => {
    const { result } = renderHook(() => useChatbotConversation("user-image-only"));

    await act(async () => {
      await result.current.sendMessage("", [buildImageAttachment()]);
    });

    await waitFor(() => {
      expect(result.current.messages.some((message) => message.role === "user")).toBe(true);
    });
    expect(result.current.messages.some((message) => message.role === "assistant")).toBe(true);

    expect(askMock).not.toHaveBeenCalled();

    const userMessage = result.current.messages.find((message) => message.role === "user");
    expect(userMessage?.attachments).toHaveLength(1);
    expect(userMessage?.content).toContain("Capture");
  });

  it("sends text to backend while preserving attached image in user message", async () => {
    askMock.mockResolvedValue(buildApiResponse());

    const { result } = renderHook(() => useChatbotConversation("user-image-text"));

    await act(async () => {
      await result.current.sendMessage("Panne internet sur zone A", [buildImageAttachment()]);
    });

    await waitFor(() => {
      expect(askMock).toHaveBeenCalledWith("Panne internet sur zone A", "fr");
    });

    const userMessage = result.current.messages.find((message) => message.role === "user");
    expect(userMessage?.attachments).toHaveLength(1);
    expect(userMessage?.content).toBe("Panne internet sur zone A");
  });

  it("suppresses duplicate massive incident candidate on consecutive assistant replies", async () => {
    askMock
      .mockResolvedValueOnce(buildMassiveCandidateResponse())
      .mockResolvedValueOnce(buildMassiveCandidateResponse());

    const { result } = renderHook(() => useChatbotConversation("user-massive-cooldown"));

    await act(async () => {
      await result.current.sendMessage("Analyse incident BSCS lot 1");
    });

    await waitFor(() => {
      expect(result.current.messages.some((item) => item.role === "assistant")).toBe(true);
    });

    await act(async () => {
      await result.current.sendMessage("Analyse incident BSCS lot 2");
    });

    const assistantMessages = result.current.messages.filter(
      (item) => item.role === "assistant" && item.id !== "welcome",
    );

    expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
    expect(assistantMessages[0]?.massiveIncidentCandidate).not.toBeNull();
    expect(assistantMessages[1]?.massiveIncidentCandidate ?? null).toBeNull();
  });

  it("returns an English local greeting without backend call when the user writes in English", async () => {
    const { result } = renderHook(() => useChatbotConversation("user-en-greeting"));

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    expect(askMock).not.toHaveBeenCalled();

    const assistantMessage = [...result.current.messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.id !== "welcome");

    expect(assistantMessage?.content).toContain("Telecom AI Assistant");
    expect(assistantMessage?.responseLanguage).toBe("en");
  });

  it("sends the preferred language to the backend when the user writes in English", async () => {
    askMock.mockResolvedValue({
      ...buildApiResponse(),
      answer: "Summary: BSCS incident under review.",
      responseLanguage: "en",
      analysis: {
        summary: "BSCS incident under review.",
        impact: "Probable impact on the service.",
        nextAction: "Review similar incidents.",
        clarificationNeeded: false,
        missingInformation: [],
      },
    });

    const { result } = renderHook(() => useChatbotConversation("user-en-backend"));

    await act(async () => {
      await result.current.sendMessage("Please analyze this BSCS issue.");
    });

    await waitFor(() => {
      expect(askMock).toHaveBeenCalledWith("Please analyze this BSCS issue.", "en");
    });

    const assistantMessage = [...result.current.messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.id !== "welcome");

    expect(assistantMessage?.responseLanguage).toBe("en");
  });

  it("shows a visible assistant fallback when the AI backend is unavailable", async () => {
    askMock.mockRejectedValue(new Error("Le chatbot IA est indisponible."));

    const { result } = renderHook(() => useChatbotConversation("user-ai-down"));

    await act(async () => {
      await result.current.sendMessage("Analyse cette panne fibre.");
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toContain("indisponible");
    });

    const assistantMessage = [...result.current.messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.isError);

    expect(assistantMessage?.content).toContain("Je n'ai pas pu joindre le backend IA.");
    expect(assistantMessage?.content).toContain("Le chatbot IA est indisponible.");
  });
});
