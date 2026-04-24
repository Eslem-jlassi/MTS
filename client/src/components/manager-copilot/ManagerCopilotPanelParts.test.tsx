import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ManagerCopilotSignalCard } from "./ManagerCopilotPanelParts";
import type { ManagerCopilotSignal } from "./types";

describe("ManagerCopilotSignalCard", () => {
  it("renders the KNN recommendation trace when provided by ALLIE", () => {
    const signal: ManagerCopilotSignal = {
      id: "incident-signal-1",
      eyebrow: "Incident probable",
      title: "Cluster tickets BSCS facture",
      description: "L'action Ouvrir un incident ressort sur 2/3 voisins proches.",
      href: "/health?serviceId=7",
      tone: "warning",
      confidence: "high",
      signalKind: "incident",
      recommendation: "Verifier s'il faut ouvrir un incident global.",
      predictedAction: "OPEN_INCIDENT",
      confidenceScore: 0.81,
      inferenceMode: "knn",
      modelVersion: "manager-copilot-knn-1.0.0",
      featureSummary: ["Service degrade ou indisponible", "4 ticket(s) similaires"],
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
    };

    render(
      <ManagerCopilotSignalCard
        signal={signal}
        sectionKey="probableIncidents"
        onNavigate={jest.fn()}
      />,
    );

    expect(screen.getByText("Recommandation KNN")).toBeInTheDocument();
    expect(screen.getByText("Ouvrir un incident")).toBeInTheDocument();
    expect(screen.getByText("Confiance KNN")).toBeInTheDocument();
    expect(screen.getByText(/81/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pourquoi un incident/i }));

    expect(screen.getAllByText("Voisins similaires").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cluster tickets BSCS facture").length).toBeGreaterThan(0);
  });
});
