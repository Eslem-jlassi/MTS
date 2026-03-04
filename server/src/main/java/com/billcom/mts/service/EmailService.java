package com.billcom.mts.service;

/**
 * Service d'envoi d'emails.
 * 
 * TODO: Implémenter avec un vrai SMTP (Gmail, SendGrid, etc.)
 * Pour l'instant, les méthodes loguent simplement l'intention.
 * 
 * @author Billcom Consulting - PFE 2026
 */
public interface EmailService {

    /**
     * Envoie un email de notification de nouveau ticket.
     * 
     * @param toEmail Destinataire
     * @param ticketNumber Numéro du ticket
     * @param ticketTitle Titre du ticket
     */
    void sendTicketCreatedNotification(String toEmail, String ticketNumber, String ticketTitle);

    /**
     * Envoie un email quand un ticket change de statut.
     * 
     * @param toEmail Destinataire
     * @param ticketNumber Numéro du ticket
     * @param oldStatus Ancien statut
     * @param newStatus Nouveau statut
     */
    void sendTicketStatusChangedNotification(String toEmail, String ticketNumber, String oldStatus, String newStatus);

    /**
     * Envoie un email quand un ticket est assigné à un agent.
     * 
     * @param agentEmail Email de l'agent
     * @param ticketNumber Numéro du ticket
     * @param ticketTitle Titre du ticket
     */
    void sendTicketAssignedNotification(String agentEmail, String ticketNumber, String ticketTitle);

    /**
     * Envoie un email de réinitialisation du mot de passe.
     * 
     * @param toEmail Email du destinataire
     * @param resetToken Token de réinitialisation
     */
    void sendPasswordResetEmail(String toEmail, String resetToken);
}
