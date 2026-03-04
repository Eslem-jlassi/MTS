package com.billcom.mts.dto.service;

import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.ServiceCriticality;
import com.billcom.mts.enums.ServiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Telecom service response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceResponse {

    private Long id;
    private String name;
    private ServiceCategory category;
    private String categoryLabel;
    private String description;
    private Boolean isActive;

    // Statut & KPIs
    private ServiceStatus status;
    private String statusLabel;
    private BigDecimal availabilityPct;
    private Integer avgLatencyMs;
    private Integer mttrMinutes;

    // Owner
    private Long ownerId;
    private String ownerName;

    // Criticité
    private ServiceCriticality criticality;
    private String criticalityLabel;

    // SLA Policy
    private Long slaPolicyId;
    private String slaPolicyName;

    // Creator
    private Long createdById;
    private String createdByName;

    // Compteurs
    private Long ticketCount;
    private Long activeIncidentCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
