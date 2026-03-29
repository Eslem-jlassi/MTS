import { fireEvent, render, screen } from "@testing-library/react";
import ChatbotPromptChips from "./ChatbotPromptChips";
import { TELECOM_QUICK_PROMPTS } from "./chatbotPrompts";

describe("ChatbotPromptChips", () => {
  it("renders telecom quick prompts and sends predefined query on click", () => {
    const onSelectPrompt = jest.fn();

    render(<ChatbotPromptChips prompts={TELECOM_QUICK_PROMPTS} onSelectPrompt={onSelectPrompt} />);

    expect(screen.getByRole("button", { name: "Incidents ouverts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tickets similaires" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Risque SLA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Etat des services" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incident VoIP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incident BSCS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incident CRM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brouillon ticket" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Incident BSCS" }));

    expect(onSelectPrompt).toHaveBeenCalledWith("Analyse un incident BSCS.");
  });

  it("disables chips when disabled flag is true", () => {
    const onSelectPrompt = jest.fn();

    render(
      <ChatbotPromptChips
        prompts={TELECOM_QUICK_PROMPTS}
        onSelectPrompt={onSelectPrompt}
        disabled
      />,
    );

    const chip = screen.getByRole("button", { name: "Incidents ouverts" });
    expect(chip).toBeDisabled();

    fireEvent.click(chip);
    expect(onSelectPrompt).not.toHaveBeenCalled();
  });

  it("renders English quick prompts when language is set to English", () => {
    const onSelectPrompt = jest.fn();

    render(
      <ChatbotPromptChips
        prompts={[
          { id: "open-incidents", label: "Open incidents", message: "Show me the open incidents." },
        ]}
        onSelectPrompt={onSelectPrompt}
        language="en"
      />,
    );

    expect(screen.getByRole("button", { name: "Open incidents" })).toBeInTheDocument();
    expect(screen.getByLabelText("Chatbot quick prompts")).toBeInTheDocument();
  });
});
