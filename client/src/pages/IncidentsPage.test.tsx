import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import IncidentsPage from "./IncidentsPage";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { IncidentStatus, Severity } from "../types";
import { incidentService as mockedIncidentService } from "../api/incidentService";

jest.mock("../api/incidentService", () => {
  const svc = {
    getAll: jest.fn(),
    hardDeleteIncident: jest.fn(),
    requestHardDeleteChallenge: jest.fn(),
  };
  return { __esModule: true, default: svc, incidentService: svc };
});

const mockGetAll = mockedIncidentService.getAll as jest.Mock;
const mockRequestHardDeleteChallenge =
  mockedIncidentService.requestHardDeleteChallenge as jest.Mock;

function buildIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: 77,
    incidentNumber: "INC-00077",
    title: "Coupure majeure",
    description: "Perte de service",
    severity: Severity.CRITICAL,
    status: IncidentStatus.OPEN,
    impact: "HIGH",
    serviceId: 5,
    serviceName: "Core MPLS",
    startedAt: new Date().toISOString(),
    hasPostMortem: false,
    ticketIds: [],
    ticketNumbers: [],
    ...overrides,
  };
}

function createStore(authOverrides: Record<string, unknown> = {}) {
  const preloadedState = {
    auth: {
      user: {
        id: 1,
        role: "ADMIN",
        firstName: "Admin",
        lastName: "Root",
        email: "admin@test.tn",
        oauthProvider: null,
      },
      token: "fake-token",
      refreshToken: null,
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
      error: null,
      ...authOverrides,
    },
  };

  const reducer = (state = preloadedState) => state;
  return configureStore({ reducer });
}

function renderPage(authOverrides: Record<string, unknown> = {}) {
  const store = createStore(authOverrides);
  return render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <ToastProvider>
            <IncidentsPage />
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

describe("IncidentsPage hard delete guardrails", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockRequestHardDeleteChallenge.mockReset();
    mockGetAll.mockResolvedValue([buildIncident()]);
    mockRequestHardDeleteChallenge.mockResolvedValue({ message: "ok" });
  });

  it("shows destructive action for ADMIN and opens strong confirmation modal", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("INC-00077")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer définitivement/i));

    expect(screen.getByText("Supprimer définitivement l'incident ?")).toBeInTheDocument();
    expect(screen.getByText(/Tapez SUPPRIMER/)).toBeInTheDocument();
    expect(screen.getByText(/Mot de passe administrateur/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tapez 77")).toBeInTheDocument();
  });

  it("hides destructive action for non-admin users", async () => {
    renderPage({
      user: {
        id: 2,
        role: "MANAGER",
        firstName: "Manager",
        lastName: "Ops",
        email: "manager@test.tn",
        oauthProvider: null,
      },
    });

    await waitFor(() => {
      expect(screen.getByText("INC-00077")).toBeInTheDocument();
    });

    expect(screen.queryByTitle(/Supprimer définitivement/i)).not.toBeInTheDocument();
  });

  it("shows OAuth challenge path and requests code", async () => {
    renderPage({
      user: {
        id: 3,
        role: "ADMIN",
        firstName: "Admin",
        lastName: "OAuth",
        email: "oauth-admin@test.tn",
        oauthProvider: "GOOGLE",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("INC-00077")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer définitivement/i));

    expect(screen.getByText(/Code de verification email/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer un code" }));

    await waitFor(() => {
      expect(mockRequestHardDeleteChallenge).toHaveBeenCalledWith(77);
    });
  });
});
