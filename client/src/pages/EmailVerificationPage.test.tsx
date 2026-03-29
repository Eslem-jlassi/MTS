import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import EmailVerificationPage from "./EmailVerificationPage";

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
  it("shows the pending verification state when an email is provided", () => {
    renderPage("/verify-email?email=client%40test.tn&status=pending");

    expect(screen.getByText("Verification en attente")).toBeInTheDocument();
    expect(screen.getByText(/client@test.tn/)).toBeInTheDocument();
    expect(screen.getByText(/Renvoyer l'email de verification/i)).toBeInTheDocument();
  });

  it("shows an invalid state when no token and no email are provided", () => {
    renderPage("/verify-email");

    expect(screen.getByText("Verification de l'email")).toBeInTheDocument();
    expect(screen.getByText(/Ce lien n'est pas exploitable/)).toBeInTheDocument();
  });
});
