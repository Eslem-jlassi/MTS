package com.billcom.mts.repository;

import com.billcom.mts.entity.IncidentTimeline;
import com.billcom.mts.enums.IncidentTimelineEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentTimelineRepository extends JpaRepository<IncidentTimeline, Long> {

    List<IncidentTimeline> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);

    List<IncidentTimeline> findByIncidentIdAndEventTypeOrderByCreatedAtDesc(
            Long incidentId, IncidentTimelineEventType eventType);

    long countByIncidentId(Long incidentId);
}
