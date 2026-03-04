package com.billcom.mts.service.impl;

import com.billcom.mts.entity.AuditLog;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.repository.AuditLogRepository;
import com.billcom.mts.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * AuditService legacy implementation.
 * Bridges the old String-based API used by existing callers (TicketService, SlaPolicyService, etc.)
 * to the new AuditLog entity which uses Long entityId and AuditAction enum.
 *
 * Note: New code should use AuditLogService directly (with AuditAction enum + HttpServletRequest).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType, String entityId, String action, User user, String details, String ipAddress) {
        try {
            Long numericEntityId = parseEntityId(entityId);
            AuditAction auditAction = resolveAction(entityType, action);

            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(numericEntityId)
                    .action(auditAction)
                    .user(user)
                    .description(details != null && details.length() > 4000 ? details.substring(0, 4000) : details)
                    .ipAddress(ipAddress)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }
    }

    /**
     * Parse String entity ID to Long (graceful fallback to 0L).
     */
    private Long parseEntityId(String entityId) {
        if (entityId == null) return 0L;
        try {
            return Long.parseLong(entityId);
        } catch (NumberFormatException e) {
            log.warn("Non-numeric entityId '{}', defaulting to 0", entityId);
            return 0L;
        }
    }

    /**
     * Resolve legacy String action to AuditAction enum.
     *
     * Strategy:
     * 1. Try exact enum match (e.g., "SLA_POLICY_CREATED" → AuditAction.SLA_POLICY_CREATED)
     * 2. Compose from entityType + normalized action (e.g., "Ticket" + "CREATE" → TICKET_CREATED)
     * 3. Fallback to SYSTEM_CONFIG_UPDATED for unknown actions
     */
    private AuditAction resolveAction(String entityType, String action) {
        // 1. Try exact enum match
        try {
            return AuditAction.valueOf(action);
        } catch (IllegalArgumentException ignored) {}

        // 2. Compose entityType_action with normalization
        String normalized = normalizeVerb(action);
        String composed = entityType.toUpperCase().replace(" ", "_") + "_" + normalized;
        try {
            return AuditAction.valueOf(composed);
        } catch (IllegalArgumentException ignored) {}

        // 3. Handle special patterns (e.g., "ESCALATION_LEVEL_2" → TICKET_ESCALATED)
        if (action.startsWith("ESCALATION_LEVEL_")) {
            return AuditAction.TICKET_ESCALATED;
        }

        // 4. Fallback
        log.warn("Unknown audit action '{}' for entity '{}', falling back to SYSTEM_CONFIG_UPDATED", action, entityType);
        return AuditAction.SYSTEM_CONFIG_UPDATED;
    }

    /**
     * Normalize legacy verb to past tense (matching enum convention).
     * "CREATE" → "CREATED", "UPDATE" → "UPDATED", etc.
     */
    private String normalizeVerb(String action) {
        switch (action.toUpperCase()) {
            case "CREATE":         return "CREATED";
            case "UPDATE":         return "UPDATED";
            case "DELETE":         return "DELETED";
            case "STATUS_CHANGE":  return "STATUS_CHANGED";
            default:               return action.toUpperCase();
        }
    }
}
