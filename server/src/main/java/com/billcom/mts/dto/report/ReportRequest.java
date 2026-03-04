package com.billcom.mts.dto.report;

import com.billcom.mts.enums.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * ReportRequest - DTO pour la création/modification d'un rapport.
 * 
 * RÔLE:
 * Transporte les données du formulaire de création de rapport
 * depuis le frontend vers le backend.
 * 
 * NOTE: Le fichier PDF est envoyé séparément via multipart/form-data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    /**
     * Titre du rapport (obligatoire).
     */
    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 200, message = "Le titre ne peut pas dépasser 200 caractères")
    private String title;

    /**
     * Description du rapport (optionnelle).
     */
    @Size(max = 2000, message = "La description ne peut pas dépasser 2000 caractères")
    private String description;

    /**
     * Type de rapport (obligatoire).
     */
    @NotNull(message = "Le type de rapport est obligatoire")
    private ReportType reportType;

    /**
     * Date de début de la période couverte (obligatoire).
     */
    @NotNull(message = "La date de début est obligatoire")
    private LocalDate periodStart;

    /**
     * Date de fin de la période couverte (obligatoire).
     */
    @NotNull(message = "La date de fin est obligatoire")
    private LocalDate periodEnd;

    /**
     * ID du service concerné (optionnel).
     * Si null, le rapport est global.
     */
    private Long serviceId;

    /**
     * Publier immédiatement le rapport (optionnel, défaut: false).
     */
    private Boolean publish;
}
