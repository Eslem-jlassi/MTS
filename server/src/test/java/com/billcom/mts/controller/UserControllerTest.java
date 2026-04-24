package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.dto.user.ChangePasswordRequest;
import com.billcom.mts.dto.user.UserResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.AuditLogService;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.SensitiveActionVerificationService;
import com.billcom.mts.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private AuthService authService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private SensitiveActionVerificationService sensitiveActionVerificationService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("PUT /api/users/me/change-password retourne 200 et delegue au service")
    void changeCurrentUserPassword_success() {
        User currentUser = User.builder()
                .id(7L)
                .email("agent@mts-telecom.tn")
                .password("encoded-password")
                .role(UserRole.AGENT)
                .isActive(true)
                .build();

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("Password1!")
                .newPassword("NouveauPass1")
                .build();

        UserController controller = new UserController(
                authService,
                userService,
                auditLogService,
                sensitiveActionVerificationService,
                new ObjectMapper()
        );
        ResponseEntity<Map<String, Boolean>> response = controller.changeCurrentUserPassword(request, currentUser);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(Boolean.TRUE.equals(response.getBody().get("success")));

        verify(userService).changePassword(7L, "Password1!", "NouveauPass1");
    }

    @Test
    @DisplayName("POST /api/users/internal cree un utilisateur interne par ADMIN")
    @WithMockUser(username = "admin@mts-telecom.tn", roles = "ADMIN")
    void createInternalUser_success() throws Exception {
        when(userService.getUserByEmail("admin@mts-telecom.tn")).thenReturn(UserResponse.builder()
                .id(99L)
                .email("admin@mts-telecom.tn")
                .firstName("Admin")
                .lastName("MTS")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build());
        when(authService.registerByAdmin(any(), any())).thenReturn(AuthResponse.builder()
                .user(AuthResponse.UserInfo.builder()
                        .id(21L)
                        .email("agent2@mts-telecom.tn")
                        .firstName("Aymen")
                        .lastName("Support")
                        .role(UserRole.AGENT)
                        .build())
                .build());
        when(userService.getUserById(21L)).thenReturn(UserResponse.builder()
                .id(21L)
                .email("agent2@mts-telecom.tn")
                .firstName("Aymen")
                .lastName("Support")
                .role(UserRole.AGENT)
                .isActive(true)
                .build());

        mockMvc.perform(post("/api/users/internal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "agent2@mts-telecom.tn",
                                  "password": "Password1",
                                  "confirmPassword": "Password1",
                                  "firstName": "Aymen",
                                  "lastName": "Support",
                                  "phone": "+21611111111",
                                  "role": "AGENT"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(21))
                .andExpect(jsonPath("$.role").value("AGENT"));

        verify(authService).registerByAdmin(any(), any());
        verify(userService).getUserById(21L);
        verify(userService).getUserByEmail("admin@mts-telecom.tn");
    }

    @Test
    @DisplayName("PUT /api/users/{id}/role accepte le role dans le body JSON")
    @WithMockUser(roles = "ADMIN")
    void updateUserRole_acceptsJsonBody() throws Exception {
        UserResponse updatedUser = UserResponse.builder()
                .id(12L)
                .email("manager@mts-telecom.tn")
                .firstName("Sara")
                .lastName("Manager")
                .role(UserRole.MANAGER)
                .isActive(true)
                .build();

        when(userService.updateUserRole(12L, UserRole.MANAGER)).thenReturn(updatedUser);

        mockMvc.perform(put("/api/users/12/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "MANAGER"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(12))
                .andExpect(jsonPath("$.role").value("MANAGER"));

        verify(userService).updateUserRole(12L, UserRole.MANAGER);
    }

    @Test
    @DisplayName("PUT /api/users/{id}/password permet a ADMIN de definir un mot de passe")
    @WithMockUser(roles = "ADMIN")
    void setUserPassword_success() throws Exception {
        mockMvc.perform(put("/api/users/15/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "newPassword": "NouveauPass1"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(userService).setPasswordByAdmin(15L, "NouveauPass1");
    }

    @Test
    @DisplayName("POST /api/users/{id}/reset-password declenche l'envoi du mail de reinitialisation")
    @WithMockUser(roles = "ADMIN")
    void resetUserPassword_success() throws Exception {
        User targetUser = User.builder()
                .id(15L)
                .email("client@mts-telecom.tn")
                .role(UserRole.CLIENT)
                .isActive(true)
                .build();

        when(userService.getUserEntityById(15L)).thenReturn(targetUser);

        mockMvc.perform(post("/api/users/15/reset-password"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(userService).getUserEntityById(15L);
        verify(authService).forgotPassword("client@mts-telecom.tn");
    }

    @Test
    @DisplayName("GET /api/users est reserve a ADMIN")
    @WithMockUser(roles = "MANAGER")
    void getUsers_forbidden_for_manager() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/users/role/AGENT est reserve a ADMIN")
    @WithMockUser(roles = "MANAGER")
    void getUsersByRole_forbidden_for_manager() throws Exception {
        mockMvc.perform(get("/api/users/role/AGENT"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/users/{id}/hard-delete supprime definitivement un utilisateur interne")
    @WithMockUser(roles = "ADMIN")
    void hardDeleteUser_success() throws Exception {
        User targetUser = User.builder()
                .id(18L)
                .email("agent3@mts-telecom.tn")
                .firstName("Ali")
                .lastName("Support")
                .role(UserRole.AGENT)
                .isActive(false)
                .build();

        when(userService.getUserEntityById(18L)).thenReturn(targetUser);

        mockMvc.perform(delete("/api/users/18/hard-delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmationKeyword": "SUPPRIMER",
                                  "confirmationTargetId": "18",
                                  "currentPassword": "Password1!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Utilisateur supprime definitivement"));

        verify(sensitiveActionVerificationService).verifyHardDeleteAuthorization(
                any(),
                eq("18"),
                any(AdminHardDeleteRequest.class),
                contains("compte interne ID 18")
        );
        verify(userService).hardDeleteUserByAdmin(eq(18L), isNull());
    }

    @Test
    @DisplayName("POST /api/users/{id}/hard-delete/challenge emet un challenge de verification")
    @WithMockUser(roles = "ADMIN")
    void issueHardDeleteChallenge_success() throws Exception {
        User targetUser = User.builder()
                .id(18L)
                .email("agent3@mts-telecom.tn")
                .firstName("Ali")
                .lastName("Support")
                .role(UserRole.AGENT)
                .isActive(false)
                .build();

        when(userService.getUserEntityById(18L)).thenReturn(targetUser);

        mockMvc.perform(post("/api/users/18/hard-delete/challenge"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Code de verification envoye"));

        verify(sensitiveActionVerificationService).issueHardDeleteVerificationCode(
                any(),
                contains("compte interne ID 18")
        );
    }
}
