package com.billcom.mts.dto.service;

import com.billcom.mts.enums.ServiceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceStatusUpdateRequest {

    @NotNull(message = "New status is required")
    private ServiceStatus status;

    private String reason;
}
