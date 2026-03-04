package com.billcom.mts.service.impl;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.dto.auth.LoginRequest;
import com.billcom.mts.dto.auth.RegisterRequest;
import com.billcom.mts.entity.RefreshToken;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour AuthServiceImpl.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User testUser;
    private RefreshToken testRefreshToken;

    @BeforeEach
    void setUp() {
        // Default: disable internal signup
        ReflectionTestUtils.setField(authService, "allowInternalSignup", false);

        testUser = User.builder()
                .id(1L)
                .email("admin@billcom.tn")
                .password("encodedPassword")
                .firstName("Admin")
                .lastName("Billcom")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build();

        testRefreshToken = RefreshToken.builder()
                .id(1L)
                .user(testUser)
                .token("refresh-token-value")
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
    }

    // =========================================================================
    // LOGIN
    // =========================================================================
    @Nested
    @DisplayName("login()")
    class LoginTests {

        @Test
        @DisplayName("Devrait retourner un AuthResponse valide avec les bons tokens")
        void login_success() {
            LoginRequest request = LoginRequest.builder()
                    .email("admin@billcom.tn")
                    .password("Password1!")
                    .build();

            Authentication auth = mock(Authentication.class);
            when(auth.getPrincipal()).thenReturn(testUser);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(auth);
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(refreshTokenService.createRefreshToken(any(User.class), anyString(), anyString()))
                    .thenReturn(testRefreshToken);
            when(jwtService.generateAccessToken(any())).thenReturn("access-token-value");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.login(request, "127.0.0.1");

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("access-token-value");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token-value");
            assertThat(response.getTokenType()).isEqualTo("Bearer");
            assertThat(response.getUser()).isNotNull();
            assertThat(response.getUser().getEmail()).isEqualTo("admin@billcom.tn");
            assertThat(response.getUser().getRole()).isEqualTo(UserRole.ADMIN);

            verify(userRepository).save(argThat(u -> u.getLastLoginAt() != null));
        }

        @Test
        @DisplayName("Devrait lancer UnauthorizedException si credentials invalides")
        void login_badCredentials() {
            LoginRequest request = LoginRequest.builder()
                    .email("admin@billcom.tn")
                    .password("wrongpassword")
                    .build();

            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            assertThatThrownBy(() -> authService.login(request, "127.0.0.1"))
                    .isInstanceOf(UnauthorizedException.class);
        }
    }

    // =========================================================================
    // REGISTER
    // =========================================================================
    @Nested
    @DisplayName("register()")
    class RegisterTests {

        private RegisterRequest validClientRequest() {
            return RegisterRequest.builder()
                    .email("client@test.tn")
                    .password("Password1!")
                    .confirmPassword("Password1!")
                    .firstName("Test")
                    .lastName("Client")
                    .role(UserRole.CLIENT)
                    .companyName("Test Corp")
                    .build();
        }

        @Test
        @DisplayName("Devrait inscrire un CLIENT avec succès")
        void register_client_success() {
            RegisterRequest request = validClientRequest();

            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

            User savedUser = User.builder()
                    .id(10L)
                    .email("client@test.tn")
                    .firstName("Test")
                    .lastName("Client")
                    .role(UserRole.CLIENT)
                    .isActive(true)
                    .build();
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(clientRepository.findMaxClientCodeNumber(anyString())).thenReturn(null);
            when(clientRepository.save(any())).thenReturn(null);
            when(refreshTokenService.createRefreshToken(any(), anyString(), anyString()))
                    .thenReturn(testRefreshToken);
            when(jwtService.generateAccessToken(any())).thenReturn("access-token");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.register(request);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("access-token");
            verify(userRepository).save(any(User.class));
            verify(clientRepository).save(any()); // Client profile created
        }

        @Test
        @DisplayName("Devrait refuser un rôle ADMIN si allowInternalSignup=false")
        void register_admin_forbidden_when_signup_disabled() {
            RegisterRequest request = validClientRequest();
            request.setRole(UserRole.ADMIN);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Devrait autoriser un rôle ADMIN si allowInternalSignup=true")
        void register_admin_allowed_when_signup_enabled() {
            ReflectionTestUtils.setField(authService, "allowInternalSignup", true);
            RegisterRequest request = validClientRequest();
            request.setRole(UserRole.ADMIN);

            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encoded");
            when(userRepository.save(any(User.class))).thenReturn(
                    User.builder().id(2L).email("client@test.tn").role(UserRole.ADMIN).isActive(true).build()
            );
            when(refreshTokenService.createRefreshToken(any(), anyString(), anyString()))
                    .thenReturn(testRefreshToken);
            when(jwtService.generateAccessToken(any())).thenReturn("tok");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.register(request);
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("Devrait refuser si email déjà existant")
        void register_duplicate_email() {
            RegisterRequest request = validClientRequest();
            when(userRepository.existsByEmail("client@test.tn")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait refuser si mots de passe ne correspondent pas")
        void register_password_mismatch() {
            RegisterRequest request = validClientRequest();
            request.setConfirmPassword("DifferentPassword1!");

            when(userRepository.existsByEmail(anyString())).thenReturn(false);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait refuser un mot de passe trop court (< 8 chars)")
        void register_password_too_short() {
            RegisterRequest request = validClientRequest();
            request.setPassword("Ab1!");
            request.setConfirmPassword("Ab1!");

            when(userRepository.existsByEmail(anyString())).thenReturn(false);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait refuser un mot de passe sans majuscule")
        void register_password_no_uppercase() {
            RegisterRequest request = validClientRequest();
            request.setPassword("password1!");
            request.setConfirmPassword("password1!");

            when(userRepository.existsByEmail(anyString())).thenReturn(false);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait refuser un mot de passe sans chiffre")
        void register_password_no_digit() {
            RegisterRequest request = validClientRequest();
            request.setPassword("Password!");
            request.setConfirmPassword("Password!");

            when(userRepository.existsByEmail(anyString())).thenReturn(false);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    // =========================================================================
    // REFRESH TOKEN
    // =========================================================================
    @Nested
    @DisplayName("refreshToken()")
    class RefreshTokenTests {

        @Test
        @DisplayName("Devrait retourner de nouveaux tokens après rotation")
        void refreshToken_success() {
            RefreshToken newToken = RefreshToken.builder()
                    .id(2L)
                    .user(testUser)
                    .token("new-refresh-token")
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .revoked(false)
                    .build();

            when(refreshTokenService.validateRefreshToken("old-token")).thenReturn(testRefreshToken);
            when(refreshTokenService.rotateRefreshToken(eq("old-token"), anyString(), anyString()))
                    .thenReturn(newToken);
            when(jwtService.generateAccessToken(any())).thenReturn("new-access-token");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.refreshToken("old-token", "127.0.0.1");

            assertThat(response.getAccessToken()).isEqualTo("new-access-token");
            assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
        }

        @Test
        @DisplayName("Devrait propager l'exception si refresh token invalide")
        void refreshToken_invalid() {
            when(refreshTokenService.validateRefreshToken("bad-token"))
                    .thenThrow(new UnauthorizedException("Refresh token invalide ou révoqué"));

            assertThatThrownBy(() -> authService.refreshToken("bad-token", "127.0.0.1"))
                    .isInstanceOf(UnauthorizedException.class);
        }
    }

    // =========================================================================
    // GOOGLE LOGIN
    // =========================================================================
    @Nested
    @DisplayName("googleLogin()")
    class GoogleLoginTests {

        @Test
        @DisplayName("Devrait lancer BadRequestException si Google Client ID non configuré")
        void googleLogin_notConfigured() {
            // googleClientId par défaut est null (non injecté par @Value en test)
            ReflectionTestUtils.setField(authService, "googleClientId", "");

            assertThatThrownBy(() -> authService.googleLogin("some-token", "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("non configurée");
        }

        @Test
        @DisplayName("Devrait lancer BadRequestException si Google Client ID est null")
        void googleLogin_nullClientId() {
            ReflectionTestUtils.setField(authService, "googleClientId", null);

            assertThatThrownBy(() -> authService.googleLogin("some-token", "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("non configurée");
        }

        @Test
        @DisplayName("Devrait lancer UnauthorizedException si token Google invalide")
        void googleLogin_invalidToken() {
            ReflectionTestUtils.setField(authService, "googleClientId", "fake-client-id.apps.googleusercontent.com");

            // Le token "invalid-token" ne sera pas vérifié par Google → exception
            assertThatThrownBy(() -> authService.googleLogin("invalid-token", "127.0.0.1"))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("Token Google invalide");
        }
    }

    // =========================================================================
    // LOGOUT
    // =========================================================================
    @Nested
    @DisplayName("logout()")
    class LogoutTests {

        @Test
        @DisplayName("Devrait révoquer le refresh token")
        void logout_success() {
            authService.logout("token-to-revoke");
            verify(refreshTokenService).revokeToken("token-to-revoke");
        }

        @Test
        @DisplayName("Ne devrait rien faire si token null")
        void logout_null_token() {
            authService.logout(null);
            verify(refreshTokenService, never()).revokeToken(anyString());
        }

        @Test
        @DisplayName("Ne devrait rien faire si token vide")
        void logout_blank_token() {
            authService.logout("   ");
            verify(refreshTokenService, never()).revokeToken(anyString());
        }
    }
}
