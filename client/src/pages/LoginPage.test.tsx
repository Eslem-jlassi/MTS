import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { GoogleOAuthProvider } from "@react-oauth/google";
import authSlice from "../redux/slices/authSlice";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import LoginPage from "./LoginPage";

jest.mock("../api/authFlowService", () => ({
  authFlowService: {
    resendVerificationEmail: jest.fn(),
  },
}));

const rootReducer = combineReducers({ auth: authSlice });

function renderLoginPage(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <ToastProvider>
            <GoogleOAuthProvider clientId="test-client-id">
              <LoginPage />
            </GoogleOAuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

describe("LoginPage", () => {
  it("renders the login form with email and password fields", () => {
    renderLoginPage();

    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("votre@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("********")).toBeInTheDocument();
  });

  it("prefills the documented demo credentials", () => {
    renderLoginPage();

    expect(screen.getByPlaceholderText("votre@email.com")).toHaveValue("admin@mts-telecom.ma");
    expect(screen.getByPlaceholderText("********")).toHaveValue("Password1!");
  });

  it("renders the submit button", () => {
    renderLoginPage();
    expect(screen.getByText(/se connecter/i)).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderLoginPage();
    expect(screen.getByText(/mot de passe oubli/i)).toBeInTheDocument();
  });

  it("shows error message when auth error exists in state", () => {
    renderLoginPage({
      auth: {
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        token: null,
        error: "Email ou mot de passe incorrect",
      } as any,
    });

    expect(screen.getByText("Email ou mot de passe incorrect")).toBeInTheDocument();
  });

  it("toggles password visibility when clicking the eye button", () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText("********");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByLabelText(/afficher le mot de passe/i);
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("allows typing in email and password fields", () => {
    renderLoginPage();

    const emailInput = screen.getByPlaceholderText("votre@email.com");
    const passwordInput = screen.getByPlaceholderText("********");

    fireEvent.change(emailInput, { target: { value: "admin@mts-telecom.ma" } });
    fireEvent.change(passwordInput, { target: { value: "Password1!" } });

    expect(emailInput).toHaveValue("admin@mts-telecom.ma");
    expect(passwordInput).toHaveValue("Password1!");
  });

  it("shows resend verification actions when the account is not verified", () => {
    renderLoginPage({
      auth: {
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        token: null,
        error: "Votre adresse email n'est pas encore verifiee.",
      } as any,
    });

    expect(screen.getByText("Compte non verifie")).toBeInTheDocument();
    expect(screen.getByText(/Renvoyer l'email/i)).toBeInTheDocument();
  });
});
