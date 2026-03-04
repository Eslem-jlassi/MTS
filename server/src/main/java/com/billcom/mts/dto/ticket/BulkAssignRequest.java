package com.billcom.mts.dto.ticket;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Requête pour assigner en masse des tickets à un agent. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAssignRequest {

    @NotEmpty(message = "Au moins un ticket doit être sélectionné")
    private List<Long> ticketIds;

    @NotNull(message = "L'agent assigné est requis")
    private Long agentId;

    /** Commentaire optionnel pour l'historique. */
    private String comment;
}
