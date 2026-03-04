// =============================================================================
// MTS TELECOM - SLA Policies Service (Politiques de niveau de service)
// =============================================================================

import api from "./client";
import type { SlaPolicy, SlaPolicyRequest } from "../types";

const PREFIX = "/sla-policies";

/**
 * Service frontend pour la gestion des politiques SLA.
 * Appelle les endpoints backend :
 * - GET    /api/sla-policies
 * - GET    /api/sla-policies/:id
 * - GET    /api/sla-policies/count
 * - POST   /api/sla-policies
 * - PUT    /api/sla-policies/:id
 * - DELETE /api/sla-policies/:id
 */
export const slaService = {
  /**
   * Liste toutes les politiques SLA.
   * @param activeOnly si true, ne retourne que les actives
   */
  list: async (activeOnly = false): Promise<SlaPolicy[]> => {
    const response = await api.get<SlaPolicy[]>(PREFIX, {
      params: activeOnly ? { activeOnly: true } : undefined,
    });
    return response.data;
  },

  /**
   * Récupère le nombre de politiques SLA actives (KPI dashboard Admin).
   */
  count: async (): Promise<number> => {
    const response = await api.get<{ count: number }>(`${PREFIX}/count`);
    return response.data.count;
  },

  /**
   * Récupère une politique SLA par ID.
   */
  getById: async (id: number): Promise<SlaPolicy> => {
    const response = await api.get<SlaPolicy>(`${PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Crée une nouvelle politique SLA.
   */
  create: async (request: SlaPolicyRequest): Promise<SlaPolicy> => {
    const response = await api.post<SlaPolicy>(PREFIX, request);
    return response.data;
  },

  /**
   * Met à jour une politique SLA existante.
   */
  update: async (id: number, request: SlaPolicyRequest): Promise<SlaPolicy> => {
    const response = await api.put<SlaPolicy>(`${PREFIX}/${id}`, request);
    return response.data;
  },

  /**
   * Supprime une politique SLA.
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`${PREFIX}/${id}`);
  },
};

export default slaService;
