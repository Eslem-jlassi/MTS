import { TicketPriority } from "../../types";
import {
  buildDraftFromAssistantMessage,
  buildDraftFromMassiveIncidentCandidate,
  isCreateTicketIntent,
  mapConfidenceToPriority,
} from "./chatbotTicketDraft";

describe("chatbotTicketDraft", () => {
  it("builds a prefilled draft from structured assistant analysis", () => {
    const draft = buildDraftFromAssistantMessage({
      id: "assistant-1",
      role: "assistant",
      content: "Résumé : Diagnostic incident BSCS.",
      timestamp: new Date().toISOString(),
      serviceDetected: "BSCS Billing System",
      analysis: {
        summary: "Diagnostic incident BSCS.",
        probableCause: "Parseur mediation bloque",
        impact: "200 clients impactes.",
        nextAction: "Vérifier les incidents similaires.",
        clarificationNeeded: true,
        missingInformation: ["heure de début"],
        draftTicketTitle: "Blocage du rating BSCS",
      },
      results: [
        {
          docId: "t-1",
          docType: "ticket",
          title: "Blocage du rating BSCS",
          serviceName: "BSCS Billing System",
          language: "fr",
          score: 0.91,
        },
      ],
    });

    expect(draft.title).toBe("Blocage du rating BSCS");
    expect(draft.detectedService).toBe("BSCS Billing System");
    expect(draft.summary).toContain("Diagnostic incident BSCS");
    expect(draft.probableCause).toBe("Parseur mediation bloque");
    expect(draft.impact).toBe("200 clients impactes.");
    expect(draft.missingInformation).toContain("heure de début");
  });

  it("detects safe draft intent from chatbot action text", () => {
    expect(isCreateTicketIntent("Préparer un brouillon de ticket")).toBe(true);
    expect(isCreateTicketIntent("Prépare un brouillon de ticket pour ce service.")).toBe(true);
    expect(isCreateTicketIntent("Vérifier le SLA")).toBe(false);
  });

  it("maps confidence to safe ticket priority", () => {
    expect(mapConfidenceToPriority("high")).toBe(TicketPriority.HIGH);
    expect(mapConfidenceToPriority("medium")).toBe(TicketPriority.MEDIUM);
    expect(mapConfidenceToPriority("low")).toBe(TicketPriority.LOW);
    expect(mapConfidenceToPriority(undefined)).toBe(TicketPriority.LOW);
  });

  it("builds a global incident draft from massive incident candidate", () => {
    const draft = buildDraftFromMassiveIncidentCandidate({
      id: "assistant-2",
      role: "assistant",
      content: "Cause probable : saturation mediation BSCS",
      timestamp: new Date().toISOString(),
      massiveIncidentCandidate: {
        detectedService: "BSCS Billing System",
        likelyIncidentTitle: "Panne massive mediation BSCS",
        clusterSize: 7,
        confidenceLevel: "high",
        confidenceScore: 0.91,
        clusterStart: "2026-03-18T09:00:00",
        clusterEnd: "2026-03-18T11:00:00",
        ticketIds: ["1", "2", "3", "4", "5", "6", "7"],
        detectionReason: "7 tickets similaires detectes",
        recommendation: "Préparer un ticket global",
      },
    });

    expect(draft).not.toBeNull();
    expect(draft?.title).toContain("CANDIDAT INCIDENT MASSIF");
    expect(draft?.detectedService).toBe("BSCS Billing System");
    expect(draft?.summary).toContain("Cluster de 7 tickets similaires");
  });
});
