package com.billcom.mts.dto.ticket;

import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Requête de changement de statut d'un ticket")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketStatusChangeRequest {

    @Schema(description = "Nouveau statut", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "New status is required")
    private TicketStatus newStatus;

    /** Description de la solution (obligatoire lors du passage à RESOLVED). */
    private String resolution;

    /** Cause racine (optionnel, souvent renseigné à la résolution). */
    private String rootCause;

    /** Catégorie finale (optionnel). */
    private TicketCategory finalCategory;

    /** Temps passé en minutes (optionnel). */
    private Integer timeSpentMinutes;

    /** Impact métier (optionnel, ex: faible, moyen, critique). */
    private String impact;

    /** Commentaire optionnel lors du changement. */
    private String comment;

    /** Marquer le commentaire comme note interne. */
    private Boolean isInternal;
}
