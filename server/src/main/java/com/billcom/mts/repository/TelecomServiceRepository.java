package com.billcom.mts.repository;

import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.ServiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for TelecomService entity operations.
 */
@Repository
public interface TelecomServiceRepository extends JpaRepository<TelecomService, Long> {

    List<TelecomService> findByIsActiveTrue();

    List<TelecomService> findByCategory(ServiceCategory category);

    List<TelecomService> findByCategoryAndIsActiveTrue(ServiceCategory category);

    Page<TelecomService> findByIsActive(Boolean isActive, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    Optional<TelecomService> findFirstByNameIgnoreCase(String name);

    List<TelecomService> findByStatus(ServiceStatus status);

    long countByStatus(ServiceStatus status);

    long countByIsActiveTrue();

    /** Services par criticite. */
    @Query("SELECT s FROM TelecomService s WHERE s.isActive = true ORDER BY s.criticality ASC")
    List<TelecomService> findActiveOrderByCriticality();

    /** Vue sante : tous les services actifs avec leur statut. */
    @Query("SELECT s FROM TelecomService s WHERE s.isActive = true ORDER BY " +
           "CASE s.status WHEN 'DOWN' THEN 0 WHEN 'DEGRADED' THEN 1 WHEN 'MAINTENANCE' THEN 2 ELSE 3 END")
    List<TelecomService> findActiveOrderByHealthPriority();

    @Modifying
    @Query("UPDATE TelecomService s SET s.createdBy = :replacementUser WHERE s.createdBy.id = :userId")
    int reassignCreatedBy(@Param("userId") Long userId, @Param("replacementUser") User replacementUser);

    @Modifying
    @Query("UPDATE TelecomService s SET s.owner = NULL WHERE s.owner.id = :userId")
    int clearOwnerReference(@Param("userId") Long userId);
}
