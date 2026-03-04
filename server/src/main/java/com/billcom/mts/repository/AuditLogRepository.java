// =============================================================================
// MTS TELECOM - AuditLogRepository Interface
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.repository;

import com.billcom.mts.entity.AuditLog;
import com.billcom.mts.enums.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AuditLogRepository - Requêtes d'audit pour traçabilité RGPD & ISO 27001.
 * 
 * Provides queries for:
 * - Entity history (ticket, service, incident, user, SLA policy)
 * - User action history (for admin audit)
 * - Action type filtering (TICKET_CREATED, SERVICE_UPDATED, etc.)
 * - Date range queries (for compliance reports)
 * - IP-based filtering (for security investigations)
 * 
 * @author Billcom Consulting
 * @version 2.0 - Enhanced with AuditAction enum + timestamp field
 * @since 2026-02-28
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Get all actions for a specific entity (e.g., all changes on Ticket #123)
     * Used in TicketDetailPage "Historique" tab
     */
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(
        String entityType, 
        Long entityId, 
        Pageable pageable
    );

    /**
     * Get last N actions for an entity (for quick preview in UI)
     */
    List<AuditLog> findTop10ByEntityTypeAndEntityIdOrderByTimestampDesc(
        String entityType, 
        Long entityId
    );

    /**
     * Get all actions by a specific user (for admin audit)
     */
    Page<AuditLog> findByUserIdOrderByTimestampDesc(
        Long userId, 
        Pageable pageable
    );

    /**
     * Get all actions of a specific type (e.g., all TICKET_CREATED)
     */
    Page<AuditLog> findByActionOrderByTimestampDesc(
        AuditAction action, 
        Pageable pageable
    );

    /**
     * Get all actions in a date range (for compliance reports)
     */
    Page<AuditLog> findByTimestampBetweenOrderByTimestampDesc(
        LocalDateTime startDate, 
        LocalDateTime endDate, 
        Pageable pageable
    );

    /**
     * Get all actions from a specific IP (for security investigations)
     */
    Page<AuditLog> findByIpAddressOrderByTimestampDesc(
        String ipAddress, 
        Pageable pageable
    );

    /**
     * Advanced search with multiple filters (used by AuditLogPage)
     * 
     * @param userId Filter by user (optional: pass null to ignore)
     * @param entityType Filter by entity type (optional)
     * @param action Filter by action type (optional)
     * @param startDate Filter by start date (optional)
     * @param endDate Filter by end date (optional)
     * @param ipAddress Filter by IP address (optional)
     */
    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:userId IS NULL OR a.user.id = :userId) AND " +
           "(:entityType IS NULL OR a.entityType = :entityType) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:startDate IS NULL OR a.timestamp >= :startDate) AND " +
           "(:endDate IS NULL OR a.timestamp <= :endDate) AND " +
           "(:ipAddress IS NULL OR a.ipAddress = :ipAddress) " +
           "ORDER BY a.timestamp DESC")
    Page<AuditLog> searchAuditLogs(
        @Param("userId") Long userId,
        @Param("entityType") String entityType,
        @Param("action") AuditAction action,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("ipAddress") String ipAddress,
        Pageable pageable
    );

    /**
     * Count actions by user in a date range (for user activity reports)
     */
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.user.id = :userId " +
           "AND a.timestamp BETWEEN :startDate AND :endDate")
    long countByUserIdAndTimestampBetween(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Count actions by action type in a date range (for audit reports)
     */
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.action = :action " +
           "AND a.timestamp BETWEEN :startDate AND :endDate")
    long countByActionAndTimestampBetween(
        @Param("action") AuditAction action,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get all system actions (no user) for debugging
     */
    Page<AuditLog> findByUserIsNullOrderByTimestampDesc(Pageable pageable);

    /**
     * Récupère les N dernières entrées d'audit (tri par date DESC).
     * Utilisé par le dashboard Admin pour afficher l'activité récente.
     */
    @Query("SELECT a FROM AuditLog a ORDER BY a.timestamp DESC")
    List<AuditLog> findTopNByOrderByTimestampDesc(Pageable pageable);
}
