// =============================================================================
// MTS TELECOM - Ticket Service
// =============================================================================

import api from "./client";
import {
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketStatusChangeRequest,
  TicketAssignRequest,
  TicketComment,
  CreateCommentRequest,
  TicketHistory,
  PageResponse,
  PageRequest,
  TicketFilterParams,
} from "../types";

/** Résultat d'une action en masse */
export interface BulkResult {
  successCount: number;
  errorCount: number;
  errors: string[];
}

const TICKETS_PREFIX = "/tickets";

export const ticketService = {
  /**
   * Get all tickets with optional filters and pagination
   */
  getTickets: async (
    filters?: TicketFilterParams,
    page?: PageRequest
  ): Promise<PageResponse<Ticket>> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
      if (page.sort) params.append("sort", page.sort);
      if (page.direction) params.append("direction", page.direction);
    }
    
    const response = await api.get<PageResponse<Ticket>>(TICKETS_PREFIX, { params });
    return response.data;
  },

  /**
   * Get ticket by ID
   */
  getTicketById: async (id: number): Promise<Ticket> => {
    const response = await api.get<Ticket>(`${TICKETS_PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Get ticket by ticket number
   */
  getTicketByNumber: async (ticketNumber: string): Promise<Ticket> => {
    const response = await api.get<Ticket>(`${TICKETS_PREFIX}/number/${ticketNumber}`);
    return response.data;
  },

  /**
   * Create new ticket
   */
  createTicket: async (request: CreateTicketRequest): Promise<Ticket> => {
    const response = await api.post<Ticket>(TICKETS_PREFIX, request);
    return response.data;
  },

  /**
   * Update ticket
   */
  updateTicket: async (id: number, request: UpdateTicketRequest): Promise<Ticket> => {
    const response = await api.put<Ticket>(`${TICKETS_PREFIX}/${id}`, request);
    return response.data;
  },

  /**
   * Change ticket status
   */
  changeStatus: async (id: number, request: TicketStatusChangeRequest): Promise<Ticket> => {
    const response = await api.post<Ticket>(`${TICKETS_PREFIX}/${id}/status`, request);
    return response.data;
  },

  /**
   * Assign ticket to agent
   */
  assignTicket: async (id: number, request: TicketAssignRequest): Promise<Ticket> => {
    const response = await api.post<Ticket>(`${TICKETS_PREFIX}/${id}/assign`, request);
    return response.data;
  },

  /**
   * Unassign ticket
   */
  unassignTicket: async (id: number): Promise<Ticket> => {
    const response = await api.delete<Ticket>(`${TICKETS_PREFIX}/${id}/assign`);
    return response.data;
  },

  /**
   * Get my tickets (current user)
   */
  getMyTickets: async (page?: PageRequest): Promise<PageResponse<Ticket>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<Ticket>>(`${TICKETS_PREFIX}/my-tickets`, { params });
    return response.data;
  },

  /**
   * Get tickets assigned to me (agent)
   */
  getAssignedToMe: async (page?: PageRequest): Promise<PageResponse<Ticket>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<Ticket>>(`${TICKETS_PREFIX}/assigned`, { params });
    return response.data;
  },

  /**
   * Get unassigned tickets
   */
  getUnassignedTickets: async (page?: PageRequest): Promise<PageResponse<Ticket>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<Ticket>>(`${TICKETS_PREFIX}/unassigned`, { params });
    return response.data;
  },

  /**
   * Get SLA breached tickets
   */
  getSlaBreachedTickets: async (page?: PageRequest): Promise<PageResponse<Ticket>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<Ticket>>(`${TICKETS_PREFIX}/sla-breached`, { params });
    return response.data;
  },

  // =========================================================================
  // COMMENTS
  // =========================================================================

  /**
   * Get ticket comments
   */
  getComments: async (ticketId: number): Promise<TicketComment[]> => {
    const response = await api.get<TicketComment[]>(`${TICKETS_PREFIX}/${ticketId}/comments`);
    return response.data;
  },

  /**
   * Add comment to ticket
   */
  addComment: async (ticketId: number, request: CreateCommentRequest): Promise<TicketComment> => {
    const response = await api.post<TicketComment>(`${TICKETS_PREFIX}/${ticketId}/comments`, request);
    return response.data;
  },

  // =========================================================================
  // ATTACHMENTS
  // =========================================================================

  /**
   * Upload attachment to ticket
   */
  addAttachment: async (ticketId: number, file: File): Promise<Ticket> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<Ticket>(`${TICKETS_PREFIX}/${ticketId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Download attachment (returns blob; caller can create object URL or trigger save)
   */
  downloadAttachment: async (ticketId: number, attachmentId: number): Promise<Blob> => {
    const response = await api.get(`${TICKETS_PREFIX}/${ticketId}/attachments/${attachmentId}/download`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },

  // =========================================================================
  // HISTORY
  // =========================================================================

  /**
   * Get ticket history
   */
  getHistory: async (ticketId: number): Promise<TicketHistory[]> => {
    const response = await api.get<TicketHistory[]>(`${TICKETS_PREFIX}/${ticketId}/history`);
    return response.data;
  },

  // =========================================================================
  // BULK & EXPORT & MACROS
  // =========================================================================

  bulkAssign: async (ticketIds: number[], agentId: number, comment?: string): Promise<BulkResult> => {
    const response = await api.post<BulkResult>(`${TICKETS_PREFIX}/bulk/assign`, {
      ticketIds,
      agentId,
      comment,
    });
    return response.data;
  },

  bulkStatus: async (
    ticketIds: number[],
    newStatus: string,
    comment?: string
  ): Promise<BulkResult> => {
    const response = await api.post<BulkResult>(`${TICKETS_PREFIX}/bulk/status`, {
      ticketIds,
      newStatus,
      comment,
    });
    return response.data;
  },

  bulkPriority: async (ticketIds: number[], priority: string): Promise<BulkResult> => {
    const response = await api.post<BulkResult>(`${TICKETS_PREFIX}/bulk/priority`, {
      ticketIds,
      priority,
    });
    return response.data;
  },

  exportCsv: async (filters?: TicketFilterParams): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<Blob>(`${TICKETS_PREFIX}/export/csv`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  exportExcel: async (filters?: TicketFilterParams): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<Blob>(`${TICKETS_PREFIX}/export/excel`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  exportPdf: async (filters?: TicketFilterParams): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<Blob>(`${TICKETS_PREFIX}/export/pdf`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  applyMacro: async (
    ticketId: number,
    macroId: number,
    targetField?: "solution" | "comment",
    isInternal?: boolean
  ): Promise<Ticket> => {
    const response = await api.post<Ticket>(`${TICKETS_PREFIX}/${ticketId}/apply-macro`, {
      macroId,
      targetField: targetField ?? "comment",
      isInternal,
    });
    return response.data;
  },
};

export default ticketService;
