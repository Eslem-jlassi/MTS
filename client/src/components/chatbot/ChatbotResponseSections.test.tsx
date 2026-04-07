import { fireEvent, render, screen } from "@testing-library/react";
import { ChatMessageModel } from "../../types/chatbot";
import ChatbotResponseSections from "./ChatbotResponseSections";

const buildAssistantMessage = (overrides: Partial<ChatMessageModel> = {}): ChatMessageModel => ({
  id: "assistant-42",
  role: "assistant",
  content: "Resume : Diagnostic probable sur BSCS.",
  timestamp: new Date().toISOString(),
  confidence: "high",
  serviceDetected: "BSCS Billing System",
  serviceDetectionConfidence: "high",
  analysis: {
    summary: "Diagnostic probable sur BSCS.",
    probableCause: "Saturation mediation",
    knownResolution: "Redemarrer le parser mediation",
    impact: "Impact probable sur les utilisateurs du service.",
    nextAction: "Verifier les incidents similaires avant validation.",
    clarificationNeeded: false,
    missingInformation: [],
  },
  results: [
    {
      docId: "ticket-001",
      docType: "ticket",
      title: "Erreur rating BSCS",
      serviceName: "BSCS Billing System",
      language: "fr",
      score: 0.92,
    },
  ],
  ...overrides,
});

describe("ChatbotResponseSections integration", () => {
  it("renders context-aware suggested actions and triggers callback on click", () => {
    const onSelectAction = jest.fn();

    render(
      <ChatbotResponseSections message={buildAssistantMessage()} onSelectAction={onSelectAction} />,
    );

    expect(screen.getByText("Actions suggerees")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verifier les incidents similaires" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Preparer un brouillon de ticket" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Consulter le service detecte" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verifier le SLA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reformuler le diagnostic" })).toBeInTheDocument();
    expect(screen.getByText("Fiabilite detection service")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Verifier le SLA" }));

    expect(onSelectAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "check-sla",
        label: "Verifier le SLA",
        message: "Verifie le risque SLA pour le service BSCS Billing System.",
      }),
    );
  });

  it("shows low-confidence actions and missing information for uncertain responses", () => {
    const onSelectAction = jest.fn();

    render(
      <ChatbotResponseSections
        message={buildAssistantMessage({
          confidence: "low",
          serviceDetected: "N/A",
          analysis: {
            summary: "Le diagnostic reste prudent.",
            impact: "Impact non confirme.",
            nextAction: "Completer le contexte avant brouillon.",
            clarificationNeeded: true,
            missingInformation: ["service impacte", "heure de debut"],
            caution: "Diagnostic heuristique a confirmer.",
          },
        })}
        onSelectAction={onSelectAction}
      />,
    );

    expect(screen.getByRole("button", { name: "Completer le contexte" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Preparer un brouillon de ticket" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verifier le SLA" })).not.toBeInTheDocument();
    expect(screen.getByText("Informations a confirmer")).toBeInTheDocument();
  });

  it("renders massive incident card and global ticket action when candidate exists", () => {
    const onSelectAction = jest.fn();

    render(
      <ChatbotResponseSections
        message={buildAssistantMessage({
          massiveIncidentCandidate: {
            detectedService: "BSCS Billing System",
            likelyIncidentTitle: "Panne massive mediation BSCS",
            clusterSize: 6,
            confidenceLevel: "high",
            confidenceScore: 0.87,
            clusterStart: "2026-03-18T09:00:00",
            clusterEnd: "2026-03-18T10:00:00",
            ticketIds: ["101", "102", "103"],
            detectionReason: "6 tickets proches en moins de 3h",
            recommendation: "Preparer un ticket global avant validation humaine",
          },
        })}
        onSelectAction={onSelectAction}
      />,
    );

    expect(screen.getByText("Candidat incident massif")).toBeInTheDocument();
    expect(screen.getByText(/6 tickets proches en moins de 3h/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preparer un ticket global" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preparer un ticket global" }));
    expect(onSelectAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prepare-global-ticket",
      }),
    );
  });

  it("renders section labels and actions in English when responseLanguage is English", () => {
    const onSelectAction = jest.fn();

    render(
      <ChatbotResponseSections
        message={buildAssistantMessage({
          responseLanguage: "en",
          analysis: {
            summary: "A likely BSCS issue has been identified.",
            probableCause: "Mediation saturation",
            knownResolution: "Restart the mediation parser",
            impact: "Probable impact on the service.",
            nextAction: "Review similar incidents before validation.",
            clarificationNeeded: false,
            missingInformation: [],
          },
        })}
        onSelectAction={onSelectAction}
      />,
    );

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Probable cause")).toBeInTheDocument();
    expect(screen.getByText("Suggested actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review SLA risk" })).toBeInTheDocument();
  });

  it("renders enriched AI metadata sections when provided by backend contract", () => {
    render(
      <ChatbotResponseSections
        message={buildAssistantMessage({
          modelVersion: "rag-chatbot-1.2.0",
          fallbackMode: "rag_primary",
          latencyMs: 154.3,
          reasoningSteps: [
            "Top semantic score=0.920.",
            "Service detecte=BSCS Billing System, confidence=high.",
          ],
          recommendedActions: [
            "Verifier les incidents similaires sur BSCS Billing System avant changement en production.",
          ],
          riskFlags: ["MASS_INCIDENT_CANDIDATE"],
          missingInformation: ["heure de debut"],
          sources: ["doc:ticket-001"],
          analysis: {
            summary: "Diagnostic probable sur BSCS.",
            impact: "Impact probable.",
            nextAction: "Verifier les incidents similaires.",
            clarificationNeeded: true,
            missingInformation: [],
          },
        })}
      />,
    );

    expect(screen.getByText("Etapes de raisonnement")).toBeInTheDocument();
    expect(screen.getByText("Recommandations IA")).toBeInTheDocument();
    expect(screen.getByText("Drapeaux de risque")).toBeInTheDocument();
    expect(screen.getByText("Version modele")).toBeInTheDocument();
    expect(screen.getByText("Mode fallback")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("heure de debut")).toBeInTheDocument();
  });
});
