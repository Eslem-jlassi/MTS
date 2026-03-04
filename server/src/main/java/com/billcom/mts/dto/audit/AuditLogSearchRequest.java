// =============================================================================
// MTS TELECOM - AuditLogSearchRequest DTO
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.dto.audit;

import com.billcom.mts.enums.AuditAction;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AuditLogSearchRequest - Critères de recherche pour l'audit.
 * 
 * All fields are optional - null means "no filter".
 * Used in AuditLogPage advanced search form.
 * 
 * @author Billcom Consulting
 * @version 1.0
 * @since 2026-02-28
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogSearchRequest {

    /**
     * Filter by user ID (who performed the action)
     */
    private Long userId;

    /**
     * Filter by entity type (TICKET, SERVICE, CLIENT, USER, etc.)
     */
    private String entityType;

    /**
     * Filter by action type (TICKET_CREATED, SERVICE_UPDATED, etc.)
     */
    private AuditAction action;

    /**
     * Filter by start date (inclusive)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDate;

    /**
     * Filter by end date (inclusive)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endDate;

    /**
     * Filter by IP address (security investigation)
     */
    private String ipAddress;

    /**
     * Filter by entity ID (e.g., get all actions on Ticket #123)
     */
    private Long entityId;

    /**
     * Page number (0-indexed, default  = 0)
     */
    @Builder.Default
    private int page = 0;

    /**
     * Page size (default = 20, max = 100)
     */
    @Builder.Default
    private int size = 20;

    /**
     * Sort field (default = "timestamp")
     */
    @Builder.Default
    private String sortBy = "timestamp";

    /**
     * Sort direction (default = "DESC")
     */
    @Builder.Default
    private String sortDir = "DESC";
}
