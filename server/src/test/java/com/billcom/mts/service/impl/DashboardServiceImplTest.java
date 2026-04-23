package com.billcom.mts.service.impl;

import com.billcom.mts.dto.dashboard.DashboardStats;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour DashboardServiceImpl.
 *
 * Vérifie:
 * - getDashboardStats() : statistiques globales (ADMIN/MANAGER)
 * - getAgentDashboardStats() : statistiques spécifiques agent
 * - getClientDashboardStats() : statistiques spécifiques client
 * - getMyDashboardStats() : routage par rôle
 * - calculateSlaComplianceRate() : calcul taux SLA
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock private TicketRepository ticketRepository;
    @Mock private UserRepository userRepository;
    @Mock private ClientRepository clientRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    private User adminUser;
    private User managerUser;
    private User agentUser;
    private User clientUser;
    private Client testClient;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(1L).email("admin@billcom.tn")
                .firstName("Admin").lastName("Sys")
                .role(UserRole.ADMIN).isActive(true).build();

        managerUser = User.builder()
                .id(2L).email("manager@billcom.tn")
                .firstName("Manager").lastName("Sup")
                .role(UserRole.MANAGER).isActive(true).build();

        agentUser = User.builder()
                .id(3L).email("agent@billcom.tn")
                .firstName("Agent").lastName("Support")
                .role(UserRole.AGENT).isActive(true).build();

        clientUser = User.builder()
                .id(5L).email("client@billcom.tn")
                .firstName("Client").lastName("Test")
                .role(UserRole.CLIENT).isActive(true).build();

        testClient = Client.builder()
                .id(10L).user(clientUser)
                .clientCode("CLI-2026-00001")
                .companyName("Test Corp").build();
    }

    // =========================================================================
    // getDashboardStats() — Statistiques globales
    // =========================================================================
    @Nested
    @DisplayName("getDashboardStats() — Admin/Manager")
    class GetDashboardStatsTests {

        @Test
        @DisplayName("Devrait calculer les totaux correctement")
        void getDashboardStats_totals() {
            // Simulate grouped counts
            when(ticketRepository.countByStatusGrouped()).thenReturn(List.of(
                    new Object[]{TicketStatus.NEW, 5L},
                    new Object[]{TicketStatus.IN_PROGRESS, 10L},
                    new Object[]{TicketStatus.RESOLVED, 20L},
                    new Object[]{TicketStatus.CLOSED, 15L}
            ));
            when(ticketRepository.countByPriorityGrouped()).thenReturn(List.of(
                    new Object[]{TicketPriority.CRITICAL, 3L},
                    new Object[]{TicketPriority.HIGH, 12L},
                    new Object[]{TicketPriority.MEDIUM, 20L},
                    new Object[]{TicketPriority.LOW, 15L}
            ));
            when(ticketRepository.countSlaBreached()).thenReturn(4L);
            when(ticketRepository.countUnassigned()).thenReturn(2L);
            when(ticketRepository.countCreatedBetween(any(), any())).thenReturn(3L);
            when(ticketRepository.countResolvedBetween(any(), any())).thenReturn(5L);
            when(ticketRepository.getAverageResolutionTimeHours()).thenReturn(8.5);
            when(ticketRepository.countResolvedOrClosedTickets()).thenReturn(35L);
            when(ticketRepository.countSlaBreachedResolvedTickets()).thenReturn(7L);
            when(ticketRepository.countByServiceGrouped()).thenReturn(List.of(
                    new Object[]{"BSCS Billing", 18L},
                    new Object[]{"CRM Siebel", 12L}
            ));
            when(ticketRepository.countByAgentGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.getAverageResolutionTimeByAgent()).thenReturn(Collections.emptyList());
            when(ticketRepository.findTop10ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());
            when(ticketRepository.findActiveCriticalTickets()).thenReturn(Collections.emptyList());

            DashboardStats stats = dashboardService.getDashboardStats();

            assertThat(stats).isNotNull();
            // total = 5+10+20+15 = 50
            assertThat(stats.getTotalTickets()).isEqualTo(50L);
            // active = tout sauf CLOSED(15) et CANCELLED(0) = 35
            assertThat(stats.getActiveTickets()).isEqualTo(35L);
            assertThat(stats.getCriticalCount()).isEqualTo(3L);
            assertThat(stats.getHighCount()).isEqualTo(12L);
            assertThat(stats.getSlaBreachedCount()).isEqualTo(4L);
            assertThat(stats.getUnassignedCount()).isEqualTo(2L);
            assertThat(stats.getCreatedToday()).isEqualTo(3L);
            assertThat(stats.getAverageResolutionTimeHours()).isEqualTo(8.5);
            // SLA compliance: 1 - 7/35 = 0.8
            assertThat(stats.getSlaComplianceRate()).isCloseTo(0.8, within(0.001));
            // Grouped maps
            assertThat(stats.getTicketsByStatus()).containsEntry("NEW", 5L);
            assertThat(stats.getTicketsByPriority()).containsEntry("CRITICAL", 3L);
            assertThat(stats.getTicketsByService()).containsEntry("BSCS Billing", 18L);
        }

        @Test
        @DisplayName("Devrait retourner 1.0 si aucun ticket résolu pour SLA compliance")
        void getDashboardStats_slaCompliance_no_tickets() {
            when(ticketRepository.countByStatusGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.countByPriorityGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.countSlaBreached()).thenReturn(0L);
            when(ticketRepository.countUnassigned()).thenReturn(0L);
            when(ticketRepository.countCreatedBetween(any(), any())).thenReturn(0L);
            when(ticketRepository.countResolvedBetween(any(), any())).thenReturn(0L);
            when(ticketRepository.getAverageResolutionTimeHours()).thenReturn(null);
            when(ticketRepository.countResolvedOrClosedTickets()).thenReturn(0L);
            when(ticketRepository.countByServiceGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.countByAgentGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.getAverageResolutionTimeByAgent()).thenReturn(Collections.emptyList());
            when(ticketRepository.findTop10ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());
            when(ticketRepository.findActiveCriticalTickets()).thenReturn(Collections.emptyList());

            DashboardStats stats = dashboardService.getDashboardStats();

            assertThat(stats.getSlaComplianceRate()).isEqualTo(1.0);
            assertThat(stats.getTotalTickets()).isEqualTo(0L);
            assertThat(stats.getAverageResolutionTimeHours()).isEqualTo(0.0);
        }
    }

    // =========================================================================
    // getAgentDashboardStats()
    // =========================================================================
    @Nested
    @DisplayName("getAgentDashboardStats()")
    class AgentDashboardTests {

        @Test
        @DisplayName("Devrait retourner les stats spécifiques à l'agent")
        void agentStats_success() {
            when(ticketRepository.countActiveByAssignedTo(3L)).thenReturn(7L);
            when(ticketRepository.countResolvedTodayByAgent(eq(3L), any(), any())).thenReturn(2L);
            when(ticketRepository.countSlaBreachedByAgent(3L)).thenReturn(1L);
            when(ticketRepository.countUnassigned()).thenReturn(4L);
            when(ticketRepository.countByAssignedToIdAndStatus(3L, TicketStatus.ASSIGNED)).thenReturn(1L);
            when(ticketRepository.countByAssignedToIdAndStatus(3L, TicketStatus.IN_PROGRESS)).thenReturn(3L);
            when(ticketRepository.countByAssignedToIdAndStatus(3L, TicketStatus.PENDING)).thenReturn(2L);
            when(ticketRepository.countByAssignedToIdAndStatus(3L, TicketStatus.PENDING_THIRD_PARTY)).thenReturn(0L);
            when(ticketRepository.countByAssignedToIdAndStatus(3L, TicketStatus.ESCALATED)).thenReturn(1L);
            when(ticketRepository.countByAssignedToIdAndStatus(3L, TicketStatus.RESOLVED)).thenReturn(0L);

            DashboardStats stats = dashboardService.getAgentDashboardStats(3L);

            assertThat(stats.getActiveTickets()).isEqualTo(7L);
            assertThat(stats.getResolvedToday()).isEqualTo(2L);
            assertThat(stats.getSlaBreachedCount()).isEqualTo(1L);
            assertThat(stats.getUnassignedCount()).isEqualTo(4L);
            assertThat(stats.getTicketsByStatus()).containsEntry(TicketStatus.PENDING.name(), 2L);
        }
    }

    // =========================================================================
    // getClientDashboardStats()
    // =========================================================================
    @Nested
    @DisplayName("getClientDashboardStats()")
    class ClientDashboardTests {

        @Test
        @DisplayName("Devrait retourner les stats spécifiques au client")
        void clientStats_success() {
            when(ticketRepository.countByClientId(10L)).thenReturn(20L);
            when(ticketRepository.countActiveByClientId(10L)).thenReturn(5L);
            when(ticketRepository.countResolvedByClientId(10L)).thenReturn(12L);

            DashboardStats stats = dashboardService.getClientDashboardStats(10L);

            assertThat(stats.getTotalTickets()).isEqualTo(20L);
            assertThat(stats.getActiveTickets()).isEqualTo(5L);
            assertThat(stats.getResolvedTickets()).isEqualTo(12L);
        }
    }

    // =========================================================================
    // getMyDashboardStats() — Routage par rôle
    // =========================================================================
    @Nested
    @DisplayName("getMyDashboardStats() — routage par rôle")
    class MyDashboardStatsTests {

        @Test
        @DisplayName("ADMIN → devrait appeler getDashboardStats()")
        void myStats_admin() {
            stubGlobalStats();
            DashboardStats stats = dashboardService.getMyDashboardStats(adminUser);
            assertThat(stats).isNotNull();
            verify(ticketRepository).countByStatusGrouped(); // preuve de appel global
        }

        @Test
        @DisplayName("MANAGER → devrait appeler getDashboardStats()")
        void myStats_manager() {
            stubGlobalStats();
            DashboardStats stats = dashboardService.getMyDashboardStats(managerUser);
            assertThat(stats).isNotNull();
            verify(ticketRepository).countByStatusGrouped();
        }

        @Test
        @DisplayName("AGENT → devrait appeler getAgentDashboardStats()")
        void myStats_agent() {
            when(ticketRepository.countActiveByAssignedTo(3L)).thenReturn(5L);
            when(ticketRepository.countResolvedTodayByAgent(eq(3L), any(), any())).thenReturn(1L);
            when(ticketRepository.countSlaBreachedByAgent(3L)).thenReturn(0L);

            DashboardStats stats = dashboardService.getMyDashboardStats(agentUser);
            assertThat(stats.getActiveTickets()).isEqualTo(5L);
        }

        @Test
        @DisplayName("CLIENT → devrait appeler getClientDashboardStats()")
        void myStats_client() {
            when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
            when(ticketRepository.countByClientId(10L)).thenReturn(8L);
            when(ticketRepository.countActiveByClientId(10L)).thenReturn(3L);
            when(ticketRepository.countResolvedByClientId(10L)).thenReturn(4L);

            DashboardStats stats = dashboardService.getMyDashboardStats(clientUser);
            assertThat(stats.getTotalTickets()).isEqualTo(8L);
        }

        @Test
        @DisplayName("CLIENT sans profil → devrait lancer BadRequestException")
        void myStats_client_no_profile() {
            when(clientRepository.findByUserId(5L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> dashboardService.getMyDashboardStats(clientUser))
                    .isInstanceOf(BadRequestException.class);
        }

        /** Stub minimal pour que getDashboardStats() ne crashe pas. */
        private void stubGlobalStats() {
            when(ticketRepository.countByStatusGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.countByPriorityGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.countSlaBreached()).thenReturn(0L);
            when(ticketRepository.countUnassigned()).thenReturn(0L);
            when(ticketRepository.countCreatedBetween(any(), any())).thenReturn(0L);
            when(ticketRepository.countResolvedBetween(any(), any())).thenReturn(0L);
            when(ticketRepository.getAverageResolutionTimeHours()).thenReturn(null);
            when(ticketRepository.countResolvedOrClosedTickets()).thenReturn(0L);
            when(ticketRepository.countByServiceGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.countByAgentGrouped()).thenReturn(Collections.emptyList());
            when(ticketRepository.getAverageResolutionTimeByAgent()).thenReturn(Collections.emptyList());
            when(ticketRepository.findTop10ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());
            when(ticketRepository.findActiveCriticalTickets()).thenReturn(Collections.emptyList());
        }
    }
}
