// =============================================================================
// MTS TELECOM - Escalation & SLA Avancé Service
// =============================================================================

import api from "./client";
import type {
  SlaEscalationStats,
  EscalationRule,
  EscalationRuleRequest,
  SlaTimelineEvent,
} from "../types";

const PREFIX = "/sla-escalation";

/**
 * Service frontend pour la gestion de l'escalade automatique et du SLA avancé.
 * Appelle les endpoints backend :
 * - GET    /api/sla-escalation/stats
 * - GET    /api/sla-escalation/timeline/:ticketId
 * - GET    /api/sla-escalation/rules
 * - POST   /api/sla-escalation/rules
 * - PUT    /api/sla-escalation/rules/:id
 * - DELETE /api/sla-escalation/rules/:id
 * - POST   /api/sla-escalation/evaluate
 */
export const escalationService = {
  /**
   * Récupère les KPI globaux SLA & Escalade.
   */
  getStats: async (): Promise<SlaEscalationStats> => {
    const response = await api.get<SlaEscalationStats>(`${PREFIX}/stats`);
    return response.data;
  },

  /**
   * Récupère l'historique SLA (timeline) d'un ticket.
   */
  getTimeline: async (ticketId: number): Promise<SlaTimelineEvent[]> => {
    const response = await api.get<SlaTimelineEvent[]>(`${PREFIX}/timeline/${ticketId}`);
    return response.data;
  },

  /**
   * Liste toutes les règles d'escalade.
   */
  listRules: async (): Promise<EscalationRule[]> => {
    const response = await api.get<EscalationRule[]>(`${PREFIX}/rules`);
    return response.data;
  },

  /**
   * Crée une nouvelle règle d'escalade.
   */
  createRule: async (request: EscalationRuleRequest): Promise<EscalationRule> => {
    const response = await api.post<EscalationRule>(`${PREFIX}/rules`, request);
    return response.data;
  },

  /**
   * Met à jour une règle d'escalade existante.
   */
  updateRule: async (id: number, request: EscalationRuleRequest): Promise<EscalationRule> => {
    const response = await api.put<EscalationRule>(`${PREFIX}/rules/${id}`, request);
    return response.data;
  },

  /**
   * Supprime une règle d'escalade.
   */
  deleteRule: async (id: number): Promise<void> => {
    await api.delete(`${PREFIX}/rules/${id}`);
  },

  /**
   * Force l'évaluation immédiate de toutes les règles d'escalade.
   * Retourne le nombre de tickets escaladés.
   */
  forceEvaluate: async (): Promise<number> => {
    const response = await api.post<{ escalatedCount: number }>(`${PREFIX}/evaluate`);
    return response.data.escalatedCount;
  },
};

export default escalationService;
