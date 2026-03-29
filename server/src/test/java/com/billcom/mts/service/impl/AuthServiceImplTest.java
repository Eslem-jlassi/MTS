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
import com.billcom.mts.service.EmailService;
import com.billcom.mts.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private EmailService emailService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User testUser;
    private RefreshToken testRefreshToken;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "allowInternalSignup", false);
        ReflectionTestUtils.setField(authService, "requireEmailVerification", false);
        ReflectionTestUtils.setField(authService, "emailVerificationExpirationHours", 24L);
        ReflectionTestUtils.setField(authService, "passwordResetExpirationHours", 1L);

        testUser = User.builder()
                .id(1L)
                .email("admin@billcom.tn")
                .password("encodedPassword")
                .firstName("Admin")
                .lastName("Billcom")
                .role(UserRole.ADMIN)
                .isActive(true)
                .emailVerified(true)
                .build();

        testRefreshToken = RefreshToken.builder()
                .id(1L)
                .user(testUser)
                .token("refresh-token-value")
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
    }

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
            assertThat(response.getUser().getEmail()).isEqualTo("admin@billcom.tn");
            assertThat(response.getUser().getEmailVerified()).isTrue();

            verify(userRepository).save(argThat(u -> u.getLastLoginAt() != null));
        }

        @Test
        @DisplayName("Devrait refuser la connexion si l'email n'est pas verifie")
        void login_unverifiedEmail_forbidden() {
            LoginRequest request = LoginRequest.builder()
                    .email("client@test.tn")
                    .password("Password1!")
                    .build();

            User unverifiedUser = User.builder()
                    .id(2L)
                    .email("client@test.tn")
                    .password("encoded")
                    .firstName("Client")
                    .lastName("Test")
                    .role(UserRole.CLIENT)
                    .isActive(true)
                    .emailVerified(false)
                    .build();

            Authentication auth = mock(Authentication.class);
            when(auth.getPrincipal()).thenReturn(unverifiedUser);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(auth);

            assertThatThrownBy(() -> authService.login(request, "127.0.0.1"))
                    .isInstanceOf(ForbiddenException.class)
                    .hasMessageContaining("pas encore verifiee");

            verify(refreshTokenService, never()).createRefreshToken(any(), anyString(), anyString());
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
        @DisplayName("Devrait inscrire un CLIENT avec succes")
        void register_client_success() {
            RegisterRequest request = validClientRequest();

            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                user.setId(10L);
                return user;
            });
            when(clientRepository.findMaxClientCodeNumber(anyString())).thenReturn(null);
            when(refreshTokenService.createRefreshToken(any(), anyString(), anyString()))
                    .thenReturn(testRefreshToken);
            when(jwtService.generateAccessToken(any())).thenReturn("access-token");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.register(request, "127.0.0.1");

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("access-token");
            assertThat(response.getEmailVerificationRequired()).isFalse();
            assertThat(response.getUser().getEmailVerified()).isTrue();
            verify(clientRepository).save(any());
        }

        @Test
        @DisplayName("Devrait exiger la verification email si activee")
        void register_requiresEmailVerification() {
            ReflectionTestUtils.setField(authService, "requireEmailVerification", true);
            RegisterRequest request = validClientRequest();

            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                user.setId(10L);
                return user;
            });
            when(clientRepository.findMaxClientCodeNumber(anyString())).thenReturn(null);
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.register(request, "127.0.0.1");

            assertThat(response.getAccessToken()).isNull();
            assertThat(response.getRefreshToken()).isNull();
            assertThat(response.getEmailVerificationRequired()).isTrue();
            assertThat(response.getEmailVerificationSent()).isTrue();
            assertThat(response.getUser().getEmailVerified()).isFalse();

            verify(refreshTokenService, never()).createRefreshToken(any(), anyString(), anyString());
            verify(emailService).sendEmailVerificationEmail(
                    eq("client@test.tn"),
                    anyString(),
                    anyString(),
                    any(LocalDateTime.class)
            );
        }

        @Test
        @DisplayName("Devrait refuser un role ADMIN si allowInternalSignup=false")
        void register_admin_forbidden_when_signup_disabled() {
            RegisterRequest request = validClientRequest();
            request.setRole(UserRole.ADMIN);

            assertThatThrownBy(() -> authService.register(request, "127.0.0.1"))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Devrait autoriser un role ADMIN si allowInternalSignup=true")
        void register_admin_allowed_when_signup_enabled() {
            ReflectionTestUtils.setField(authService, "allowInternalSignup", true);
            RegisterRequest request = validClientRequest();
            request.setRole(UserRole.ADMIN);

            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encoded");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                user.setId(2L);
                return user;
            });
            when(refreshTokenService.createRefreshToken(any(), anyString(), anyString()))
                    .thenReturn(testRefreshToken);
            when(jwtService.generateAccessToken(any())).thenReturn("tok");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            AuthResponse response = authService.register(request, "127.0.0.1");
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("Devrait refuser si email deja existant")
        void register_duplicate_email() {
            RegisterRequest request = validClientRequest();
            when(userRepository.existsByEmail("client@test.tn")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(request, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait refuser si mots de passe ne correspondent pas")
        void register_password_mismatch() {
            RegisterRequest request = validClientRequest();
            request.setConfirmPassword("DifferentPassword1!");

            when(userRepository.existsByEmail(anyString())).thenReturn(false);

            assertThatThrownBy(() -> authService.register(request, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("refreshToken()")
    class RefreshTokenTests {

        @Test
        @DisplayName("Devrait retourner de nouveaux tokens apres rotation")
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
    }

    @Nested
    @DisplayName("verifyEmail()")
    class VerifyEmailTests {

        @Test
        @DisplayName("Devrait verifier l'email et purger le token")
        void verifyEmail_success() {
            User user = User.builder()
                    .id(3L)
                    .email("client@test.tn")
                    .emailVerified(false)
                    .emailVerificationToken("verify-token")
                    .emailVerificationTokenExpiry(LocalDateTime.now().plusHours(2))
                    .build();

            when(userRepository.findByEmailVerificationToken("verify-token")).thenReturn(java.util.Optional.of(user));

            authService.verifyEmail("verify-token");

            verify(userRepository).save(argThat(saved ->
                    Boolean.TRUE.equals(saved.getEmailVerified())
                            && saved.getEmailVerificationToken() == null
                            && saved.getEmailVerificationTokenExpiry() == null
            ));
        }

        @Test
        @DisplayName("Devrait refuser un token de verification expire")
        void verifyEmail_expiredToken() {
            User user = User.builder()
                    .id(3L)
                    .email("client@test.tn")
                    .emailVerified(false)
                    .emailVerificationToken("verify-token")
                    .emailVerificationTokenExpiry(LocalDateTime.now().minusMinutes(1))
                    .build();

            when(userRepository.findByEmailVerificationToken("verify-token")).thenReturn(java.util.Optional.of(user));

            assertThatThrownBy(() -> authService.verifyEmail("verify-token"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("expire");
        }
    }

    @Nested
    @DisplayName("resendVerificationEmail()")
    class ResendVerificationEmailTests {

        @Test
        @DisplayName("Devrait regenerer un token et renvoyer l'email")
        void resendVerificationEmail_success() {
            User user = User.builder()
                    .id(4L)
                    .email("agent@test.tn")
                    .firstName("Agent")
                    .lastName("Test")
                    .role(UserRole.AGENT)
                    .emailVerified(false)
                    .build();

            when(userRepository.findByEmail("agent@test.tn")).thenReturn(java.util.Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            authService.resendVerificationEmail("agent@test.tn");

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();

            assertThat(savedUser.getEmailVerificationToken()).isNotBlank();
            assertThat(savedUser.getEmailVerificationTokenExpiry()).isAfter(LocalDateTime.now());
            verify(emailService).sendEmailVerificationEmail(
                    eq("agent@test.tn"),
                    eq("Agent Test"),
                    eq(savedUser.getEmailVerificationToken()),
                    eq(savedUser.getEmailVerificationTokenExpiry())
            );
        }
    }
}
