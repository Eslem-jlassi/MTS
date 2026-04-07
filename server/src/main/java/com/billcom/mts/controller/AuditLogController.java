package com.billcom.mts.controller;

import com.billcom.mts.dto.audit.AuditLogResponse;
import com.billcom.mts.entity.AuditLog;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.service.AuditLogService;
import com.billcom.mts.service.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * AuditLogController - API REST pour l'audit.
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Slf4j
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final TicketService ticketService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
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
            @RequestParam(defaultValue = "DESC") String sortDir) {
        log.info("Admin searching audit logs: userId={}, entityType={}, action={}",
                userId, entityType, action);

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size, Sort.Direction.fromString(sortDir), sortBy);
        Page<AuditLog> auditLogs = auditLogService.search(
                userId, entityType, action, startDate, endDate, ipAddress, pageable);
        return ResponseEntity.ok(auditLogs.map(this::toResponse));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<AuditLogResponse> getAuditLog(@PathVariable Long id) {
        AuditLog auditLog = auditLogService.getById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Audit log not found: " + id));
        return ResponseEntity.ok(toResponse(auditLog));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AuditLogResponse>> getRecentActivity(
            @RequestParam(defaultValue = "10") int limit) {
        limit = Math.min(limit, 50);
        List<AuditLogResponse> response = auditLogService.getRecentActivity(limit)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<AuditLogResponse>> getEntityHistory(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            Authentication authentication,
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String normalizedEntityType = entityType.toUpperCase(Locale.ROOT);
        log.info("Fetching entity history: entityType={}, entityId={}", normalizedEntityType, entityId);

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));

        if (!isAdmin) {
            if (!"TICKET".equals(normalizedEntityType)) {
                throw new AccessDeniedException("Seul l'historique des tickets est accessible hors ADMIN");
            }

            if (currentUser != null && currentUser.getRole() != UserRole.ADMIN) {
                ticketService.getTicketByIdSecured(entityId, currentUser);
            }
        }

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLog> auditLogs = auditLogService.getEntityHistory(normalizedEntityType, entityId, pageable);
        return ResponseEntity.ok(auditLogs.map(this::toResponse));
    }

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
