package com.billcom.mts.repository;

import com.billcom.mts.entity.Incident;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Optional<Incident> findByIncidentNumber(String incidentNumber);

    List<Incident> findByServiceIdOrderByStartedAtDesc(Long serviceId, Pageable pageable);

    Page<Incident> findByServiceId(Long serviceId, Pageable pageable);

    List<Incident> findByStatusIn(List<IncidentStatus> statuses);

    long countByStatus(IncidentStatus status);

    long countByServiceIdAndStatusIn(Long serviceId, List<IncidentStatus> statuses);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.startedAt >= :from AND i.startedAt < :to")
    long countByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Incidents actifs (OPEN ou IN_PROGRESS). */
    @Query("SELECT i FROM Incident i WHERE i.status IN ('OPEN','IN_PROGRESS') ORDER BY i.severity ASC, i.startedAt ASC")
    List<Incident> findActive();

    /**
     * Incidents affectant un service (via table many-to-many incident_services).
     */
    @Query("SELECT i FROM Incident i JOIN i.affectedServices s WHERE s.id = :serviceId ORDER BY i.startedAt DESC")
    List<Incident> findByAffectedServiceId(@Param("serviceId") Long serviceId);

    /** Prochain numéro d'incident. */
    @Query("SELECT MAX(i.id) FROM Incident i")
    Long findMaxId();

    /** Filtre combiné pour la liste d'incidents. */
    @Query("SELECT i FROM Incident i WHERE " +
            "(:status IS NULL OR i.status = :status) AND " +
            "(:severity IS NULL OR i.severity = :severity) AND " +
            "(:serviceId IS NULL OR i.service.id = :serviceId)")
    Page<Incident> findFiltered(
            @Param("status") IncidentStatus status,
            @Param("severity") Severity severity,
            @Param("serviceId") Long serviceId,
            Pageable pageable);

    /**
     * Compte les incidents lies via le champ legacy ticket_id.
     */
    long countByTicketId(Long ticketId);

    List<Incident> findByTicketId(Long ticketId);

    /**
     * Compte les incidents lies via la table many-to-many incident_tickets.
     */
    long countByTickets_Id(Long ticketId);

    List<Incident> findDistinctByTickets_Id(Long ticketId);

    @Modifying
    @Query("UPDATE Incident i SET i.commander = NULL WHERE i.commander.id = :userId")
    int clearCommanderReference(@Param("userId") Long userId);

    // =========================================================================
    // V29 – Requêtes pour reporting avancé
    // =========================================================================

    /** Incidents CRITICAL dans une période. */
    @Query("SELECT COUNT(i) FROM Incident i WHERE i.severity = com.billcom.mts.enums.Severity.CRITICAL AND i.startedAt >= :from AND i.startedAt < :to")
    long countCriticalByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Incidents dans une période, triés par sévérité. */
    @Query("SELECT i FROM Incident i WHERE i.startedAt >= :from AND i.startedAt < :to ORDER BY i.severity ASC, i.startedAt DESC")
    List<Incident> findByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
