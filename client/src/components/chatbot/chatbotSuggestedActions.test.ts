import { ChatMessageModel } from "../../types/chatbot";
import { resolveSuggestedActions } from "./chatbotSuggestedActionsResolver";

const buildAssistantMessage = (overrides: Partial<ChatMessageModel> = {}): ChatMessageModel => ({
  id: "assistant-1",
  role: "assistant",
  content: "Analyse effectuee",
  timestamp: new Date().toISOString(),
  confidence: "high",
  serviceDetected: "VoIP Core",
  results: [],
  ...overrides,
});

describe("chatbotSuggestedActions", () => {
  it("returns clarification-focused actions when confidence is low", () => {
    const actions = resolveSuggestedActions(
      buildAssistantMessage({ confidence: "low", serviceDetected: "CRM" }),
    );

    expect(actions.map((action) => action.label)).toContain("Completer le contexte");
    expect(actions.map((action) => action.label)).toContain("Preparer un brouillon de ticket");
    expect(actions.map((action) => action.label)).not.toContain("Verifier le SLA");
  });

  it("returns operational actions when confidence is medium/high", () => {
    const actions = resolveSuggestedActions(
      buildAssistantMessage({ confidence: "medium", serviceDetected: "BSCS Billing System" }),
    );

    expect(actions.map((action) => action.label)).toContain("Verifier les incidents similaires");
    expect(actions.map((action) => action.label)).toContain("Consulter le service detecte");
    expect(actions.map((action) => action.label)).toContain("Verifier le SLA");
  });

  it("returns no actions for non-relevant assistant messages", () => {
    expect(
      resolveSuggestedActions(
        buildAssistantMessage({ id: "welcome", confidence: undefined, serviceDetected: undefined }),
      ),
    ).toHaveLength(0);

    expect(
      resolveSuggestedActions(
        buildAssistantMessage({ confidence: undefined, serviceDetected: undefined }),
      ),
    ).toHaveLength(0);
  });

  it("prepends global-ticket action when a massive incident candidate is present", () => {
    const actions = resolveSuggestedActions(
      buildAssistantMessage({
        confidence: "high",
        massiveIncidentCandidate: {
          detectedService: "BSCS Billing System",
          likelyIncidentTitle: "Panne massive mediation BSCS",
          clusterSize: 6,
          confidenceLevel: "high",
          confidenceScore: 0.88,
          clusterStart: "2026-03-18T09:00:00",
          clusterEnd: "2026-03-18T10:00:00",
          ticketIds: ["1", "2", "3", "4", "5", "6"],
          detectionReason: "6 tickets similaires detectes.",
          recommendation: "Preparer un ticket global.",
        },
      }),
    );

    expect(actions[0]?.id).toBe("prepare-global-ticket");
    expect(actions[0]?.label).toBe("Preparer un ticket global");
  });

  it("returns English actions when the response language is English", () => {
    const actions = resolveSuggestedActions(
      buildAssistantMessage({
        responseLanguage: "en",
        confidence: "medium",
        serviceDetected: "BSCS Billing System",
      }),
    );

    expect(actions.map((action) => action.label)).toContain("Review similar incidents");
    expect(actions.map((action) => action.label)).toContain("Review detected service");
    expect(actions.map((action) => action.label)).toContain("Review SLA risk");
  });
});
