package com.billcom.mts.controller;

import com.billcom.mts.entity.AuditLog;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.AuditLogService;
import com.billcom.mts.service.TicketService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditLogController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class AuditLogControllerRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private TicketService ticketService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("MANAGER ne peut pas consulter l'historique audit d'une entite non ticket")
    @WithMockUser(roles = "MANAGER")
    void managerCannotAccessServiceAuditHistory() throws Exception {
        mockMvc.perform(get("/api/audit-logs/entity/SERVICE/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AGENT peut consulter l'historique audit d'un ticket accessible")
    @WithMockUser(roles = "AGENT")
    void agentCanAccessTicketAuditHistory() throws Exception {
        when(auditLogService.getEntityHistory(eq("TICKET"), eq(1L), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/audit-logs/entity/TICKET/1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN peut consulter le detail d'une entree d'audit par identifiant")
    @WithMockUser(roles = "ADMIN")
    void adminCanAccessAuditLogDetailsById() throws Exception {
        User user = User.builder()
                .id(7L)
                .email("admin@mts-telecom.ma")
                .firstName("Mohammed")
                .lastName("Benali")
                .role(UserRole.ADMIN)
                .build();

        AuditLog auditLog = AuditLog.builder()
                .id(42L)
                .timestamp(LocalDateTime.of(2026, 4, 3, 10, 15))
                .user(user)
                .action(AuditAction.USER_CREATED)
                .entityType("USER")
                .entityId(15L)
                .entityName("Layla Amrani")
                .description("Utilisateur cree")
                .ipAddress("127.0.0.1")
                .build();

        when(auditLogService.getById(42L)).thenReturn(Optional.of(auditLog));

        mockMvc.perform(get("/api/audit-logs/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.entityType").value("USER"))
                .andExpect(jsonPath("$.entityId").value(15))
                .andExpect(jsonPath("$.userEmail").value("admin@mts-telecom.ma"));
    }
}
