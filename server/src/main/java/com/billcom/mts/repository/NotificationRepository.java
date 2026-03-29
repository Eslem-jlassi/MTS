package com.billcom.mts.repository;

import com.billcom.mts.entity.Notification;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * NotificationRepository - Repository pour l'entité Notification.
 * 
 * RÔLE:
 * Accès aux données de la table "notifications" via Spring Data JPA.
 * Fournit des méthodes optimisées pour le temps réel et la pagination.
 * 
 * FONCTIONNALITÉS:
 * - Récupération des notifications non lues d'un utilisateur
 * - Comptage des notifications non lues (pour le badge)
 * - Marquage en masse comme lues
 * - Suppression des notifications expirées
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // =========================================================================
    // RECHERCHE PAR UTILISATEUR
    // =========================================================================

    /**
     * Récupère toutes les notifications d'un utilisateur, triées par date décroissante.
     * 
     * @param user L'utilisateur concerné
     * @param pageable Configuration de pagination
     * @return Page de notifications
     */
    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    /**
     * Récupère les notifications non lues d'un utilisateur.
     * 
     * @param user L'utilisateur concerné
     * @return Liste des notifications non lues
     */
    List<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    /**
     * Récupère les N dernières notifications d'un utilisateur.
     * 
     * @param user L'utilisateur concerné
     * @param pageable Limite (ex: PageRequest.of(0, 10))
     * @return Liste des notifications récentes
     */
    List<Notification> findAllByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    // =========================================================================
    // COMPTAGE
    // =========================================================================

    /**
     * Compte le nombre de notifications non lues d'un utilisateur.
     * 
     * Utilisé pour afficher le badge avec le nombre dans l'UI.
     * 
     * @param user L'utilisateur concerné
     * @return Nombre de notifications non lues
     */
    long countByUserAndIsReadFalse(User user);

    /**
     * Compte le nombre total de notifications d'un utilisateur.
     * 
     * @param user L'utilisateur concerné
     * @return Nombre total de notifications
     */
    long countByUser(User user);

    // =========================================================================
    // FILTRAGE PAR TYPE
    // =========================================================================

    /**
     * Récupère les notifications d'un type spécifique pour un utilisateur.
     * 
     * @param user L'utilisateur concerné
     * @param type Le type de notification
     * @return Liste des notifications du type spécifié
     */
    List<Notification> findByUserAndTypeOrderByCreatedAtDesc(User user, NotificationType type);

    /**
     * Récupère les notifications par référence (ex: toutes les notifs d'un ticket).
     * 
     * @param user L'utilisateur concerné
     * @param referenceType Le type de référence ("TICKET", "SERVICE", etc.)
     * @param referenceId L'ID de l'objet référencé
     * @return Liste des notifications
     */
    List<Notification> findByUserAndReferenceTypeAndReferenceId(
            User user, String referenceType, Long referenceId);

    // =========================================================================
    // MISE À JOUR EN MASSE
    // =========================================================================

    /**
     * Marque toutes les notifications d'un utilisateur comme lues.
     * 
     * @param userId ID de l'utilisateur
     * @param readAt Date de lecture
     * @return Nombre de notifications mises à jour
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt " +
           "WHERE n.user.id = :userId AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);

    /**
     * Marque une liste de notifications comme lues.
     * 
     * @param ids Liste des IDs de notifications
     * @param readAt Date de lecture
     * @return Nombre de notifications mises à jour
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt " +
           "WHERE n.id IN :ids")
    int markAsReadByIds(@Param("ids") List<Long> ids, @Param("readAt") LocalDateTime readAt);

    // =========================================================================
    // NETTOYAGE
    // =========================================================================

    /**
     * Supprime les notifications expirées.
     * 
     * À appeler régulièrement via un scheduled job.
     * 
     * @param expiryDate Date limite (notifications plus anciennes seront supprimées)
     * @return Nombre de notifications supprimées
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.expiresAt IS NOT NULL AND n.expiresAt < :expiryDate")
    int deleteExpiredNotifications(@Param("expiryDate") LocalDateTime expiryDate);

    /**
     * Supprime les anciennes notifications lues d'un utilisateur.
     * 
     * @param userId ID de l'utilisateur
     * @param olderThan Date limite (notifications plus anciennes seront supprimées)
     * @return Nombre de notifications supprimées
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId " +
           "AND n.isRead = true AND n.createdAt < :olderThan")
    int deleteOldReadNotifications(@Param("userId") Long userId, 
                                    @Param("olderThan") LocalDateTime olderThan);

    /**
     * Supprime toutes les notifications d'un utilisateur.
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    /**
     * Supprime toutes les notifications liees a une reference metier.
     */
    long deleteByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
}
