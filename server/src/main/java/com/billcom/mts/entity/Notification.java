package com.billcom.mts.entity;

// =============================================================================
// IMPORTS
// =============================================================================
import com.billcom.mts.enums.NotificationType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

// =============================================================================
// ENTITÉ NOTIFICATION - Table des notifications temps réel
// =============================================================================
/**
 * Notification - Entité représentant une notification utilisateur.
 * 
 * RÔLE DE CETTE CLASSE:
 * Stocke les notifications système envoyées aux utilisateurs.
 * Utilisée en combinaison avec WebSocket pour le push temps réel.
 * 
 * FLUX DE NOTIFICATION:
 * 1. Un événement se produit (ex: nouveau ticket)
 * 2. NotificationService crée une Notification en BDD
 * 3. NotificationService envoie un message WebSocket
 * 4. Le frontend reçoit et affiche la notification
 * 5. L'utilisateur peut marquer comme lue
 * 
 * TYPES DE NOTIFICATIONS:
 * - Tickets: création, assignation, statut, commentaire
 * - SLA: warning, breach
 * - Services: down, degraded, restored
 * - Rapports: publication
 * 
 * TABLE SQL:
 * CREATE TABLE notifications (
 *     id BIGINT PRIMARY KEY AUTO_INCREMENT,
 *     user_id BIGINT NOT NULL,
 *     title VARCHAR(200) NOT NULL,
 *     message TEXT NOT NULL,
 *     notification_type VARCHAR(50) NOT NULL,
 *     reference_type VARCHAR(50),
 *     reference_id BIGINT,
 *     is_read BOOLEAN DEFAULT FALSE,
 *     read_at TIMESTAMP,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     expires_at TIMESTAMP
 * );
 */
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notif_user", columnList = "user_id"),
    @Index(name = "idx_notif_type", columnList = "notification_type"),
    @Index(name = "idx_notif_is_read", columnList = "is_read"),
    @Index(name = "idx_notif_created", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    // =========================================================================
    // CLÉ PRIMAIRE
    // =========================================================================
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // DESTINATAIRE
    // =========================================================================
    
    /**
     * Utilisateur destinataire de la notification.
     * 
     * Chaque notification est envoyée à UN utilisateur.
     * Pour notifier plusieurs personnes, on crée plusieurs Notification.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // =========================================================================
    // CONTENU
    // =========================================================================
    
    /**
     * Titre court de la notification.
     * Ex: "Nouveau ticket", "SLA dépassé"
     */
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String title;

    /**
     * Message détaillé de la notification.
     * Ex: "Le ticket TKT-2026-00005 a été créé par client1@ericsson.tn"
     */
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * Type de notification (pour filtrage et icône).
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "notification_type", nullable = false, length = 50)
    private NotificationType type;

    // =========================================================================
    // RÉFÉRENCE VERS L'OBJET CONCERNÉ
    // =========================================================================
    
    /**
     * Type de l'objet référencé (ex: "TICKET", "SERVICE").
     * Permet de créer un lien vers l'objet concerné.
     */
    @Size(max = 50)
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    /**
     * ID de l'objet référencé.
     * Ex: si referenceType = "TICKET" et referenceId = 5,
     * alors la notification concerne le ticket avec id = 5.
     */
    @Column(name = "reference_id")
    private Long referenceId;

    // =========================================================================
    // ÉTAT
    // =========================================================================
    
    /**
     * Indique si la notification a été lue.
     */
    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    /**
     * Date à laquelle la notification a été lue.
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    // =========================================================================
    // TIMESTAMPS
    // =========================================================================
    
    /**
     * Date de création de la notification.
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Date d'expiration (après laquelle la notification peut être archivée).
     * Optionnel - si null, pas d'expiration.
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================
    
    /**
     * Marque la notification comme lue.
     */
    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }

    /**
     * Vérifie si la notification est expirée.
     */
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Vérifie si la notification est urgente (basé sur le type).
     */
    public boolean isUrgent() {
        return type != null && type.isUrgent();
    }

    /**
     * Retourne le chemin vers l'objet référencé (pour navigation frontend).
     * Ex: "/tickets/5" pour un ticket avec id = 5
     */
    public String getReferencePath() {
        if (referenceType == null || referenceId == null) {
            return null;
        }
        return switch (referenceType.toUpperCase()) {
            case "TICKET" -> "/tickets/" + referenceId;
            case "SERVICE" -> "/services/" + referenceId;
            case "USER" -> "/users/" + referenceId;
            case "REPORT" -> "/reports/" + referenceId;
            default -> null;
        };
    }
}
