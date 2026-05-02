package com.billcom.mts.service.impl;

import com.billcom.mts.exception.ServiceUnavailableException;
import com.billcom.mts.service.EmailService;
import jakarta.annotation.PostConstruct;
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

    private static final String EMAIL_BRAND_TITLE = "MTS Telecom";
    private static final String EMAIL_SAFE_NOTICE =
            "Cet email est emis automatiquement. Si vous n'etes pas concerne, ignorez-le.";

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private String mailEnabledSetting;

    @Value("${MAIL_ENABLED:}")
    private String mailEnabledRaw;

    @Value("${COMPOSE_MAIL_ENABLED:}")
    private String composeMailEnabledRaw;

    @Value("${app.mail.from:no-reply@mts-telecom.local}")
    private String fromEmail;

    @Value("${app.mail.from-name:MTS Telecom}")
    private String fromName;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private String smtpAuthSetting;

    @PostConstruct
    void logMailConfigurationSummary() {
        log.info(
                "Configuration email effective: enabled={}, hostConfigured={}, smtpAuth={}, credentialsConfigured={}, fromConfigured={}, frontendBaseUrl={}",
                isMailFeatureEnabled(),
                StringUtils.hasText(mailHost),
                isSmtpAuthEnabled(),
                areSmtpCredentialsConfigured(),
                StringUtils.hasText(fromEmail),
                safeLogValue(frontendBaseUrl));
        if (!isMailFeatureEnabled()) {
            log.warn(
                    "Les emails applicatifs sont desactives ou incomplets. Configurez MAIL_ENABLED=true, MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD et MAIL_FROM sur le service backend.");
        }
    }

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
        String safeResetUrl = escapeHtml(resetUrl);

        sendEmail(
                toEmail,
                "Reinitialisation de votre mot de passe MTS Telecom",
                "Une demande de reinitialisation a ete recue. Utilisez ce lien: " + resetUrl,
                buildEmailLayout(
                        "Reinitialisation du mot de passe",
                        """
                        <p>Bonjour,</p>
                        <p>Nous avons recu une demande de reinitialisation pour votre compte MTS Telecom.</p>
                        %s
                        <p>Pour votre securite, ce lien est a usage unique et expire rapidement.</p>
                        <p>Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer ce message.</p>
                        """.formatted(buildActionButton(safeResetUrl, "Definir un nouveau mot de passe"))
                ),
                true);
    }

    @Override
    public void sendEmailVerificationEmail(
            String toEmail,
            String recipientName,
            String verificationToken,
            LocalDateTime expiresAt) {
        String verificationUrl = buildFrontendUrl(
                "/verify-email?token=" + encode(verificationToken) + "&email=" + encode(toEmail)
        );
        String safeRecipientName = StringUtils.hasText(recipientName) ? recipientName.trim() : "Bonjour";
        String expiresLabel = expiresAt != null ? DATE_FORMATTER.format(expiresAt) : "bientot";
        String safeVerificationUrl = escapeHtml(verificationUrl);
        String safeExpiresLabel = escapeHtml(expiresLabel);

        sendEmail(
                toEmail,
                "Verification de votre adresse email MTS Telecom",
                "Confirmez votre adresse email via ce lien: " + verificationUrl,
                buildEmailLayout(
                        "Verification de votre compte",
                        """
                        <p>Bonjour %s,</p>
                        <p>Votre compte MTS Telecom vient d'etre cree.</p>
                        <p>Pour finaliser l'activation, confirmez votre adresse email :</p>
                        %s
                        <p>Ce lien expire le <strong>%s</strong>.</p>
                        <p>Si vous n'etes pas a l'origine de cette creation de compte, aucune action n'est requise.</p>
                        """.formatted(
                                escapeHtml(safeRecipientName),
                                buildActionButton(safeVerificationUrl, "Verifier mon adresse email"),
                                safeExpiresLabel)
                ),
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
            log.error("Email sending failed to {}: {}", toEmail, ex.getMessage(), ex);
            log.error(
                    "Echec SMTP pour email '{}' vers {} via {}:{}: {}",
                    subject,
                    toEmail,
                    safeLogValue(mailHost),
                    mailPort,
                    sanitizeMailErrorMessage(ex.getMessage()));
            log.debug("Trace SMTP detaillee sans secret pour '{}'", subject, ex);
            if (!required) {
                return;
            }
            throw new ServiceUnavailableException(
                    "Le service email est temporairement indisponible. Veuillez reessayer plus tard.",
                    ex);
        }
    }

    private boolean ensureMailConfigured(boolean required, String subject, String toEmail) {
        if (!isMailFeatureEnabled()) {
            if (!required) {
                log.warn("Email '{}' ignore pour {} car la configuration email est inactive ou incomplete", subject, toEmail);
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
        if (!StringUtils.hasText(mailHost)) {
            if (!required) {
                log.warn("Email '{}' ignore pour {} car MAIL_HOST n'est pas configure", subject, toEmail);
                return false;
            }
            throw new ServiceUnavailableException("Le serveur SMTP n'est pas configure.");
        }
        if (isSmtpAuthEnabled() && !areSmtpCredentialsConfigured()) {
            if (!required) {
                log.warn("Email '{}' ignore pour {} car les identifiants SMTP sont incomplets", subject, toEmail);
                return false;
            }
            throw new ServiceUnavailableException("Les identifiants SMTP ne sont pas configures.");
        }
        return true;
    }

    private boolean isMailFeatureEnabled() {
        if (isTruthy(mailEnabledSetting)) {
            return true;
        }
        if (isExplicitMailDisabled()) {
            return false;
        }
        return hasSmtpDeliveryConfig();
    }

    private boolean hasSmtpDeliveryConfig() {
        return StringUtils.hasText(mailHost)
                && StringUtils.hasText(fromEmail)
                && (!isSmtpAuthEnabled() || areSmtpCredentialsConfigured());
    }

    private boolean areSmtpCredentialsConfigured() {
        return StringUtils.hasText(mailUsername) && StringUtils.hasText(mailPassword);
    }

    private boolean isSmtpAuthEnabled() {
        return !isExplicitFalse(smtpAuthSetting);
    }

    private boolean isExplicitMailDisabled() {
        return isExplicitFalse(mailEnabledRaw) || isExplicitFalse(composeMailEnabledRaw);
    }

    private boolean isTruthy(String value) {
        String normalized = normalizeFlag(value);
        return "true".equals(normalized)
                || "1".equals(normalized)
                || "yes".equals(normalized)
                || "on".equals(normalized);
    }

    private boolean isExplicitFalse(String value) {
        String normalized = normalizeFlag(value);
        return "false".equals(normalized)
                || "0".equals(normalized)
                || "no".equals(normalized)
                || "off".equals(normalized);
    }

    private String normalizeFlag(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String normalized = value.trim();
        if ((normalized.startsWith("\"") && normalized.endsWith("\""))
                || (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }
        return normalized.toLowerCase();
    }

    private String buildFrontendUrl(String relativePath) {
        String normalizedBase = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        return normalizedBase + relativePath;
    }

    private String buildActionButton(String safeUrl, String label) {
        return """
                <p style=\"margin: 24px 0;\">
                    <a href=\"%s\" style=\"display:inline-block;padding:12px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;\">%s</a>
                </p>
                <p style=\"margin-top: 0; font-size: 12px; color: #64748b; word-break: break-all;\">Ou copiez ce lien dans votre navigateur : %s</p>
                """.formatted(safeUrl, escapeHtml(label), safeUrl);
    }

    private String buildEmailLayout(String title, String innerHtml) {
        return """
                <div style=\"margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;\">
                    <table role=\"presentation\" style=\"max-width:640px;width:100%%;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;\">
                        <tr>
                            <td style=\"padding:16px 20px;background:#0f172a;color:#e2e8f0;font-size:14px;font-weight:600;\">%s</td>
                        </tr>
                        <tr>
                            <td style=\"padding:24px 20px 18px 20px;\">
                                <h2 style=\"margin:0 0 12px 0;font-size:20px;color:#0f172a;\">%s</h2>
                                %s
                            </td>
                        </tr>
                        <tr>
                            <td style=\"padding:0 20px 20px 20px;font-size:12px;color:#64748b;\">%s</td>
                        </tr>
                    </table>
                </div>
                """.formatted(
                escapeHtml(EMAIL_BRAND_TITLE),
                escapeHtml(title),
                innerHtml,
                escapeHtml(EMAIL_SAFE_NOTICE)
        );
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

    private String sanitizeMailErrorMessage(String message) {
        if (message == null) {
            return "Erreur SMTP sans message";
        }

        String sanitized = message;
        if (StringUtils.hasText(mailPassword)) {
            sanitized = sanitized.replace(mailPassword, "[MAIL_PASSWORD]");
        }
        if (StringUtils.hasText(mailUsername)) {
            sanitized = sanitized.replace(mailUsername, "[MAIL_USERNAME]");
        }
        return sanitized;
    }

    private String safeLogValue(String value) {
        return StringUtils.hasText(value) ? value.trim() : "non-configure";
    }
}
