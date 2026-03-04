package com.billcom.mts.dto.service;

import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.ServiceCriticality;
import com.billcom.mts.enums.ServiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Telecom service create/update request DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRequest {

    @NotBlank(message = "Service name is required")
    @Size(max = 100)
    private String name;

    private ServiceCategory category;

    private String description;

    private Boolean isActive;

    private ServiceStatus status;

    private Long ownerId;

    private ServiceCriticality criticality;

    private Long slaPolicyId;
}
