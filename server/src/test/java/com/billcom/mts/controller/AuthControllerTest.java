package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.AuthRateLimitService;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthController authController;

    @MockBean
    private AuthService authService;

    @MockBean
    private AuthRateLimitService authRateLimitService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/auth/register applique checkRegister rate limit")
    void register_appliesRateLimit() throws Exception {
        when(authService.register(org.mockito.ArgumentMatchers.any(), eq("203.0.113.10")))
                .thenReturn(sampleAuthResponse());

        mockMvc.perform(post("/api/auth/register")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "client@test.tn",
                                  "password": "Password1!",
                                  "confirmPassword": "Password1!",
                                  "firstName": "Client",
                                  "lastName": "Test",
                                  "role": "CLIENT",
                                  "companyName": "Test Corp"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());

        verify(authRateLimitService).checkRegister("203.0.113.10");
        verify(authService).register(org.mockito.ArgumentMatchers.any(), eq("203.0.113.10"));
    }

    @Test
    @DisplayName("POST /api/auth/register ne cree pas de session si verification email requise")
    void register_doesNotCreateSessionWhenEmailVerificationRequired() throws Exception {
        when(authService.register(org.mockito.ArgumentMatchers.any(), eq("203.0.113.11")))
                .thenReturn(sampleEmailVerificationRequiredResponse());

        mockMvc.perform(post("/api/auth/register")
                        .header("X-Forwarded-For", "203.0.113.11")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "client@test.tn",
                                  "password": "Password1!",
                                  "confirmPassword": "Password1!",
                                  "firstName": "Client",
                                  "lastName": "Test",
                                  "role": "CLIENT",
                                  "companyName": "Test Corp"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("Cookie"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.emailVerificationRequired").value(true))
                .andExpect(jsonPath("$.emailVerificationSent").value(true))
                .andExpect(jsonPath("$.user.emailVerified").value(false))
                .andExpect(header().stringValues(
                        "Set-Cookie",
                        org.hamcrest.Matchers.hasItems(
                                org.hamcrest.Matchers.containsString("mts_auth_token=;"),
                                org.hamcrest.Matchers.containsString("mts_refresh_token=;")
                        )
                ));

        verify(authRateLimitService).checkRegister("203.0.113.11");
        verify(authService).register(org.mockito.ArgumentMatchers.any(), eq("203.0.113.11"));
    }

    @Test
    @DisplayName("POST /api/auth/google delegue vers authService.googleLogin")
    void googleLogin_delegatesToService() throws Exception {
        when(authService.googleLogin(eq("google-id-token"), eq("203.0.113.50")))
                .thenReturn(sampleAuthResponse());

        mockMvc.perform(post("/api/auth/google")
                        .header("X-Forwarded-For", "203.0.113.50")
                        .contentType("application/json")
                        .content("""
                                {
                                  "token": "google-id-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").value("access-token"));

        verify(authService).googleLogin("google-id-token", "203.0.113.50");
    }

    @Test
    @DisplayName("POST /api/auth/google retourne 401 si token Google invalide")
    void googleLogin_returnsUnauthorizedWhenTokenInvalid() throws Exception {
        when(authService.googleLogin(eq("bad-token"), eq("203.0.113.51")))
                .thenThrow(new UnauthorizedException("Token Google invalide ou expire"));

        mockMvc.perform(post("/api/auth/google")
                        .header("X-Forwarded-For", "203.0.113.51")
                        .contentType("application/json")
                        .content("""
                                {
                                  "token": "bad-token"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Token Google invalide ou expire"));
    }

    @Test
    @DisplayName("GET /api/auth/google/config retourne missing-client-id si non configure")
    void googleConfig_returnsMissingClientIdWhenNotConfigured() throws Exception {
        ReflectionTestUtils.setField(authController, "googleClientId", "");

        mockMvc.perform(get("/api/auth/google/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.reason").value("missing-client-id"));
    }

    @Test
    @DisplayName("GET /api/auth/google/config retourne invalid-client-id si format invalide")
    void googleConfig_returnsInvalidClientIdWhenMalformed() throws Exception {
        ReflectionTestUtils.setField(authController, "googleClientId", "invalid-client-id");

        mockMvc.perform(get("/api/auth/google/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.reason").value("invalid-client-id"));
    }

    @Test
    @DisplayName("GET /api/auth/google/config retourne configured si Client ID valide")
    void googleConfig_returnsConfiguredWhenClientIdValid() throws Exception {
        ReflectionTestUtils.setField(
                authController,
                "googleClientId",
                "frontend-app.apps.googleusercontent.com"
        );

        mockMvc.perform(get("/api/auth/google/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.reason").value("configured"));
    }

    @Test
    @DisplayName("POST /api/auth/login applique checkLogin rate limit")
    void login_appliesRateLimit() throws Exception {
        when(authService.login(org.mockito.ArgumentMatchers.any(), eq("198.51.100.21")))
                .thenReturn(sampleAuthResponse());

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "198.51.100.21")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "admin@test.tn",
                                  "password": "Password1!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").value("access-token"));

        verify(authRateLimitService).checkLogin("198.51.100.21");
        verify(authService).login(org.mockito.ArgumentMatchers.any(), eq("198.51.100.21"));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password applique checkForgotPassword")
    void forgotPassword_appliesRateLimit() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .header("X-Forwarded-For", "192.0.2.34")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "client@test.tn"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(authRateLimitService).checkForgotPassword("192.0.2.34");
        verify(authService).forgotPassword("client@test.tn");
    }

    @Test
    @DisplayName("POST /api/auth/reset-password applique checkResetPassword")
    void resetPassword_appliesRateLimit() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .header("X-Forwarded-For", "192.0.2.41")
                        .contentType("application/json")
                        .content("""
                                {
                                  "token": "reset-token",
                                  "newPassword": "NouveauPass1"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(authRateLimitService).checkResetPassword("192.0.2.41");
        verify(authService).resetPassword("reset-token", "NouveauPass1");
    }

    @Test
    @DisplayName("POST /api/auth/resend-verification applique checkResendVerification")
    void resendVerification_appliesRateLimit() throws Exception {
        mockMvc.perform(post("/api/auth/resend-verification")
                        .header("X-Forwarded-For", "192.0.2.77")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "client@test.tn"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(authRateLimitService).checkResendVerification("192.0.2.77");
        verify(authService).resendVerificationEmail("client@test.tn");
    }

    @Test
    @DisplayName("GET /api/auth/verify-email delegue au service")
    void verifyEmail_delegatesToService() throws Exception {
        mockMvc.perform(get("/api/auth/verify-email")
                        .param("token", "verify-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(authService).verifyEmail("verify-token");
    }

    @Test
    @DisplayName("POST /api/auth/login utilise SameSite=None pour les cookies securises")
    void login_setsSecureCrossSiteCookiesForProduction() throws Exception {
        ReflectionTestUtils.setField(authController, "cookieSecure", true);
        when(authService.login(org.mockito.ArgumentMatchers.any(), eq("198.51.100.22")))
                .thenReturn(sampleAuthResponse());

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "198.51.100.22")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "admin@test.tn",
                                  "password": "Password1!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().stringValues(
                        "Set-Cookie",
                        org.hamcrest.Matchers.hasItem(org.hamcrest.Matchers.containsString("SameSite=None"))
                ));
    }

    private AuthResponse sampleAuthResponse() {
        return AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .tokenType("Bearer")
                .expiresIn(900_000L)
                .user(AuthResponse.UserInfo.builder()
                        .id(1L)
                        .email("admin@test.tn")
                        .firstName("Admin")
                        .lastName("Root")
                        .build())
                .build();
    }

    private AuthResponse sampleEmailVerificationRequiredResponse() {
        return AuthResponse.builder()
                .accessToken(null)
                .refreshToken(null)
                .tokenType("Bearer")
                .expiresIn(0L)
                .emailVerificationRequired(true)
                .emailVerificationSent(true)
                .user(AuthResponse.UserInfo.builder()
                        .id(2L)
                        .email("client@test.tn")
                        .firstName("Client")
                        .lastName("Test")
                        .emailVerified(false)
                        .build())
                .build();
    }
}
