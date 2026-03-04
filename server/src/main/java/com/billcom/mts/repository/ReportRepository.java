package com.billcom.mts.repository;

import com.billcom.mts.entity.Report;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * ReportRepository - Repository pour l'entité Report.
 * 
 * RÔLE:
 * Accès aux données de la table "reports" via Spring Data JPA.
 * Fournit des méthodes de recherche et filtrage des rapports PDF.
 * 
 * FONCTIONNALITÉS:
 * - Liste des rapports publiés
 * - Filtrage par type, période, service
 * - Recherche par auteur
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    // =========================================================================
    // RECHERCHE PAR PUBLICATION
    // =========================================================================

    /**
     * Récupère tous les rapports publiés, triés par date décroissante.
     * 
     * @param pageable Configuration de pagination
     * @return Page de rapports publiés
     */
    Page<Report> findByIsPublishedTrueOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Récupère tous les rapports (publiés ou non), triés par date décroissante.
     * 
     * Pour les admins qui peuvent voir tous les rapports.
     * 
     * @param pageable Configuration de pagination
     * @return Page de tous les rapports
     */
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // =========================================================================
    // RECHERCHE PAR AUTEUR
    // =========================================================================

    /**
     * Récupère les rapports créés par un utilisateur.
     * 
     * @param createdBy L'auteur du rapport
     * @param pageable Configuration de pagination
     * @return Page de rapports de l'auteur
     */
    Page<Report> findByCreatedByOrderByCreatedAtDesc(User createdBy, Pageable pageable);

    /**
     * Récupère les rapports publiés par un utilisateur.
     * 
     * @param createdBy L'auteur du rapport
     * @return Liste des rapports publiés
     */
    List<Report> findByCreatedByAndIsPublishedTrueOrderByCreatedAtDesc(User createdBy);

    // =========================================================================
    // FILTRAGE PAR TYPE
    // =========================================================================

    /**
     * Récupère les rapports publiés d'un type spécifique.
     * 
     * @param reportType Le type de rapport
     * @param pageable Configuration de pagination
     * @return Page de rapports du type spécifié
     */
    Page<Report> findByReportTypeAndIsPublishedTrueOrderByCreatedAtDesc(
            ReportType reportType, Pageable pageable);

    /**
     * Récupère tous les rapports d'un type spécifique.
     * 
     * @param reportType Le type de rapport
     * @return Liste des rapports
     */
    List<Report> findByReportTypeOrderByCreatedAtDesc(ReportType reportType);

    // =========================================================================
    // FILTRAGE PAR SERVICE
    // =========================================================================

    /**
     * Récupère les rapports publiés pour un service spécifique.
     * 
     * @param service Le service concerné
     * @param pageable Configuration de pagination
     * @return Page de rapports
     */
    Page<Report> findByServiceAndIsPublishedTrueOrderByCreatedAtDesc(
            TelecomService service, Pageable pageable);

    /**
     * Récupère les rapports globaux (sans service spécifique).
     * 
     * @param pageable Configuration de pagination
     * @return Page de rapports globaux
     */
    Page<Report> findByServiceIsNullAndIsPublishedTrueOrderByCreatedAtDesc(Pageable pageable);

    // =========================================================================
    // FILTRAGE PAR PÉRIODE
    // =========================================================================

    /**
     * Récupère les rapports couvrant une période donnée.
     * 
     * @param startDate Date de début de la période recherchée
     * @param endDate Date de fin de la période recherchée
     * @param pageable Configuration de pagination
     * @return Page de rapports
     */
    @Query("SELECT r FROM Report r WHERE r.isPublished = true " +
           "AND r.periodStart >= :startDate AND r.periodEnd <= :endDate " +
           "ORDER BY r.createdAt DESC")
    Page<Report> findByPeriodRange(@Param("startDate") LocalDate startDate,
                                    @Param("endDate") LocalDate endDate,
                                    Pageable pageable);

    /**
     * Récupère les rapports d'un mois spécifique.
     * 
     * @param year L'année
     * @param month Le mois (1-12)
     * @return Liste des rapports du mois
     */
    @Query("SELECT r FROM Report r WHERE r.isPublished = true " +
           "AND YEAR(r.periodStart) = :year AND MONTH(r.periodStart) = :month " +
           "ORDER BY r.createdAt DESC")
    List<Report> findByMonth(@Param("year") int year, @Param("month") int month);

    // =========================================================================
    // RECHERCHE COMBINÉE
    // =========================================================================

    /**
     * Recherche avancée de rapports avec plusieurs critères.
     * 
     * @param reportType Type de rapport (peut être null)
     * @param serviceId ID du service (peut être null)
     * @param startDate Date de début (peut être null)
     * @param endDate Date de fin (peut être null)
     * @param pageable Configuration de pagination
     * @return Page de rapports correspondant aux critères
     */
    @Query("SELECT r FROM Report r WHERE r.isPublished = true " +
           "AND (:reportType IS NULL OR r.reportType = :reportType) " +
           "AND (:serviceId IS NULL OR r.service.id = :serviceId) " +
           "AND (:startDate IS NULL OR r.periodStart >= :startDate) " +
           "AND (:endDate IS NULL OR r.periodEnd <= :endDate) " +
           "ORDER BY r.createdAt DESC")
    Page<Report> searchReports(@Param("reportType") ReportType reportType,
                               @Param("serviceId") Long serviceId,
                               @Param("startDate") LocalDate startDate,
                               @Param("endDate") LocalDate endDate,
                               Pageable pageable);

    // =========================================================================
    // STATISTIQUES
    // =========================================================================

    /**
     * Compte le nombre total de rapports publiés.
     * 
     * @return Nombre de rapports publiés
     */
    long countByIsPublishedTrue();

    /**
     * Compte les rapports créés par un utilisateur.
     * 
     * @param createdBy L'auteur
     * @return Nombre de rapports
     */
    long countByCreatedBy(User createdBy);

    /**
     * Compte les rapports par type.
     * 
     * @param reportType Le type de rapport
     * @return Nombre de rapports de ce type
     */
    long countByReportType(ReportType reportType);
}
