package com.billcom.mts.service.impl;

import com.billcom.mts.dto.ticket.TicketAssignRequest;
import com.billcom.mts.dto.ticket.TicketCreateRequest;
import com.billcom.mts.dto.ticket.TicketResponse;
import com.billcom.mts.dto.ticket.TicketStatusChangeRequest;
import com.billcom.mts.entity.*;
import com.billcom.mts.enums.*;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour TicketServiceImpl.
 */
@ExtendWith(MockitoExtension.class)
class TicketServiceImplTest {

    @Mock private TicketRepository ticketRepository;
    @Mock private TicketCommentRepository commentRepository;
    @Mock private TicketHistoryRepository historyRepository;
    @Mock private TelecomServiceRepository serviceRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private TicketServiceImpl ticketService;

    private User clientUser;
    private User agentUser;
    private Client testClient;
    private TelecomService testService;
    private Ticket testTicket;

    @BeforeEach
    void setUp() {
        // SLA config
        ReflectionTestUtils.setField(ticketService, "slaCriticalHours", 1);
        ReflectionTestUtils.setField(ticketService, "slaHighHours", 4);
        ReflectionTestUtils.setField(ticketService, "slaMediumHours", 24);
        ReflectionTestUtils.setField(ticketService, "slaLowHours", 72);

        clientUser = User.builder()
                .id(5L)
                .email("client@billcom.tn")
                .firstName("Test")
                .lastName("Client")
                .role(UserRole.CLIENT)
                .isActive(true)
                .build();

        agentUser = User.builder()
                .id(3L)
                .email("agent@billcom.tn")
                .firstName("Agent")
                .lastName("Support")
                .role(UserRole.AGENT)
                .isActive(true)
                .build();

        testClient = Client.builder()
                .id(1L)
                .user(clientUser)
                .clientCode("CLI-2026-00001")
                .companyName("Test Corp")
                .build();

        testService = TelecomService.builder()
                .id(1L)
                .name("BSCS Billing")
                .isActive(true)
                .build();

        testTicket = Ticket.builder()
                .id(100L)
                .ticketNumber("TKT-2026-00001")
                .title("Panne BSCS")
                .description("Facturation bloquée")
                .client(testClient)
                .service(testService)
                .createdBy(clientUser)
                .category(TicketCategory.PANNE)
                .priority(TicketPriority.HIGH)
                .status(TicketStatus.NEW)
                .slaHours(4)
                .deadline(LocalDateTime.now().plusHours(4))
                .breachedSla(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .comments(new ArrayList<>())
                .history(new ArrayList<>())
                .build();
    }

    // =========================================================================
    // CREATE TICKET
    // =========================================================================
    @Nested
    @DisplayName("createTicket()")
    class CreateTicketTests {

        @Test
        @DisplayName("Devrait créer un ticket HIGH avec deadline 4h")
        void createTicket_success_high_priority() {
            TicketCreateRequest request = TicketCreateRequest.builder()
                    .title("Panne réseau")
                    .description("Liaisons coupées zone Nord")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.HIGH)
                    .build();

            when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
            when(serviceRepository.findById(1L)).thenReturn(Optional.of(testService));
            when(ticketRepository.findMaxTicketNumber(anyString())).thenReturn(null);
            when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
                Ticket t = inv.getArgument(0);
                t.setId(200L);
                t.setCreatedAt(LocalDateTime.now());
                t.setUpdatedAt(LocalDateTime.now());
                return t;
            });
            when(historyRepository.save(any())).thenReturn(null);
            when(historyRepository.findByTicketIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());

            TicketResponse response = ticketService.createTicket(request, clientUser, "127.0.0.1");

            assertThat(response).isNotNull();
            assertThat(response.getPriority()).isEqualTo(TicketPriority.HIGH);
            assertThat(response.getStatus()).isEqualTo(TicketStatus.NEW);
            assertThat(response.getSlaHours()).isEqualTo(4);

