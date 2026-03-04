package com.billcom.mts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * RefreshToken - Entité pour les tokens de rafraîchissement.
 * 
 * Stocke les refresh tokens en base pour permettre:
 * - La révocation (logout, changement de mot de passe)
 * - Le suivi des sessions actives
 * - La rotation de tokens (sécurité renforcée)
 * 
 * @author Billcom Consulting - PFE 2026
 */
@Entity
@Table(name = "refresh_tokens", indexes = {
    @Index(name = "idx_refresh_tokens_token", columnList = "token"),
    @Index(name = "idx_refresh_tokens_user_id", columnList = "user_id"),
    @Index(name = "idx_refresh_tokens_expires_at", columnList = "expires_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Token JWT de rafraîchissement (valeur complète) */
    @Column(nullable = false, unique = true, length = 512)
    private String token;

    /** Date d'expiration du token */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** true = token révoqué (logout, rotation) */
    @Builder.Default
    @Column(nullable = false)
    private Boolean revoked = false;

    /** Info navigateur pour suivi des sessions */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /** Adresse IP au moment de la création */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ========== Méthodes utilitaires ==========

    /** Vérifie si le token est expiré */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /** Vérifie si le token est utilisable (non révoqué et non expiré) */
    public boolean isValid() {
        return !revoked && !isExpired();
    }
}
