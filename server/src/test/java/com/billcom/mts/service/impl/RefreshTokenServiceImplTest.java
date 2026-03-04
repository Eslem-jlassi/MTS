package com.billcom.mts.service.impl;

import com.billcom.mts.entity.RefreshToken;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.repository.RefreshTokenRepository;
import com.billcom.mts.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour RefreshTokenServiceImpl.
 */
@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceImplTest {

    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private JwtService jwtService;

    @InjectMocks
    private RefreshTokenServiceImpl refreshTokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenExpiration", 604800000L); // 7 days

        testUser = User.builder()
                .id(1L)
                .email("admin@billcom.tn")
                .firstName("Admin")
                .lastName("Billcom")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build();
    }

    // =========================================================================
    // CREATE REFRESH TOKEN
    // =========================================================================
    @Nested
    @DisplayName("createRefreshToken()")
    class CreateTests {

        @Test
        @DisplayName("Devrait créer un nouveau refresh token")
        void create_success() {
            when(refreshTokenRepository.countByUserIdAndRevokedFalseAndExpiresAtAfter(eq(1L), any()))
                    .thenReturn(0L);
            when(jwtService.generateRefreshToken(testUser)).thenReturn("generated-refresh-token");
            when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> {
                RefreshToken rt = inv.getArgument(0);
                rt.setId(1L);
                return rt;
            });

            RefreshToken result = refreshTokenService.createRefreshToken(testUser, "192.168.1.1", "Mozilla/5.0");

            assertThat(result).isNotNull();
            assertThat(result.getToken()).isEqualTo("generated-refresh-token");
            assertThat(result.getUser()).isEqualTo(testUser);
            assertThat(result.getIpAddress()).isEqualTo("192.168.1.1");
            assertThat(result.getUserAgent()).isEqualTo("Mozilla/5.0");
        }

        @Test
        @DisplayName("Devrait révoquer tous les tokens si max sessions atteint (5)")
        void create_revokes_when_max_sessions() {
            when(refreshTokenRepository.countByUserIdAndRevokedFalseAndExpiresAtAfter(eq(1L), any()))
                    .thenReturn(5L);
            when(refreshTokenRepository.revokeAllByUserId(1L)).thenReturn(5);
            when(jwtService.generateRefreshToken(testUser)).thenReturn("new-token");
            when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> {
                RefreshToken rt = inv.getArgument(0);
                rt.setId(2L);
                return rt;
            });

            refreshTokenService.createRefreshToken(testUser, "10.0.0.1", "web");

            verify(refreshTokenRepository).revokeAllByUserId(1L);
        }
    }

    // =========================================================================
    // VALIDATE REFRESH TOKEN
    // =========================================================================
    @Nested
    @DisplayName("validateRefreshToken()")
    class ValidateTests {

        @Test
        @DisplayName("Devrait retourner le token si valide")
        void validate_success() {
            RefreshToken validToken = RefreshToken.builder()
                    .id(1L)
                    .user(testUser)
                    .token("valid-token")
                    .expiresAt(LocalDateTime.now().plusDays(3))
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByTokenAndRevokedFalse("valid-token"))
                    .thenReturn(Optional.of(validToken));

            RefreshToken result = refreshTokenService.validateRefreshToken("valid-token");

            assertThat(result).isNotNull();
            assertThat(result.getToken()).isEqualTo("valid-token");
        }

        @Test
        @DisplayName("Devrait lancer UnauthorizedException si token inconnu")
        void validate_token_not_found() {
            when(refreshTokenRepository.findByTokenAndRevokedFalse("unknown"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> refreshTokenService.validateRefreshToken("unknown"))
                    .isInstanceOf(UnauthorizedException.class);
        }

        @Test
        @DisplayName("Devrait lancer UnauthorizedException si token expiré")
        void validate_token_expired() {
            RefreshToken expiredToken = RefreshToken.builder()
                    .id(1L)
                    .user(testUser)
                    .token("expired-token")
                    .expiresAt(LocalDateTime.now().minusHours(1))
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByTokenAndRevokedFalse("expired-token"))
                    .thenReturn(Optional.of(expiredToken));

            assertThatThrownBy(() -> refreshTokenService.validateRefreshToken("expired-token"))
                    .isInstanceOf(UnauthorizedException.class);
        }

        @Test
        @DisplayName("Devrait lancer UnauthorizedException si utilisateur désactivé")
        void validate_user_disabled() {
            User disabledUser = User.builder()
                    .id(2L)
                    .email("disabled@billcom.tn")
                    .isActive(false)
                    .build();

            RefreshToken token = RefreshToken.builder()
                    .id(1L)
                    .user(disabledUser)
                    .token("disabled-user-token")
                    .expiresAt(LocalDateTime.now().plusDays(3))
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByTokenAndRevokedFalse("disabled-user-token"))
                    .thenReturn(Optional.of(token));

            assertThatThrownBy(() -> refreshTokenService.validateRefreshToken("disabled-user-token"))
                    .isInstanceOf(UnauthorizedException.class);
        }
    }

    // =========================================================================
    // ROTATE REFRESH TOKEN
    // =========================================================================
    @Nested
    @DisplayName("rotateRefreshToken()")
    class RotateTests {

        @Test
        @DisplayName("Devrait révoquer l'ancien et créer un nouveau token")
        void rotate_success() {
            RefreshToken oldToken = RefreshToken.builder()
                    .id(1L)
                    .user(testUser)
                    .token("old-token")
                    .expiresAt(LocalDateTime.now().plusDays(3))
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByTokenAndRevokedFalse("old-token"))
                    .thenReturn(Optional.of(oldToken));
            when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
            when(refreshTokenRepository.countByUserIdAndRevokedFalseAndExpiresAtAfter(eq(1L), any())).thenReturn(0L);
            when(jwtService.generateRefreshToken(testUser)).thenReturn("new-token");

            RefreshToken result = refreshTokenService.rotateRefreshToken("old-token", "10.0.0.1", "web");

            assertThat(result.getToken()).isEqualTo("new-token");
            // Verify old token was revoked
            verify(refreshTokenRepository).save(argThat(rt ->
                    "old-token".equals(rt.getToken()) && rt.getRevoked()
            ));
        }
    }

    // =========================================================================
    // REVOKE
    // =========================================================================
    @Nested
    @DisplayName("revokeToken()")
    class RevokeTests {

        @Test
        @DisplayName("Devrait appeler revokeByToken sur le repository")
        void revoke_success() {
            refreshTokenService.revokeToken("token-to-revoke");
            verify(refreshTokenRepository).revokeByToken("token-to-revoke");
        }
    }

    // =========================================================================
    // REVOKE ALL USER TOKENS
    // =========================================================================
    @Nested
    @DisplayName("revokeAllUserTokens()")
    class RevokeAllTests {

        @Test
        @DisplayName("Devrait révoquer tous les tokens de l'utilisateur")
        void revokeAll_success() {
            refreshTokenService.revokeAllUserTokens(1L);
            verify(refreshTokenRepository).revokeAllByUserId(1L);
        }
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================
    @Nested
    @DisplayName("cleanupExpiredTokens()")
    class CleanupTests {

        @Test
        @DisplayName("Devrait supprimer les tokens expirés")
        void cleanup_success() {
            when(refreshTokenRepository.deleteExpiredTokens(any(LocalDateTime.class))).thenReturn(5);

            refreshTokenService.cleanupExpiredTokens();

            verify(refreshTokenRepository).deleteExpiredTokens(any(LocalDateTime.class));
        }
    }
}
