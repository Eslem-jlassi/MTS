// =============================================================================
// MTS TELECOM - Report Service
// V29 – Filtres avancés, Executive Summary, export PDF/CSV, KPIs embarqués
// =============================================================================

import api from "./client";

const REPORTS_PREFIX = "/reports";

/**
 * Interface complète pour un rapport (V29 enrichi).
 * Inclut les nouveaux champs: executiveSummary, format, filtres, KPIs.
 */
export interface Report {
  id: number;
  title: string;
  description: string;

  /** Résumé exécutif auto-généré (V29) */
  executiveSummary?: string;

  reportType: string;
  reportTypeLabel?: string;
  periodStart: string;
  periodEnd: string;
  formattedPeriod?: string;

  // Fichier
  fileName: string;
  fileSize: number;
  formattedFileSize?: string;
  mimeType?: string;

  /** Format de sortie: "PDF" ou "CSV" (V29) */
  format?: string;

  // Service associé
  serviceId?: number;
  serviceName?: string;

  // Auteur
  createdById?: number;
  createdByName: string;

  // Statistiques
  downloadCount: number;
  isPublished: boolean;
  source?: string;
  sourceLabel?: string;

  // V29 – Filtres utilisés (traçabilité)
  serviceFilterId?: number;
  serviceFilterName?: string;
  teamFilter?: string;
  clientFilterId?: number;
  clientFilterName?: string;
  statusFilter?: string;

  // V29 – KPIs embarqués (renseignés uniquement pour les rapports générés)
  ticketsCreated?: number;
  ticketsResolved?: number;
  ticketsCritical?: number;
  ticketsSlaBreached?: number;
  incidentsCount?: number;
  incidentsCritical?: number;
  slaCompliancePct?: number;
  backlogCount?: number;

  // Dates
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

export interface ReportListResponse {
  content: Report[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

/**
 * Paramètres de génération de rapport V29.
 */
export interface GenerateReportParams {
  reportType: string;
  periodStart: string;
  periodEnd: string;
  publish?: boolean;
  /** Filtre par service (optionnel) */
  serviceId?: number;
  /** Filtre par équipe (optionnel) */
  team?: string;
  /** Filtre par client (optionnel) */
  clientId?: number;
  /** Filtre par statut ticket (optionnel) */
  ticketStatus?: string;
  /** Format de sortie: "PDF" (défaut) ou "CSV" */
  format?: string;
}

export const reportService = {
  /**
   * Récupère tous les rapports (publiés) avec pagination.
   */
  getReports: async (params?: { page?: number; size?: number }): Promise<ReportListResponse> => {
    const response = await api.get<ReportListResponse>(`${REPORTS_PREFIX}/all`, { params });
    return response.data;
  },

  /**
   * Récupère un rapport par ID.
   */
  getReportById: async (id: number): Promise<Report> => {
    const response = await api.get<Report>(`${REPORTS_PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Upload un rapport PDF manuellement.
   */
  upload: async (formData: FormData): Promise<Report> => {
    const response = await api.post<Report>(`${REPORTS_PREFIX}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Re-upload le fichier PDF d'un rapport existant (remplace le fichier actuel).
   */
  reuploadFile: async (id: number, formData: FormData): Promise<Report> => {
    const response = await api.put<Report>(`${REPORTS_PREFIX}/${id}/reupload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Télécharge le fichier d'un rapport (PDF ou CSV).
   * Retourne un Blob prêt à être sauvegardé côté client.
   */
  download: async (id: number): Promise<Blob> => {
    const response = await api.get(`${REPORTS_PREFIX}/${id}/download`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },

  /**
   * Génère un rapport périodique enrichi (V29).
   * Accepte les filtres avancés (service, équipe, client, statut)
   * et le format de sortie (PDF ou CSV).
   */
  generate: async (body: GenerateReportParams): Promise<Report> => {
    const response = await api.post<Report>(`${REPORTS_PREFIX}/generate`, body);
    return response.data;
  },

  /**
   * Recherche de rapports avec filtres.
   */
  searchReports: async (params?: {
    reportType?: string;
    serviceId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<ReportListResponse> => {
    const response = await api.get<ReportListResponse>(`${REPORTS_PREFIX}/search`, { params });
    return response.data;
  },

  /**
   * Publie un rapport.
   */
  publish: async (id: number): Promise<Report> => {
    const response = await api.put<Report>(`${REPORTS_PREFIX}/${id}/publish`);
    return response.data;
  },

  /**
   * Dépublie un rapport.
   */
  unpublish: async (id: number): Promise<Report> => {
    const response = await api.put<Report>(`${REPORTS_PREFIX}/${id}/unpublish`);
    return response.data;
  },

  /**
   * Supprime un rapport.
   */
  deleteReport: async (id: number): Promise<void> => {
    await api.delete(`${REPORTS_PREFIX}/${id}`);
  },
};
