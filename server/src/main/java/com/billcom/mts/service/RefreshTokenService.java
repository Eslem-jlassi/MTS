package com.billcom.mts.service;

import com.billcom.mts.entity.RefreshToken;
import com.billcom.mts.entity.User;

/**
 * Service de gestion des refresh tokens.
 * 
 * Responsabilités:
 * - Création et stockage des refresh tokens
 * - Validation et rotation des tokens
 * - Révocation (logout, changement de mot de passe)
 * - Nettoyage des tokens expirés
 */
public interface RefreshTokenService {

    /**
     * Crée un nouveau refresh token pour l'utilisateur.
     * 
     * @param user L'utilisateur
     * @param ipAddress Adresse IP du client
     * @param userAgent User-Agent du navigateur
     * @return Le refresh token créé
     */
    RefreshToken createRefreshToken(User user, String ipAddress, String userAgent);

    /**
     * Valide un refresh token et retourne l'entité.
     * 
     * @param token La valeur du token
     * @return Le refresh token validé
     * @throws com.billcom.mts.exception.UnauthorizedException si invalide
     */
    RefreshToken validateRefreshToken(String token);

    /**
     * Effectue la rotation du token: révoque l'ancien, crée un nouveau.
     * 
     * @param oldToken Le token actuel
     * @param ipAddress Nouvelle adresse IP
     * @param userAgent Nouveau User-Agent
     * @return Le nouveau refresh token
     */
    RefreshToken rotateRefreshToken(String oldToken, String ipAddress, String userAgent);

    /**
     * Révoque un token spécifique (logout d'une session).
     * 
     * @param token La valeur du token à révoquer
     */
    void revokeToken(String token);

    /**
     * Révoque tous les tokens d'un utilisateur (logout global).
     * 
     * @param userId ID de l'utilisateur
     */
    void revokeAllUserTokens(Long userId);

    /**
     * Nettoie les tokens expirés de la base de données.
     * Appelé périodiquement par un @Scheduled.
     */
    void cleanupExpiredTokens();
}
