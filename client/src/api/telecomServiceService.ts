// =============================================================================
// MTS TELECOM - Telecom Service Service
// =============================================================================

import api from "./client";
import {
  TelecomService,
  CreateServiceRequest,
  PageResponse,
  PageRequest,
  ServiceCategory,
  ServiceStatus,
} from "../types";
import type { ServiceStatusHistoryEntry } from "../types";

const SERVICES_PREFIX = "/services";

export const telecomServiceService = {
  /**
   * Get all services with optional pagination
   */
  getServices: async (page?: PageRequest): Promise<PageResponse<TelecomService>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<TelecomService>>(SERVICES_PREFIX, { params });
    return response.data;
  },

  /**
   * Get service by ID
   */
  getServiceById: async (id: number): Promise<TelecomService> => {
    const response = await api.get<TelecomService>(`${SERVICES_PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Get active services only
   */
  getActiveServices: async (): Promise<TelecomService[]> => {
    const response = await api.get<TelecomService[]>(`${SERVICES_PREFIX}/active`);
    return response.data;
  },

  /**
   * Get services by category
   */
  getServicesByCategory: async (category: ServiceCategory): Promise<TelecomService[]> => {
    const response = await api.get<TelecomService[]>(`${SERVICES_PREFIX}/category/${category}`);
    return response.data;
  },

  /**
   * Create new service (Admin only)
   */
  createService: async (request: CreateServiceRequest): Promise<TelecomService> => {
    const response = await api.post<TelecomService>(SERVICES_PREFIX, request);
    return response.data;
  },

  /**
   * Update service (Admin only)
   */
  updateService: async (
    id: number,
    data: {
      name?: string;
      description?: string;
      category?: ServiceCategory;
      status?: ServiceStatus;
    },
  ): Promise<TelecomService> => {
    const response = await api.put<TelecomService>(`${SERVICES_PREFIX}/${id}`, data);
    return response.data;
  },

  /**
   * Update service operational status (Admin/Manager).
   * Sends { status, reason? } to PATCH /api/services/:id/status (ServiceStatusUpdateRequest).
   */
  updateServiceStatus: async (
    id: number,
    status: ServiceStatus,
    reason?: string,
  ): Promise<TelecomService> => {
    const response = await api.patch<TelecomService>(`${SERVICES_PREFIX}/${id}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  /**
   * Activate service (Admin only)
   */
  activateService: async (id: number): Promise<TelecomService> => {
    const response = await api.post<TelecomService>(`${SERVICES_PREFIX}/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate service (Admin only)
   */
  deactivateService: async (id: number): Promise<TelecomService> => {
    const response = await api.post<TelecomService>(`${SERVICES_PREFIX}/${id}/deactivate`);
    return response.data;
  },

  /**
   * Delete service (Admin only)
   */
  deleteService: async (id: number): Promise<void> => {
    await api.delete(`${SERVICES_PREFIX}/${id}`);
  },

  // =========================================================================
  // HEALTH MONITORING
  // =========================================================================

  /**
   * Health dashboard: services ordered by health priority (DOWN first)
   */
  getHealthDashboard: async (): Promise<TelecomService[]> => {
    try {
      const response = await api.get<TelecomService[]>(`${SERVICES_PREFIX}/health`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  /**
   * Full status change history for a service
   */
  getStatusHistory: async (id: number): Promise<ServiceStatusHistoryEntry[]> => {
    try {
      const response = await api.get<ServiceStatusHistoryEntry[]>(
        `${SERVICES_PREFIX}/${id}/status-history`,
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  /**
   * Recent status history (sparkline data, default 30 days)
   */
  getRecentStatusHistory: async (id: number, days = 30): Promise<ServiceStatusHistoryEntry[]> => {
    try {
      const response = await api.get<ServiceStatusHistoryEntry[]>(
        `${SERVICES_PREFIX}/${id}/status-history/recent`,
        { params: { days } },
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },
};

export default telecomServiceService;
