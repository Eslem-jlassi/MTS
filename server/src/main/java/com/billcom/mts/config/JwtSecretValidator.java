package com.billcom.mts.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * ============================================================================
 * JwtSecretValidator - Validates JWT Secret Configuration on Startup
 * ============================================================================
 * 
 * CRITICAL SECURITY FIX: Validates JWT secret strength before application starts
 * 
 * VALIDATION RULES:
 * - Minimum length: 43 characters (256 bits encoded in base64)
 * - Must not be the default development value in production
 * - Logs security warnings if weak secret detected
 * 
 * BEST PRACTICES:
 * - Generate strong secret: openssl rand -base64 64
 * - Store in environment variable: export JWT_SECRET=<your-secret>
 * - Never commit secrets to version control
 * - Rotate secrets periodically
 * 
 * ============================================================================
 */
@Slf4j
@Configuration
public class JwtSecretValidator {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    private static final int MINIMUM_SECRET_LENGTH = 43;  // 256 bits in base64
    private static final String DEFAULT_SECRET_PREFIX = "CHANGE_THIS_IN_PRODUCTION";
    private static final String DEV_SECRET_PREFIX = "MTS_BILLCOM";

    @PostConstruct
    public void validateJwtSecret() {
        log.info("Validating JWT secret configuration...");

        // Check if using default/weak secret
        if (jwtSecret.startsWith(DEFAULT_SECRET_PREFIX) || jwtSecret.startsWith(DEV_SECRET_PREFIX)) {
            if ("prod".equalsIgnoreCase(activeProfile) || "production".equalsIgnoreCase(activeProfile)) {
                log.error("╔════════════════════════════════════════════════════════════════╗");
                log.error("║ CRITICAL SECURITY VULNERABILITY DETECTED!                      ║");
                log.error("║ Using default JWT secret in PRODUCTION environment!            ║");
                log.error("║                                                                ║");
                log.error("║ ACTION REQUIRED:                                               ║");
                log.error("║ 1. Generate strong secret: openssl rand -base64 64            ║");
                log.error("║ 2. Set environment variable: export JWT_SECRET=<your-secret>  ║");
                log.error("║ 3. Restart the application                                    ║");
                log.error("║                                                                ║");
                log.error("║ RISK: All JWTs can be forged by attackers!                    ║");
                log.error("╚════════════════════════════════════════════════════════════════╝");
                
                // Block startup in production with default secret
                throw new IllegalStateException("Cannot start with default JWT secret in production! Set JWT_SECRET environment variable.");
            } else {
                log.warn("────────────────────────────────────────────────────────────────");
                log.warn("⚠️  WARNING: Using default JWT secret in {} environment!", activeProfile);
                log.warn("   This is acceptable for development but NEVER use in production!");
                log.warn("────────────────────────────────────────────────────────────────");
            }
        }

        // Check secret length
        int secretLength = jwtSecret.length();
        if (secretLength < MINIMUM_SECRET_LENGTH) {
            log.error("╔════════════════════════════════════════════════════════════════╗");
            log.error("║ CRITICAL: JWT secret is TOO SHORT!                             ║");
            log.error("║ Current length: {} characters                                   ║", secretLength);
            log.error("║ Minimum required: {} characters (256 bits)                      ║", MINIMUM_SECRET_LENGTH);
            log.error("║                                                                ║");
            log.error("║ A short secret is vulnerable to brute force attacks!          ║");
            log.error("║ Generate a strong secret: openssl rand -base64 64             ║");
            log.error("╚════════════════════════════════════════════════════════════════╝");
        } else {
            log.info("✓ JWT secret length validated: {} characters (>= {} required)", secretLength, MINIMUM_SECRET_LENGTH);
        }

        // Check entropy (basic check)
        if (isLowEntropy(jwtSecret)) {
            log.warn("⚠️  WARNING: JWT secret may have low entropy (repetitive pattern detected)");
            log.warn("   Consider generating a new random secret for better security");
        }

        log.info("JWT secret validation completed");
    }

    /**
     * Basic entropy check - detects obviously weak secrets
     */
    private boolean isLowEntropy(String secret) {
        // Check for repetitive characters
        if (secret.matches(".*(.)\\1{5,}.*")) {  // 6+ consecutive same characters
            return true;
        }

        // Check for common patterns
        String lower = secret.toLowerCase();
        String[] weakPatterns = {"123456", "password", "secret", "admin", "qwerty"};
        for (String pattern : weakPatterns) {
            if (lower.contains(pattern)) {
                return true;
            }
        }

        return false;
    }
}
