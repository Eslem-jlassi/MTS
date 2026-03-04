package com.billcom.mts.controller;

import com.billcom.mts.dto.dashboard.DashboardStats;
import com.billcom.mts.entity.User;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests du DashboardController via MockMvc.
 *
 * @WebMvcTest charge uniquement le contrôleur spécifié (pas tout le contexte Spring).
 * On mocke les beans de sécurité (JwtService, UserDetailsService) pour que le filtre ne bloque pas.
 */
@WebMvcTest(DashboardController.class)
@AutoConfigureMockMvc(addFilters = false) // désactive les filtres de sécurité pour tester les endpoints purs
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    // =========================================================================
    // GET /api/dashboard/stats
    // =========================================================================
    @Test
    @DisplayName("GET /api/dashboard/stats — devrait retourner 200 avec les stats")
    @WithMockUser(roles = "ADMIN")
    void getStats_success() throws Exception {
        DashboardStats stats = DashboardStats.builder()
                .totalTickets(50L)
                .activeTickets(20L)
                .slaBreachedCount(3L)
                .createdToday(5L)
                .resolvedToday(2L)
                .averageResolutionTimeHours(12.5)
                .slaComplianceRate(0.85)
                .build();

        when(dashboardService.getMyDashboardStats(any(User.class))).thenReturn(stats);

        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTickets").value(50))
                .andExpect(jsonPath("$.activeTickets").value(20))
                .andExpect(jsonPath("$.slaBreachedCount").value(3))
                .andExpect(jsonPath("$.averageResolutionTimeHours").value(12.5));
    }

    // =========================================================================
    // GET /api/dashboard/my-stats
    // =========================================================================
    @Test
    @DisplayName("GET /api/dashboard/my-stats — devrait retourner 200")
    @WithMockUser(roles = "AGENT")
    void getMyStats_success() throws Exception {
        DashboardStats stats = DashboardStats.builder()
                .activeTickets(7L)
                .resolvedToday(3L)
                .slaBreachedCount(1L)
                .build();

        when(dashboardService.getMyDashboardStats(any(User.class))).thenReturn(stats);

        mockMvc.perform(get("/api/dashboard/my-stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeTickets").value(7));
    }

    // =========================================================================
    // GET /api/dashboard/agent/{agentId}
    // =========================================================================
    @Test
    @DisplayName("GET /api/dashboard/agent/3 — devrait retourner les stats agent")
    @WithMockUser(roles = "ADMIN")
    void getAgentStats_success() throws Exception {
        DashboardStats stats = DashboardStats.builder()
                .activeTickets(5L)
                .resolvedToday(2L)
                .slaBreachedCount(0L)
                .build();

        when(dashboardService.getAgentDashboardStats(3L)).thenReturn(stats);

        mockMvc.perform(get("/api/dashboard/agent/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeTickets").value(5));
    }

    // =========================================================================
    // GET /api/dashboard/client/{clientId}
    // =========================================================================
    @Test
    @DisplayName("GET /api/dashboard/client/10 — devrait retourner les stats client")
    @WithMockUser(roles = "ADMIN")
    void getClientStats_success() throws Exception {
        DashboardStats stats = DashboardStats.builder()
                .totalTickets(20L)
                .activeTickets(3L)
                .resolvedTickets(12L)
                .build();

        when(dashboardService.getClientDashboardStats(10L)).thenReturn(stats);

        mockMvc.perform(get("/api/dashboard/client/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTickets").value(20))
                .andExpect(jsonPath("$.resolvedTickets").value(12));
    }
}
