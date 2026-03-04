package com.billcom.mts.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * ReportResponse - DTO complet pour les réponses de rapport.
 * V29 – Ajout du résumé exécutif, filtres utilisés, format, KPIs embarqués.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {

    private Long id;
    private String title;
    private String description;

    /** Résumé exécutif auto-généré (V29). */
    private String executiveSummary;

    private String reportType;
    private String reportTypeLabel;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private String formattedPeriod;

    // Fichier
    private String fileName;
    private Long fileSize;
    private String formattedFileSize;
    private String mimeType;

    /** Format de sortie: PDF ou CSV (V29). */
    private String format;

    // Service associé (optionnel)
    private Long serviceId;
    private String serviceName;

    // Auteur
    private Long createdById;
    private String createdByName;

    // Statistiques
    private Integer downloadCount;
    private Boolean isPublished;

    /** Origine: UPLOADED ou GENERATED */
    private String source;
    private String sourceLabel;

    // ---- V29 – Filtres utilisés pour traçabilité ----
    private Long serviceFilterId;
    private String serviceFilterName;
    private String teamFilter;
    private Long clientFilterId;
    private String clientFilterName;
    private String statusFilter;

    // ---- V29 – KPIs embarqués (dans la réponse JSON, pas seulement le PDF) ----
    private Long ticketsCreated;
    private Long ticketsResolved;
    private Long ticketsCritical;
    private Long ticketsSlaBreached;
    private Long incidentsCount;
    private Long incidentsCritical;
    private Double slaCompliancePct;
    private Long backlogCount;

    // Dates
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
