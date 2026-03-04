package com.billcom.mts.service.impl;

import com.billcom.mts.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Implémentation placeholder du service d'emails.
 * 
 * TODO: Remplacer les logs par de vrais envois d'emails.
 * Options recommandées:
 * - Spring Boot Mail (spring-boot-starter-mail)
 * - SendGrid Java SDK
 * - Amazon SES
 * 
 * Configuration requise dans application.yaml:
 * spring.mail.host: smtp.gmail.com
 * spring.mail.port: 587
 * spring.mail.username: votre-email@gmail.com
 * spring.mail.password: mot-de-passe-app
 * 
 * @author Billcom Consulting - PFE 2026
 */
@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    @Override
    public void sendTicketCreatedNotification(String toEmail, String ticketNumber, String ticketTitle) {
        // TODO: Implémenter l'envoi réel d'email
        log.info("[EMAIL PLACEHOLDER] Notification création ticket → {} | Ticket: {} - {}", 
                 toEmail, ticketNumber, ticketTitle);
    }

    @Override
    public void sendTicketStatusChangedNotification(String toEmail, String ticketNumber, String oldStatus, String newStatus) {
        // TODO: Implémenter l'envoi réel d'email
        log.info("[EMAIL PLACEHOLDER] Notification changement statut → {} | Ticket: {} | {} → {}", 
                 toEmail, ticketNumber, oldStatus, newStatus);
    }

    @Override
    public void sendTicketAssignedNotification(String agentEmail, String ticketNumber, String ticketTitle) {
        // TODO: Implémenter l'envoi réel d'email
        log.info("[EMAIL PLACEHOLDER] Notification assignation → {} | Ticket: {} - {}", 
                 agentEmail, ticketNumber, ticketTitle);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        // TODO: Implémenter l'envoi réel d'email
        log.info("[EMAIL PLACEHOLDER] Email réinitialisation mot de passe → {} | Token: {}...", 
                 toEmail, resetToken.substring(0, Math.min(10, resetToken.length())));
    }
}
