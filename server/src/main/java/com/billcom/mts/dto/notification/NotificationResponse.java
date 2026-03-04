package com.billcom.mts.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * NotificationResponse - DTO pour les réponses de notification.
 * 
 * RÔLE:
 * Transporte les données de notification du backend vers le frontend.
 * Utilisé à la fois pour les réponses REST et les messages WebSocket.
 * 
 * CHAMPS:
 * - Identifiants: id
 * - Contenu: title, message
 * - Type: type (code), typeLabel (label localisé)
 * - Référence: referenceType, referenceId, referencePath (pour navigation)
 * - État: isRead, readAt
 * - Métadonnées: createdAt, isUrgent
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    /**
     * ID unique de la notification.
     */
    private Long id;

    /**
     * Titre court de la notification.
     */
    private String title;

    /**
     * Message détaillé.
     */
    private String message;

    /**
     * Code du type (ex: "TICKET_CREATED", "SLA_BREACH").
     */
    private String type;

    /**
     * Label localisé du type (ex: "Nouveau ticket", "SLA dépassé").
     */
    private String typeLabel;

    /**
     * Type de l'objet référencé (ex: "TICKET", "SERVICE").
     */
    private String referenceType;

    /**
     * ID de l'objet référencé.
     */
    private Long referenceId;

    /**
     * Chemin vers l'objet (ex: "/tickets/5").
     * Pour faciliter la navigation côté frontend.
     */
    private String referencePath;

    /**
     * Indique si la notification a été lue.
     */
    private Boolean isRead;

    /**
     * Date de lecture (si lue).
     */
    private LocalDateTime readAt;

    /**
     * Date de création de la notification.
     */
    private LocalDateTime createdAt;

    /**
     * Indique si la notification est urgente (affichage différent).
     */
    private Boolean isUrgent;
}
