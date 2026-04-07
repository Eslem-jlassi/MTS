// =============================================================================
// MTS TELECOM - AuditLogService (Business Layer)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.service;

import com.billcom.mts.entity.AuditLog;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * AuditLogService - Gestion centralisée des logs d'audit (RGPD, ISO 27001).
 * 
 * Features:
 * - Asynchronous logging (non-blocking, separate transaction)
 * - Automatic IP + User-Agent extraction from HttpServletRequest
 * - Convenience methods for common actions (ticket created, assigned, status changed)
 * - Advanced search with multiple filters (user, entity, action, date range, IP)
 * 
 * Usage in controllers/services:
 * ```java
 * auditLogService.log(
 *     AuditAction.TICKET_CREATED,
 *     "TICKET", ticket.getId(), ticket.getTitle(),
 *     "Nouveau ticket créé par " + user.getEmail(),
 *     null, ticketJson,
 *     user, request
 * );
 * ```
 * 
 * @author Billcom Consulting
 * @version 1.0
 * @since 2026-02-28
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    // =========================================================================
    // CORE LOGGING METHODS
    // =========================================================================

    /**
     * Log an action with full details (main method).
     * 
     * This method is @Async and runs in a separate transaction to avoid blocking
     * the main business logic and to ensure audit logs are persisted even if
     * the parent transaction rolls back.
     * 
     * @param action Action type (TICKET_CREATED, SERVICE_UPDATED, etc.)
     * @param entityType Entity type (TICKET, SERVICE, CLIENT, USER, etc.)
     * @param entityId Entity ID (e.g., ticket ID, service ID)
     * @param entityName Entity display name (e.g., "Ticket #123", "Service Fibre FTTH")
     * @param description Human-readable description (e.g., "Statut changé de OUVERT à EN_COURS")
     * @param oldValue Old value before change (JSON or plain text, nullable)
     * @param newValue New value after change (JSON or plain text, nullable)
     * @param user User who performed the action (nullable for system actions)
     * @param request HTTP request (for IP and User-Agent extraction, nullable)
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
        AuditAction action,
        String entityType,
        Long entityId,
        String entityName,
        String description,
        String oldValue,
        String newValue,
        User user,
        HttpServletRequest request
    ) {
        try {
            String ipAddress = extractIpAddress(request);
            String userAgent = extractUserAgent(request);

            AuditLog auditLog = AuditLog.builder()
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .entityName(entityName)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .user(user)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

            auditLogRepository.save(auditLog);

            log.debug("✅ Audit log created: {}", auditLog);
        } catch (Exception e) {
            // Never throw exceptions from audit logging (fail silently to avoid breaking business logic)
            log.error("❌ Failed to create audit log for action {}: {}", action, e.getMessage(), e);
        }
    }

    /**
     * Simplified logging without old/new values (for simple actions)
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
        AuditAction action,
        String entityType,
        Long entityId,
        String entityName,
        String description,
        User user,
        HttpServletRequest request
    ) {
        log(action, entityType, entityId, entityName, description, null, null, user, request);
    }

    /**
     * System action logging (no user)
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSystemAction(
        AuditAction action,
        String entityType,
        Long entityId,
        String entityName,
        String description
    ) {
        log(action, entityType, entityId, entityName, description, null, null, null, null);
    }

    // =========================================================================
    // QUERY METHODS (for controllers)
    // =========================================================================

    /**
     * Get entity history (for TicketDetailPage "Historique" tab)
     */
    public Page<AuditLog> getEntityHistory(String entityType, Long entityId, Pageable pageable) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(
            entityType, entityId, pageable
        );
    }

    /**
     * Get last 10 actions for an entity (for quick preview)
     */
    public List<AuditLog> getRecentEntityHistory(String entityType, Long entityId) {
        return auditLogRepository.findTop10ByEntityTypeAndEntityIdOrderByTimestampDesc(
            entityType, entityId
        );
    }

    /**
     * Get all actions by a user (for admin audit)
     */
    public Page<AuditLog> getUserActions(Long userId, Pageable pageable) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId, pageable);
    }

    /**
     * Advanced search with multiple filters (for AuditLogPage)
     */
    public Page<AuditLog> search(
        Long userId,
        String entityType,
        AuditAction action,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String ipAddress,
        Pageable pageable
    ) {
        return auditLogRepository.searchAuditLogs(
            userId, entityType, action, startDate, endDate, ipAddress, pageable
        );
    }

    /**
     * Get all audit logs (for admin)
     */
    public Page<AuditLog> getAll(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    /**
     * Get a specific audit log by id.
     */
    public Optional<AuditLog> getById(Long id) {
        return auditLogRepository.findById(id);
    }

    /**
     * Get recent activity (for admin dashboard)
     */
    public List<AuditLog> getRecentActivity(int limit) {
        return auditLogRepository.findTopNByOrderByTimestampDesc(
            org.springframework.data.domain.PageRequest.of(0, limit)
        );
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Extract IP address from HTTP request
     */
    private String extractIpAddress(HttpServletRequest request) {
        if (request == null) return null;

        // Check for proxy headers (X-Forwarded-For, X-Real-IP)
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // Handle multiple IPs in X-Forwarded-For (take first one)
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }

    /**
     * Extract User-Agent from HTTP request
     */
    private String extractUserAgent(HttpServletRequest request) {
        if (request == null) return null;
        return request.getHeader("User-Agent");
    }
}
