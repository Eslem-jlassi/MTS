package com.billcom.mts.controller;

import com.billcom.mts.dto.service.*;
import com.billcom.mts.entity.User;
import com.billcom.mts.service.TelecomServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for telecom service management.
 */
@Slf4j
@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
@Tag(name = "Telecom Services", description = "Telecom service management")
public class ServiceController {

    private final TelecomServiceService telecomServiceService;

    // =========================================================================
    // CRUD
    // =========================================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new telecom service (Admin only)")
    public ServiceResponse createService(@Valid @RequestBody ServiceRequest request) {
        return telecomServiceService.createService(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a telecom service (Admin only)")
    public ServiceResponse updateService(
            @PathVariable Long id,
            @Valid @RequestBody ServiceRequest request) {
        return telecomServiceService.updateService(id, request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get service by ID")
    public ServiceResponse getServiceById(@PathVariable Long id) {
        return telecomServiceService.getServiceById(id);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get all services with pagination")
    public Page<ServiceResponse> getAllServices(Pageable pageable) {
        return telecomServiceService.getAllServices(pageable);
    }

    @GetMapping("/active")
    @Operation(summary = "Get all active services")
    public List<ServiceResponse> getActiveServices() {
        return telecomServiceService.getActiveServices();
    }

    @GetMapping("/topology")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Graphe de dépendances services (topologie)")
    public TopologyResponse getTopology() {
        return telecomServiceService.getTopology();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a service (Admin only, only if no tickets exist)")
    public void deleteService(@PathVariable Long id) {
        telecomServiceService.deleteService(id);
    }

    // =========================================================================
    // STATUS
    // =========================================================================

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update service operational status with history tracking")
    public ServiceResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ServiceStatusUpdateRequest request,
            @AuthenticationPrincipal User user) {
        return telecomServiceService.updateStatus(id, request, user);
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate a service")
    public ServiceResponse activateService(@PathVariable Long id) {
        return telecomServiceService.activateService(id);
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate a service")
    public ServiceResponse deactivateService(@PathVariable Long id) {
        return telecomServiceService.deactivateService(id);
    }

    // =========================================================================
    // CATEGORY & HEALTH
    // =========================================================================

    @GetMapping("/category/{category}")
    @Operation(summary = "Get services by category")
    public List<ServiceResponse> getByCategory(@PathVariable String category) {
        return telecomServiceService.getServicesByCategory(category);
    }

    @GetMapping("/health")
    @Operation(summary = "Health dashboard - services ordered by health priority")
    public List<ServiceResponse> getHealthDashboard() {
        return telecomServiceService.getHealthDashboard();
    }

    // =========================================================================
    // STATUS HISTORY
    // =========================================================================

    @GetMapping("/{id}/status-history")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Service status change history")
    public List<ServiceStatusHistoryResponse> getStatusHistory(@PathVariable Long id) {
        return telecomServiceService.getStatusHistory(id);
    }

    @GetMapping("/{id}/status-history/recent")
    @Operation(summary = "Recent status history (for sparkline)")
    public List<ServiceStatusHistoryResponse> getRecentHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "30") int days) {
        return telecomServiceService.getRecentStatusHistory(id, days);
    }
}
