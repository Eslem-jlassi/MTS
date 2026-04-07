package com.billcom.mts.service.impl;

import com.billcom.mts.exception.ServiceUnavailableException;
import com.billcom.mts.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service SMTP reel pour les emails applicatifs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.from:no-reply@mts-telecom.local}")
    private String fromEmail;

    @Value("${app.mail.from-name:MTS Telecom}")
    private String fromName;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Override
    public void sendTicketCreatedNotification(String toEmail, String ticketNumber, String ticketTitle) {
        sendEmail(
                toEmail,
                "Nouveau ticket cree - " + ticketNumber,
                "Un nouveau ticket a ete cree: " + ticketNumber + " - " + ticketTitle,
                """
                <p>Bonjour,</p>
                <p>Un nouveau ticket a ete cree dans MTS Telecom.</p>
                <p><strong>Reference :</strong> %s<br/><strong>Titre :</strong> %s</p>
                <p>Cet email a ete emis automatiquement par la plateforme.</p>
                """.formatted(escapeHtml(ticketNumber), escapeHtml(ticketTitle)),
                false);
    }

    @Override
    public void sendTicketStatusChangedNotification(
            String toEmail,
            String ticketNumber,
            String oldStatus,
            String newStatus) {
        sendEmail(
                toEmail,
                "Mise a jour du ticket " + ticketNumber,
                "Le ticket " + ticketNumber + " est passe de " + oldStatus + " a " + newStatus + ".",
                """
                <p>Bonjour,</p>
                <p>Le statut de votre ticket a ete mis a jour.</p>
                <p><strong>Reference :</strong> %s<br/><strong>Ancien statut :</strong> %s<br/><strong>Nouveau statut :</strong> %s</p>
                <p>Connectez-vous a la plateforme pour suivre le detail de l'avancement.</p>
                """.formatted(
                        escapeHtml(ticketNumber),
                        escapeHtml(oldStatus),
                        escapeHtml(newStatus)),
                false);
    }

    @Override
    public void sendTicketAssignedNotification(String agentEmail, String ticketNumber, String ticketTitle) {
        sendEmail(
                agentEmail,
                "Ticket assigne - " + ticketNumber,
                "Le ticket " + ticketNumber + " vous a ete assigne.",
                """
                <p>Bonjour,</p>
                <p>Un ticket vous a ete assigne dans MTS Telecom.</p>
                <p><strong>Reference :</strong> %s<br/><strong>Titre :</strong> %s</p>
                <p>Merci de prendre en charge ce ticket depuis la plateforme.</p>
                """.formatted(escapeHtml(ticketNumber), escapeHtml(ticketTitle)),
                false);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        String resetUrl = buildFrontendUrl("/reset-password?token=" + encode(resetToken));
        sendEmail(
                toEmail,
                "Reinitialisation de votre mot de passe MTS Telecom",
                "Utilisez ce lien pour reinitialiser votre mot de passe: " + resetUrl,
                """
                <p>Bonjour,</p>
                <p>Une demande de reinitialisation de mot de passe a ete effectuee pour votre compte MTS Telecom.</p>
                <p><a href="%s">Definir un nouveau mot de passe</a></p>
                <p>Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.</p>
                """.formatted(escapeHtml(resetUrl)),
                true);
    }

    @Override
    public void sendEmailVerificationEmail(
            String toEmail,
            String recipientName,
            String verificationToken,
            LocalDateTime expiresAt) {
        String verificationUrl = buildFrontendUrl("/verify-email?token=" + encode(verificationToken));
        String safeRecipientName = StringUtils.hasText(recipientName) ? recipientName.trim() : "Bonjour";
        String expiresLabel = expiresAt != null ? DATE_FORMATTER.format(expiresAt) : "bientot";

        sendEmail(
                toEmail,
                "Verification de votre adresse email MTS Telecom",
                "Confirmez votre adresse email via ce lien: " + verificationUrl,
                """
                <p>Bonjour %s,</p>
                <p>Bienvenue sur la plateforme intelligente de supervision MTS Telecom.</p>
                <p>Pour activer votre compte, merci de verifier votre adresse email via le lien ci-dessous :</p>
                <p><a href="%s">Verifier mon adresse email</a></p>
                <p>Ce lien expire le <strong>%s</strong>.</p>
                <p>Si vous n'etes pas a l'origine de cette creation de compte, ignorez simplement cet email.</p>
                """.formatted(
                        escapeHtml(safeRecipientName),
                        escapeHtml(verificationUrl),
                        escapeHtml(expiresLabel)),
                true);
    }

            @Override
            public void sendSensitiveActionCodeEmail(
                String toEmail,
                String recipientName,
                String verificationCode,
                LocalDateTime expiresAt,
                String actionLabel) {
            String safeRecipientName = StringUtils.hasText(recipientName) ? recipientName.trim() : "Administrateur";
            String safeActionLabel = StringUtils.hasText(actionLabel)
                ? actionLabel.trim()
                : "cette action sensible";
            String expiresLabel = expiresAt != null ? DATE_FORMATTER.format(expiresAt) : "bientot";

            sendEmail(
                toEmail,
                "Code de verification admin - MTS Telecom",
                "Votre code de verification est: " + verificationCode,
                """
                <p>Bonjour %s,</p>
                <p>Une verification supplementaire est requise pour %s.</p>
                <p>Votre code de verification est :</p>
                <p style=\"font-size: 24px; font-weight: bold; letter-spacing: 4px;\">%s</p>
                <p>Ce code expire le <strong>%s</strong>.</p>
                <p>Si vous n'etes pas a l'origine de cette operation, contactez immediatement un administrateur de securite.</p>
                """.formatted(
                    escapeHtml(safeRecipientName),
                    escapeHtml(safeActionLabel),
                    escapeHtml(verificationCode),
                    escapeHtml(expiresLabel)),
                true);
            }

    private void sendEmail(
            String toEmail,
            String subject,
            String textBody,
            String htmlBody,
            boolean required) {
        if (!ensureMailConfigured(required, subject, toEmail)) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());

            helper.setTo(toEmail);
            helper.setFrom(fromEmail, fromName);
            helper.setSubject(subject);
            helper.setText(textBody, htmlBody);

            mailSender.send(message);
            log.info("Email envoye a {} avec sujet '{}'", toEmail, subject);
        } catch (MailException | MessagingException | java.io.UnsupportedEncodingException ex) {
            log.error("Echec d'envoi email vers {}: {}", toEmail, ex.getMessage(), ex);
            if (!required) {
                return;
            }
            throw new ServiceUnavailableException(
                    "Le service email est temporairement indisponible. Veuillez reessayer plus tard.",
                    ex);
        }
    }

    private boolean ensureMailConfigured(boolean required, String subject, String toEmail) {
        if (!mailEnabled) {
            if (!required) {
                log.warn("Email '{}' ignore pour {} car MAIL_ENABLED=false", subject, toEmail);
                return false;
            }
            throw new ServiceUnavailableException(
                    "Le service email n'est pas configure sur cette instance. Configurez SMTP pour activer ce flux.");
        }
        if (!StringUtils.hasText(fromEmail)) {
            if (!required) {
                log.warn("Email '{}' ignore pour {} car l'expediteur n'est pas configure", subject, toEmail);
                return false;
            }
            throw new ServiceUnavailableException("L'adresse d'expedition email n'est pas configuree.");
        }
        return true;
    }

    private String buildFrontendUrl(String relativePath) {
        String normalizedBase = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        return normalizedBase + relativePath;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
