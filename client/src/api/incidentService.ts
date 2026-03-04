// =============================================================================
// MTS TELECOM - Incident Service (supervision / ITSM)
// =============================================================================

import api from "./client";
import type { Incident, IncidentRequest, IncidentTimelineEntry, PageResponse } from "../types";
import { IncidentStatus, Severity } from "../types";

const PREFIX = "/incidents";

/** Backend may return Incident[] or PageResponse<Incident>. Normalize to array. */
function toList(data: unknown): Incident[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as PageResponse<Incident>).content)) {
    return (data as PageResponse<Incident>).content;
  }
  return [];
}

export const incidentService = {
  // =========================================================================
  // CRUD
  // =========================================================================

  getAll: async (page = 0, size = 50): Promise<Incident[]> => {
    try {
      const response = await api.get<Incident[] | PageResponse<Incident>>(PREFIX, {
        params: { page, size, sort: "startedAt,desc" },
      });
      return toList(response.data);
    } catch {
      return [];
    }
  },

  getActive: async (): Promise<Incident[]> => {
    try {
      const response = await api.get<Incident[]>(`${PREFIX}/active`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  getById: async (id: number): Promise<Incident> => {
    const response = await api.get<Incident>(`${PREFIX}/${id}`);
    return response.data;
  },

  create: async (request: IncidentRequest): Promise<Incident> => {
    const response = await api.post<Incident>(PREFIX, request);
    return response.data;
  },

  update: async (id: number, request: IncidentRequest): Promise<Incident> => {
    const response = await api.put<Incident>(`${PREFIX}/${id}`, request);
    return response.data;
  },

  // =========================================================================
  // FILTERS
  // =========================================================================

  getFiltered: async (params: {
    status?: IncidentStatus;
    severity?: Severity;
    serviceId?: number;
    page?: number;
    size?: number;
  }): Promise<Incident[]> => {
    try {
      const response = await api.get<PageResponse<Incident>>(`${PREFIX}/filter`, { params });
      return toList(response.data);
    } catch {
      return [];
    }
  },

  getByService: async (serviceId: number): Promise<Incident[]> => {
    try {
      const response = await api.get<PageResponse<Incident>>(`${PREFIX}/service/${serviceId}`);
      return toList(response.data);
    } catch {
      return [];
    }
  },

  getByAffectedService: async (serviceId: number): Promise<Incident[]> => {
    try {
      const response = await api.get<Incident[]>(`${PREFIX}/affected-service/${serviceId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  // =========================================================================
  // STATUS & ACTIONS
  // =========================================================================

  changeStatus: async (id: number, status: IncidentStatus): Promise<Incident> => {
    const response = await api.patch<Incident>(`${PREFIX}/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  close: async (id: number): Promise<Incident> => {
    const response = await api.post<Incident>(`${PREFIX}/${id}/close`);
    return response.data;
  },

  // =========================================================================
  // TIMELINE & NOTES
  // =========================================================================

  getTimeline: async (id: number): Promise<IncidentTimelineEntry[]> => {
    try {
      const response = await api.get<IncidentTimelineEntry[]>(`${PREFIX}/${id}/timeline`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  addNote: async (id: number, content: string): Promise<IncidentTimelineEntry> => {
    const response = await api.post<IncidentTimelineEntry>(`${PREFIX}/${id}/notes`, { content });
    return response.data;
  },

  // =========================================================================
  // POST-MORTEM
  // =========================================================================

  savePostMortem: async (id: number, content: string): Promise<Incident> => {
    const response = await api.post<Incident>(`${PREFIX}/${id}/post-mortem`, { content });
    return response.data;
  },

  // =========================================================================
  // TICKET LINKING
  // =========================================================================

  linkTickets: async (id: number, ticketIds: number[]): Promise<Incident> => {
    const response = await api.post<Incident>(`${PREFIX}/${id}/tickets`, ticketIds);
    return response.data;
  },

  unlinkTicket: async (id: number, ticketId: number): Promise<Incident> => {
    const response = await api.delete<Incident>(`${PREFIX}/${id}/tickets/${ticketId}`);
    return response.data;
  },

  // =========================================================================
  // SERVICE LINKING
  // =========================================================================

  linkServices: async (id: number, serviceIds: number[]): Promise<Incident> => {
    const response = await api.post<Incident>(`${PREFIX}/${id}/services`, serviceIds);
    return response.data;
  },

  unlinkService: async (id: number, serviceId: number): Promise<Incident> => {
    const response = await api.delete<Incident>(`${PREFIX}/${id}/services/${serviceId}`);
    return response.data;
  },
};

export default incidentService;
