package com.billcom.mts.dto.sla;

import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour une règle d'escalade.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EscalationRuleResponse {
    private Long id;
    private String name;
    private String description;
    private String triggerType;
    private Integer thresholdPercent;
    private Integer escalationLevel;
    private Long autoAssignToId;
    private String autoAssignToName;
    private String notifyRoles;
    private String changePriority;
    private Boolean enabled;
    private String priorityFilter;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
