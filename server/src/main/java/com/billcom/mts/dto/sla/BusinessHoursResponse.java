package com.billcom.mts.dto.sla;

import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour les horaires ouvrés.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BusinessHoursResponse {
    private Long id;
    private String name;
    private Integer startHour;
    private Integer endHour;
    private String workDays;
    private String timezone;
    private Boolean isDefault;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
