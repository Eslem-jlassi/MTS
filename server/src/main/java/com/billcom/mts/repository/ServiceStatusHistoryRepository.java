package com.billcom.mts.repository;

import com.billcom.mts.entity.ServiceStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ServiceStatusHistoryRepository extends JpaRepository<ServiceStatusHistory, Long> {

    List<ServiceStatusHistory> findByServiceIdOrderByCreatedAtDesc(Long serviceId);

    /** Historique récent (pour sparkline). */
    List<ServiceStatusHistory> findByServiceIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long serviceId, LocalDateTime since);

    /** Historique limité pour un service. */
    List<ServiceStatusHistory> findTop20ByServiceIdOrderByCreatedAtDesc(Long serviceId);

    long countByServiceId(Long serviceId);
}
