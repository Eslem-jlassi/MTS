package com.billcom.mts.dto.incident;

import com.billcom.mts.enums.IncidentImpact;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentRequest {

    @NotBlank
    private String title;

    private String description;

    @NotNull
    private Severity severity;

    private IncidentImpact impact;

    private IncidentStatus status;

    @NotNull
    private Long serviceId;

    /** Legacy single ticket link. */
    private Long ticketId;

    /** Multi-tickets linking. */
    private List<Long> ticketIds;

    /** Services affectés (en plus du service principal). */
    private List<Long> affectedServiceIds;

    /** Commandant d'incident. */
    private Long commanderId;

    @NotNull
    private LocalDateTime startedAt;

    private LocalDateTime resolvedAt;

    private String cause;
}
