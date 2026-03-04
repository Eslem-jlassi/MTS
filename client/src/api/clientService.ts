// =============================================================================
// MTS TELECOM - Client Service
// =============================================================================

import api from "./client";
import { Client, CreateClientRequest, CreateClientFormData, PageResponse, PageRequest } from "../types";

const CLIENTS_PREFIX = "/clients";

export interface ClientsQueryParams extends PageRequest {
  search?: string;
}

export const clientService = {
  /**
   * Get clients with pagination, optional search and sort.
   * TODO BACKEND: GET /api/clients?page=&size=&sort=&direction=&search= (search on companyName, clientCode, userEmail).
   */
  getClients: async (params?: ClientsQueryParams): Promise<PageResponse<Client>> => {
    const q = new URLSearchParams();
    if (params) {
      if (params.page !== undefined) q.append("page", String(params.page));
      if (params.size !== undefined) q.append("size", String(params.size));
      if (params.sort) q.append("sort", params.sort);
      if (params.direction) q.append("direction", params.direction);
      if (params.search?.trim()) q.append("search", params.search.trim());
    }
    const response = await api.get<PageResponse<Client>>(CLIENTS_PREFIX, { params: q });
    return response.data;
  },

  /**
   * Get client by ID
   */
  getClientById: async (id: number): Promise<Client> => {
    const response = await api.get<Client>(`${CLIENTS_PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Get client by client code
   */
  getClientByCode: async (code: string): Promise<Client> => {
    const response = await api.get<Client>(`${CLIENTS_PREFIX}/code/${code}`);
    return response.data;
  },

  /**
   * Create new client
   */
  createClient: async (request: CreateClientRequest): Promise<Client> => {
    const response = await api.post<Client>(CLIENTS_PREFIX, request);
    return response.data;
  },

  /**
   * Update client
   */
  updateClient: async (
    id: number,
    data: { companyName?: string; address?: string }
  ): Promise<Client> => {
    const response = await api.put<Client>(`${CLIENTS_PREFIX}/${id}`, data);
    return response.data;
  },

  /**
   * Search clients
   */
  searchClients: async (query: string): Promise<Client[]> => {
    const response = await api.get<Client[]>(`${CLIENTS_PREFIX}/search`, {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Create client with user account (admin operation).
   * Uses the register endpoint to create user + client profile in one step.
   */
  createClientFull: async (data: CreateClientFormData): Promise<Client> => {
    // Register the user as CLIENT, then the backend auto-creates the client profile.
    const registerPayload = {
      email: data.email,
      password: data.password,
      confirmPassword: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || undefined,
      companyName: data.companyName || undefined,
      address: data.address || undefined,
      role: "CLIENT",
    };
    await api.post("/auth/register", registerPayload);
    // Fetch the newly created client by email search
    const clients = await api.get<Client[]>(`${CLIENTS_PREFIX}/search`, {
      params: { q: data.email },
    });
    return clients.data?.[0] ?? ({} as Client);
  },
};

export default clientService;
