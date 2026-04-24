import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MainLayout from "./MainLayout";
import { ThemeProvider } from "../../context/ThemeContext";
import { UserResponse, UserRole } from "../../types";

jest.mock("../chatbot", () => ({
  ChatbotWidget: () => <div data-testid="chatbot-widget">Chatbot</div>,
}));
jest.mock("../manager-copilot", () => ({
  ManagerCopilotWidget: ({ role }: { role?: UserRole }) => (
    <div data-testid="manager-copilot-widget">{role}</div>
  ),
}));

jest.mock("./Breadcrumb", () => () => <div data-testid="breadcrumb">Breadcrumb</div>);
jest.mock("../command/CommandPalette", () => () => <div data-testid="command-palette" />);
jest.mock("../auth/OnboardingModal", () => () => <div data-testid="onboarding-modal" />);
jest.mock("../notifications/NotificationCenter", () => () => (
  <div data-testid="notification-center" />
));
jest.mock("../../hooks/useWebSocketNotifications", () => ({
  useWebSocketNotifications: jest.fn(),
}));

function createUser(role: UserRole): UserResponse {
  return {
    id: 1,
    email: `${role.toLowerCase()}@mts.test`,
    firstName: role,
    lastName: "User",
    fullName: `${role} User`,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

function renderMainLayout(role: UserRole) {
  const authState = {
    user: createUser(role),
    token: null,
    isAuthenticated: true,
    isInitialized: true,
    isLoading: false,
    error: null,
  };

  const store = configureStore({
    reducer: {
      auth: (state = authState) => state,
    },
  });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={["/"]}
        >
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<div>Page de test</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("MainLayout chatbot visibility", () => {
  it("renders the chatbot widget for CLIENT only", () => {
    renderMainLayout(UserRole.CLIENT);

    expect(screen.getByTestId("chatbot-widget")).toBeInTheDocument();
  });

  it.each([UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN])(
    "does not render the chatbot widget for %s",
    (role) => {
      renderMainLayout(role);

      expect(screen.queryByTestId("chatbot-widget")).not.toBeInTheDocument();
    },
  );
});

describe("MainLayout manager copilot visibility", () => {
  it("renders the manager copilot widget for MANAGER only", () => {
    renderMainLayout(UserRole.MANAGER);

    expect(screen.getByTestId("manager-copilot-widget")).toBeInTheDocument();
  });

  it.each([UserRole.CLIENT, UserRole.AGENT, UserRole.ADMIN])(
    "does not render the manager copilot widget for %s",
    (role) => {
      renderMainLayout(role);

      expect(screen.queryByTestId("manager-copilot-widget")).not.toBeInTheDocument();
    },
  );
});
