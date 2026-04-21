import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { GoogleOAuthProvider } from "@react-oauth/google";
import authSlice from "../redux/slices/authSlice";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import RegisterPage from "./RegisterPage";

const rootReducer = combineReducers({ auth: authSlice });

function renderRegisterPage() {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        token: null,
        error: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <ToastProvider>
            <GoogleOAuthProvider clientId="test-client-id">
              <RegisterPage />
            </GoogleOAuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

describe("RegisterPage", () => {
  it("keeps public signup limited to the client role", () => {
    renderRegisterPage();

    expect(screen.getByText(/Inscription publique réservée aux comptes clients/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /client/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /agent/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manager/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /administrateur/i })).not.toBeInTheDocument();
  });
});
