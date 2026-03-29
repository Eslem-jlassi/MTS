package com.billcom.mts.controller;

import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.TelecomServiceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ServiceController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class ServiceControllerRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TelecomServiceService telecomServiceService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("MANAGER peut acceder au health monitoring services")
    @WithMockUser(roles = "MANAGER")
    void managerCanAccessHealthDashboard() throws Exception {
        mockMvc.perform(get("/api/services/health"))
                .andExpect(result ->
                        assertNotEquals(403, result.getResponse().getStatus(),
                                "MANAGER ne devrait pas etre bloque sur /api/services/health"));
    }

    @Test
    @DisplayName("AGENT ne peut pas acceder au health monitoring services")
    @WithMockUser(roles = "AGENT")
    void agentCannotAccessHealthDashboard() throws Exception {
        mockMvc.perform(get("/api/services/health"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CLIENT peut charger les services actifs")
    @WithMockUser(roles = "CLIENT")
    void clientCanAccessActiveServices() throws Exception {
        mockMvc.perform(get("/api/services/active"))
                .andExpect(result ->
                        assertNotEquals(403, result.getResponse().getStatus(),
                                "CLIENT doit pouvoir charger /api/services/active"));
    }

    @Test
    @DisplayName("MANAGER peut mettre a jour le statut operationnel d'un service")
    @WithMockUser(roles = "MANAGER")
    void managerCanUpdateServiceStatus() throws Exception {
        mockMvc.perform(patch("/api/services/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "DEGRADED"
                                }
                                """))
                .andExpect(result ->
                        assertNotEquals(403, result.getResponse().getStatus(),
                                "MANAGER doit pouvoir PATCH /api/services/{id}/status"));
    }

    @Test
    @DisplayName("MANAGER ne peut pas activer structurellement un service")
    @WithMockUser(roles = "MANAGER")
    void managerCannotActivateService() throws Exception {
        mockMvc.perform(post("/api/services/1/activate"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AGENT ne peut pas voir l'historique de statut d'un service")
    @WithMockUser(roles = "AGENT")
    void agentCannotAccessServiceStatusHistory() throws Exception {
        mockMvc.perform(get("/api/services/1/status-history"))
                .andExpect(status().isForbidden());
    }
}
