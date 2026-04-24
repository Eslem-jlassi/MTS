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

  it("renders a clean unavailable assistant error message when backend marks response unavailable", () => {
    const message = createAssistantMessageFromResponse({
      available: false,
      answer: "Le chatbot IA est indisponible pour le moment.",
      confidence: "low",
      serviceDetected: "N/A",
      fallbackMode: "service_unavailable",
      results: [],
    });

    expect(message.isError).toBe(true);
    expect(message.content).toBe(
      "Assistant temporairement indisponible. Reessayez dans quelques instants.",
    );
  });

  it("keeps partial useful payload even when availability flag is false", () => {
    const message = createAssistantMessageFromResponse({
      available: false,
      answer: "Resume : Le diagnostic reste prudent.",
      confidence: "low",
      serviceDetected: "N/A",
      analysis: {
        summary: "Le diagnostic reste prudent.",
        impact: "Impact non confirme.",
        nextAction: "Completer le contexte.",
        clarificationNeeded: true,
        missingInformation: ["service impacte"],
      },
      results: [],
    });

    expect(message.isError).not.toBe(true);
    expect(message.analysis?.summary).toBe("Le diagnostic reste prudent.");
  });

  it("does not expose technical backend fallback text as business summary", () => {
    const message = createAssistantMessageFromResponse({
      available: false,
      answer: "java.net.ConnectException: Connection refused http://127.0.0.1:8002",
      confidence: "medium",
      serviceDetected: "Fibre FTTH",
      analysis: {
        summary: "Analyse partielle disponible sur le service FTTH.",
        impact: "Impact localise a confirmer.",
        nextAction: "Verifier incidents similaires et OLT.",
        clarificationNeeded: true,
        missingInformation: ["heure de debut"],
      },
      results: [],
      fallbackMode: "service_unavailable",
    });

    expect(message.isError).not.toBe(true);
    expect(message.content).toContain("Analyse partielle disponible");
    expect(message.content).not.toContain("ConnectException");
    expect(message.content).not.toContain("Connection refused");
  });
});
