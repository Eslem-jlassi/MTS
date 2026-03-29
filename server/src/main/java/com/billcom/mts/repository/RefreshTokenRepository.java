package com.billcom.mts.repository;

import com.billcom.mts.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository pour les refresh tokens.
 * Gère la persistance et les requêtes sur les tokens de rafraîchissement.
 */
@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /** Trouve un token non révoqué par sa valeur */
    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);

    /** Trouve un token par sa valeur (même révoqué) */
    Optional<RefreshToken> findByToken(String token);

    /** Tous les tokens actifs d'un utilisateur */
    List<RefreshToken> findByUserIdAndRevokedFalse(Long userId);

    /** Révoque tous les tokens d'un utilisateur (logout global) */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user.id = :userId AND rt.revoked = false")
    int revokeAllByUserId(@Param("userId") Long userId);

    /** Révoque un token spécifique */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.token = :token")
    int revokeByToken(@Param("token") String token);

    /** Supprime les tokens expirés (nettoyage) */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    int deleteExpiredTokens(@Param("now") LocalDateTime now);

    /** Supprime tous les refresh tokens d'un utilisateur */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    /** Compte les sessions actives d'un utilisateur */
    long countByUserIdAndRevokedFalseAndExpiresAtAfter(Long userId, LocalDateTime now);
}
