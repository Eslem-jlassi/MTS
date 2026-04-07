package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.AuthResponse;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
                .andExpect(jsonPath("$.tokenType").value("Cookie"));

        verify(authRateLimitService).checkRegister("203.0.113.10");
        verify(authService).register(org.mockito.ArgumentMatchers.any(), eq("203.0.113.10"));
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
                .andExpect(jsonPath("$.tokenType").value("Cookie"));

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
}
