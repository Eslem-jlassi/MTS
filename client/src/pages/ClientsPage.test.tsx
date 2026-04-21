import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "../context/ThemeContext";
import ClientsPage from "./ClientsPage";
import { clientService as mockedClientService } from "../api/clientService";

jest.mock("../api/clientService", () => {
  const svc = {
    getClients: jest.fn(),
    hardDeleteClient: jest.fn(),
    requestHardDeleteChallenge: jest.fn(),
    createClientFull: jest.fn(),
    updateClient: jest.fn(),
    archiveClient: jest.fn(),
    restoreClient: jest.fn(),
  };
  return { __esModule: true, default: svc, clientService: svc };
});

const mockGetClients = mockedClientService.getClients as jest.Mock;
const mockRequestHardDeleteChallenge = mockedClientService.requestHardDeleteChallenge as jest.Mock;

function buildClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 44,
    clientCode: "CLI-2026-00044",
    companyName: "Telco Plus",
    address: "Tunis",
    userId: 31,
    userEmail: "client2@mts-telecom.tn",
    userFullName: "Nadia Client",
    userPhone: "+21622222222",
    userEmailVerified: true,
    isActive: true,
    ticketCount: 0,
    createdAt: new Date().toISOString(),
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
        ...authOverrides,
      },
      token: "fake-token",
      refreshToken: null,
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
      error: null,
    },
  };

  const reducer = (state = preloadedState) => state;
  return configureStore({ reducer });
}

function renderPage(authOverrides: Record<string, unknown> = {}) {
  const store = createStore(authOverrides);
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ClientsPage />
      </ThemeProvider>
    </Provider>,
  );
}

describe("ClientsPage hard delete guardrails", () => {
  beforeEach(() => {
    mockGetClients.mockReset();
    mockRequestHardDeleteChallenge.mockReset();
    mockGetClients.mockResolvedValue({
      content: [buildClient()],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });
    mockRequestHardDeleteChallenge.mockResolvedValue({ message: "ok" });
  });

  it("shows destructive action for ADMIN and opens a strong confirmation modal", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("CLI-2026-00044")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer definitivement/i));

    expect(screen.getByText("Supprimer definitivement ce client ?")).toBeInTheDocument();
    expect(screen.getByText(/Tapez SUPPRIMER/)).toBeInTheDocument();
    expect(screen.getByText(/Mot de passe administrateur/)).toBeInTheDocument();
  });

  it("hides destructive action for non-admin users", async () => {
    renderPage({
      id: 2,
      role: "MANAGER",
      firstName: "Manager",
      lastName: "Ops",
      email: "manager@test.tn",
      oauthProvider: null,
    });

    await waitFor(() => {
      expect(screen.getByText("CLI-2026-00044")).toBeInTheDocument();
    });

    expect(screen.queryByTitle(/Supprimer definitivement/i)).not.toBeInTheDocument();
  });

  it("shows OAuth challenge path and requests a verification code", async () => {
    renderPage({
      id: 3,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "OAuth",
      email: "oauth-admin@test.tn",
      oauthProvider: "GOOGLE",
    });

    await waitFor(() => {
      expect(screen.getByText("CLI-2026-00044")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer definitivement/i));

    expect(screen.getByText(/Code de verification email/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer un code" }));

    await waitFor(() => {
      expect(mockRequestHardDeleteChallenge).toHaveBeenCalledWith(44);
    });
  });
});
