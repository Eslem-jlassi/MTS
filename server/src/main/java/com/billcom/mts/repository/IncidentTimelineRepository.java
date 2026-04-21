package com.billcom.mts.repository;

import com.billcom.mts.entity.IncidentTimeline;
import com.billcom.mts.enums.IncidentTimelineEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentTimelineRepository extends JpaRepository<IncidentTimeline, Long> {

    List<IncidentTimeline> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);

    List<IncidentTimeline> findByIncidentIdAndEventTypeOrderByCreatedAtDesc(
            Long incidentId, IncidentTimelineEventType eventType);

    long countByIncidentId(Long incidentId);

    @Modifying
    @Query("UPDATE IncidentTimeline it SET it.author = NULL WHERE it.author.id = :userId")
    int clearAuthorReference(@Param("userId") Long userId);
}
