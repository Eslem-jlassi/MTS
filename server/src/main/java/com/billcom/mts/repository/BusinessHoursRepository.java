package com.billcom.mts.repository;

import com.billcom.mts.entity.BusinessHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour les horaires ouvrés.
 */
@Repository
public interface BusinessHoursRepository extends JpaRepository<BusinessHours, Long> {

    /** Horaire par défaut (is_default = true + active = true) */
    Optional<BusinessHours> findByIsDefaultTrueAndActiveTrue();

    /** Tous les horaires actifs */
    List<BusinessHours> findByActiveTrueOrderByNameAsc();

    /** Tous (pour Admin) */
    List<BusinessHours> findAllByOrderByNameAsc();
}
