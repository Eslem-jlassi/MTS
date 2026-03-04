package com.billcom.mts.dto.sla;

import com.billcom.mts.enums.TicketPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour une politique SLA.
 * <p>
 * Contient toutes les informations lisibles d'une politique :
 * nom, description, priorité, délais, statut actif, timestamps.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaPolicyResponse {

    private Long id;

    /** Nom lisible de la politique (ex: "Critique - Mission Critical") */
    private String name;

    /** Description détaillée */
    private String description;

    /** Priorité du ticket (CRITICAL, HIGH, MEDIUM, LOW) */
    private TicketPriority priority;

    /** Délai maximum de résolution en heures */
    private Integer resolutionTimeHours;

    /** Délai maximum de première réponse en heures */
    private Integer responseTimeHours;

    /** ID du service cible (null si politique globale) */
    private Long serviceId;

    /** Nom du service cible (null si politique globale) */
    private String serviceName;

    /** ID des horaires ouvrés associés (null = 24/7) */
    private Long businessHoursId;

    /** Nom des horaires ouvrés associés */
    private String businessHoursName;

    /** La politique est-elle active ? */
    private Boolean active;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
