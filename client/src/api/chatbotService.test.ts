import { normalizeChatbotResponse } from "./chatbotService";

describe("normalizeChatbotResponse", () => {
  it("maps chatbot API fields to frontend-friendly names", () => {
    const response = normalizeChatbotResponse({
      available: true,
      message: undefined,
      answer: "Diagnostic",
      confidence: "high",
      top_score: 0.92,
      service_detected: "VoIP Platform",
      service_detection_confidence: "high",
      response_language: "fr",
      analysis: {
        summary: "Un cas proche a ete identifie.",
        impact: "Impact probable sur le service.",
        next_action: "Verifier les incidents similaires.",
        clarification_needed: false,
        missing_information: [],
        draft_ticket_title: "Perte de voix",
      },
      results: [
        {
          doc_type: "ticket",
          title: "Perte de voix",
          service_name: "VoIP Platform",
          language: "fr",
          score: 0.91,
          doc_id: "ticket-1",
        },
      ],
    });

    expect(response.topScore).toBe(0.92);
    expect(response.serviceDetected).toBe("VoIP Platform");
    expect(response.serviceDetectionConfidence).toBe("high");
    expect(response.responseLanguage).toBe("fr");
    expect(response.analysis?.draftTicketTitle).toBe("Perte de voix");
    expect(response.results[0]).toEqual({
      docType: "ticket",
      title: "Perte de voix",
      serviceName: "VoIP Platform",
      language: "fr",
      score: 0.91,
      docId: "ticket-1",
    });
  });

  it("provides safe defaults for incomplete payloads", () => {
    const response = normalizeChatbotResponse(undefined);

    expect(response.answer).toBe("Aucune reponse disponible.");
    expect(response.confidence).toBe("low");
    expect(response.serviceDetected).toBe("N/A");
    expect(response.responseLanguage).toBe("fr");
    expect(response.results).toEqual([]);
  });

  it("keeps English response language when returned by the backend", () => {
    const response = normalizeChatbotResponse({
      answer: "Summary: Incident under review.",
      confidence: "medium",
      service_detected: "BSCS Billing System",
      response_language: "en",
      results: [],
    });

    expect(response.responseLanguage).toBe("en");
  });
});
