/**
 * LoginPage.test.tsx
 * Tests React Testing Library pour la page de connexion MTS.
 * Vérifie : rendu, validation, affichage d'erreurs.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authSlice from "../redux/slices/authSlice";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "../context/ThemeContext";
import LoginPage from "./LoginPage";

const rootReducer = combineReducers({ auth: authSlice });

// Helper: wrap LoginPage with all required providers
function renderLoginPage(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider>
          <GoogleOAuthProvider clientId="test-client-id">
            <LoginPage />
          </GoogleOAuthProvider>
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
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    renderLoginPage();

    // The submit button contains "Se connecter" text
    expect(screen.getByText(/se connecter/i)).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderLoginPage();

    expect(screen.getByText(/mot de passe oublié/i)).toBeInTheDocument();
  });

  it("shows error message when auth error exists in state", () => {
    renderLoginPage({
      auth: {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        refreshToken: null,
        error: "Email ou mot de passe incorrect",
      } as any,
    });

    expect(screen.getByText("Email ou mot de passe incorrect")).toBeInTheDocument();
  });

  it("toggles password visibility when clicking the eye button", () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText("••••••••");
    expect(passwordInput).toHaveAttribute("type", "password");

    // Find and click the eye toggle button
    const toggleBtn = screen.getByLabelText(/afficher le mot de passe/i);
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("allows typing in email and password fields", () => {
    renderLoginPage();

    const emailInput = screen.getByPlaceholderText("votre@email.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(emailInput, { target: { value: "admin@mts.com" } });
    fireEvent.change(passwordInput, { target: { value: "password" } });

    expect(emailInput).toHaveValue("admin@mts.com");
    expect(passwordInput).toHaveValue("password");
  });
});
