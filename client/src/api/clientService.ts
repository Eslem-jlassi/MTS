// =============================================================================
// MTS TELECOM - Client Service
// =============================================================================

import api from "./client";
import { Client, CreateClientFormData, PageRequest, PageResponse } from "../types";

const CLIENTS_PREFIX = "/clients";

export interface ClientsQueryParams extends PageRequest {
  search?: string;
}

export const clientService = {
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

  getClientById: async (id: number): Promise<Client> => {
    const response = await api.get<Client>(`${CLIENTS_PREFIX}/${id}`);
    return response.data;
  },

  getClientByCode: async (code: string): Promise<Client> => {
    const response = await api.get<Client>(`${CLIENTS_PREFIX}/code/${code}`);
    return response.data;
  },

  updateClient: async (
    id: number,
    data: { companyName?: string; address?: string },
  ): Promise<Client> => {
    const response = await api.put<Client>(`${CLIENTS_PREFIX}/${id}`, data);
    return response.data;
  },

  searchClients: async (query: string): Promise<Client[]> => {
    const response = await api.get<Client[]>(`${CLIENTS_PREFIX}/search`, {
      params: { q: query },
    });
    return response.data;
  },

  archiveClient: async (id: number): Promise<Client> => {
    const response = await api.post<Client>(`${CLIENTS_PREFIX}/${id}/archive`);
    return response.data;
  },

  restoreClient: async (id: number): Promise<Client> => {
    const response = await api.post<Client>(`${CLIENTS_PREFIX}/${id}/restore`);
    return response.data;
  },

  hardDeleteClient: async (id: number): Promise<void> => {
    await api.delete(`${CLIENTS_PREFIX}/${id}/hard-delete`);
  },

  createClientFull: async (data: CreateClientFormData): Promise<Client> => {
    const response = await api.post<Client>(CLIENTS_PREFIX, {
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword ?? data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || undefined,
      companyName: data.companyName,
      address: data.address || undefined,
    });
    return response.data;
  },
};

export default clientService;
