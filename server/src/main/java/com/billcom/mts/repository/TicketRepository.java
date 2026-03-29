package com.billcom.mts.repository;

// =============================================================================
// IMPORTS
// =============================================================================

import com.billcom.mts.entity.Ticket;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// =============================================================================
// REPOSITORY DES TICKETS
// =============================================================================
/**
 * ============================================================================
 * TicketRepository - Interface d'accès aux données tickets
 * ============================================================================
 *
 * C'est le Repository le plus complexe de l'application car les tickets
 * sont au cœur du métier et nécessitent de nombreuses requêtes.
 *
 * INTERFACES ÉTENDUES:
 * --------------------
 * 1. JpaRepository<Ticket, Long>
 *    - CRUD de base: save(), findById(), findAll(), delete()
 *
 * 2. JpaSpecificationExecutor<Ticket>
 *    - Permet des requêtes dynamiques avec Specifications
 *    - Utile pour les filtres de recherche complexes
 *
 * RÈGLE MÉTIER IMPORTANTE:
 * Les tickets ne sont JAMAIS supprimés physiquement (traçabilité/audit).
 * Ils sont marqués comme CANCELLED ou CLOSED mais restent en base.
 *
 * CATÉGORIES DE REQUÊTES:
 * - Requêtes Client: Tickets d'un client
 * - Requêtes Agent: Tickets assignés
 * - Requêtes Statut: Filtrage par statut
 * - Requêtes SLA: Surveillance des délais
 * - Requêtes Statistiques: Dashboard
 *
 * PERFORMANCE FIX: @EntityGraph annotations eagerly fetch client, service,
 * and assignedTo associations to prevent N+1 queries on entity-returning methods.
 *
 * ============================================================================
 */
