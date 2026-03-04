// =============================================================================
// MTS TELECOM - AuditLogResponse DTO
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.dto.audit;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AuditLogResponse - DTO pour afficher l'historique d'audit en UI.
 * 
 * Used in:
 * - AuditLogPage (admin full audit table)
 * - TicketDetailPage "Historique" tab
 * - UserDetailPage action history
 * - ServiceDetailPage change timeline
 * 
 * @author Billcom Consulting
 * @version 2.0 - Enhanced with actionLabel, category, old/new values
 * @since 2026-02-28
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {

    /**
     * Audit log ID (for reference)
     */
    private Long id;

    /**
     * When the action occurred (ISO 8601 format for frontend)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    /**
     * User who performed the action (nullable for system actions)
     */
    private String userName;

    /**
     * User email (for admin audit, nullable for system actions)
     */
    private String userEmail;

    /**
     * User ID (for filtering, nullable for system actions)
     */
    private Long userId;

    /**
     * Action type (TICKET_CREATED, SERVICE_UPDATED, etc.)
     */
    private String action;

    /**
     * Human-readable action label (French)
     * e.g., "Ticket créé", "Statut modifié", "Utilisateur désactivé"
     */
    private String actionLabel;

    /**
     * Action category (for grouping in UI)
     * e.g., "Tickets", "Services", "Utilisateurs"
     */
    private String actionCategory;

    /**
     * Entity type (TICKET, SERVICE, CLIENT, USER, etc.)
     */
    private String entityType;

    /**
     * Entity ID
     */
    private Long entityId;

    /**
     * Entity display name (e.g., "Ticket #123", "Service Fibre FTTH")
     */
    private String entityName;

    /**
     * Human-readable description of the action
     * e.g., "Statut changé de OUVERT à EN_COURS"
     */
    private String description;

    /**
     * Old value before the action (JSON or plain text)
     */
    private String oldValue;

    /**
     * New value after the action (JSON or plain text)
     */
    private String newValue;

    /**
     * IP address where the action originated
     */
    private String ipAddress;

    /**
     * User agent (browser/client info)
     */
    private String userAgent;

    /**
     * Whether action was performed by system (no user)
     */
    private boolean systemAction;
}
