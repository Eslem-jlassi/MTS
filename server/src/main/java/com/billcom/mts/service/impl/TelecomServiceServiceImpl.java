package com.billcom.mts.service.impl;

import com.billcom.mts.dto.service.*;
import com.billcom.mts.entity.ServiceStatusHistory;
import com.billcom.mts.entity.ServiceDependency;
import com.billcom.mts.entity.SlaConfig;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.ServiceStatus;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.*;
import com.billcom.mts.service.TelecomServiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Telecom service management implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TelecomServiceServiceImpl implements TelecomServiceService {

    private final TelecomServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final ServiceDependencyRepository serviceDependencyRepository;
    private final ServiceStatusHistoryRepository statusHistoryRepository;
    private final IncidentRepository incidentRepository;

    @Override
    @Transactional
    public ServiceResponse createService(ServiceRequest request) {
        if (serviceRepository.existsByNameIgnoreCase(request.getName())) {
            throw new BadRequestException("Service name already exists: " + request.getName());
        }

        User currentUser = getCurrentUser();

        TelecomService service = TelecomService.builder()
            .name(request.getName())
            .description(request.getDescription())
            .category(request.getCategory())
            .isActive(request.getIsActive() != null ? request.getIsActive() : true)
            .status(request.getStatus() != null ? request.getStatus() : ServiceStatus.UP)
            .criticality(request.getCriticality() != null ? request.getCriticality() : com.billcom.mts.enums.ServiceCriticality.MEDIUM)
            .createdBy(currentUser)
            .build();

        // Owner
        if (request.getOwnerId() != null) {
            User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getOwnerId()));
            service.setOwner(owner);
        }

        // SLA Policy
        if (request.getSlaPolicyId() != null) {
            // We just set the ID reference - JPA handles it
            SlaConfig slaPolicy = new SlaConfig();
            slaPolicy.setId(request.getSlaPolicyId());
            service.setSlaPolicy(slaPolicy);
        }

        service = serviceRepository.save(service);
        log.info("Telecom service created: {}", service.getName());
        return mapToResponse(service);
    }

    @Override
    @Transactional
    public ServiceResponse updateService(Long serviceId, ServiceRequest request) {
        TelecomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));

        if (request.getName() != null) {
            if (!service.getName().equalsIgnoreCase(request.getName()) 
                && serviceRepository.existsByNameIgnoreCase(request.getName())) {
                throw new BadRequestException("Service name already exists: " + request.getName());
            }
            service.setName(request.getName());
        }
        if (request.getDescription() != null) service.setDescription(request.getDescription());
        if (request.getCategory() != null) service.setCategory(request.getCategory());
        if (request.getIsActive() != null) service.setIsActive(request.getIsActive());
        if (request.getStatus() != null) service.setStatus(request.getStatus());
        if (request.getCriticality() != null) service.setCriticality(request.getCriticality());

        if (request.getOwnerId() != null) {
            User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getOwnerId()));
            service.setOwner(owner);
        }

        if (request.getSlaPolicyId() != null) {
            SlaConfig slaPolicy = new SlaConfig();
            slaPolicy.setId(request.getSlaPolicyId());
            service.setSlaPolicy(slaPolicy);
        }

        service = serviceRepository.save(service);
        log.info("Telecom service updated: {}", service.getName());
        return mapToResponse(service);
    }

    @Override
    public ServiceResponse getServiceById(Long serviceId) {
        TelecomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));
        return mapToResponse(service);
    }

    @Override
    public Page<ServiceResponse> getAllServices(Pageable pageable) {
        return serviceRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public List<ServiceResponse> getActiveServices() {
        return serviceRepository.findByIsActiveTrue().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ServiceResponse activateService(Long serviceId) {
        TelecomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));
        service.setIsActive(true);
        service = serviceRepository.save(service);
        log.info("Telecom service activated: {}", service.getName());
        return mapToResponse(service);
    }

    @Override
    @Transactional
    public ServiceResponse deactivateService(Long serviceId) {
        TelecomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));
        service.setIsActive(false);
        service = serviceRepository.save(service);
        log.info("Telecom service deactivated: {}", service.getName());
        return mapToResponse(service);
    }

    @Override
    @Transactional
    public ServiceResponse updateStatus(Long serviceId, ServiceStatusUpdateRequest request, User currentUser) {
        TelecomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));

        ServiceStatus oldStatus = service.getStatus();
        ServiceStatus newStatus = request.getStatus();

        if (oldStatus == newStatus) {
            return mapToResponse(service);
        }

        // Record history
        ServiceStatusHistory history = ServiceStatusHistory.builder()
            .service(service)
            .oldStatus(oldStatus)
            .newStatus(newStatus)
            .changedBy(currentUser)
            .reason(request.getReason())
            .build();
        statusHistoryRepository.save(history);

        service.setStatus(newStatus);
        service = serviceRepository.save(service);

        log.info("Service {} status changed: {} -> {} by {}", 
            service.getName(), oldStatus, newStatus, currentUser.getEmail());
        return mapToResponse(service);
    }

    @Override
    public List<ServiceResponse> getServicesByCategory(String category) {
        ServiceCategory cat = ServiceCategory.valueOf(category.toUpperCase());
        return serviceRepository.findByCategoryAndIsActiveTrue(cat).stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ServiceResponse> getHealthDashboard() {
        return serviceRepository.findActiveOrderByHealthPriority().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ServiceStatusHistoryResponse> getStatusHistory(Long serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service", "id", serviceId);
        }
        return statusHistoryRepository.findByServiceIdOrderByCreatedAtDesc(serviceId).stream()
            .map(this::mapHistoryToResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ServiceStatusHistoryResponse> getRecentStatusHistory(Long serviceId, int days) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service", "id", serviceId);
        }
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return statusHistoryRepository.findByServiceIdAndCreatedAtAfterOrderByCreatedAtAsc(serviceId, since)
            .stream()
            .map(this::mapHistoryToResponse)
            .collect(Collectors.toList());
    }

    @Override
    public TopologyResponse getTopology() {
        List<ServiceDependency> deps = serviceDependencyRepository.findAllWithServices();
        Set<Long> ids = new HashSet<>();
        List<TopologyResponse.ServiceNode> nodes = new ArrayList<>();
        List<TopologyResponse.Edge> edges = new ArrayList<>();
        for (ServiceDependency d : deps) {
            addNode(nodes, ids, d.getParent());
            addNode(nodes, ids, d.getChild());
            edges.add(TopologyResponse.Edge.builder()
                .parentId(d.getParent().getId())
                .childId(d.getChild().getId())
                .parentName(d.getParent().getName())
                .childName(d.getChild().getName())
                .build());
        }
        return TopologyResponse.builder().nodes(nodes).edges(edges).build();
    }

    private void addNode(List<TopologyResponse.ServiceNode> nodes, Set<Long> ids, TelecomService s) {
        if (s == null || ids.contains(s.getId())) return;
        ids.add(s.getId());
        nodes.add(TopologyResponse.ServiceNode.builder()
            .id(s.getId())
            .name(s.getName())
            .status(s.getStatus() != null ? s.getStatus().name() : "UP")
            .category(s.getCategory() != null ? s.getCategory().name() : null)
            .build());
    }

    @Override
    @Transactional
    public void deleteService(Long serviceId) {
        TelecomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));
        if (service.getTickets() != null && !service.getTickets().isEmpty()) {
            throw new BadRequestException("Cannot delete service with existing tickets. Deactivate it instead.");
        }
        serviceRepository.delete(service);
        log.info("Telecom service deleted: {}", service.getName());
    }

    // =========================================================================
    // MAPPING
    // =========================================================================

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private ServiceResponse mapToResponse(TelecomService service) {
        long activeIncidents = 0;
        try {
            activeIncidents = incidentRepository.countByServiceIdAndStatusIn(
                service.getId(), List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS));
        } catch (Exception e) {
            // Ignore if incident query fails
        }

        return ServiceResponse.builder()
            .id(service.getId())
            .name(service.getName())
            .category(service.getCategory())
            .categoryLabel(service.getCategory() != null ? service.getCategory().getLabel() : null)
            .description(service.getDescription())
            .isActive(service.getIsActive())
            // Status & KPIs
            .status(service.getStatus())
            .statusLabel(service.getStatus() != null ? service.getStatus().getLabel() : null)
            .availabilityPct(service.getAvailabilityPct())
            .avgLatencyMs(service.getAvgLatencyMs())
            .mttrMinutes(service.getMttrMinutes())
            // Owner
            .ownerId(service.getOwner() != null ? service.getOwner().getId() : null)
            .ownerName(service.getOwner() != null ? service.getOwner().getFullName() : null)
            // Criticality
            .criticality(service.getCriticality())
            .criticalityLabel(service.getCriticality() != null ? service.getCriticality().getLabel() : null)
            // SLA Policy
            .slaPolicyId(service.getSlaPolicy() != null ? service.getSlaPolicy().getId() : null)
            .slaPolicyName(service.getSlaPolicy() != null ? service.getSlaPolicy().getName() : null)
            // Creator
            .createdById(service.getCreatedBy() != null ? service.getCreatedBy().getId() : null)
            .createdByName(service.getCreatedBy() != null ? service.getCreatedBy().getFullName() : null)
            // Counts
            .ticketCount(service.getTickets() != null ? (long) service.getTickets().size() : 0L)
            .activeIncidentCount(activeIncidents)
            .createdAt(service.getCreatedAt())
            .updatedAt(service.getUpdatedAt())
            .build();
    }

    private ServiceStatusHistoryResponse mapHistoryToResponse(ServiceStatusHistory h) {
        return ServiceStatusHistoryResponse.builder()
            .id(h.getId())
            .serviceId(h.getService().getId())
            .oldStatus(h.getOldStatus())
            .oldStatusLabel(h.getOldStatus() != null ? h.getOldStatus().getLabel() : null)
            .newStatus(h.getNewStatus())
            .newStatusLabel(h.getNewStatus() != null ? h.getNewStatus().getLabel() : null)
            .changedById(h.getChangedBy() != null ? h.getChangedBy().getId() : null)
            .changedByName(h.getChangedBy() != null ? h.getChangedBy().getFullName() : null)
            .reason(h.getReason())
            .createdAt(h.getCreatedAt())
            .build();
    }
}
