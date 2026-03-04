package com.billcom.mts.service.impl;

import com.billcom.mts.entity.RefreshToken;
import com.billcom.mts.entity.User;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.repository.RefreshTokenRepository;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Implémentation du service de gestion des refresh tokens.
 * 
 * Sécurité:
 * - Les tokens sont stockés en BDD pour permettre la révocation
 * - Rotation automatique: un token utilisé est remplacé par un nouveau
 * - Nettoyage automatique des tokens expirés toutes les heures
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;

    @Value("${jwt.refresh-token.expiration-ms}")
    private long refreshTokenExpiration;

    /** Nombre max de sessions simultanées par utilisateur */
    private static final int MAX_SESSIONS = 5;

    @Override
    @Transactional
    public RefreshToken createRefreshToken(User user, String ipAddress, String userAgent) {
        // Vérifier le nombre de sessions actives
        long activeSessions = refreshTokenRepository
                .countByUserIdAndRevokedFalseAndExpiresAtAfter(user.getId(), LocalDateTime.now());
        
        // Si trop de sessions, révoquer les anciennes
        if (activeSessions >= MAX_SESSIONS) {
            log.info("Utilisateur {} a atteint la limite de sessions ({}), révocation des anciennes", 
                     user.getEmail(), MAX_SESSIONS);
            refreshTokenRepository.revokeAllByUserId(user.getId());
        }

        // Générer le JWT refresh token
        String tokenValue = jwtService.generateRefreshToken(user);

        // Calculer la date d'expiration
        LocalDateTime expiresAt = LocalDateTime.now()
                .plusSeconds(refreshTokenExpiration / 1000);

        // Créer et sauvegarder l'entité
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(expiresAt)
                .revoked(false)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        refreshToken = refreshTokenRepository.save(refreshToken);
        log.debug("Refresh token créé pour l'utilisateur: {}", user.getEmail());

        return refreshToken;
    }

    @Override
    @Transactional(readOnly = true)
    public RefreshToken validateRefreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenAndRevokedFalse(token)
                .orElseThrow(() -> new UnauthorizedException("Refresh token invalide ou révoqué"));

        if (refreshToken.isExpired()) {
            throw new UnauthorizedException("Refresh token expiré");
        }

        if (!refreshToken.getUser().getIsActive()) {
            throw new UnauthorizedException("Compte utilisateur désactivé");
        }

        return refreshToken;
    }

    @Override
    @Transactional
    public RefreshToken rotateRefreshToken(String oldToken, String ipAddress, String userAgent) {
        // Valider l'ancien token
        RefreshToken oldRefreshToken = validateRefreshToken(oldToken);

        // Révoquer l'ancien token (rotation)
        oldRefreshToken.setRevoked(true);
        refreshTokenRepository.save(oldRefreshToken);

        // Créer un nouveau token
        return createRefreshToken(oldRefreshToken.getUser(), ipAddress, userAgent);
    }

    @Override
    @Transactional
    public void revokeToken(String token) {
        int revoked = refreshTokenRepository.revokeByToken(token);
        if (revoked > 0) {
            log.debug("Refresh token révoqué");
        }
    }

    @Override
    @Transactional
    public void revokeAllUserTokens(Long userId) {
        int revoked = refreshTokenRepository.revokeAllByUserId(userId);
        log.info("Tous les refresh tokens révoqués pour l'utilisateur {}: {} tokens", userId, revoked);
    }

    @Override
    @Transactional
    @Scheduled(fixedRate = 3600000) // Toutes les heures
    public void cleanupExpiredTokens() {
        try {
            log.debug("Starting expired refresh token cleanup job");
            int deleted = refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
            if (deleted > 0) {
                log.info("Nettoyage: {} refresh tokens expirés supprimés", deleted);
            } else {
                log.debug("No expired tokens to clean up");
            }
        } catch (Exception e) {
            log.error("Failed to cleanup expired refresh tokens", e);
            // Don't rethrow - allow the scheduled job to continue running
        }
    }
}
