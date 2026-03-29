import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import App from "./App";
import authReducer from "./redux/slices/authSlice";
import { ThemeProvider } from "./context/ThemeContext";

const rootReducer = combineReducers({ auth: authReducer });

test("redirects unauthenticated users to the login page", async () => {
  window.history.pushState({}, "Test", "/");

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: null,
      },
    },
  });

  render(
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>,
  );

  expect(await screen.findByText("Connexion")).toBeInTheDocument();
});
