package com.billcom.mts.repository;

import com.billcom.mts.entity.SlaConfig;
import com.billcom.mts.enums.TicketPriority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour la table sla_config (politiques SLA).
 * <p>
 * Requêtes spécifiques :
 * - Recherche par priorité/service (résolution SLA existante)
 * - Liste par statut actif (dashboard Admin)
 * - Comptage des politiques actives (KPI)
 */
@Repository
public interface SlaConfigRepository extends JpaRepository<SlaConfig, Long> {

    // =========================================================================
    // REQUÊTES EXISTANTES (Phase 3)
    // =========================================================================

    /** Config pour une priorité et un service donné. */
    Optional<SlaConfig> findByPriorityAndService_Id(TicketPriority priority, Long serviceId);

    /** Défaut par priorité (tous services). */
    Optional<SlaConfig> findByPriorityAndServiceIsNull(TicketPriority priority);

    // =========================================================================
    // NOUVELLES REQUÊTES (Phase 10 - Admin Dashboard)
    // =========================================================================

    /** Liste toutes les politiques actives, triées par priorité */
    List<SlaConfig> findByActiveTrueOrderByPriorityAsc();

    /** Liste toutes les politiques (actives ou non) */
    List<SlaConfig> findAllByOrderByPriorityAsc();

    /** Compte les politiques actives (pour KPI dashboard) */
    long countByActiveTrue();

    /** Liste les politiques globales (sans service spécifique) */
    List<SlaConfig> findByServiceIsNullOrderByPriorityAsc();

    /** Liste les politiques pour un service spécifique */
    List<SlaConfig> findByService_IdOrderByPriorityAsc(Long serviceId);

    /** Vérifie l'existence d'une politique par nom (pour éviter les doublons) */
    boolean existsByNameIgnoreCase(String name);

    /** Vérifie l'existence d'une politique par nom excluant un ID (pour update) */
    @Query("SELECT COUNT(s) > 0 FROM SlaConfig s WHERE LOWER(s.name) = LOWER(:name) AND s.id <> :excludeId")
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long excludeId);
}
