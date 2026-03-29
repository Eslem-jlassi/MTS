package com.billcom.mts.service;

import java.time.LocalDateTime;

/**
 * Service d'envoi d'emails applicatifs.
 */
public interface EmailService {

    void sendTicketCreatedNotification(String toEmail, String ticketNumber, String ticketTitle);

    void sendTicketStatusChangedNotification(
            String toEmail,
            String ticketNumber,
            String oldStatus,
            String newStatus);

    void sendTicketAssignedNotification(String agentEmail, String ticketNumber, String ticketTitle);

    void sendPasswordResetEmail(String toEmail, String resetToken);

    void sendEmailVerificationEmail(
            String toEmail,
            String recipientName,
            String verificationToken,
            LocalDateTime expiresAt);
}
