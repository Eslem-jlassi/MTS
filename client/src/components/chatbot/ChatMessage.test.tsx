import { render, screen } from "@testing-library/react";
import { ChatMessageModel } from "../../types/chatbot";
import ChatMessage from "./ChatMessage";

const buildAssistantMessage = (overrides: Partial<ChatMessageModel> = {}): ChatMessageModel => ({
  id: "assistant-1",
  role: "assistant",
  content: "Assistant temporairement indisponible. Reessayez dans quelques instants.",
  timestamp: "2026-04-14T12:00:00.000Z",
  responseLanguage: "fr",
  ...overrides,
});

describe("ChatMessage", () => {
  it("renders assistant errors as plain message content", () => {
    const message = buildAssistantMessage({ isError: true });
    render(<ChatMessage message={message} />);

    expect(
      screen.getByText("Assistant temporairement indisponible. Reessayez dans quelques instants."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Résumé")).not.toBeInTheDocument();
  });

  it("renders structured sections for non-error assistant messages", () => {
    const message = buildAssistantMessage({
      content: "Résumé : Diagnostic en cours.\nAction suivante : Vérifier les incidents similaires.",
      isError: false,
    });
    render(<ChatMessage message={message} />);

    expect(screen.getByText("Résumé")).toBeInTheDocument();
    expect(screen.getByText("Action suivante")).toBeInTheDocument();
  });
});
