package com.billcom.mts.repository;

import com.billcom.mts.entity.ServiceStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ServiceStatusHistoryRepository extends JpaRepository<ServiceStatusHistory, Long> {

    List<ServiceStatusHistory> findByServiceIdOrderByCreatedAtDesc(Long serviceId);

    /** Historique recent (pour sparkline). */
    List<ServiceStatusHistory> findByServiceIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long serviceId, LocalDateTime since);

    /** Historique limite pour un service. */
    List<ServiceStatusHistory> findTop20ByServiceIdOrderByCreatedAtDesc(Long serviceId);

    long countByServiceId(Long serviceId);

    @Modifying
    @Query("UPDATE ServiceStatusHistory h SET h.changedBy = NULL WHERE h.changedBy.id = :userId")
    int clearChangedByReference(@Param("userId") Long userId);
}
