package com.billcom.mts.repository;

import com.billcom.mts.entity.SlaTimeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'historique SLA (timeline).
 */
@Repository
public interface SlaTimelineRepository extends JpaRepository<SlaTimeline, Long> {

    /** Historique SLA d'un ticket, plus recent en premier */
    List<SlaTimeline> findByTicket_IdOrderByCreatedAtDesc(Long ticketId);

    /** Nombre total d'evenements pour un ticket */
    long countByTicket_Id(Long ticketId);

    @Modifying
    @Query("DELETE FROM SlaTimeline st WHERE st.ticket.id = :ticketId")
    int deleteByTicketId(@Param("ticketId") Long ticketId);
}
