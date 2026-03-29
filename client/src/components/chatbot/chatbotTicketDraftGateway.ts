import { ticketService } from "../../api";
import { CreateTicketRequest, Ticket } from "../../types";

export interface ChatbotTicketDraftGateway {
  createDraftTicket: (request: CreateTicketRequest) => Promise<Ticket>;
}

export const defaultChatbotTicketDraftGateway: ChatbotTicketDraftGateway = {
  createDraftTicket: (request: CreateTicketRequest) => ticketService.createTicket(request),
};
