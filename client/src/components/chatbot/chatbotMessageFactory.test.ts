import { createAssistantMessageFromResponse } from "./chatbotMessageFactory";

describe("createAssistantMessageFromResponse", () => {
  it("normalizes assistant answer to French before rendering", () => {
    const message = createAssistantMessageFromResponse({
      available: true,
      answer: "Root Cause: Network outage. Resolution: Restart the service.",
      confidence: "high",
      serviceDetected: "Core Network",
      results: [],
    });

    expect(message.content).toContain("Cause probable :");
    expect(message.content).toContain("panne reseau");
    expect(message.content).toContain("Action recommandee :");
  });

  it("keeps structured analysis for low confidence replies", () => {
    const message = createAssistantMessageFromResponse({
      available: true,
      answer: "Resume : Le diagnostic reste prudent.",
      confidence: "low",
      serviceDetected: "N/A",
      analysis: {
        summary: "Le diagnostic reste prudent.",
        impact: "Impact non confirme a ce stade.",
        nextAction: "Completer le contexte avant brouillon.",
        clarificationNeeded: true,
        missingInformation: ["service impacte", "heure de debut"],
        caution: "Diagnostic heuristique a confirmer.",
      },
      results: [
        {
          docType: "incident",
          title: "Sample",
          serviceName: "Core Network",
          language: "en",
          score: 0.3,
          docId: "doc-1",
        },
      ],
    });

    expect(message.analysis?.clarificationNeeded).toBe(true);
    expect(message.analysis?.missingInformation).toContain("service impacte");
    expect(message.responseLanguage).toBe("fr");
  });

  it("normalizes assistant answers to English when the backend language is English", () => {
    const message = createAssistantMessageFromResponse(
      {
        available: true,
        answer:
          "Cause probable : Saturation mediation. Resolution connue : Restart mediation parser.",
        confidence: "high",
        serviceDetected: "BSCS Billing System",
        responseLanguage: "en",
        results: [],
      },
      "en",
    );

    expect(message.content).toContain("Probable Cause:");
    expect(message.content).toContain("Known Resolution:");
    expect(message.responseLanguage).toBe("en");
  });

  it("reduces noisy related results by confidence threshold and duplicates", () => {
    const message = createAssistantMessageFromResponse({
      available: true,
      answer: "Root Cause: Network outage.",
      confidence: "medium",
      serviceDetected: "Core Network",
      results: [
        {
          docType: "incident",
          title: "Network outage in zone A",
          serviceName: "Core Network",
          language: "en",
          score: 0.31,
          docId: "doc-1",
        },
        {
          docType: "incident",
          title: "Network outage in zone A",
          serviceName: "Core Network",
          language: "en",
          score: 0.45,
          docId: "doc-2",
        },
        {
          docType: "ticket",
          title: "Minor warning",
          serviceName: "Core Network",
          language: "en",
          score: 0.2,
          docId: "doc-3",
        },
      ],
    });

    expect(message.results).toHaveLength(1);
    expect(message.results?.[0]?.docId).toBe("doc-2");
  });
});
