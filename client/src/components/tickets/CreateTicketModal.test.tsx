import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CreateTicketModal from "./CreateTicketModal";

jest.mock("../../api", () => ({
  ticketService: {
    createTicket: jest.fn(),
  },
  telecomServiceService: {
    getActiveServices: jest.fn(),
  },
}));

import { ticketService, telecomServiceService } from "../../api";

describe("CreateTicketModal", () => {
  const onClose = jest.fn();
  const onCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (telecomServiceService.getActiveServices as jest.Mock).mockResolvedValue([
      { id: 12, name: "Fibre FTTH", category: "NETWORK" },
    ]);
    (ticketService.createTicket as jest.Mock).mockResolvedValue({ id: 1 });
  });

  it("creates a ticket with the selected service and closes the modal", async () => {
    render(<CreateTicketModal isOpen onClose={onClose} onCreated={onCreated} />);

    await waitFor(() => {
      expect(telecomServiceService.getActiveServices).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText(/Titre/i), {
      target: { value: "Incident fibre site Casablanca" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Coupure totale depuis 08:30." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Creer le ticket/i }));

    await waitFor(() => {
      expect(ticketService.createTicket).toHaveBeenCalledWith({
        title: "Incident fibre site Casablanca",
        description: "Coupure totale depuis 08:30.",
        priority: "MEDIUM",
        category: "PANNE",
        serviceId: 12,
      });
    });

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a guard message when no active service is available", async () => {
    (telecomServiceService.getActiveServices as jest.Mock).mockResolvedValue([]);

    render(<CreateTicketModal isOpen onClose={onClose} onCreated={onCreated} />);

    await waitFor(() => {
      expect(screen.getByText(/Aucun service actif n'est disponible/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Creer le ticket/i })).toBeDisabled();
  });
});
