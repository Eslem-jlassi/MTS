import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import EmailVerificationPage from "./EmailVerificationPage";
import { authFlowService } from "../api/authFlowService";

jest.mock("../api/authFlowService", () => ({
  authFlowService: {
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  },
}));

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[initialEntry]}
    >
      <ThemeProvider>
        <ToastProvider>
          <Routes>
            <Route path="/verify-email" element={<EmailVerificationPage />} />
          </Routes>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("EmailVerificationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows account-created pending message after signup", () => {
    renderPage("/verify-email?email=client%40test.tn&status=pending&source=signup");

    expect(screen.getByText("Compte cree, verifiez votre boite mail")).toBeInTheDocument();
    expect(screen.getByText(/Votre compte a bien ete cree/i)).toBeInTheDocument();
  });

  it("shows the pending verification state when an email is provided", () => {
    renderPage("/verify-email?email=client%40test.tn&status=pending");

    expect(screen.getByText("Verification en attente")).toBeInTheDocument();
    expect(screen.getByText(/client@test.tn/)).toBeInTheDocument();
    expect(screen.getByText(/Renvoyer l'email de verification/i)).toBeInTheDocument();
  });

  it("shows an invalid state when no token and no email are provided", () => {
    renderPage("/verify-email");

    expect(screen.getByText("Lien invalide")).toBeInTheDocument();
    expect(screen.getByText(/Ce lien de verification n'est pas valide/i)).toBeInTheDocument();
  });

  it("shows an expired state with resend action when the token has expired", async () => {
    (authFlowService.verifyEmail as jest.Mock).mockRejectedValue(
      new Error("Le lien de verification a expire. Demandez un nouvel email."),
    );

    renderPage("/verify-email?token=expired-token&email=client%40test.tn");

    expect(await screen.findByText("Lien expire")).toBeInTheDocument();
    expect(screen.getByText(/client@test.tn/)).toBeInTheDocument();
    expect(screen.getByText(/Renvoyer l'email de verification/i)).toBeInTheDocument();
  });
});
