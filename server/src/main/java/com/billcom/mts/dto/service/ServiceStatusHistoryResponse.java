package com.billcom.mts.dto.service;

import com.billcom.mts.enums.ServiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceStatusHistoryResponse {

    private Long id;
    private Long serviceId;
    private ServiceStatus oldStatus;
    private String oldStatusLabel;
    private ServiceStatus newStatus;
    private String newStatusLabel;
    private Long changedById;
    private String changedByName;
    private String reason;
    private LocalDateTime createdAt;
}
