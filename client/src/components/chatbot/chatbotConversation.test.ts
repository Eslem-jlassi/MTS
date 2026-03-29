import {
  buildLowConfidenceMessage,
  detectGreeting,
  detectHelpIntent,
  resolveLocalAssistantReply,
  resolveLocalAssistantReplyForLanguage,
  shouldCallApi,
} from "./chatbotConversation";

describe("chatbotConversation", () => {
  it("detects greetings without calling the backend", () => {
    expect(detectGreeting("Bonjour")).toBe(true);
    expect(shouldCallApi("Bonjour")).toBe(false);
    expect(resolveLocalAssistantReply("Bonjour")).toBeTruthy();
  });

  it("detects help intents without calling the backend", () => {
    expect(detectHelpIntent("aide")).toBe(true);
    expect(shouldCallApi("aide")).toBe(false);
  });

  it("sends real troubleshooting prompts to the backend", () => {
    expect(shouldCallApi("Analyse un incident BSCS avec erreur de rating")).toBe(true);
    expect(resolveLocalAssistantReply("Analyse un incident BSCS avec erreur de rating")).toBeNull();
  });

  it("builds a low-confidence message with the detected service when available", () => {
    const message = buildLowConfidenceMessage({
      serviceDetected: "BSCS Billing System",
      results: [
        {
          docType: "incident",
          title: "Perte mediation BSCS",
          serviceName: "BSCS Billing System",
          language: "fr",
          score: 0.36,
          docId: "inc-1",
        },
      ],
    });

    expect(message).toContain("BSCS Billing System");
    expect(message).toContain("confiance");
    expect(message).toContain("Cas potentiellement proches");
  });

  it("returns an English local greeting for English salutations", () => {
    const message = resolveLocalAssistantReplyForLanguage("hello", "en");

    expect(message).toContain("Telecom AI Assistant");
  });
});
