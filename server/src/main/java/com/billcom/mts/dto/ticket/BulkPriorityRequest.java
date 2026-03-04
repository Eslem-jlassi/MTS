package com.billcom.mts.dto.ticket;

import com.billcom.mts.enums.TicketPriority;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Requête pour changer la priorité en masse. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPriorityRequest {

    @NotEmpty(message = "Au moins un ticket doit être sélectionné")
    private List<Long> ticketIds;

    @NotNull(message = "La nouvelle priorité est requise")
    private TicketPriority priority;
}
