import React, { ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import { seedDemoAuth } from "./demo/demoConfig";
import App from "./App";
import "./tailwind.css";
import "./index.css";
import "./App.css";
import store from "./redux/store";
import { Provider } from "react-redux";
import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "./pages/ErrorPage";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

// =============================================================================
// DEMO MODE: Seed localStorage AVANT le rendu React.
// Le store Redux (authSlice) lit localStorage au moment de son initialisation,
// mais les imports ES sont hoistés — donc l'appel ici (après tous les imports)
// s'exécute AVANT le premier render React tout en respectant ESLint import/first.
// Note: les modules ES évaluent le top-level dans l'ordre d'import, donc
// seedDemoAuth s'exécute avant que ReactDOM.createRoot ne soit appelé.
// =============================================================================
seedDemoAuth();

function handleError(error: unknown, info: ErrorInfo) {
  console.error("Caught an error:", error, info);
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorPage} onError={handleError}>
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
