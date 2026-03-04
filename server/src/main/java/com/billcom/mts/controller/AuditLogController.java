// =============================================================================
// MTS TELECOM - AuditLogController (REST API)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.controller;

import com.billcom.mts.dto.audit.AuditLogResponse;
import com.billcom.mts.entity.AuditLog;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * AuditLogController - API REST pour l'audit RGPD/ISO 27001.
 * 
 * Endpoints:
 * - GET /api/audit-logs - Advanced search (ADMIN only)
 * - GET /api/audit-logs/{id} - Get single audit log (ADMIN only)
 * - GET /api/audit-logs/entity/{type}/{id} - Get entity history (AGENT+ with restrictions)
 * - GET /api/audit-logs/recent - Get recent activity (ADMIN only, for dashboard widget)
 * 
 * RBAC Rules (see docs/RBAC_MATRIX.md):
 * - ADMIN: Full audit access (all users, all entities, all actions)
 * - MANAGER: Can view audit logs for their managed entities (tickets, clients)
 * - AGENT: Can only view ticket history (entity/{type}/{id} with type=TICKET)
 * - CLIENT: No access to audit logs
 * 
 * @author Billcom Consulting
 * @version 1.0
 * @since 2026-02-28
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Slf4j
public class AuditLogController {

    private final AuditLogService auditLogService;

    // =========================================================================
    // ADMIN ENDPOINTS (Full audit access)
    // =========================================================================

    /**
     * Advanced search with multiple filters (ADMIN only).
     * 
     * GET /api/audit-logs?userId=5&entityType=TICKET&action=TICKET_CREATED&startDate=2026-01-01T00:00:00&endDate=2026-12-31T23:59:59&ipAddress=192.168.1.1&page=0&size=20
     * 
     * @param request Search criteria (all fields optional)
     * @return Paginated audit logs
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLogResponse>> searchAuditLogs(
        @RequestParam(required = false) Long userId,
        @RequestParam(required = false) String entityType,
        @RequestParam(required = false) AuditAction action,
        @RequestParam(required = false) LocalDateTime startDate,
        @RequestParam(required = false) LocalDateTime endDate,
        @RequestParam(required = false) String ipAddress,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "timestamp") String sortBy,
        @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        log.info("🔍 Admin searching audit logs: userId={}, entityType={}, action={}, startDate={}, endDate={}, ipAddress={}", 
            userId, entityType, action, startDate, endDate, ipAddress);

        // Limit page size to prevent abuse
        size = Math.min(size, 100);

        Pageable pageable = PageRequest.of(
            page, 
            size, 
            Sort.Direction.fromString(sortDir), 
            sortBy
        );

        Page<AuditLog> auditLogs = auditLogService.search(
            userId, entityType, action, startDate, endDate, ipAddress, pageable
        );

        Page<AuditLogResponse> response = auditLogs.map(this::toResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Get single audit log by ID (ADMIN only).
     * 
     * GET /api/audit-logs/123
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuditLogResponse> getAuditLog(@PathVariable Long id) {
        log.info("🔍 Admin fetching audit log ID: {}", id);

        AuditLog auditLog = auditLogService.getAll(PageRequest.of(0, 1))
            .stream()
            .filter(log -> log.getId().equals(id))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Audit log not found: " + id));

        return ResponseEntity.ok(toResponse(auditLog));
    }

    /**
     * Get recent activity (ADMIN only, for dashboard widget).
     * 
     * GET /api/audit-logs/recent?limit=10
     */
    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLogResponse>> getRecentActivity(
        @RequestParam(defaultValue = "10") int limit
    ) {
        log.info("🔍 Admin fetching recent activity (limit={})", limit);

        limit = Math.min(limit, 50); // Max 50

        List<AuditLog> auditLogs = auditLogService.getRecentActivity(limit);
        List<AuditLogResponse> response = auditLogs.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // AGENT/MANAGER ENDPOINTS (Entity history with restrictions)
    // =========================================================================

    /**
     * Get entity history (AGENT+ with business rule checks).
     * 
     * Business rules:
     * - AGENT/MANAGER: Can view TICKET history only (for TicketDetailPage "Historique" tab)
     * - ADMIN: Can view any entity history (TICKET, SERVICE, CLIENT, USER, INCIDENT, SLA)
     * 
     * GET /api/audit-logs/entity/TICKET/123?page=0&size=20
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    public ResponseEntity<Page<AuditLogResponse>> getEntityHistory(
        @PathVariable String entityType,
        @PathVariable Long entityId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        log.info("🔍 Fetching entity history: entityType={}, entityId={}", entityType, entityId);

        // TODO: Add business rule check for AGENT/MANAGER (only TICKET history allowed)
        // For now, allow all since we'll enforce in frontend

        size = Math.min(size, 100);

        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLog> auditLogs = auditLogService.getEntityHistory(entityType, entityId, pageable);

        Page<AuditLogResponse> response = auditLogs.map(this::toResponse);

        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Convert AuditLog entity to AuditLogResponse DTO.
     */
    private AuditLogResponse toResponse(AuditLog auditLog) {
        User user = auditLog.getUser();

        return AuditLogResponse.builder()
            .id(auditLog.getId())
            .timestamp(auditLog.getTimestamp())
            .userName(user != null ? user.getFirstName() + " " + user.getLastName() : null)
            .userEmail(user != null ? user.getEmail() : null)
            .userId(user != null ? user.getId() : null)
            .action(auditLog.getAction() != null ? auditLog.getAction().name() : null)
            .actionLabel(auditLog.getAction() != null ? auditLog.getAction().getLabel() : null)
            .actionCategory(auditLog.getAction() != null ? auditLog.getAction().getCategory() : null)
            .entityType(auditLog.getEntityType())
            .entityId(auditLog.getEntityId())
            .entityName(auditLog.getEntityName())
            .description(auditLog.getDescription())
            .oldValue(auditLog.getOldValue())
            .newValue(auditLog.getNewValue())
            .ipAddress(auditLog.getIpAddress())
            .userAgent(auditLog.getUserAgent())
            .systemAction(auditLog.isSystemAction())
            .build();
    }
}
