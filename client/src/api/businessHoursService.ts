// =============================================================================
// MTS TELECOM - Business Hours Service (Horaires ouvrés)
// =============================================================================

import api from "./client";
import type { BusinessHours, BusinessHoursRequest } from "../types";

const PREFIX = "/business-hours";

/**
 * Service frontend pour la gestion des horaires ouvrés.
 * Appelle les endpoints backend :
 * - GET    /api/business-hours
 * - GET    /api/business-hours/:id
 * - POST   /api/business-hours
 * - PUT    /api/business-hours/:id
 * - DELETE /api/business-hours/:id
 */
export const businessHoursService = {
  /**
   * Liste tous les horaires ouvrés.
   * @param activeOnly si true, ne retourne que les actifs
   */
  list: async (activeOnly = false): Promise<BusinessHours[]> => {
    const response = await api.get<BusinessHours[]>(PREFIX, {
      params: activeOnly ? { activeOnly: true } : undefined,
    });
    return response.data;
  },

  /**
   * Récupère un horaire ouvrés par ID.
   */
  getById: async (id: number): Promise<BusinessHours> => {
    const response = await api.get<BusinessHours>(`${PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Crée un nouvel horaire ouvrés.
   */
  create: async (request: BusinessHoursRequest): Promise<BusinessHours> => {
    const response = await api.post<BusinessHours>(PREFIX, request);
    return response.data;
  },

  /**
   * Met à jour un horaire ouvrés existant.
   */
  update: async (id: number, request: BusinessHoursRequest): Promise<BusinessHours> => {
    const response = await api.put<BusinessHours>(`${PREFIX}/${id}`, request);
    return response.data;
  },

  /**
   * Supprime un horaire ouvrés.
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`${PREFIX}/${id}`);
  },
};

export default businessHoursService;
