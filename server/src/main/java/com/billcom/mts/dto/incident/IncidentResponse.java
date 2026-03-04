package com.billcom.mts.dto.incident;

import com.billcom.mts.enums.IncidentImpact;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
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
public class IncidentResponse {

    private Long id;
    private String incidentNumber;
    private String title;
    private String description;
    private Severity severity;
    private String severityLabel;
    private IncidentImpact impact;
    private String impactLabel;
    private IncidentStatus status;
    private String statusLabel;

    // Service principal
    private Long serviceId;
    private String serviceName;

    // Legacy single ticket
    private Long ticketId;
    private String ticketNumber;

    // Multi-tickets
    private List<Long> ticketIds;
    private List<String> ticketNumbers;

    // Services affectés
    private List<Long> affectedServiceIds;
    private List<String> affectedServiceNames;

    // Commandant d'incident
    private Long commanderId;
    private String commanderName;

    // Post-mortem
    private String postMortem;
    private LocalDateTime postMortemAt;
    private Boolean hasPostMortem;

    // Timeline
    private Long timelineCount;

    private LocalDateTime startedAt;
    private LocalDateTime resolvedAt;
    private String cause;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
