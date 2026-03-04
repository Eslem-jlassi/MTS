package com.billcom.mts.dto.sla;

import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour un événement de la timeline SLA.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SlaTimelineResponse {
    private Long id;
    private Long ticketId;
    private String ticketNumber;
    private String eventType;
    private String oldValue;
    private String newValue;
    private String details;
    private Long pausedMinutes;
    private LocalDateTime createdAt;
}
