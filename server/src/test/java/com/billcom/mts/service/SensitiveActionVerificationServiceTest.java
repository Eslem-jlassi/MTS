package com.billcom.mts.service;

import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SensitiveActionVerificationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private SensitiveActionVerificationService service;

    private User localAdmin;
    private User oauthAdmin;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "codeExpirationMinutes", 10L);

        localAdmin = User.builder()
                .id(1L)
                .email("admin@mts-telecom.ma")
                .password("hashed-password")
                .role(UserRole.ADMIN)
                .oauthProvider(null)
                .build();

        oauthAdmin = User.builder()
                .id(2L)
                .email("oauth-admin@mts-telecom.ma")
                .password("hashed-password")
                .role(UserRole.ADMIN)
                .oauthProvider("GOOGLE")
                .build();
    }

    @Test
    @DisplayName("verifyHardDeleteAuthorization should validate local admin password")
    void verifyHardDeleteAuthorization_localPassword_success() {
        AdminHardDeleteRequest request = AdminHardDeleteRequest.builder()
                .confirmationKeyword("SUPPRIMER")
                .confirmationTargetId("42")
                .currentPassword("Password1!")
                .build();

        when(passwordEncoder.matches("Password1!", "hashed-password")).thenReturn(true);

        service.verifyHardDeleteAuthorization(localAdmin, 42L, request, "delete ticket");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("verifyHardDeleteAuthorization should reject wrong local admin password")
    void verifyHardDeleteAuthorization_localPassword_invalid() {
        AdminHardDeleteRequest request = AdminHardDeleteRequest.builder()
                .confirmationKeyword("SUPPRIMER")
                .confirmationTargetId("42")
                .currentPassword("WrongPassword")
                .build();

        when(passwordEncoder.matches("WrongPassword", "hashed-password")).thenReturn(false);

        assertThatThrownBy(() -> service.verifyHardDeleteAuthorization(localAdmin, 42L, request, "delete ticket"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Mot de passe administrateur invalide");
    }

    @Test
    @DisplayName("issueHardDeleteVerificationCode should persist code and send email for OAuth admin")
    void issueHardDeleteVerificationCode_oauth_success() {
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-code");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.issueHardDeleteVerificationCode(oauthAdmin, "la suppression definitive de l'incident INC-00042");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User saved = userCaptor.getValue();
        assertThat(saved.getSensitiveActionCodeHash()).isEqualTo("hashed-code");
        assertThat(saved.getSensitiveActionCodeExpiry()).isAfter(LocalDateTime.now());

        verify(emailService).sendSensitiveActionCodeEmail(
                anyString(),
                anyString(),
                anyString(),
                any(LocalDateTime.class),
                anyString()
        );
    }

    @Test
    @DisplayName("verifyHardDeleteAuthorization should validate OAuth code and clear it")
    void verifyHardDeleteAuthorization_oauthCode_success() {
        oauthAdmin.setSensitiveActionCodeHash("hashed-code");
        oauthAdmin.setSensitiveActionCodeExpiry(LocalDateTime.now().plusMinutes(5));

        AdminHardDeleteRequest request = AdminHardDeleteRequest.builder()
                .confirmationKeyword("SUPPRIMER")
                .confirmationTargetId("99")
                .verificationCode("123456")
                .build();

        when(passwordEncoder.matches("123456", "hashed-code")).thenReturn(true);

        service.verifyHardDeleteAuthorization(oauthAdmin, 99L, request, "delete incident");

        verify(userRepository).save(oauthAdmin);
        assertThat(oauthAdmin.getSensitiveActionCodeHash()).isNull();
        assertThat(oauthAdmin.getSensitiveActionCodeExpiry()).isNull();
    }

    @Test
    @DisplayName("verifyHardDeleteAuthorization should fail for OAuth admin without code")
    void verifyHardDeleteAuthorization_oauthCode_missing() {
        oauthAdmin.setSensitiveActionCodeHash("hashed-code");
        oauthAdmin.setSensitiveActionCodeExpiry(LocalDateTime.now().plusMinutes(5));

        AdminHardDeleteRequest request = AdminHardDeleteRequest.builder()
                .confirmationKeyword("SUPPRIMER")
                .confirmationTargetId("99")
                .build();

        assertThatThrownBy(() -> service.verifyHardDeleteAuthorization(oauthAdmin, 99L, request, "delete incident"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("code de verification");
    }
}
