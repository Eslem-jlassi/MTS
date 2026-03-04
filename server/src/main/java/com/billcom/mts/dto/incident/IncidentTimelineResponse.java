package com.billcom.mts.dto.incident;

import com.billcom.mts.enums.IncidentTimelineEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentTimelineResponse {

    private Long id;
    private IncidentTimelineEventType eventType;
    private String eventTypeLabel;
    private String content;
    private String oldValue;
    private String newValue;
    private Long authorId;
    private String authorName;
    private LocalDateTime createdAt;
}
