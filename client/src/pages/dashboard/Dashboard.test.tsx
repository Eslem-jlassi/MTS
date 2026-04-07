import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import Dashboard from "./Dashboard";
import { UserRole } from "../../types";

jest.mock("./ClientDashboard", () => ({
  ClientDashboard: () => <div data-testid="client-dashboard">client dashboard</div>,
}));

jest.mock("./AgentDashboard", () => ({
  AgentDashboard: () => <div data-testid="agent-dashboard">agent dashboard</div>,
}));

jest.mock("./ManagerDashboard", () => ({
  ManagerDashboard: () => <div data-testid="manager-dashboard">manager dashboard</div>,
}));

jest.mock("./AdminDashboard", () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">admin dashboard</div>,
}));

jest.mock("../../api", () => ({
  authService: {
    getStoredUser: jest.fn(() => null),
    getToken: jest.fn(() => null),
    login: jest.fn(),
    register: jest.fn(),
    googleLogin: jest.fn(),
    logout: jest.fn(),
    clearSession: jest.fn(),
  },
  dashboardService: {
    getStats: jest.fn(),
    getMyStats: jest.fn(),
  },
  telecomServiceService: {
    getServices: jest.fn(),
    getActiveServices: jest.fn(),
  },
  ticketService: {
    getTickets: jest.fn(),
    getMyTickets: jest.fn(),
    getAssignedToMe: jest.fn(),
  },
}));

jest.mock("../../api/clientService", () => ({
  clientService: {
    getClients: jest.fn(),
  },
}));

import { clientService } from "../../api/clientService";
import { dashboardService, telecomServiceService, ticketService } from "../../api";

const buildStore = (role: UserRole) =>
  {
    const preloadedState = {
      auth: {
        user: {
          id: 1,
          role,
          firstName: "Demo",
          lastName: role,
          email: `${role.toLowerCase()}@mts-telecom.ma`,
        },
        token: "token",
        refreshToken: null,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      },
    };

    return configureStore({
      reducer: (state = preloadedState) => state,
      preloadedState,
    });
  };

const renderDashboard = (role: UserRole) =>
  render(
    <Provider store={buildStore(role)}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Dashboard />
      </MemoryRouter>
    </Provider>,
  );

const statsResponse = { totalTickets: 4, activeTickets: 2, slaBreachedCount: 1 };
const ticketPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
const servicePage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
const clientPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };

describe("Dashboard role routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dashboardService.getStats as jest.Mock).mockResolvedValue(statsResponse);
    (dashboardService.getMyStats as jest.Mock).mockResolvedValue(statsResponse);
    (ticketService.getTickets as jest.Mock).mockResolvedValue(ticketPage);
    (ticketService.getMyTickets as jest.Mock).mockResolvedValue(ticketPage);
    (ticketService.getAssignedToMe as jest.Mock).mockResolvedValue(ticketPage);
    (telecomServiceService.getServices as jest.Mock).mockResolvedValue(servicePage);
    (telecomServiceService.getActiveServices as jest.Mock).mockResolvedValue([]);
    (clientService.getClients as jest.Mock).mockResolvedValue(clientPage);
  });

  it("loads the client dashboard with my stats, my tickets and active services", async () => {
    renderDashboard(UserRole.CLIENT);

    await waitFor(() => {
      expect(screen.getByTestId("client-dashboard")).toBeInTheDocument();
    });

    expect(dashboardService.getMyStats).toHaveBeenCalledTimes(1);
    expect(ticketService.getMyTickets).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(telecomServiceService.getActiveServices).toHaveBeenCalledTimes(1);
    expect(dashboardService.getStats).not.toHaveBeenCalled();
  });

  it("loads the agent dashboard with my stats and assigned tickets", async () => {
    renderDashboard(UserRole.AGENT);

    await waitFor(() => {
      expect(screen.getByTestId("agent-dashboard")).toBeInTheDocument();
    });

    expect(dashboardService.getMyStats).toHaveBeenCalledTimes(1);
    expect(ticketService.getAssignedToMe).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(telecomServiceService.getServices).not.toHaveBeenCalled();
  });

  it("loads the manager dashboard with global stats, services, tickets and clients", async () => {
    renderDashboard(UserRole.MANAGER);

    await waitFor(() => {
      expect(screen.getByTestId("manager-dashboard")).toBeInTheDocument();
    });

    expect(dashboardService.getStats).toHaveBeenCalledTimes(1);
    expect(ticketService.getTickets).toHaveBeenCalledWith({}, { page: 0, size: 10 });
    expect(telecomServiceService.getServices).toHaveBeenCalledWith({ page: 0, size: 100 });
    expect(clientService.getClients).toHaveBeenCalledWith({ page: 0, size: 100 });
  });

  it("loads the admin dashboard with global stats and services without manager-only clients", async () => {
    renderDashboard(UserRole.ADMIN);

    await waitFor(() => {
      expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    });

    expect(dashboardService.getStats).toHaveBeenCalledTimes(1);
    expect(ticketService.getTickets).toHaveBeenCalledWith({}, { page: 0, size: 10 });
    expect(telecomServiceService.getServices).toHaveBeenCalledWith({ page: 0, size: 100 });
    expect(clientService.getClients).toHaveBeenCalledWith({ page: 0, size: 100 });
  });
});
