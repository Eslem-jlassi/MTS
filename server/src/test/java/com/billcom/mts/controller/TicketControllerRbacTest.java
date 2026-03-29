package com.billcom.mts.controller;

import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.TicketService;
import com.billcom.mts.service.TicketExportService;
import com.billcom.mts.service.TicketBulkOperationService;
import com.billcom.mts.service.MacroService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests RBAC pour les endpoints tickets.
 * <p>
 * Vérifie que chaque rôle accède uniquement aux endpoints autorisés.
 * Les tests "allowed" vérifient que le statut n'est PAS 403 (Forbidden).
 * Les tests "denied" vérifient que le statut EST 403 (Forbidden).
 * <p>
 * Note: addFilters=false désactive le filtre JWT mais @PreAuthorize reste actif.
 * Les services sont mockés et retournent null, donc les endpoints "allowed"
 * peuvent retourner 500 — c'est normal, seul le code 403 est significatif ici.
 */
@WebMvcTest(TicketController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class TicketControllerRbacTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private TicketService ticketService;
    @MockBean private TicketExportService ticketExportService;
    @MockBean private TicketBulkOperationService ticketBulkOperationService;
    @MockBean private MacroService macroService;
    @MockBean private JwtService jwtService;
    @MockBean private UserDetailsService userDetailsService;

    // =========================================================================
    // CLIENT role tests
    // =========================================================================
    @Nested
    @DisplayName("Rôle CLIENT")
    class ClientRoleTests {

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT peut créer un ticket (non bloqué par RBAC)")
        void clientCanCreateTicket() throws Exception {
            mockMvc.perform(post("/api/tickets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Test\",\"serviceId\":1,\"category\":\"PANNE\",\"priority\":\"HIGH\"}"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "CLIENT devrait pouvoir créer un ticket (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT peut voir ses tickets (non bloqué par RBAC)")
        void clientCanGetMyTickets() throws Exception {
            mockMvc.perform(get("/api/tickets/my-tickets"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "CLIENT devrait accéder à /my-tickets (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT peut consulter les commentaires de son ticket (non bloque par RBAC)")
        void clientCanGetTicketComments() throws Exception {
            mockMvc.perform(get("/api/tickets/1/comments"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "CLIENT devrait pouvoir atteindre /comments (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT peut consulter l'historique visible de son ticket (non bloque par RBAC)")
        void clientCanGetTicketHistory() throws Exception {
            mockMvc.perform(get("/api/tickets/1/history"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "CLIENT devrait pouvoir atteindre /history (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT ne peut pas exporter en CSV")
        void clientCannotExportCsv() throws Exception {
            mockMvc.perform(get("/api/tickets/export/csv"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT ne peut pas assigner un ticket")
        void clientCannotAssign() throws Exception {
            mockMvc.perform(post("/api/tickets/1/assign")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"agentId\":3}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT peut supprimer son ticket (non bloqué par RBAC)")
        void clientCanDeleteTicket() throws Exception {
            mockMvc.perform(delete("/api/tickets/1"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "CLIENT devrait pouvoir supprimer un ticket (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("CLIENT ne peut pas voir le pool des tickets non assignes")
        void clientCannotGetUnassignedTickets() throws Exception {
            mockMvc.perform(get("/api/tickets/unassigned"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @WithMockUser(roles = "CLIENT")
    @DisplayName("CLIENT ne peut pas supprimer definitivement un ticket")
    void clientCannotHardDeleteTicket() throws Exception {
        mockMvc.perform(delete("/api/tickets/1/hard-delete"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // AGENT role tests
    // =========================================================================
    @Nested
    @DisplayName("Rôle AGENT")
    class AgentRoleTests {

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT peut voir les tickets assignés (non bloqué par RBAC)")
        void agentCanGetAssigned() throws Exception {
            mockMvc.perform(get("/api/tickets/assigned"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "AGENT devrait accéder à /assigned (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT peut changer le statut (non bloqué par RBAC)")
        void agentCanChangeStatus() throws Exception {
            mockMvc.perform(post("/api/tickets/1/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"newStatus\":\"IN_PROGRESS\"}"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "AGENT devrait pouvoir changer le statut (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT peut voir le pool des tickets non assignes (non bloque par RBAC)")
        void agentCanGetUnassignedTickets() throws Exception {
            mockMvc.perform(get("/api/tickets/unassigned"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "AGENT devrait acceder a /unassigned (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT peut consulter les commentaires d'un ticket (non bloque par RBAC)")
        void agentCanGetTicketComments() throws Exception {
            mockMvc.perform(get("/api/tickets/1/comments"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "AGENT devrait pouvoir atteindre /comments (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT peut consulter l'historique d'un ticket (non bloque par RBAC)")
        void agentCanGetTicketHistory() throws Exception {
            mockMvc.perform(get("/api/tickets/1/history"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "AGENT devrait pouvoir atteindre /history (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT ne peut pas assigner un ticket")
        void agentCannotAssign() throws Exception {
            mockMvc.perform(post("/api/tickets/1/assign")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"agentId\":3}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT peut exporter en CSV (non bloqué par RBAC)")
        void agentCanExportCsv() throws Exception {
            mockMvc.perform(get("/api/tickets/export/csv"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "AGENT devrait pouvoir exporter CSV (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "AGENT")
        @DisplayName("AGENT ne peut pas accéder aux stats SLA breached")
        void agentCannotAccessSlaBreached() throws Exception {
            mockMvc.perform(get("/api/tickets/sla-breached"))
                    .andExpect(status().isForbidden());
        }

                @Test
                @WithMockUser(roles = "AGENT")
                @DisplayName("AGENT ne peut pas supprimer un ticket client")
                void agentCannotDeleteTicket() throws Exception {
                        mockMvc.perform(delete("/api/tickets/1"))
                                        .andExpect(status().isForbidden());
                }
    }

    @Test
    @WithMockUser(roles = "AGENT")
    @DisplayName("AGENT ne peut pas supprimer definitivement un ticket")
    void agentCannotHardDeleteTicket() throws Exception {
        mockMvc.perform(delete("/api/tickets/1/hard-delete"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MANAGER role tests
    // =========================================================================
    @Nested
    @DisplayName("Rôle MANAGER")
    class ManagerRoleTests {

        @Test
        @WithMockUser(roles = "MANAGER")
        @DisplayName("MANAGER peut assigner un ticket (non bloqué par RBAC)")
        void managerCanAssign() throws Exception {
            mockMvc.perform(post("/api/tickets/1/assign")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"agentId\":3}"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "MANAGER devrait pouvoir assigner (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        @DisplayName("MANAGER peut voir les SLA breached (non bloqué par RBAC)")
        void managerCanAccessSlaBreached() throws Exception {
            mockMvc.perform(get("/api/tickets/sla-breached"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "MANAGER devrait accéder aux SLA breached (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        @DisplayName("MANAGER peut voir le pool des tickets non assignes (non bloque par RBAC)")
        void managerCanGetUnassignedTickets() throws Exception {
            mockMvc.perform(get("/api/tickets/unassigned"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "MANAGER devrait acceder a /unassigned (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        @DisplayName("MANAGER ne peut pas supprimer definitivement un ticket")
        void managerCannotHardDeleteTicket() throws Exception {
            mockMvc.perform(delete("/api/tickets/1/hard-delete"))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================================
    // ADMIN role tests
    // =========================================================================
    @Nested
    @DisplayName("Rôle ADMIN")
    class AdminRoleTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN peut assigner un ticket (non bloqué par RBAC)")
        void adminCanAssign() throws Exception {
            mockMvc.perform(post("/api/tickets/1/assign")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"agentId\":3}"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "ADMIN devrait pouvoir assigner (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN peut voir les SLA approaching (non bloqué par RBAC)")
        void adminCanAccessSlaApproaching() throws Exception {
            mockMvc.perform(get("/api/tickets/sla-approaching"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "ADMIN devrait accéder aux SLA approaching (pas 403)"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN peut exporter en Excel (non bloqué par RBAC)")
        void adminCanExportExcel() throws Exception {
            mockMvc.perform(get("/api/tickets/export/excel"))
                    .andExpect(result ->
                            assertNotEquals(403, result.getResponse().getStatus(),
                                    "ADMIN devrait pouvoir exporter Excel (pas 403)"));
        }
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN peut supprimer definitivement un ticket (non bloque par RBAC)")
    void adminCanHardDeleteTicket() throws Exception {
        mockMvc.perform(delete("/api/tickets/1/hard-delete"))
                .andExpect(result ->
                        assertNotEquals(403, result.getResponse().getStatus(),
                                "ADMIN devrait pouvoir supprimer definitivement un ticket (pas 403)"));
    }

    // =========================================================================
    // Unauthenticated tests
    // =========================================================================
    @Nested
    @DisplayName("Non authentifié")
    class UnauthenticatedTests {

        @Test
        @DisplayName("Sans auth → accès refusé sur endpoint protégé (@PreAuthorize)")
        void noAuthDenied() throws Exception {
            // Sans @WithMockUser → pas de SecurityContext → @PreAuthorize lève
            // AuthenticationCredentialsNotFoundException → serveur refuse (non-200)
            mockMvc.perform(get("/api/tickets/export/csv"))
                    .andExpect(result -> {
                        int s = result.getResponse().getStatus();
                        assertNotEquals(200, s, "Sans auth, l'endpoint ne doit pas retourner 200");
                    });
        }
    }
}
