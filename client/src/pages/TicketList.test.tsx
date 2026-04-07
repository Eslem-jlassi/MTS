/**
 * TicketList.test.tsx
 * Tests React Testing Library pour la page de liste des tickets MTS.
 * Vérifie : squelette loading, état vide, affichage des tickets, recherche.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import ticketsReducer from "../redux/slices/ticketsSlice";
import authReducer from "../redux/slices/authSlice";
import dashboardReducer from "../redux/slices/dashboardSlice";
import notificationsReducer from "../redux/slices/notificationsSlice";
import TicketList from "./TicketList";
import { TicketStatus, TicketPriority, TicketCategory } from "../types";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";

jest.mock("../components/tickets/TicketDrawer", () => ({
  __esModule: true,
  default: ({ ticketId, isOpen }: { ticketId: number | null; isOpen: boolean }) => (
    <div data-testid="ticket-drawer" data-open={String(isOpen)} data-ticket-id={ticketId ?? ""} />
  ),
}));

// Mock ticketService (used by component for exports + fetching via thunk)
jest.mock("../api/ticketService", () => {
  const svc = {
    exportCsv: jest.fn(),
    exportExcel: jest.fn(),
    exportPdf: jest.fn(),
    deleteTicket: jest.fn(),
    hardDeleteTicket: jest.fn(),
    getTickets: jest.fn().mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10,
    }),
  };
  return { __esModule: true, default: svc, ticketService: svc };
});

// Also mock the barrel re-export used by ticketsSlice — preserve all other exports
jest.mock("../api", () => {
  const actual = jest.requireActual("../api");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mocked = jest.requireMock("../api/ticketService");
  return { ...actual, ticketService: mocked.default };
});

// Get a reference to the mocked getTickets for per-test configuration
// eslint-disable-next-line import/first
import { ticketService as mockedService } from "../api/ticketService";
const mockGetTickets = mockedService.getTickets as jest.Mock;
const mockHardDeleteTicket = mockedService.hardDeleteTicket as jest.Mock;

// ----- Helpers ---------------------------------------------------------------

function buildTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    ticketNumber: "TK-20240001",
    title: "Problème de connexion fibre",
    description: "Perte de signal fibre optique",
    status: TicketStatus.NEW,
    priority: TicketPriority.HIGH,
    category: TicketCategory.PANNE,
    clientId: 10,
    clientName: "Ahmed Ben Ali",
    clientCode: "CLI-001",
    clientCompanyName: "Acme Corp",
    serviceId: 1,
    serviceName: "Fibre Optique Pro",
    createdById: 10,
    createdByName: "Ahmed Ben Ali",
    assignedToId: 5,
    assignedToName: "Agent Dupont",
    slaHours: 8,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    breachedSla: false,
    slaPercentage: 40,
    slaWarning: false,
    slaRemainingMinutes: 120,
    createdAt: new Date().toISOString(),
    commentCount: 2,
    ...overrides,
  };
}

const rootReducer = combineReducers({
  auth: authReducer,
  tickets: ticketsReducer,
  dashboard: dashboardReducer,
  notifications: notificationsReducer,
});

function createTestStore(
  ticketsOverrides: Record<string, unknown> = {},
  authOverrides: Record<string, unknown> = {},
) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: {
          id: 5,
          role: "AGENT",
          firstName: "Agent",
          lastName: "Test",
          email: "agent@test.com",
        },
        token: "fake-jwt-token",
        refreshToken: null,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
        ...authOverrides,
      },
      tickets: {
        tickets: [],
        selectedTicket: null,
        comments: [],
        history: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 10,
        isLoading: false,
        isLoadingDetails: false,
        error: null,
        filters: {},
        ...ticketsOverrides,
      },
    } as any,
  });
}

function renderTicketList(
  ticketsOverrides?: Record<string, unknown>,
  authOverrides?: Record<string, unknown>,
  routerOptions: {
    initialEntries?: string[];
    routePath?: string;
  } = {},
) {
  const store = createTestStore(ticketsOverrides, authOverrides);
  return render(
    <Provider store={store}>
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={routerOptions.initialEntries ?? ["/tickets"]}
      >
        <ThemeProvider>
          <ToastProvider>
            <Routes>
              <Route path={routerOptions.routePath ?? "/tickets"} element={<TicketList />} />
            </Routes>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

// ----- Tests -----------------------------------------------------------------

describe("TicketList", () => {
  beforeEach(() => {
    mockGetTickets.mockReset();
    mockHardDeleteTicket.mockReset();
    mockGetTickets.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10,
    });
    mockHardDeleteTicket.mockResolvedValue(undefined);
  });

  it("shows loading skeleton when isLoading is true", () => {
    // Make the API call never resolve so isLoading stays true
    mockGetTickets.mockReturnValue(new Promise(() => {}));
    renderTicketList();

    // The page header should still be present
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    // No ticket data should be visible
    expect(screen.queryByText("TK-20240001")).not.toBeInTheDocument();
  });

  it("shows empty state when there are no tickets", async () => {
    renderTicketList();

    await waitFor(() => {
      expect(screen.getByText("Aucun ticket trouvé")).toBeInTheDocument();
    });
  });

  it("renders ticket rows when tickets exist", async () => {
    const tickets = [
      buildTicket({ id: 1, ticketNumber: "TK-20240001", title: "Problème fibre" }),
      buildTicket({
        id: 2,
        ticketNumber: "TK-20240002",
        title: "Panne ADSL",
        assignedToName: "Agent Martin",
      }),
    ];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByText("TK-20240001")).toBeInTheDocument();
    });
    expect(screen.getByText("TK-20240002")).toBeInTheDocument();
    expect(screen.getByText("Problème fibre")).toBeInTheDocument();
    expect(screen.getByText("Panne ADSL")).toBeInTheDocument();
  });

  it("shows the total ticket count in page header", async () => {
    mockGetTickets.mockResolvedValue({
      content: [],
      totalElements: 42,
      totalPages: 5,
      number: 0,
      size: 10,
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByText("42 ticket(s) au total")).toBeInTheDocument();
    });
  });

  it("renders search input with placeholder", () => {
    renderTicketList();

    expect(
      screen.getByPlaceholderText("Rechercher par numéro, titre, client..."),
    ).toBeInTheDocument();
  });

  it("allows typing in the search field", () => {
    renderTicketList();

    const searchInput = screen.getByPlaceholderText("Rechercher par numéro, titre, client...");
    fireEvent.change(searchInput, { target: { value: "TK-2024" } });

    expect(searchInput).toHaveValue("TK-2024");
  });

  it("shows 'Nouveau ticket' button for CLIENT role", () => {
    renderTicketList(
      {},
      {
        user: {
          id: 10,
          role: "CLIENT",
          firstName: "Client",
          lastName: "User",
          email: "client@test.com",
        },
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        token: "fake",
        refreshToken: null,
        error: null,
      },
    );

    expect(screen.getByText("Nouveau ticket")).toBeInTheDocument();
  });

  it("shows export buttons (CSV/Excel/PDF) for non-CLIENT roles", () => {
    renderTicketList(
      {},
      {
        user: {
          id: 5,
          role: "AGENT",
          firstName: "Agent",
          lastName: "Test",
          email: "agent@test.com",
        },
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        token: "fake",
        refreshToken: null,
        error: null,
      },
    );

    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("shows SLA 'Dépassé' indicator for breached tickets", async () => {
    const tickets = [buildTicket({ breachedSla: true, slaPercentage: 100 })];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByText("Dépassé")).toBeInTheDocument();
    });
  });

  it("displays pagination controls with page info", async () => {
    const tickets = Array.from({ length: 10 }, (_, i) =>
      buildTicket({ id: i + 1, ticketNumber: `TK-${String(i + 1).padStart(8, "0")}` }),
    );

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 25,
      totalPages: 3,
      number: 0,
      size: 10,
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByText("Page 1 sur 3")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Page précédente")).toBeDisabled();
    expect(screen.getByLabelText("Page suivante")).not.toBeDisabled();
  });

  it("opens the drawer when the page is loaded from a /tickets/:id deep link", async () => {
    renderTicketList(
      {},
      {},
      {
        initialEntries: ["/tickets/42"],
        routePath: "/tickets/:id",
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-drawer")).toHaveAttribute("data-open", "true");
    });
    expect(screen.getByTestId("ticket-drawer")).toHaveAttribute("data-ticket-id", "42");
  });

  it("shows the hard delete action only for ADMIN on a new unassigned ticket", async () => {
    const tickets = [
      buildTicket({
        id: 3,
        ticketNumber: "TK-20240003",
        title: "Ticket a supprimer",
        status: TicketStatus.NEW,
        assignedToId: undefined,
        assignedToName: undefined,
      }),
    ];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList(
      {},
      {
        user: {
          id: 1,
          role: "ADMIN",
          firstName: "Admin",
          lastName: "Root",
          email: "admin@test.com",
        },
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        token: "fake",
        refreshToken: null,
        error: null,
      },
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText("Supprimer definitivement le ticket TK-20240003"),
      ).toBeInTheDocument();
    });
  });

  it("does not show the hard delete action for AGENT on the same ticket", async () => {
    const tickets = [
      buildTicket({
        id: 4,
        ticketNumber: "TK-20240004",
        title: "Ticket admin only",
        status: TicketStatus.NEW,
        assignedToId: undefined,
        assignedToName: undefined,
      }),
    ];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByText("TK-20240004")).toBeInTheDocument();
    });

    expect(
      screen.queryByLabelText("Supprimer definitivement le ticket TK-20240004"),
    ).not.toBeInTheDocument();
  });

  it("shows a strong confirmation modal with ticket reference and title for ADMIN hard delete", async () => {
    const tickets = [
      buildTicket({
        id: 5,
        ticketNumber: "TK-20240005",
        title: "Suppression definitive test",
        status: TicketStatus.NEW,
        assignedToId: undefined,
        assignedToName: undefined,
      }),
    ];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList(
      {},
      {
        user: {
          id: 1,
          role: "ADMIN",
          firstName: "Admin",
          lastName: "Root",
          email: "admin@test.com",
        },
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        token: "fake",
        refreshToken: null,
        error: null,
      },
    );

    const deleteButton = await screen.findByLabelText(
      "Supprimer definitivement le ticket TK-20240005",
    );
    fireEvent.click(deleteButton);

    expect(screen.getByText("Supprimer definitivement ce ticket ?")).toBeInTheDocument();
    expect(screen.getAllByText(/TK-20240005/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Titre :")).toBeInTheDocument();
    expect(screen.getAllByText(/Suppression definitive test/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tapez SUPPRIMER/)).toBeInTheDocument();
  });

  it("requires admin password in hard delete modal for local admin accounts", async () => {
    const tickets = [
      buildTicket({
        id: 6,
        ticketNumber: "TK-20240006",
        title: "Suppression locale",
        status: TicketStatus.NEW,
        assignedToId: undefined,
        assignedToName: undefined,
      }),
    ];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList(
      {},
      {
        user: {
          id: 1,
          role: "ADMIN",
          firstName: "Admin",
          lastName: "Local",
          email: "admin.local@test.com",
          oauthProvider: null,
        },
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        token: "fake",
        refreshToken: null,
        error: null,
      },
    );

    fireEvent.click(await screen.findByLabelText("Supprimer definitivement le ticket TK-20240006"));

    expect(screen.getByText(/Mot de passe administrateur/)).toBeInTheDocument();
    expect(screen.queryByText(/Code de verification email/)).not.toBeInTheDocument();
  });

  it("shows verification code challenge fields for OAuth admin hard delete", async () => {
    const tickets = [
      buildTicket({
        id: 7,
        ticketNumber: "TK-20240007",
        title: "Suppression oauth",
        status: TicketStatus.NEW,
        assignedToId: undefined,
        assignedToName: undefined,
      }),
    ];

    mockGetTickets.mockResolvedValue({
      content: tickets,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    });

    renderTicketList(
      {},
      {
        user: {
          id: 1,
          role: "ADMIN",
          firstName: "Admin",
          lastName: "OAuth",
          email: "admin.oauth@test.com",
          oauthProvider: "GOOGLE",
        },
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        token: "fake",
        refreshToken: null,
        error: null,
      },
    );

    fireEvent.click(await screen.findByLabelText("Supprimer definitivement le ticket TK-20240007"));

    expect(screen.getByText(/Code de verification email/)).toBeInTheDocument();
    expect(screen.getByText("Envoyer un code")).toBeInTheDocument();
  });
});
