package com.billcom.mts.service;

import com.billcom.mts.exception.TooManyRequestsException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiting for sensitive authentication endpoints.
 */
@Slf4j
@Service
public class AuthRateLimitService {

    private final Map<String, RateWindow> windows = new ConcurrentHashMap<>();

    @Value("${app.auth.rate-limit.login.max-attempts:5}")
    private int loginMaxAttempts;

    @Value("${app.auth.rate-limit.login.window-seconds:60}")
    private int loginWindowSeconds;

    @Value("${app.auth.rate-limit.register.max-attempts:5}")
    private int registerMaxAttempts;

    @Value("${app.auth.rate-limit.register.window-seconds:300}")
    private int registerWindowSeconds;

    @Value("${app.auth.rate-limit.forgot-password.max-attempts:10}")
    private int forgotPasswordMaxAttempts;

    @Value("${app.auth.rate-limit.forgot-password.window-seconds:60}")
    private int forgotPasswordWindowSeconds;

    @Value("${app.auth.rate-limit.reset-password.max-attempts:20}")
    private int resetPasswordMaxAttempts;

    @Value("${app.auth.rate-limit.reset-password.window-seconds:60}")
    private int resetPasswordWindowSeconds;

    @Value("${app.auth.rate-limit.resend-verification.max-attempts:10}")
    private int resendVerificationMaxAttempts;

    @Value("${app.auth.rate-limit.resend-verification.window-seconds:60}")
    private int resendVerificationWindowSeconds;

    public void checkLogin(String clientIp) {
        check(
                "login",
                clientIp,
                loginMaxAttempts,
                loginWindowSeconds,
                "Trop de tentatives de connexion. Veuillez reessayer dans %d secondes."
        );
    }

    public void checkRegister(String clientIp) {
        check(
                "register",
                clientIp,
                registerMaxAttempts,
                registerWindowSeconds,
                "Trop de tentatives d'inscription. Veuillez reessayer dans %d secondes."
        );
    }

    public void checkForgotPassword(String clientIp) {
        check(
                "forgot-password",
                clientIp,
                forgotPasswordMaxAttempts,
                forgotPasswordWindowSeconds,
                "Trop de demandes de reinitialisation. Veuillez reessayer dans %d secondes."
        );
    }

    public void checkResetPassword(String clientIp) {
        check(
                "reset-password",
                clientIp,
                resetPasswordMaxAttempts,
                resetPasswordWindowSeconds,
                "Trop de tentatives de reinitialisation. Veuillez reessayer dans %d secondes."
        );
    }

    public void checkResendVerification(String clientIp) {
        check(
                "resend-verification",
                clientIp,
                resendVerificationMaxAttempts,
                resendVerificationWindowSeconds,
                "Trop de demandes de renvoi de verification. Veuillez reessayer dans %d secondes."
        );
    }

    private void check(String action, String identifier, int maxAttempts, int windowSeconds, String messageTemplate) {
        String normalizedIdentifier = normalizeIdentifier(identifier);
        long now = System.currentTimeMillis();
        long windowMs = Math.max(1, windowSeconds) * 1000L;
        String key = action + ":" + normalizedIdentifier;

        RateWindow currentWindow = windows.compute(key, (ignored, existingWindow) -> {
            if (existingWindow == null || now - existingWindow.windowStartMs >= windowMs) {
                return new RateWindow(now, 1);
            }
            existingWindow.attempts += 1;
            return existingWindow;
        });

        if (currentWindow == null) {
            return;
        }

        if (currentWindow.attempts <= maxAttempts) {
            return;
        }

        int retryAfterSeconds = computeRetryAfterSeconds(currentWindow.windowStartMs, now, windowSeconds);
        log.warn("Rate limit exceeded for action='{}' identifier='{}' attempts={}",
                action,
                normalizedIdentifier,
                currentWindow.attempts);
        throw new TooManyRequestsException(String.format(messageTemplate, retryAfterSeconds), retryAfterSeconds);
    }

    private int computeRetryAfterSeconds(long windowStartMs, long nowMs, int windowSeconds) {
        long elapsedSeconds = Math.max(0L, (nowMs - windowStartMs) / 1000L);
        int retryAfter = windowSeconds - (int) elapsedSeconds;
        return Math.max(1, retryAfter);
    }

    private String normalizeIdentifier(String identifier) {
        if (!StringUtils.hasText(identifier)) {
            return "unknown";
        }
        return identifier.trim();
    }

    private static final class RateWindow {
        private final long windowStartMs;
        private int attempts;

        private RateWindow(long windowStartMs, int attempts) {
            this.windowStartMs = windowStartMs;
            this.attempts = attempts;
        }
    }
}
