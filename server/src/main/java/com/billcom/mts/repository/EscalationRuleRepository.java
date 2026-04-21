package com.billcom.mts.repository;

import com.billcom.mts.entity.EscalationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour les regles d'escalade.
 */
@Repository
public interface EscalationRuleRepository extends JpaRepository<EscalationRule, Long> {

    /** Regles actives d'un type de declencheur, triees par sortOrder. */
    List<EscalationRule> findByTriggerTypeAndEnabledTrueOrderBySortOrderAsc(String triggerType);

    /** Toutes les regles actives, triees. */
    List<EscalationRule> findByEnabledTrueOrderBySortOrderAsc();

    /** Toutes les regles (pour Admin CRUD). */
    List<EscalationRule> findAllByOrderBySortOrderAsc();

    /** Nombre de regles actives. */
    long countByEnabledTrue();

    @Modifying
    @Query("UPDATE EscalationRule r SET r.autoAssignTo = NULL WHERE r.autoAssignTo.id = :userId")
    int clearAutoAssignReference(@Param("userId") Long userId);
}
