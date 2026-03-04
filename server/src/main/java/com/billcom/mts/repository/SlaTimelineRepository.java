package com.billcom.mts.repository;

import com.billcom.mts.entity.SlaTimeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'historique SLA (timeline).
 */
@Repository
public interface SlaTimelineRepository extends JpaRepository<SlaTimeline, Long> {

    /** Historique SLA d'un ticket, plus récent en premier */
    List<SlaTimeline> findByTicket_IdOrderByCreatedAtDesc(Long ticketId);

    /** Nombre total d'événements pour un ticket */
    long countByTicket_Id(Long ticketId);
}