@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    // =========================================================================
    // RECHERCHE PAR NUMÉRO DE TICKET
    // =========================================================================

    /**
     * Trouve un ticket par son numéro unique.
     *
     * FORMAT: TKT-AAAA-NNNNN (ex: TKT-2024-00001)
     *
     * @param ticketNumber Le numéro du ticket
     * @return Optional contenant le ticket ou vide
     */
    @EntityGraph(attributePaths = {"client", "client.user", "service", "assignedTo"})
    Optional<Ticket> findByTicketNumber(String ticketNumber);

    /**
     * Vérifie si un numéro de ticket existe.
     * Utilisé lors de la génération de nouveaux numéros.
     */
    boolean existsByTicketNumber(String ticketNumber);

    // =========================================================================
    // REQUÊTES CLIENT
    // =========================================================================

    /**
     * Trouve les tickets d'un client (par ID client).
     *
     * @param clientId ID de l'entité Client
     * @param pageable Pagination
     * @return Page de tickets
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    Page<Ticket> findByClientId(Long clientId, Pageable pageable);

    /**
     * Trouve les tickets actifs d'un client (excluant un statut).
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByClientIdAndStatusNot(Long clientId, TicketStatus status);

    /**
     * Trouve les tickets d'un client via l'ID de son User.
     *
     * Cette requête fait une jointure:
     * Ticket → Client → User (pour récupérer par userId)
     *
     * @param userId ID de l'utilisateur (pas du client!)
     * @param pageable Pagination
     * @return Page de tickets du client
     */
    @EntityGraph(attributePaths = {"client", "client.user", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.client.user.id = :userId ORDER BY t.createdAt DESC")
    Page<Ticket> findByClientUserId(@Param("userId") Long userId, Pageable pageable);

    // =========================================================================
    // REQUÊTES AGENT
    // =========================================================================

    /**
     * Trouve les tickets assignés à un agent.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    Page<Ticket> findByAssignedToId(Long agentId, Pageable pageable);

    /**
     * Trouve les tickets non assignes encore actifs.
     */
    @EntityGraph(attributePaths = {"client", "client.user", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.assignedTo IS NULL AND t.status NOT IN " +
           "(com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    Page<Ticket> findUnassignedActiveTickets(Pageable pageable);

    /**
     * Trouve les tickets d'un agent avec certains statuts.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByAssignedToIdAndStatusIn(Long agentId, List<TicketStatus> statuses);

    /**
     * Trouve les tickets actifs d'un agent (non terminés).
     *
     * Triés par priorité décroissante puis par deadline croissante.
     * → Les tickets critiques avec deadline proche en premier.
     *
     * @param agentId ID de l'agent
     * @return Liste de tickets actifs
     */
    @EntityGraph(attributePaths = {"client", "client.user", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.assignedTo.id = :agentId AND t.status NOT IN " +
           "(com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED) " +
           "ORDER BY t.priority DESC, t.deadline ASC")
    List<Ticket> findActiveTicketsByAgent(@Param("agentId") Long agentId);

    // =========================================================================
    // REQUÊTES PAR STATUT
    // =========================================================================

    /**
     * Trouve tous les tickets avec un statut spécifique.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByStatus(TicketStatus status);

    /**
     * Même chose avec pagination.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    Page<Ticket> findByStatus(TicketStatus status, Pageable pageable);

    /**
     * Trouve les tickets avec l'un des statuts listés.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByStatusIn(List<TicketStatus> statuses);

    /**
     * Trouve les tickets n'ayant PAS un statut spécifique.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByStatusNot(TicketStatus status);

    /**
     * Trouve tous les tickets actifs (non terminés).
     *
     * Tickets actifs = pas RESOLVED, CLOSED, ou CANCELLED
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.status NOT IN (com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    List<Ticket> findActiveTickets();

    /**
     * Même chose avec pagination.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.status NOT IN (com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    Page<Ticket> findActiveTickets(Pageable pageable);

    /** Compte les tickets par statut */
    long countByStatus(TicketStatus status);

    // =========================================================================
    // REQUÊTES PAR PRIORITÉ
    // =========================================================================

    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    Page<Ticket> findByPriority(TicketPriority priority, Pageable pageable);

    long countByPriority(TicketPriority priority);

    // =========================================================================
    // REQUÊTES SLA (Service Level Agreement)
    // =========================================================================
    /**
     * SLA = Accord de niveau de service
     *
     * Définit le temps maximum pour résoudre un ticket:
     * - CRITICAL: 4h
     * - HIGH: 8h
     * - MEDIUM: 24h
     * - LOW: 48h
     *
     * Les requêtes SLA servent à:
     * - Détecter les tickets en retard (deadline dépassée)
     * - Prévenir les dépassements (tickets approchant leur deadline)
     */

    /**
     * Trouve les tickets dont le SLA est dépassé mais pas encore marqués.
     *
     * Conditions:
     * - deadline < maintenant (en retard)
     * - pas encore marqué comme breachedSla
     * - ticket actif (pas fermé/résolu/annulé)
     *
     * Utilisé par un job planifié pour marquer les tickets en retard.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.deadline < :now AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED) AND t.breachedSla = false")
    List<Ticket> findSlaBreachedTicketsByDeadline(@Param("now") LocalDateTime now);

    /** Trouve les tickets avec SLA dépassé (déjà marqués) */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.breachedSla = true")
    Page<Ticket> findBreachedSlaTickets(Pageable pageable);

    /** Compte les tickets avec SLA dépassé */
    long countByBreachedSlaTrue();

    /**
     * Trouve les tickets approchant leur deadline SLA.
     *
     * @param now Instant actuel
     * @param warningTime Limite d'avertissement (ex: now + 4h)
     * @return Tickets entre now et warningTime
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.deadline BETWEEN :now AND :warningTime AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    List<Ticket> findTicketsNearingSla(@Param("now") LocalDateTime now, @Param("warningTime") LocalDateTime warningTime);

    /** Variante de la méthode précédente */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.deadline BETWEEN :now AND :warningTime AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.CANCELLED, com.billcom.mts.enums.TicketStatus.RESOLVED)")
    List<Ticket> findTicketsApproachingSla(@Param("now") LocalDateTime now, @Param("warningTime") LocalDateTime warningTime);

    /**
     * Trouve TOUS les tickets avec SLA dépassé.
     * Inclut ceux déjà marqués + ceux en retard mais pas encore marqués.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.breachedSla = true OR (t.deadline < CURRENT_TIMESTAMP AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED))")
    List<Ticket> findSlaBreachedTickets();

    // =========================================================================
    // REQUÊTES PAR SERVICE
    // =========================================================================

    /** Trouve les tickets liés à un service télécom */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    Page<Ticket> findByServiceId(Long serviceId, Pageable pageable);

    /** Compte les tickets par service */
    long countByServiceId(Long serviceId);

    // =========================================================================
    // REQUÊTES STATISTIQUES (pour le Dashboard)
    // =========================================================================
    /**
     * Ces requêtes retournent des données agrégées pour le dashboard.
     *
     * Retour List<Object[]>:
     * Chaque Object[] contient les colonnes du GROUP BY
     * Ex: [TicketStatus.OPEN, 15L] = 15 tickets OPEN
     */

    /**
     * Compte les tickets groupés par statut.
     *
     * RÉSULTAT: Liste de [statut, count]
     * Ex: [[OPEN, 15], [IN_PROGRESS, 8], [RESOLVED, 42]]
     */
    @Query("SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status")
    List<Object[]> countByStatusGrouped();

    /**
     * Compte les tickets groupés par priorité.
     */
    @Query("SELECT t.priority, COUNT(t) FROM Ticket t GROUP BY t.priority")
    List<Object[]> countByPriorityGrouped();

    /**
     * Compte les tickets groupés par service.
     */
    @Query("SELECT t.service.name, COUNT(t) FROM Ticket t GROUP BY t.service.name")
    List<Object[]> countByServiceGrouped();

    /**
     * Compte les tickets groupés par agent assigné.
     */
    @Query("SELECT t.assignedTo.id, COUNT(t) FROM Ticket t WHERE t.assignedTo IS NOT NULL GROUP BY t.assignedTo.id")
    List<Object[]> countByAgentGrouped();

    /**
     * Calcule le temps moyen de résolution en heures.
     *
     * Uses native query for cross-database compatibility.
     *
     * @return Temps moyen en heures (null si aucun ticket résolu)
     */
    @Query(value = "SELECT AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at)) FROM tickets t WHERE t.resolved_at IS NOT NULL", nativeQuery = true)
    Double getAverageResolutionTimeHours();

    /**
     * Temps moyen de résolution PAR AGENT.
     */
    @Query(value = "SELECT t.assigned_to, AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at)) FROM tickets t " +
           "WHERE t.resolved_at IS NOT NULL AND t.assigned_to IS NOT NULL GROUP BY t.assigned_to", nativeQuery = true)
    List<Object[]> getAverageResolutionTimeByAgent();

    // =========================================================================
    // REQUÊTES DE COMPTAGE
    // =========================================================================

    /** Compte les tickets résolus ou fermés */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.status IN (com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CLOSED)")
    long countResolvedOrClosedTickets();

    /** Compte les tickets résolus/fermés avec SLA dépassé */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.breachedSla = true AND t.status IN (com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CLOSED)")
    long countSlaBreachedResolvedTickets();

    /** Compte tous les tickets avec SLA dépassé */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.breachedSla = true OR (t.deadline < CURRENT_TIMESTAMP AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED))")
    long countSlaBreached();

    /** Compte les tickets non assignés et actifs */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.assignedTo IS NULL AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    long countUnassigned();

    /** Compte les tickets créés dans une période */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.createdAt BETWEEN :start AND :end")
    long countCreatedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** Compte les tickets résolus dans une période */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.resolvedAt BETWEEN :start AND :end")
    long countResolvedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** Compte les tickets actifs d'un agent */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.assignedTo.id = :agentId AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    long countActiveByAssignedTo(@Param("agentId") Long agentId);

    /** Compte les tickets résolus dans une période par un agent */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.assignedTo.id = :agentId AND t.resolvedAt BETWEEN :start AND :end AND t.status = com.billcom.mts.enums.TicketStatus.RESOLVED")
    long countResolvedTodayByAgent(@Param("agentId") Long agentId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** Compte les tickets avec SLA dépassé par agent */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.assignedTo.id = :agentId AND t.breachedSla = true")
    long countSlaBreachedByAgent(@Param("agentId") Long agentId);

    /** Compte les tickets d'un client */
    long countByClientId(Long clientId);

    /** Compte les tickets assignes a un utilisateur */
    long countByAssignedToId(Long userId);

    /** Compte les tickets crees par un utilisateur */
    long countByCreatedById(Long userId);

    /** Compte les tickets actifs d'un client */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.client.id = :clientId AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    long countActiveByClientId(@Param("clientId") Long clientId);

    /** Compte les tickets résolus d'un client */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.client.id = :clientId AND t.status = com.billcom.mts.enums.TicketStatus.RESOLVED")
    long countResolvedByClientId(@Param("clientId") Long clientId);

    // =========================================================================
    // REQUÊTES PAR DATE
    // =========================================================================

    /** Trouve les tickets créés dans une période */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /** Trouve les tickets créés après une date */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findByCreatedAtAfter(LocalDateTime date);

    /** Trouve les tickets résolus dans une période */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.resolvedAt BETWEEN :start AND :end")
    List<Ticket> findByResolvedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // =========================================================================
    // REQUÊTES DE RECHERCHE TEXTUELLE
    // =========================================================================

    /**
     * Recherche dans numéro, titre et description.
     *
     * LIKE avec LOWER pour recherche insensible à la casse.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE " +
           "(LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Ticket> searchTickets(@Param("search") String search, Pageable pageable);

    /** Variante avec paramètre nommé différent */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE " +
           "(LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(t.title) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :term, '%')))")
    Page<Ticket> searchByTerm(@Param("term") String term, Pageable pageable);

    // =========================================================================
    // REQUÊTES DASHBOARD
    // =========================================================================

    /**
     * Trouve les tickets critiques actifs.
     * Utilisé pour les alertes sur le dashboard.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.priority = com.billcom.mts.enums.TicketPriority.CRITICAL AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CLOSED)")
    List<Ticket> findActiveCriticalTickets();

    /**
     * Trouve les 10 derniers tickets créés.
     * Pour l'affichage "Tickets récents" sur le dashboard.
     */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    List<Ticket> findTop10ByOrderByCreatedAtDesc();

    // =========================================================================
    // GÉNÉRATION DU NUMÉRO DE TICKET
    // =========================================================================

    /**
     * Trouve le plus grand numéro de ticket pour un préfixe donné.
     *
     * Format: TKT-2024-00001 → préfixe = "TKT-2024-"
     * SUBSTRING(t.ticketNumber, 10) extrait "00001"
     * CAST AS integer convertit en nombre
     * MAX trouve le plus grand
     *
     * @param prefix Le préfixe (ex: "TKT-2024-")
     * @return Le plus grand numéro ou null si aucun ticket
     */
    @Query("SELECT MAX(CAST(SUBSTRING(t.ticketNumber, 10) AS integer)) FROM Ticket t WHERE t.ticketNumber LIKE :prefix%")
    Integer findMaxTicketNumber(@Param("prefix") String prefix);

    // =========================================================================
    // V29 – Requêtes pour reporting avancé
    // =========================================================================

    /** Compte les tickets CRITICAL créés dans une période. */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.priority = com.billcom.mts.enums.TicketPriority.CRITICAL AND t.createdAt BETWEEN :start AND :end")
    long countCriticalBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** Compte les tickets avec SLA dépassé dans une période. */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.breachedSla = true AND t.createdAt BETWEEN :start AND :end")
    long countSlaBreachedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** Compte le backlog (tickets ouverts non résolus) à une date donnée. */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.createdAt <= :end AND t.status NOT IN (com.billcom.mts.enums.TicketStatus.RESOLVED, com.billcom.mts.enums.TicketStatus.CLOSED, com.billcom.mts.enums.TicketStatus.CANCELLED)")
    long countBacklogAt(@Param("end") LocalDateTime end);

    /** Trouve les tickets créés dans une période pour un service donné. */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.createdAt BETWEEN :start AND :end AND t.service.id = :serviceId")
    List<Ticket> findByCreatedAtBetweenAndServiceId(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, @Param("serviceId") Long serviceId);

    /** Trouve les tickets créés dans une période pour un client donné. */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.createdAt BETWEEN :start AND :end AND t.client.id = :clientId")
    List<Ticket> findByCreatedAtBetweenAndClientId(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, @Param("clientId") Long clientId);

    /** Trouve les tickets créés dans une période pour un agent/équipe donné. */
    @EntityGraph(attributePaths = {"client", "service", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE t.createdAt BETWEEN :start AND :end AND (CONCAT(t.assignedTo.firstName, ' ', t.assignedTo.lastName) LIKE %:team% OR t.assignedTo.email LIKE %:team%)")
    List<Ticket> findByCreatedAtBetweenAndTeam(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, @Param("team") String team);
}
// =============================================================================
// FIN DU REPOSITORY TICKETS
// =============================================================================
