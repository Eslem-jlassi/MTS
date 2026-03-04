package com.billcom.mts.dto.ticket;

import com.billcom.mts.enums.TicketStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Requête pour changer le statut en masse. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkStatusRequest {

    @NotEmpty(message = "Au moins un ticket doit être sélectionné")
    private List<Long> ticketIds;

    @NotNull(message = "Le nouveau statut est requis")
    private TicketStatus newStatus;

    /** Commentaire optionnel (ex. pour RESOLVED, renseigner la résolution). */
    private String comment;
}
