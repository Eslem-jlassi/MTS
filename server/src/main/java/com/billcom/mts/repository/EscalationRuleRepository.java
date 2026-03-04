package com.billcom.mts.repository;

import com.billcom.mts.entity.EscalationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour les règles d'escalade.
 */
@Repository
public interface EscalationRuleRepository extends JpaRepository<EscalationRule, Long> {

    /** Règles actives d'un type de déclencheur, triées par sortOrder */
    List<EscalationRule> findByTriggerTypeAndEnabledTrueOrderBySortOrderAsc(String triggerType);

    /** Toutes les règles actives, triées */
    List<EscalationRule> findByEnabledTrueOrderBySortOrderAsc();

    /** Toutes les règles (pour Admin CRUD) */
    List<EscalationRule> findAllByOrderBySortOrderAsc();

    /** Nombre de règles actives */
    long countByEnabledTrue();
}
