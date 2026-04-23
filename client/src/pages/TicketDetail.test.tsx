import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TicketDetail from "./TicketDetail";

import { ticketService } from "../api";

jest.mock("../api", () => ({
  ticketService: {
    getTicketById: jest.fn(),
    addComment: jest.fn(),
    changeStatus: jest.fn(),
    assignTicket: jest.fn(),
    takeTicket: jest.fn(),
    unassignTicket: jest.fn(),
  },
  userService: {
    getAgents: jest.fn(),
  },
}));

const buildStore = () => {
  const preloadedState = {
    auth: {
      user: {
        id: 2,
        role: "MANAGER",
        firstName: "Sara",
        lastName: "El Fassi",
        email: "manager@mts-telecom.ma",
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

describe("TicketDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ticketService.getTicketById as jest.Mock).mockResolvedValue({
      id: 42,
      ticketNumber: "TKT-2026-00042",
      title: "Perte de connectivite fibre site principal",
      description: "Le site principal est coupe depuis 08:30.",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      category: "PANNE",
      categoryLabel: "Panne",
      clientCompanyName: "Atlas Distribution Maroc",
      serviceName: "Fibre FTTH",
      createdByName: "Samir Alaoui",
      assignedToName: "Karim Ziani",
      slaHours: 4,
      deadline: "2026-04-03T12:30:00",
      breachedSla: false,
      overdue: false,
      slaPercentage: 42.4,
      slaWarning: false,
      slaRemainingMinutes: 138,
      createdAt: "2026-04-03T08:30:00",
      comments: [],
      history: [],
      allowedTransitions: [],
      canTakeOwnership: false,
    });
  });

  it("loads and displays the requested ticket detail", async () => {
    render(
      <Provider store={buildStore()}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={["/tickets/42"]}
        >
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(ticketService.getTicketById).toHaveBeenCalledWith(42);
    });

    expect(await screen.findByText("TKT-2026-00042")).toBeInTheDocument();
    expect(screen.getByText("Perte de connectivite fibre site principal")).toBeInTheDocument();
    expect(screen.getAllByText("Atlas Distribution Maroc").length).toBeGreaterThan(0);
    expect(screen.getByText("Fibre FTTH")).toBeInTheDocument();
    expect(screen.getByText(/SLA/i)).toBeInTheDocument();
  });

  it("submits a RESOLVED transition then reloads the backend state", async () => {
    (ticketService.getTicketById as jest.Mock)
      .mockResolvedValueOnce({
        id: 42,
        ticketNumber: "TKT-2026-00042",
        title: "Perte de connectivite fibre site principal",
        description: "Le site principal est coupe depuis 08:30.",
        status: "ASSIGNED",
        priority: "CRITICAL",
        category: "PANNE",
        categoryLabel: "Panne",
        clientCompanyName: "Atlas Distribution Maroc",
        serviceName: "Fibre FTTH",
        createdByName: "Samir Alaoui",
        assignedToName: "Karim Ziani",
        slaHours: 4,
        deadline: "2026-04-03T12:30:00",
        breachedSla: false,
        overdue: false,
        slaPercentage: 42.4,
        slaWarning: false,
        slaRemainingMinutes: 138,
        createdAt: "2026-04-03T08:30:00",
        comments: [],
        history: [],
        allowedTransitions: ["RESOLVED"],
        canTakeOwnership: false,
      })
      .mockResolvedValueOnce({
        id: 42,
        ticketNumber: "TKT-2026-00042",
        title: "Perte de connectivite fibre site principal",
        description: "Le site principal est coupe depuis 08:30.",
        status: "RESOLVED",
        priority: "CRITICAL",
        category: "PANNE",
        categoryLabel: "Panne",
        clientCompanyName: "Atlas Distribution Maroc",
        serviceName: "Fibre FTTH",
        createdByName: "Samir Alaoui",
        assignedToName: "Karim Ziani",
        slaHours: 4,
        deadline: "2026-04-03T12:30:00",
        breachedSla: false,
        overdue: false,
        slaPercentage: 42.4,
        slaWarning: false,
        slaRemainingMinutes: 138,
        createdAt: "2026-04-03T08:30:00",
        comments: [],
        history: [],
        allowedTransitions: [],
        canTakeOwnership: false,
      });
    (ticketService.changeStatus as jest.Mock).mockResolvedValue({ id: 42, status: "RESOLVED" });

    render(
      <Provider store={buildStore()}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={["/tickets/42"]}
        >
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByText("Changer le statut")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Changer le statut"));
    fireEvent.change(screen.getByLabelText(/Nouveau statut/i), {
      target: { value: "RESOLVED" },
    });
    fireEvent.change(screen.getByLabelText(/solution/i), {
      target: { value: "Correctif applique sur le lien principal." },
    });
    fireEvent.click(screen.getByText("Confirmer"));

    await waitFor(() => {
      expect(ticketService.changeStatus).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          newStatus: "RESOLVED",
          resolution: "Correctif applique sur le lien principal.",
        }),
      );
    });

    await waitFor(() => {
      expect(ticketService.getTicketById).toHaveBeenCalledTimes(2);
    });
  });
});
