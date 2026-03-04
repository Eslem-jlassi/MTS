package com.billcom.mts.dto.sla;

import com.billcom.mts.enums.TicketPriority;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de création / mise à jour d'une politique SLA.
 * <p>
 * Validation :
 * - name : obligatoire, 2-100 caractères
 * - priority : obligatoire (CRITICAL, HIGH, MEDIUM, LOW)
 * - slaHours (résolution) : obligatoire, >= 1
 * - responseTimeHours (première réponse) : optionnel, >= 1
 * - serviceId : optionnel (null = politique globale)
 * - active : optionnel (défaut true)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaPolicyRequest {

    @NotBlank(message = "Le nom de la politique est obligatoire")
    @Size(min = 2, max = 100, message = "Le nom doit contenir entre 2 et 100 caractères")
    private String name;

    @Size(max = 4000, message = "La description ne doit pas dépasser 4000 caractères")
    private String description;

    @NotNull(message = "La priorité est obligatoire")
    private TicketPriority priority;

    /** Délai maximum de résolution en heures */
    @NotNull(message = "Le délai de résolution est obligatoire")
    @Min(value = 1, message = "Le délai de résolution doit être d'au moins 1 heure")
    private Integer resolutionTimeHours;

    /** Délai maximum de première réponse en heures */
    @Min(value = 1, message = "Le délai de réponse doit être d'au moins 1 heure")
    private Integer responseTimeHours;

    /** ID du service cible (null = politique globale) */
    private Long serviceId;

    /** ID des horaires ouvrés associés (null = 24/7) */
    private Long businessHoursId;

    /** Activer/désactiver la politique */
    private Boolean active;
}
