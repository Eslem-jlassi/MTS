package com.billcom.mts.service;

import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * Centralized strong verification for sensitive admin actions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SensitiveActionVerificationService {

    private static final String REQUIRED_KEYWORD = "SUPPRIMER";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.auth.sensitive-action.code-expiration-minutes:10}")
    private long codeExpirationMinutes;

    @Transactional
    public void issueHardDeleteVerificationCode(User admin, String actionLabel) {
        ensureAdmin(admin);

        if (!isOauthAccount(admin)) {
            throw new BadRequestException(
                    "Le compte administrateur local utilise une re-authentification par mot de passe."
            );
        }

        String verificationCode = generateNumericCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(codeExpirationMinutes);

        admin.setSensitiveActionCodeHash(passwordEncoder.encode(verificationCode));
        admin.setSensitiveActionCodeExpiry(expiresAt);
        userRepository.save(admin);

        emailService.sendSensitiveActionCodeEmail(
                admin.getEmail(),
                resolveRecipientName(admin),
                verificationCode,
                expiresAt,
                actionLabel
        );

        log.info("Sensitive action verification code issued for admin {}", admin.getEmail());
    }

    @Transactional
    public void verifyHardDeleteAuthorization(
            User admin,
            Long targetId,
            AdminHardDeleteRequest request,
            String actionLabel) {
        ensureAdmin(admin);
        validateStrongConfirmation(targetId, request);

        if (isOauthAccount(admin)) {
            verifyOauthCode(admin, request != null ? request.getVerificationCode() : null);
            log.info("Sensitive action OAuth verification successful for {} on {}", admin.getEmail(), actionLabel);
            return;
        }

        verifyPassword(admin, request != null ? request.getCurrentPassword() : null, actionLabel);
        log.info("Sensitive action password verification successful for {} on {}", admin.getEmail(), actionLabel);
    }

    public boolean isOauthAccount(User user) {
        return user != null && StringUtils.hasText(user.getOauthProvider());
    }

    public String getRequiredKeyword() {
        return REQUIRED_KEYWORD;
    }

    public String resolveReauthMode(User user) {
        return isOauthAccount(user) ? "OAUTH_EMAIL_CODE" : "PASSWORD";
    }

    private void ensureAdmin(User user) {
        if (user == null || user.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Action reservee aux administrateurs");
        }
    }

    private void validateStrongConfirmation(Long targetId, AdminHardDeleteRequest request) {
        if (request == null) {
            throw new BadRequestException("Une confirmation forte est requise pour cette operation");
        }

        String confirmationKeyword = request.getConfirmationKeyword();
        if (!REQUIRED_KEYWORD.equals(confirmationKeyword != null ? confirmationKeyword.trim() : null)) {
            throw new BadRequestException("Le mot-cle de confirmation doit etre exactement SUPPRIMER");
        }

        String expectedId = targetId != null ? String.valueOf(targetId) : "";
        String providedId = request.getConfirmationTargetId() != null
                ? request.getConfirmationTargetId().trim()
                : "";

        if (!expectedId.equals(providedId)) {
            throw new BadRequestException("L'identifiant saisi ne correspond pas a la ressource a supprimer");
        }
    }

    private void verifyPassword(User admin, String password, String actionLabel) {
        if (!StringUtils.hasText(password)) {
            throw new BadRequestException("Le mot de passe administrateur est obligatoire pour cette action");
        }

        if (!passwordEncoder.matches(password, admin.getPassword())) {
            log.warn("Sensitive action denied (bad password) for {} on {}", admin.getEmail(), actionLabel);
            throw new ForbiddenException("Mot de passe administrateur invalide");
        }
    }

    private void verifyOauthCode(User admin, String verificationCode) {
        if (!StringUtils.hasText(verificationCode)) {
            throw new BadRequestException(
                    "Le code de verification est requis. Demandez un code puis saisissez-le pour confirmer."
            );
        }

        if (admin.getSensitiveActionCodeExpiry() == null
                || admin.getSensitiveActionCodeExpiry().isBefore(LocalDateTime.now())
                || !StringUtils.hasText(admin.getSensitiveActionCodeHash())) {
            throw new BadRequestException("Le code de verification est absent ou expire. Demandez un nouveau code.");
        }

        boolean validCode = passwordEncoder.matches(verificationCode.trim(), admin.getSensitiveActionCodeHash());
        if (!validCode) {
            throw new ForbiddenException("Code de verification invalide");
        }

        admin.setSensitiveActionCodeHash(null);
        admin.setSensitiveActionCodeExpiry(null);
        userRepository.save(admin);
    }

    private String generateNumericCode() {
        int value = secureRandom.nextInt(1_000_000);
        return String.format("%06d", value);
    }

    private String resolveRecipientName(User user) {
        String fullName = user.getFullName();
        return StringUtils.hasText(fullName) ? fullName : user.getEmail();
    }
}
