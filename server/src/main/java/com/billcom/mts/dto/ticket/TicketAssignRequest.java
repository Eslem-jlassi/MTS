package com.billcom.mts.dto.ticket;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Requête d'assignation d'un ticket à un agent")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketAssignRequest {

    @Schema(description = "ID de l'agent à assigner", example = "3", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Agent ID is required")
    private Long agentId;

    /**
     * Optional comment when assigning ticket.
     */
    private String comment;
}
