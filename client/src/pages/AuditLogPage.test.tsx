import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import auditService from "../api/auditService";
import AuditLogPage from "./AuditLogPage";

jest.mock("../api/auditService", () => ({
  __esModule: true,
  default: {
    searchAuditLogs: jest.fn(),
  },
}));

const baseAuthState = {
  user: {
    id: 1,
    role: "ADMIN",
    firstName: "Mohammed",
    lastName: "Benali",
    email: "admin@mts-telecom.ma",
  },
  token: "token",
  refreshToken: null,
  isAuthenticated: true,
  isInitialized: true,
  isLoading: false,
  error: null,
};

const rootReducer = combineReducers({
  auth: (state = baseAuthState) => state,
});

const buildStore = () =>
  configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: baseAuthState,
    } as any,
  });

describe("AuditLogPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditService.searchAuditLogs as jest.Mock).mockResolvedValue({
      content: [
        {
          id: 42,
          timestamp: "2026-04-03T10:15:00",
          userId: 1,
          userName: "Mohammed Benali",
          userEmail: "admin@mts-telecom.ma",
          action: "TICKET_ASSIGNED",
          actionLabel: "Ticket assigne",
          entityType: "TICKET",
          entityId: 2026,
          entityName: "TKT-2026-00042",
          description: "Assignation au niveau support N2",
          ipAddress: "127.0.0.1",
          userAgent: "Jest",
          oldValue: '{"assignedTo":"N1"}',
          newValue: '{"assignedTo":"N2"}',
          systemAction: false,
        },
      ],
      totalPages: 1,
      totalElements: 1,
      number: 0,
      size: 20,
    });
  });

  it("loads audit logs and opens detail modal", async () => {
    render(
      <Provider store={buildStore()}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuditLogPage />
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(auditService.searchAuditLogs).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Journal d'Audit")).toBeInTheDocument();
    expect(screen.getByText("Assignation au niveau support N2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Assignation au niveau support N2"));

    expect(screen.getByText(/Audit #42/i)).toBeInTheDocument();
    expect(screen.getByText("Ancienne valeur")).toBeInTheDocument();
    expect(screen.getByText("Nouvelle valeur")).toBeInTheDocument();
  });
});
