import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import TicketDrawer from "./TicketDrawer";
import { ticketService } from "../../api/ticketService";
import { userService } from "../../api/userService";
import { sentimentService } from "../../api/sentimentService";
import { duplicateService } from "../../api/duplicateService";
import { incidentService } from "../../api/incidentService";
import { telecomServiceService } from "../../api/telecomServiceService";

jest.mock("../ui", () => ({
  Tabs: ({
    tabs,
    activeKey,
    onChange,
  }: {
    tabs: Array<{ key: string; label: string }>;
    activeKey: string;
    onChange: (key: string) => void;
  }) => (
    <div>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          aria-pressed={activeKey === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
  Tab: () => null,
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("../ui/Drawer", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div aria-label={title || "drawer"} role="dialog">
        {children}
      </div>
    ) : null,
}));

jest.mock("./QuickReplies", () => () => null);
jest.mock("../manager-copilot/ManagerCopilotTicketCard", () => () => null);
jest.mock("../manager-copilot/useManagerCopilot", () => ({
  useManagerCopilot: () => ({ snapshot: null }),
}));
jest.mock("../manager-copilot/managerCopilotTicketContext", () => ({
  buildManagerCopilotTicketContext: () => null,
}));

jest.mock("../../api/ticketService", () => ({
  ticketService: {
    getTicketById: jest.fn(),
    getTickets: jest.fn(),
    getComments: jest.fn(),
    getHistory: jest.fn(),
    assignTicket: jest.fn(),
    unassignTicket: jest.fn(),
  },
}));

jest.mock("../../api/userService", () => ({
  userService: {
    getAgents: jest.fn(),
  },
}));

jest.mock("../../api/sentimentService", () => ({
  sentimentService: {
    analyze: jest.fn(),
  },
}));

jest.mock("../../api/duplicateService", () => ({
  duplicateService: {
    detectDuplicates: jest.fn(),
  },
}));

jest.mock("../../api/incidentService", () => ({
  incidentService: {
    getByService: jest.fn(),
    getByAffectedService: jest.fn(),
  },
}));

jest.mock("../../api/telecomServiceService", () => ({
  telecomServiceService: {
    getServiceById: jest.fn(),
  },
}));

const baseTicket = {
  id: 42,
  ticketNumber: "TKT-2026-00042",
  title: "Perte de connectivite fibre site principal",
  description: "Le site principal est coupe depuis 08:30.",
  status: "IN_PROGRESS",
  priority: "CRITICAL",
  category: "PANNE",
  categoryLabel: "Panne",
  allowedTransitions: ["RESOLVED"],
  comments: [],
  history: [],
  attachments: [],
  clientId: 7,
  clientName: "Atlas Distribution Maroc",
  clientCompanyName: "Atlas Distribution Maroc",
  serviceId: 12,
  serviceName: "Fibre FTTH",
  createdByName: "Samir Alaoui",
  createdAt: "2026-04-03T08:30:00",
  deadline: "2026-04-03T12:30:00",
  slaHours: 4,
  slaPercentage: 42.4,
  slaWarning: false,
  breachedSla: false,
  overdue: false,
  assignedToId: null,
  assignedToName: null,
};

const agents = [
  { id: 2, fullName: "Aicha Benali", role: "AGENT" },
  { id: 3, fullName: "Karim Ziani", role: "AGENT" },
];

const buildStore = (
  authOverrides: Partial<{
    id: number;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
  }> = {},
) => {
  const preloadedState = {
    auth: {
      user: {
        id: 10,
        role: "MANAGER",
        firstName: "Sara",
        lastName: "El Fassi",
        email: "manager@mts-telecom.ma",
        ...authOverrides,
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

const renderDrawer = (
  ticketOverrides: Record<string, unknown> = {},
  options: {
    authOverrides?: Partial<{
      id: number;
      role: string;
      firstName: string;
      lastName: string;
      email: string;
    }>;
    onRequestHardDelete?: jest.Mock;
  } = {},
) => {
  (ticketService.getTicketById as jest.Mock).mockResolvedValue({
    ...baseTicket,
    ...ticketOverrides,
  });
  (ticketService.getTickets as jest.Mock).mockResolvedValue({ content: [] });
  (ticketService.assignTicket as jest.Mock).mockResolvedValue(undefined);
  (ticketService.unassignTicket as jest.Mock).mockResolvedValue(undefined);
  (userService.getAgents as jest.Mock).mockResolvedValue(agents);
  (sentimentService.analyze as jest.Mock).mockResolvedValue({
    category: "PANNE",
    priority: "HIGH",
    service: "Fibre FTTH",
    urgency: "HIGH",
    sentiment: "NEGATIF",
    criticality: "HIGH",
    confidence: 0.84,
    reasoning: "Signal critique.",
  });
  (duplicateService.detectDuplicates as jest.Mock).mockResolvedValue({
    is_duplicate: false,
    possible_mass_incident: false,
    duplicate_confidence: 0.12,
    matched_tickets: [],
    reasoning: "Aucun doublon proche.",
    recommendation: "Continuer le traitement.",
  });
  (incidentService.getByService as jest.Mock).mockResolvedValue([]);
  (incidentService.getByAffectedService as jest.Mock).mockResolvedValue([]);
  (telecomServiceService.getServiceById as jest.Mock).mockResolvedValue(null);

  return render(
    <Provider store={buildStore(options.authOverrides)}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TicketDrawer
          isOpen
          ticketId={42}
          onClose={jest.fn()}
          onTicketUpdated={jest.fn()}
          onRequestHardDelete={options.onRequestHardDelete}
        />
      </MemoryRouter>
    </Provider>,
  );
};

describe("TicketDrawer assignment dropdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the full assignment menu in a portal and closes on outside click", async () => {
    renderDrawer();

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ticket-assignment-trigger"));

    expect(await screen.findByText("Aicha Benali")).toBeInTheDocument();
    expect(screen.getByText("Karim Ziani")).toBeInTheDocument();

    const menu = screen.getByTestId("ticket-assignment-menu");
    expect(within(screen.getByRole("dialog")).queryByTestId("ticket-assignment-menu")).toBeNull();
    expect(menu).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId("ticket-assignment-menu")).not.toBeInTheDocument();
    });
  });

  it("keeps assign action working from the portal menu", async () => {
    renderDrawer();

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ticket-assignment-trigger"));
    fireEvent.click(await screen.findByText("Aicha Benali"));

    await waitFor(() => {
      expect(ticketService.assignTicket).toHaveBeenCalledWith(42, { agentId: 2 });
    });
  });

  it("keeps unassign action working from the portal menu", async () => {
    renderDrawer({ assignedToId: 3, assignedToName: "Karim Ziani" });

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ticket-assignment-trigger"));
    fireEvent.click(await screen.findByRole("menuitem", { name: /sassigner/i }));

    await waitFor(() => {
      expect(ticketService.unassignTicket).toHaveBeenCalledWith(42);
    });
  });

  it("keeps assignment read-only for AGENT role", async () => {
    renderDrawer(
      { assignedToId: 3, assignedToName: "Karim Ziani" },
      { authOverrides: { role: "AGENT", email: "agent@mts-telecom.ma" } },
    );

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();

    expect(screen.queryByTestId("ticket-assignment-trigger")).not.toBeInTheDocument();
    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
  });

  it("shows lock message only when assignment is locked by status", async () => {
    renderDrawer(
      { status: "RESOLVED", assignedToId: 3, assignedToName: "Karim Ziani" },
      { authOverrides: { role: "MANAGER", email: "manager@mts-telecom.ma" } },
    );

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/L'assignation est verrouillée après résolution, clôture ou annulation\./i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ticket-assignment-trigger")).toBeDisabled();
  });
});

describe("TicketDrawer hard-delete visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows definitive delete action section for eligible ADMIN ticket only", async () => {
    const onRequestHardDelete = jest.fn();

    renderDrawer(
      {
        status: "NEW",
        assignedToId: null,
        assignedToName: null,
      },
      {
        authOverrides: { role: "ADMIN", email: "admin@mts-telecom.ma" },
        onRequestHardDelete,
      },
    );

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();
    const button = screen.getByTestId("ticket-hard-delete-action");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(onRequestHardDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    });
  });

  it("does not expose definitive delete action section for MANAGER", async () => {
    const onRequestHardDelete = jest.fn();

    renderDrawer(
      {
        status: "NEW",
        assignedToId: null,
        assignedToName: null,
      },
      {
        authOverrides: { role: "MANAGER", email: "manager@mts-telecom.ma" },
        onRequestHardDelete,
      },
    );

    expect(
      await screen.findByText("Perte de connectivite fibre site principal"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-hard-delete-action")).not.toBeInTheDocument();
  });
});
