import { normalizeDashboardSnapshot } from "./managerCopilotService";

describe("normalizeDashboardSnapshot", () => {
  it("preserves the KNN recommendation trace returned by the backend", () => {
    const snapshot = normalizeDashboardSnapshot({
      available: true,
      mode: "live",
      generatedAt: "2026-04-23T10:00:00Z",
      summary: "ALLIE remonte un incident probable sur BSCS.",
      modelVersion: "manager-copilot-knn-1.0.0",
      inferenceMode: "knn",
      confidenceScore: 0.81,
      featureSummary: ["Service degrade ou indisponible", "4 ticket(s) similaires"],
      reasoningSteps: ["KNN supervise execute sur 1 cas manager."],
      decisionAreas: [
        {
          id: "incident-watch",
          title: "Incident global",
          headline: "1 signal converge vers une cause commune",
          description: "La recommandation se base sur des voisins proches.",
          tone: "warning",
          confidence: "high",
        },
      ],
      probableIncidents: [
        {
          id: "incident-signal-1",
          title: "Cluster tickets BSCS facture",
          description: "L'action Ouvrir un incident ressort sur 2/3 voisins proches.",
          href: "/health?serviceId=7",
          tone: "warning",
          confidence: "high",
          signalKind: "incident",
          serviceId: 7,
          serviceName: "BSCS Billing",
          predictedAction: "OPEN_INCIDENT",
          confidenceScore: 0.81,
          inferenceMode: "knn",
          modelVersion: "manager-copilot-knn-1.0.0",
          featureSummary: ["Service degrade ou indisponible"],
          nearestExamples: [
            {
              exampleId: "seed-inc-001",
              label: "OPEN_INCIDENT",
              title: "Cluster tickets BSCS facture",
              summary: "Plusieurs tickets similaires convergent sur BSCS.",
              recommendation: "Ouvrir un incident global.",
              distance: 0.18,
              featureSummary: ["Service degrade ou indisponible"],
            },
          ],
        },
      ],
    });

    expect(snapshot.inferenceMode).toBe("knn");
    expect(snapshot.modelVersion).toBe("manager-copilot-knn-1.0.0");
    expect(snapshot.confidenceScore).toBe(0.81);
    expect(snapshot.featureSummary).toContain("4 ticket(s) similaires");
    expect(snapshot.reasoningSteps).toContain("KNN supervise execute sur 1 cas manager.");
    expect(snapshot.decisionAreas[0].title).toBe("Incident global");
    expect(snapshot.probableIncidents[0].predictedAction).toBe("OPEN_INCIDENT");
    expect(snapshot.probableIncidents[0].nearestExamples?.[0].exampleId).toBe("seed-inc-001");
  });
});
