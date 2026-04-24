import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import UsersPage from "./UsersPage";
import { userService as mockedUserService } from "../api/userService";

jest.mock("../api/userService", () => {
  const svc = {
    getUsers: jest.fn(),
    hardDeleteUser: jest.fn(),
    requestHardDeleteChallenge: jest.fn(),
    deactivateUser: jest.fn(),
    activateUser: jest.fn(),
    changeRole: jest.fn(),
    createInternalUser: jest.fn(),
    updateUser: jest.fn(),
    setPasswordByAdmin: jest.fn(),
  };
  return { __esModule: true, default: svc, userService: svc };
});

const mockGetUsers = mockedUserService.getUsers as jest.Mock;
const mockHardDeleteUser = mockedUserService.hardDeleteUser as jest.Mock;
const mockRequestHardDeleteChallenge = mockedUserService.requestHardDeleteChallenge as jest.Mock;

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 18,
    email: "agent3@mts-telecom.tn",
    firstName: "Ali",
    lastName: "Support",
    fullName: "Ali Support",
    role: "AGENT",
    isActive: false,
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
        email: "admin@mts-telecom.tn",
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
  return render(
    <Provider store={createStore(authOverrides)}>
      <ThemeProvider>
        <ToastProvider>
          <UsersPage />
        </ToastProvider>
      </ThemeProvider>
    </Provider>,
  );
}

describe("UsersPage hard delete guardrails", () => {
  beforeEach(() => {
    mockGetUsers.mockReset();
    mockHardDeleteUser.mockReset();
    mockRequestHardDeleteChallenge.mockReset();
    mockGetUsers.mockResolvedValue({
      content: [buildUser()],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 1000,
    });
    mockHardDeleteUser.mockResolvedValue(undefined);
    mockRequestHardDeleteChallenge.mockResolvedValue({ message: "ok" });
  });

  it("shows strong confirmation fields with the exact system account ID for local admins", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("agent3@mts-telecom.tn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer definitivement/i));

    expect(screen.getByText("Supprimer definitivement cet utilisateur ?")).toBeInTheDocument();
    expect(screen.getByText(/Mot de passe administrateur/)).toBeInTheDocument();
  });

  it("submits system account identifier automatically with admin password", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("agent3@mts-telecom.tn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer definitivement/i));

    const dialog = screen.getByRole("dialog");
    const confirmationInput = within(dialog).getByRole("textbox");

    fireEvent.change(confirmationInput, { target: { value: "SUPPRIMER" } });
    fireEvent.change(screen.getByPlaceholderText("Confirmez avec votre mot de passe"), {
      target: { value: "Password1!" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer definitivement" }));

    await waitFor(() => {
      expect(mockHardDeleteUser).toHaveBeenCalledWith(18, {
        confirmationKeyword: "SUPPRIMER",
        confirmationTargetId: "18",
        currentPassword: "Password1!",
        verificationCode: undefined,
      });
    });
  });

  it("shows the OAuth challenge path for definitive deletion", async () => {
    renderPage({
      id: 2,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "OAuth",
      email: "oauth-admin@mts-telecom.tn",
      oauthProvider: "GOOGLE",
    });

    await waitFor(() => {
      expect(screen.getByText("agent3@mts-telecom.tn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Supprimer definitivement/i));

    expect(screen.getByText(/Code de verification email/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer un code" }));

    await waitFor(() => {
      expect(mockRequestHardDeleteChallenge).toHaveBeenCalledWith(18);
    });
  });
});
