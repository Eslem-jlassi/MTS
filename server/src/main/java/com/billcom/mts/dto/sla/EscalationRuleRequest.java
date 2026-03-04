package com.billcom.mts.dto.sla;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO de requête pour créer/modifier une règle d'escalade.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EscalationRuleRequest {

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 150)
    private String name;

    @Size(max = 4000)
    private String description;

    /** Type de déclencheur: AT_RISK ou BREACHED */
    @NotBlank(message = "Le type de déclencheur est obligatoire")
    @Size(max = 30)
    private String triggerType;

    /** Seuil en pourcentage (ex: 80 pour AT_RISK) */
    @Min(1) @Max(100)
    private Integer thresholdPercent;

    /** Niveau d'escalade */
    @NotNull(message = "Le niveau d'escalade est obligatoire")
    @Min(1) @Max(5)
    private Integer escalationLevel;

    /** ID utilisateur à auto-assigner (optionnel) */
    private Long autoAssignToId;

    /** Rôles à notifier, séparés par virgule: "MANAGER,ADMIN" */
    @Size(max = 100)
    private String notifyRoles;

    /** Nouvelle priorité à appliquer (optionnel) */
    @Size(max = 20)
    private String changePriority;

    /** Règle active ? */
    private Boolean enabled;

    /** Filtre par priorité (optionnel) */
    @Size(max = 20)
    private String priorityFilter;

    /** Ordre de tri */
    @Min(0)
    private Integer sortOrder;
}
