// =============================================================================
// MTS TELECOM - AuditLog Entity (Enhanced for RBAC & Audit Phase)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.entity;

import com.billcom.mts.enums.AuditAction;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * AuditLog - Traçabilité complète "qui a fait quoi, quand, comment".
 * 
 * Logs all critical actions on entities: tickets, services, incidents, users, SLA policies.
 * Used for compliance (GDPR, ISO 27001), debugging, and security auditing.
 * 
 * @author Billcom Consulting
 * @version 2.0 - Enhanced with old/new values, description, AuditAction enum
 * @since 2026-02-28
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_entity", columnList = "entity_type, entity_id"),
    @Index(name = "idx_audit_user", columnList = "user_id"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_entity_timestamp", columnList = "entity_type, entity_id, timestamp")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Timestamp of action (indexed for chronological sorting)
     */
    @CreationTimestamp
    @Column(name = "timestamp", updatable = false, nullable = false)
    private LocalDateTime timestamp;

    /**
     * User who performed the action (nullable for system actions)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Action type (enum: TICKET_CREATED, SERVICE_UPDATED, etc.)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(100)")
    private AuditAction action;

    /**
     * Entity type (TICKET, SERVICE, CLIENT, USER, etc.)
     */
    @NotBlank
    @Size(max = 50)
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    /**
     * Entity ID (FK-like, not enforced due to polymorphism)
     */
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    /**
     * Entity display name (e.g., "Ticket #123", "Service Fibre FTTH")
     */
    @Size(max = 255)
    @Column(name = "entity_name", length = 255)
    private String entityName;

    /**
     * Human-readable description of the action
     * e.g., "Statut changé de OUVERT à EN_COURS"
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    /**
     * Old value before the action (JSON or plain text)
     */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /**
     * New value after the action (JSON or plain text)
     */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    /**
     * IP address of the user (for security tracing)
     */
    @Size(max = 45)
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * User agent (browser/client info)
     */
    @Size(max = 255)
    @Column(name = "user_agent", length = 255)
    private String userAgent;

    /**
     * Additional metadata in JSON format (flexible for future extensions)
     */
    @Column(columnDefinition = "JSON")
    private String metadata;

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Check if action was performed by system (no user)
     */
    public boolean isSystemAction() {
        return user == null;
    }

    /**
     * Short representation for logging
     */
    @Override
    public String toString() {
        String userName = user != null ? user.getEmail() : "SYSTEM";
        return String.format("[%s] %s#%d by %s @ %s",
            action != null ? action.name() : "UNKNOWN",
            entityType,
            entityId,
            userName,
            timestamp
        );
    }
}
