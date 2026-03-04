package com.billcom.mts.service;

import com.billcom.mts.dto.notification.NotificationResponse;
import com.billcom.mts.entity.Notification;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.NotificationType;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.NotificationRepository;
import com.billcom.mts.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

// =============================================================================
// SERVICE NOTIFICATION - Gestion des notifications temps réel
// =============================================================================
/**
 * NotificationService - Service gérant les notifications utilisateurs.
 * 
 * RÔLE DE CETTE CLASSE:
 * - Créer et persister les notifications en base de données
 * - Envoyer les notifications en temps réel via WebSocket
 * - Gérer la lecture et la suppression des notifications
 * 
 * FLUX D'UNE NOTIFICATION:
 * 
 * 1. Un événement se produit (ex: nouveau ticket créé)
 *    TicketService.createTicket() → notificationService.notifyTicketCreated()
 * 
 * 2. NotificationService:
 *    a. Identifie les destinataires (agents, managers, admin)
 *    b. Crée une Notification en BDD pour chaque destinataire
 *    c. Envoie un message WebSocket à chaque destinataire connecté
 * 
 * 3. Frontend React:
 *    a. Reçoit le message WebSocket
 *    b. Affiche une notification toast
 *    c. Met à jour le compteur de notifications
 * 
 * TOPICS WEBSOCKET:
 * - /user/queue/notifications : Notifications privées (ticket assigné à MOI)
 * - /topic/service-status : Status services (broadcast à tous)
 * - /topic/tickets : Nouveau ticket (agents + managers)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // =========================================================================
    // NOTIFICATIONS TICKETS
    // =========================================================================

    /**
     * Notifie la création d'un nouveau ticket.
     * 
     * Destinataires: Tous les agents + managers + admins
     * 
     * @param ticket Le ticket créé
     */
    @Transactional
    public void notifyTicketCreated(Ticket ticket) {
        log.info("[Notification] Nouveau ticket créé: {}", ticket.getTicketNumber());
        
        // Récupère tous les utilisateurs staff (agents, managers, admins)
        List<User> staffUsers = userRepository.findByRoleIn(
                List.of(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN));
        
        String title = "Nouveau ticket";
        String message = String.format("Ticket %s créé par %s: %s",
                ticket.getTicketNumber(),
                ticket.getClient().getCompanyName(),
                truncate(ticket.getTitle(), 50));
        
        for (User user : staffUsers) {
            createAndSendNotification(
                    user,
                    title,
                    message,
                    NotificationType.TICKET_CREATED,
                    "TICKET",
                    ticket.getId()
            );
        }
        
        // Broadcast sur le topic tickets
        broadcastToTopic("/topic/tickets", mapToResponse(
                Notification.builder()
                        .title(title)
                        .message(message)
                        .type(NotificationType.TICKET_CREATED)
                        .referenceType("TICKET")
                        .referenceId(ticket.getId())
                        .createdAt(LocalDateTime.now())
                        .build()
        ));
    }

    /**
     * Notifie l'assignation d'un ticket à un agent.
     * 
     * Destinataires: L'agent assigné + le client (si changement d'agent)
     * 
     * @param ticket Le ticket assigné
     * @param agent L'agent assigné
     */
    @Transactional
    public void notifyTicketAssigned(Ticket ticket, User agent) {
        log.info("[Notification] Ticket {} assigné à {}", 
                ticket.getTicketNumber(), agent.getEmail());
        
        // Notification à l'agent
        createAndSendNotification(
                agent,
                "Ticket assigné",
                String.format("Le ticket %s vous a été assigné: %s",
                        ticket.getTicketNumber(),
                        truncate(ticket.getTitle(), 50)),
                NotificationType.TICKET_ASSIGNED,
                "TICKET",
                ticket.getId()
        );
        
        // Notification au client
        if (ticket.getClient() != null && ticket.getClient().getUser() != null) {
            createAndSendNotification(
                    ticket.getClient().getUser(),
                    "Agent assigné",
                    String.format("Un agent (%s) a été assigné à votre ticket %s",
                            agent.getFullName(),
                            ticket.getTicketNumber()),
                    NotificationType.TICKET_ASSIGNED,
                    "TICKET",
                    ticket.getId()
            );
        }
    }

    /**
     * Notifie un changement de statut de ticket.
     * 
     * Destinataires: Client + Agent assigné
     * 
     * @param ticket Le ticket modifié
     * @param oldStatus L'ancien statut
     * @param newStatus Le nouveau statut
     */
    @Transactional
    public void notifyTicketStatusChanged(Ticket ticket, String oldStatus, String newStatus) {
        log.info("[Notification] Statut ticket {} changé: {} -> {}", 
                ticket.getTicketNumber(), oldStatus, newStatus);
        
        String message = String.format("Le ticket %s est passé de %s à %s",
                ticket.getTicketNumber(), oldStatus, newStatus);
        
        // Notification au client
        if (ticket.getClient() != null && ticket.getClient().getUser() != null) {
            createAndSendNotification(
                    ticket.getClient().getUser(),
                    "Statut modifié",
                    message,
                    NotificationType.TICKET_STATUS_CHANGED,
                    "TICKET",
                    ticket.getId()
            );
        }
        
        // Notification à l'agent assigné
        if (ticket.getAssignedTo() != null) {
            createAndSendNotification(
                    ticket.getAssignedTo(),
                    "Statut modifié",
                    message,
                    NotificationType.TICKET_STATUS_CHANGED,
                    "TICKET",
                    ticket.getId()
            );
        }
    }

    /**
     * Notifie l'ajout d'un commentaire sur un ticket.
     * 
     * @param ticket Le ticket commenté
     * @param author L'auteur du commentaire
     * @param isInternal Si c'est une note interne
     */
    @Transactional
    public void notifyTicketComment(Ticket ticket, User author, boolean isInternal) {
        log.info("[Notification] Nouveau commentaire sur ticket {} par {}", 
                ticket.getTicketNumber(), author.getEmail());
        
        // Si commentaire public, notifier le client (sauf si c'est lui l'auteur)
        if (!isInternal && ticket.getClient() != null && 
            ticket.getClient().getUser() != null &&
            !ticket.getClient().getUser().getId().equals(author.getId())) {
            
            createAndSendNotification(
                    ticket.getClient().getUser(),
                    "Nouveau commentaire",
                    String.format("Nouveau commentaire sur votre ticket %s",
                            ticket.getTicketNumber()),
                    NotificationType.TICKET_COMMENT,
                    "TICKET",
                    ticket.getId()
            );
        }
        
        // Notifier l'agent assigné (sauf si c'est lui l'auteur)
        if (ticket.getAssignedTo() != null && 
            !ticket.getAssignedTo().getId().equals(author.getId())) {
            
            createAndSendNotification(
                    ticket.getAssignedTo(),
                    isInternal ? "Note interne" : "Nouveau commentaire",
                    String.format("Nouveau %s sur le ticket %s par %s",
                            isInternal ? "note interne" : "commentaire",
                            ticket.getTicketNumber(),
                            author.getFullName()),
                    NotificationType.TICKET_COMMENT,
                    "TICKET",
                    ticket.getId()
            );
        }
    }

    // =========================================================================
    // NOTIFICATIONS SLA
    // =========================================================================

    /**
     * Notifie un avertissement SLA (approche de l'échéance).
     * 
     * Destinataires: Agent assigné + Managers
     * 
     * @param ticket Le ticket concerné
     * @param percentUsed Pourcentage du temps SLA utilisé
     */
    @Transactional
    public void notifySlaWarning(Ticket ticket, int percentUsed) {
        log.warn("[Notification] SLA Warning ticket {}: {}% du temps utilisé", 
                ticket.getTicketNumber(), percentUsed);
        
        String message = String.format(
                "⚠️ Attention: Le ticket %s a consommé %d%% de son temps SLA",
                ticket.getTicketNumber(), percentUsed);
        
        // Notifier l'agent assigné
        if (ticket.getAssignedTo() != null) {
            createAndSendNotification(
                    ticket.getAssignedTo(),
                    "Alerte SLA",
                    message,
                    NotificationType.SLA_WARNING,
                    "TICKET",
                    ticket.getId()
            );
        }
        
        // Notifier les managers
        List<User> managers = userRepository.findByRole(UserRole.MANAGER);
        for (User manager : managers) {
            createAndSendNotification(
                    manager,
                    "Alerte SLA",
                    message,
                    NotificationType.SLA_WARNING,
                    "TICKET",
                    ticket.getId()
            );
        }
    }

    /**
     * Notifie un dépassement de SLA (breach).
     * 
     * Destinataires: Agent assigné + Managers + Admins
     * 
     * @param ticket Le ticket en breach
     */
    @Transactional
    public void notifySlaBreach(Ticket ticket) {
        log.error("[Notification] SLA BREACH ticket {}", ticket.getTicketNumber());
        
        String message = String.format(
                "🚨 SLA DÉPASSÉ: Le ticket %s a dépassé son délai de résolution!",
                ticket.getTicketNumber());
        
        // Notifier l'agent assigné
        if (ticket.getAssignedTo() != null) {
            createAndSendNotification(
                    ticket.getAssignedTo(),
                    "SLA Dépassé",
                    message,
                    NotificationType.SLA_BREACH,
                    "TICKET",
                    ticket.getId()
            );
        }
        
        // Notifier managers et admins
        List<User> leaders = userRepository.findByRoleIn(
                List.of(UserRole.MANAGER, UserRole.ADMIN));
        for (User leader : leaders) {
            createAndSendNotification(
                    leader,
                    "SLA Dépassé",
                    message,
                    NotificationType.SLA_BREACH,
                    "TICKET",
                    ticket.getId()
            );
        }
    }

    // =========================================================================
    // NOTIFICATIONS SERVICES
    // =========================================================================

    /**
     * Notifie un changement de statut de service.
     * 
     * @param service Le service modifié
     * @param oldStatus L'ancien statut
     * @param newStatus Le nouveau statut
     */
    @Transactional
    public void notifyServiceStatusChanged(TelecomService service, String oldStatus, String newStatus) {
        log.info("[Notification] Service {} status: {} -> {}", 
                service.getName(), oldStatus, newStatus);
        
        NotificationType type;
        String title;
        
        switch (newStatus.toUpperCase()) {
            case "DOWN" -> {
                type = NotificationType.SERVICE_DOWN;
                title = "🚨 Service en panne";
            }
            case "DEGRADED" -> {
                type = NotificationType.SERVICE_DEGRADED;
                title = "⚠️ Service dégradé";
            }
            case "UP" -> {
                type = NotificationType.SERVICE_RESTORED;
                title = "✅ Service restauré";
            }
            default -> {
                type = NotificationType.INFO;
                title = "Status service modifié";
            }
        }
        
        String message = String.format("Le service %s est passé de %s à %s",
                service.getName(), oldStatus, newStatus);
        
        // Notifier admins et managers
        List<User> leaders = userRepository.findByRoleIn(
                List.of(UserRole.MANAGER, UserRole.ADMIN));
        for (User leader : leaders) {
            createAndSendNotification(
                    leader,
                    title,
                    message,
                    type,
                    "SERVICE",
                    service.getId()
            );
        }
        
        // Broadcast sur le topic service-status
        broadcastToTopic("/topic/service-status", mapToResponse(
                Notification.builder()
                        .title(title)
                        .message(message)
                        .type(type)
                        .referenceType("SERVICE")
                        .referenceId(service.getId())
                        .createdAt(LocalDateTime.now())
                        .build()
        ));
    }

    // =========================================================================
    // GESTION DES NOTIFICATIONS
    // =========================================================================

    /**
     * Récupère les notifications d'un utilisateur avec pagination.
     * 
     * @param user L'utilisateur
     * @param pageable Configuration de pagination
     * @return Page de notifications
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(User user, Pageable pageable) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Récupère les notifications non lues d'un utilisateur.
     * 
     * @param user L'utilisateur
     * @return Liste des notifications non lues
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(User user) {
        return notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(user)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Compte les notifications non lues.
     * 
     * @param user L'utilisateur
     * @return Nombre de notifications non lues
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    /**
     * Marque une notification comme lue.
     * 
     * @param notificationId ID de la notification
     * @param user L'utilisateur (pour vérification)
     */
    @Transactional
    public void markAsRead(Long notificationId, User user) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getUser().getId().equals(user.getId()))
                .ifPresent(Notification::markAsRead);
    }

    /**
     * Marque toutes les notifications comme lues.
     * 
     * @param user L'utilisateur
     * @return Nombre de notifications marquées
     */
    @Transactional
    public int markAllAsRead(User user) {
        return notificationRepository.markAllAsReadByUserId(
                user.getId(), LocalDateTime.now());
    }

    // =========================================================================
    // MÉTHODES PRIVÉES
    // =========================================================================

    /**
     * Crée une notification en BDD et l'envoie via WebSocket.
     */
    private void createAndSendNotification(User user, String title, String message,
                                            NotificationType type, String refType, Long refId) {
        
        // Crée et sauvegarde la notification
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .referenceType(refType)
                .referenceId(refId)
                .isRead(false)
                .build();
        
        notification = notificationRepository.save(notification);
        
        // Envoie via WebSocket (queue privée de l'utilisateur)
        sendToUser(user.getEmail(), mapToResponse(notification));
    }

    /**
     * Envoie une notification à un utilisateur spécifique via WebSocket.
     */
    private void sendToUser(String username, NotificationResponse notification) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/notifications",
                    notification
            );
            log.debug("[WebSocket] Notification envoyée à {}", username);
        } catch (Exception e) {
            log.error("[WebSocket] Erreur envoi à {}: {}", username, e.getMessage());
        }
    }

    /**
     * Broadcast une notification sur un topic public.
     */
    private void broadcastToTopic(String topic, NotificationResponse notification) {
        try {
            messagingTemplate.convertAndSend(topic, notification);
            log.debug("[WebSocket] Broadcast sur {}", topic);
        } catch (Exception e) {
            log.error("[WebSocket] Erreur broadcast {}: {}", topic, e.getMessage());
        }
    }

    /**
     * Mappe une entité Notification vers un DTO Response.
     */
    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType() != null ? notification.getType().name() : null)
                .typeLabel(notification.getType() != null ? notification.getType().getLabel() : null)
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .referencePath(notification.getReferencePath())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .isUrgent(notification.isUrgent())
                .build();
    }

    /**
     * Tronque une chaîne si elle dépasse maxLength.
     */
    private String truncate(String str, int maxLength) {
        if (str == null) return "";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength - 3) + "...";
    }
}
