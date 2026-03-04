package com.billcom.mts.service;

import com.billcom.mts.dto.service.*;
import com.billcom.mts.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for telecom service management.
 */
public interface TelecomServiceService {

    ServiceResponse createService(ServiceRequest request);

    ServiceResponse updateService(Long serviceId, ServiceRequest request);

    ServiceResponse getServiceById(Long serviceId);

    Page<ServiceResponse> getAllServices(Pageable pageable);

    List<ServiceResponse> getActiveServices();

    ServiceResponse activateService(Long serviceId);

    ServiceResponse deactivateService(Long serviceId);

    void deleteService(Long serviceId);

    TopologyResponse getTopology();

    /** Update service operational status with history tracking. */
    ServiceResponse updateStatus(Long serviceId, ServiceStatusUpdateRequest request, User currentUser);

    /** Get services by category. */
    List<ServiceResponse> getServicesByCategory(String category);

    /** Get services ordered by health priority (worst first). */
    List<ServiceResponse> getHealthDashboard();

    /** Get status change history for a service. */
    List<ServiceStatusHistoryResponse> getStatusHistory(Long serviceId);

    /** Recent status history (for sparkline). */
    List<ServiceStatusHistoryResponse> getRecentStatusHistory(Long serviceId, int days);
}
