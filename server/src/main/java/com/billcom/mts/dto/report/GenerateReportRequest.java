package com.billcom.mts.dto.report;

import com.billcom.mts.enums.ReportType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Requête pour générer un rapport périodique enrichi.
 * V29 – Filtres avancés: service, équipe, client, statut + format de sortie.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateReportRequest {

    @NotNull
    private ReportType reportType;

    @NotNull
    private LocalDate periodStart;

    @NotNull
    private LocalDate periodEnd;

    private Boolean publish;

    // ---- V29 – Filtres avancés ----

    /** ID du service à filtrer (null = tous). */
    private Long serviceId;

    /** Nom de l'équipe à filtrer (null = toutes). */
    private String team;

    /** ID du client à filtrer (null = tous). */
    private Long clientId;

    /** Statut ticket à filtrer (ex: "OPEN", null = tous). */
    private String ticketStatus;

    /** Format de sortie: "PDF" (défaut) ou "CSV". */
    private String format;
}
