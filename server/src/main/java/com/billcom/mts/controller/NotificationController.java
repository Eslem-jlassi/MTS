package com.billcom.mts.controller;

import com.billcom.mts.dto.notification.NotificationResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// =============================================================================
// CONTRÔLEUR NOTIFICATIONS - API REST pour les notifications
// =============================================================================
/**
 * NotificationController - Endpoints pour gérer les notifications utilisateur.
 * 
 * RÔLE:
 * Expose les endpoints REST pour:
 * - Récupérer les notifications d'un utilisateur
 * - Compter les notifications non lues
 * - Marquer les notifications comme lues
 * 
 * ENDPOINTS:
 * - GET /api/notifications : Liste paginée des notifications
 * - GET /api/notifications/unread : Notifications non lues
 * - GET /api/notifications/count : Compteur de non lues
 * - PUT /api/notifications/{id}/read : Marquer comme lue
 * - PUT /api/notifications/read-all : Marquer toutes comme lues
 * 
 * SÉCURITÉ:
 * Tous les endpoints sont protégés par JWT.
 * L'utilisateur ne peut accéder qu'à SES notifications.
 */
@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Gestion des notifications utilisateur")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    // =========================================================================
    // RÉCUPÉRATION DES NOTIFICATIONS
    // =========================================================================

    /**
     * Récupère les notifications de l'utilisateur connecté avec pagination.
     * 
     * ENDPOINT: GET /api/notifications?page=0&size=20
     * 
     * @param user L'utilisateur connecté (injecté par Spring Security)
     * @param page Numéro de page (commence à 0)
     * @param size Nombre d'éléments par page
     * @return Page de notifications
     */
    @GetMapping
    @Operation(summary = "Liste des notifications avec pagination")
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        log.debug("GET notifications for user {}, page={}, size={}", 
                user.getEmail(), page, size);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationResponse> notifications = 
                notificationService.getUserNotifications(user, pageable);
        
        return ResponseEntity.ok(notifications);
    }

    /**
     * Récupère les notifications non lues de l'utilisateur.
     * 
     * ENDPOINT: GET /api/notifications/unread
     * 
     * Utilisé pour afficher les notifications dans le dropdown header.
     * 
     * @param user L'utilisateur connecté
     * @return Liste des notifications non lues
     */
    @GetMapping("/unread")
    @Operation(summary = "Notifications non lues")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(
            @AuthenticationPrincipal User user) {
        
        log.debug("GET unread notifications for user {}", user.getEmail());
        
        List<NotificationResponse> notifications = 
                notificationService.getUnreadNotifications(user);
        
        return ResponseEntity.ok(notifications);
    }

    /**
     * Compte les notifications non lues.
     * 
     * ENDPOINT: GET /api/notifications/count
     * 
     * Utilisé pour le badge dans le header (nombre de notifications).
     * 
     * @param user L'utilisateur connecté
     * @return Objet avec le compteur { "count": 5 }
     */
    @GetMapping("/count")
    @Operation(summary = "Compteur de notifications non lues")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal User user) {
        
        long count = notificationService.getUnreadCount(user);
        
        return ResponseEntity.ok(Map.of("count", count));
    }

    // =========================================================================
    // MARQUAGE COMME LUE
    // =========================================================================

    /**
     * Marque une notification comme lue.
     * 
     * ENDPOINT: PUT /api/notifications/{id}/read
     * 
     * @param id ID de la notification
     * @param user L'utilisateur connecté
     * @return 200 OK si succès
     */
    @PutMapping("/{id}/read")
    @Operation(summary = "Marquer une notification comme lue")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        
        log.debug("Marking notification {} as read for user {}", id, user.getEmail());
        
        notificationService.markAsRead(id, user);
        
        return ResponseEntity.ok().build();
    }

    /**
     * Marque toutes les notifications comme lues.
     * 
     * ENDPOINT: PUT /api/notifications/read-all
     * 
     * @param user L'utilisateur connecté
     * @return Nombre de notifications marquées
     */
    @PutMapping("/read-all")
    @Operation(summary = "Marquer toutes les notifications comme lues")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(
            @AuthenticationPrincipal User user) {
        
        log.debug("Marking all notifications as read for user {}", user.getEmail());
        
        int count = notificationService.markAllAsRead(user);
        
        return ResponseEntity.ok(Map.of("markedCount", count));
    }
}