            verify(ticketRepository).save(argThat(ticket ->
                    ticket.getSlaHours() == 4 &&
                    ticket.getStatus() == TicketStatus.NEW &&
                    ticket.getBreachedSla() == false
            ));
            verify(historyRepository).save(any(TicketHistory.class));
        }

        @Test
        @DisplayName("Devrait créer un ticket CRITICAL avec deadline 1h")
        void createTicket_critical_sla() {
            TicketCreateRequest request = TicketCreateRequest.builder()
                    .title("BSCS down")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.CRITICAL)
                    .build();

            when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
            when(serviceRepository.findById(1L)).thenReturn(Optional.of(testService));
            when(ticketRepository.findMaxTicketNumber(anyString())).thenReturn(null);
            when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
                Ticket t = inv.getArgument(0);
                t.setId(201L);
                t.setCreatedAt(LocalDateTime.now());
                t.setUpdatedAt(LocalDateTime.now());
                return t;
            });
            when(historyRepository.save(any())).thenReturn(null);
            when(historyRepository.findByTicketIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());

            ticketService.createTicket(request, clientUser, "127.0.0.1");

            verify(ticketRepository).save(argThat(ticket -> ticket.getSlaHours() == 1));
        }

        @Test
        @DisplayName("Devrait échouer si le client n'a pas de profil")
        void createTicket_no_client_profile() {
            TicketCreateRequest request = TicketCreateRequest.builder()
                    .title("Test")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.LOW)
                    .build();

            when(clientRepository.findByUserId(5L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> ticketService.createTicket(request, clientUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait échouer si le service n'existe pas")
        void createTicket_service_not_found() {
            TicketCreateRequest request = TicketCreateRequest.builder()
                    .title("Test")
                    .serviceId(999L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.LOW)
                    .build();

            when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
            when(serviceRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> ticketService.createTicket(request, clientUser, "127.0.0.1"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Devrait échouer si le service est inactif")
        void createTicket_inactive_service() {
            testService.setIsActive(false);

            TicketCreateRequest request = TicketCreateRequest.builder()
                    .title("Test")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.LOW)
                    .build();

            when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
            when(serviceRepository.findById(1L)).thenReturn(Optional.of(testService));

            assertThatThrownBy(() -> ticketService.createTicket(request, clientUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    // =========================================================================
    // CHANGE STATUS
    // =========================================================================
    @Nested
    @DisplayName("changeStatus()")
    class ChangeStatusTests {

        @Test
        @DisplayName("Devrait permettre NEW → IN_PROGRESS")
        void changeStatus_new_to_inProgress() {
            testTicket.setStatus(TicketStatus.NEW);

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.IN_PROGRESS)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(ticketRepository.save(any(Ticket.class))).thenReturn(testTicket);
            when(historyRepository.save(any())).thenReturn(null);
            when(historyRepository.findByTicketIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());

            TicketResponse response = ticketService.changeStatus(100L, request, agentUser, "127.0.0.1");

            assertThat(response).isNotNull();
            verify(ticketRepository).save(argThat(t -> t.getStatus() == TicketStatus.IN_PROGRESS));
        }

        @Test
        @DisplayName("Devrait refuser NEW → CLOSED (transition invalide)")
        void changeStatus_invalid_transition() {
            testTicket.setStatus(TicketStatus.NEW);

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.CLOSED)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            assertThatThrownBy(() -> ticketService.changeStatus(100L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait exiger une résolution pour RESOLVED")
        void changeStatus_resolved_requires_resolution() {
            testTicket.setStatus(TicketStatus.IN_PROGRESS);

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.RESOLVED)
                    .resolution(null)  // manquante
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            assertThatThrownBy(() -> ticketService.changeStatus(100L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Devrait enregistrer resolvedAt lors de la résolution")
        void changeStatus_resolved_sets_resolvedAt() {
            testTicket.setStatus(TicketStatus.IN_PROGRESS);

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.RESOLVED)
                    .resolution("Problème corrigé — redémarrage du service BSCS")
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(ticketRepository.save(any(Ticket.class))).thenReturn(testTicket);
            when(historyRepository.save(any())).thenReturn(null);
            when(historyRepository.findByTicketIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());

            ticketService.changeStatus(100L, request, agentUser, "127.0.0.1");

            verify(ticketRepository).save(argThat(t ->
                    t.getResolvedAt() != null &&
                    t.getStatus() == TicketStatus.RESOLVED &&
                    t.getResolution().contains("BSCS")
            ));
        }

        @Test
        @DisplayName("Devrait échouer si le ticket n'existe pas")
        void changeStatus_ticket_not_found() {
            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.IN_PROGRESS)
                    .build();

            when(ticketRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> ticketService.changeStatus(999L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =========================================================================
    // ASSIGN TICKET
    // =========================================================================
    @Nested
    @DisplayName("assignTicket()")
    class AssignTicketTests {

        @Test
        @DisplayName("Devrait assigner un ticket à un agent")
        void assignTicket_success() {
            TicketAssignRequest request = TicketAssignRequest.builder()
                    .agentId(3L)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(userRepository.findById(3L)).thenReturn(Optional.of(agentUser));
            when(ticketRepository.save(any(Ticket.class))).thenReturn(testTicket);
            when(historyRepository.save(any())).thenReturn(null);
            when(historyRepository.findByTicketIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());

            TicketResponse response = ticketService.assignTicket(100L, request, agentUser, "127.0.0.1");

            assertThat(response).isNotNull();
            verify(ticketRepository).save(argThat(t -> t.getAssignedTo() != null));
        }

        @Test
        @DisplayName("Devrait refuser d'assigner à un non-agent")
        void assignTicket_not_agent_role() {
            User managerUser = User.builder()
                    .id(4L)
                    .email("manager@billcom.tn")
                    .role(UserRole.MANAGER)
                    .isActive(true)
                    .build();

            TicketAssignRequest request = TicketAssignRequest.builder()
                    .agentId(4L)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(userRepository.findById(4L)).thenReturn(Optional.of(managerUser));

            assertThatThrownBy(() -> ticketService.assignTicket(100L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    // =========================================================================
    // SLA BREACH DETECTION
    // =========================================================================
    @Nested
    @DisplayName("detectSlaBreaches()")
    class SlaBreachTests {

        @Test
        @DisplayName("Devrait marquer les tickets dépassés comme breachedSla=true")
        void detectSlaBreaches_marks_breached() {
            Ticket breachedTicket = Ticket.builder()
                    .id(50L)
                    .ticketNumber("TKT-2026-00050")
                    .title("Ancien ticket")
                    .status(TicketStatus.IN_PROGRESS)
                    .deadline(LocalDateTime.now().minusHours(2))
                    .breachedSla(false)
                    .history(new ArrayList<>())
                    .build();

            when(ticketRepository.findSlaBreachedTickets()).thenReturn(List.of(breachedTicket));

            ticketService.detectSlaBreaches();

            verify(ticketRepository).save(argThat(t ->
                    t.getId().equals(50L) && t.getBreachedSla() == true
            ));
            verify(historyRepository).save(any(TicketHistory.class));
        }

        @Test
        @DisplayName("Ne devrait pas sauvegarder si déjà marqué breached")
        void detectSlaBreaches_already_breached() {
            Ticket alreadyBreached = Ticket.builder()
                    .id(51L)
                    .ticketNumber("TKT-2026-00051")
                    .status(TicketStatus.IN_PROGRESS)
                    .deadline(LocalDateTime.now().minusHours(1))
                    .breachedSla(true)
                    .history(new ArrayList<>())
                    .build();

            when(ticketRepository.findSlaBreachedTickets()).thenReturn(List.of(alreadyBreached));

            ticketService.detectSlaBreaches();

            verify(ticketRepository, never()).save(any(Ticket.class));
        }
    }

    // =========================================================================
    // STATISTICS
    // =========================================================================
    @Nested
    @DisplayName("Statistics")
    class StatisticsTests {

        @Test
        @DisplayName("Devrait retourner le taux de conformité SLA")
        void getSlaComplianceRate() {
            when(ticketRepository.countResolvedOrClosedTickets()).thenReturn(10L);
            when(ticketRepository.countSlaBreachedResolvedTickets()).thenReturn(2L);

            Double rate = ticketService.getSlaComplianceRate();

            assertThat(rate).isEqualTo(0.8); // 8/10 compliant
        }

        @Test
        @DisplayName("Devrait retourner 1.0 si aucun ticket résolu")
        void getSlaComplianceRate_noTickets() {
            when(ticketRepository.countResolvedOrClosedTickets()).thenReturn(0L);

            Double rate = ticketService.getSlaComplianceRate();

            assertThat(rate).isEqualTo(1.0);
        }
    }
}
