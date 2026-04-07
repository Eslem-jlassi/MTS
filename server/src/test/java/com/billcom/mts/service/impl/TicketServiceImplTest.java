package com.billcom.mts.service.impl;

import com.billcom.mts.dto.ticket.TicketAssignRequest;
import com.billcom.mts.dto.ticket.TicketCommentRequest;
import com.billcom.mts.dto.ticket.TicketCreateRequest;
import com.billcom.mts.dto.ticket.TicketResponse;
import com.billcom.mts.dto.ticket.TicketStatusChangeRequest;
import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.entity.*;
import com.billcom.mts.enums.*;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
    @Mock private TicketAttachmentRepository attachmentRepository;
    @Mock private TelecomServiceRepository serviceRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private IncidentRepository incidentRepository;
    @Mock private SlaTimelineRepository slaTimelineRepository;
        @Mock private com.billcom.mts.service.SensitiveActionVerificationService sensitiveActionVerificationService;

    @InjectMocks
    private TicketServiceImpl ticketService;

    @TempDir
    Path tempDir;

    private User clientUser;
    private User agentUser;
    private User adminUser;
    private User otherAgentUser;
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

        lenient().when(commentRepository.findByTicketIdOrderByCreatedAtDesc(anyLong()))
                .thenReturn(List.of());
        lenient().when(historyRepository.findByTicketIdOrderByCreatedAtDesc(anyLong()))
                .thenReturn(List.of());
        lenient().when(attachmentRepository.findByTicketIdOrderByCreatedAtDesc(anyLong()))
                .thenReturn(List.of());
        lenient().when(historyRepository.save(any())).thenReturn(null);
        lenient().when(commentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

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

        adminUser = User.builder()
                .id(1L)
                .email("admin@billcom.tn")
                .firstName("Admin")
                .lastName("Root")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build();

        otherAgentUser = User.builder()
                .id(8L)
                .email("agent2@billcom.tn")
                .firstName("Autre")
                .lastName("Agent")
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
    // ACCESS CONTROL
    // =========================================================================
    @Nested
    @DisplayName("getTicketByIdSecured()")
    class AccessControlTests {

        @Test
        @DisplayName("AGENT peut voir un ticket non assigne")
        void agentCanViewUnassignedTicket() {
            testTicket.setAssignedTo(null);
            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            TicketResponse response = ticketService.getTicketByIdSecured(100L, agentUser);

            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(100L);
        }

        @Test
        @DisplayName("AGENT ne peut pas voir un ticket assigne a un autre agent")
        void agentCannotViewOtherAgentsTicket() {
            testTicket.setAssignedTo(otherAgentUser);
            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            assertThatThrownBy(() -> ticketService.getTicketByIdSecured(100L, agentUser))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("CLIENT ne voit pas les notes internes ni l'historique interne")
        void clientCannotSeeInternalNotesOrHistory() {
            TicketComment publicComment = TicketComment.builder()
                    .id(1L)
                    .ticket(testTicket)
                    .author(agentUser)
                    .content("Reponse publique")
                    .isInternal(false)
                    .build();
            TicketComment internalComment = TicketComment.builder()
                    .id(2L)
                    .ticket(testTicket)
                    .author(agentUser)
                    .content("Diagnostic interne")
                    .isInternal(true)
                    .build();

            TicketHistory publicHistory = TicketHistory.builder()
                    .id(10L)
                    .ticket(testTicket)
                    .user(agentUser)
                    .action(TicketAction.STATUS_CHANGE)
                    .oldValue(TicketStatus.NEW.name())
                    .newValue(TicketStatus.IN_PROGRESS.name())
                    .details("Prise en charge")
                    .build();
            TicketHistory internalHistory = TicketHistory.builder()
                    .id(11L)
                    .ticket(testTicket)
                    .user(agentUser)
                    .action(TicketAction.INTERNAL_NOTE)
                    .details("Analyse reservee au support")
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
            when(commentRepository.findByTicketIdOrderByCreatedAtDesc(100L))
                    .thenReturn(List.of(internalComment, publicComment));
            when(historyRepository.findByTicketIdOrderByCreatedAtDesc(100L))
                    .thenReturn(List.of(internalHistory, publicHistory));

            TicketResponse response = ticketService.getTicketByIdSecured(100L, clientUser);

            assertThat(response.getCommentCount()).isEqualTo(1);
            assertThat(response.getComments())
                    .extracting(TicketResponse.CommentInfo::getContent)
                    .containsExactly("Reponse publique");
            assertThat(response.getHistory())
                    .extracting(TicketResponse.HistoryInfo::getAction)
                    .containsExactly(TicketAction.STATUS_CHANGE.name());
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
            testTicket.setAssignedTo(agentUser);

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
            testTicket.setAssignedTo(agentUser);

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
            testTicket.setAssignedTo(agentUser);

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
            testTicket.setAssignedTo(agentUser);

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
        @DisplayName("Devrait marquer le SLA comme depasse si la resolution arrive apres la deadline")
        void changeStatus_resolved_after_deadline_marks_breached_sla() {
            testTicket.setStatus(TicketStatus.IN_PROGRESS);
            testTicket.setAssignedTo(agentUser);
            testTicket.setDeadline(LocalDateTime.now().minusMinutes(5));

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.RESOLVED)
                    .resolution("Resolution tardive")
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(ticketRepository.save(any(Ticket.class))).thenReturn(testTicket);

            ticketService.changeStatus(100L, request, agentUser, "127.0.0.1");

            verify(ticketRepository).save(argThat(t ->
                    t.getStatus() == TicketStatus.RESOLVED &&
                    Boolean.TRUE.equals(t.getBreachedSla())
            ));
        }

        @Test
        @DisplayName("Devrait nettoyer resolvedAt et closedAt lors de la reouverture")
        void changeStatus_reopen_clears_resolution_timestamps() {
            testTicket.setStatus(TicketStatus.RESOLVED);
            testTicket.setAssignedTo(agentUser);
            testTicket.setResolvedAt(LocalDateTime.now().minusMinutes(30));
            testTicket.setClosedAt(LocalDateTime.now().minusMinutes(10));

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.IN_PROGRESS)
                    .comment("Reouverture pour verification")
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
            when(ticketRepository.save(any(Ticket.class))).thenReturn(testTicket);

            ticketService.changeStatus(100L, request, agentUser, "127.0.0.1");

            verify(ticketRepository).save(argThat(t ->
                    t.getStatus() == TicketStatus.IN_PROGRESS &&
                    t.getResolvedAt() == null &&
                    t.getClosedAt() == null
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

        @Test
        @DisplayName("AGENT ne peut pas changer le statut d'un ticket non assigne")
        void changeStatus_forbidden_for_unassigned_ticket() {
            testTicket.setStatus(TicketStatus.NEW);
            testTicket.setAssignedTo(null);

            TicketStatusChangeRequest request = TicketStatusChangeRequest.builder()
                    .newStatus(TicketStatus.IN_PROGRESS)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            assertThatThrownBy(() -> ticketService.changeStatus(100L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(ForbiddenException.class);
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

        @Test
        @DisplayName("Devrait refuser l'assignation d'un ticket deja resolu")
        void assignTicket_refuses_terminal_workflow_state() {
            testTicket.setStatus(TicketStatus.RESOLVED);

            TicketAssignRequest request = TicketAssignRequest.builder()
                    .agentId(3L)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            assertThatThrownBy(() -> ticketService.assignTicket(100L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("resolu");
        }
    }

    // =========================================================================
    // COMMENTS
    // =========================================================================
    @Nested
    @DisplayName("addComment()")
    class CommentTests {

        @Test
        @DisplayName("Devrait refuser un commentaire sur un ticket clos")
        void addComment_rejects_closed_ticket() {
            testTicket.setStatus(TicketStatus.CLOSED);
            testTicket.setAssignedTo(agentUser);

            TicketCommentRequest request = TicketCommentRequest.builder()
                    .content("Relance client")
                    .isInternal(false)
                    .build();

            when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

            assertThatThrownBy(() -> ticketService.addComment(100L, request, agentUser, "127.0.0.1"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("clos ou annule");
            verify(commentRepository, never()).save(any(TicketComment.class));
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
            ArgumentCaptor<TicketHistory> historyCaptor = ArgumentCaptor.forClass(TicketHistory.class);
            verify(historyRepository, atLeastOnce()).save(historyCaptor.capture());
            assertThat(historyCaptor.getAllValues())
                    .extracting(TicketHistory::getAction)
                    .contains(TicketAction.SLA_BREACH);
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

        @Test
        @DisplayName("Devrait escalader automatiquement un ticket actif en depassement SLA")
        void detectSlaBreaches_auto_escalates_active_ticket() {
            Ticket breachedTicket = Ticket.builder()
                    .id(52L)
                    .ticketNumber("TKT-2026-00052")
                    .title("Ticket critique")
                    .status(TicketStatus.IN_PROGRESS)
                    .deadline(LocalDateTime.now().minusHours(1))
                    .breachedSla(false)
                    .createdBy(clientUser)
                    .build();

            when(ticketRepository.findSlaBreachedTickets()).thenReturn(List.of(breachedTicket));

            ticketService.detectSlaBreaches();

            verify(ticketRepository).save(argThat(t ->
                    t.getId().equals(52L)
                            && Boolean.TRUE.equals(t.getBreachedSla())
                            && t.getStatus() == TicketStatus.ESCALATED
            ));

            ArgumentCaptor<TicketHistory> historyCaptor = ArgumentCaptor.forClass(TicketHistory.class);
            verify(historyRepository, atLeast(2)).save(historyCaptor.capture());
            assertThat(historyCaptor.getAllValues())
                    .extracting(TicketHistory::getAction)
                    .contains(TicketAction.SLA_BREACH, TicketAction.ESCALATION);
        }
    }

        // =========================================================================
        // DELETE TICKET (CLIENT)
        // =========================================================================
        @Nested
        @DisplayName("deleteTicketAsClient()")
        class DeleteTicketAsClientTests {

                @Test
                @DisplayName("Devrait supprimer un ticket NEW non assigné appartenant au client")
                void deleteTicketAsClient_success() {
                        testTicket.setStatus(TicketStatus.NEW);
                        testTicket.setAssignedTo(null);

                        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
                        when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));
                        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

                        ticketService.deleteTicketAsClient(100L, clientUser, "127.0.0.1");

                        assertThat(testTicket.getStatus()).isEqualTo(TicketStatus.CANCELLED);
                        verify(ticketRepository).save(testTicket);
                        verify(historyRepository).save(any(TicketHistory.class));
                        verify(ticketRepository, never()).delete(any(Ticket.class));
                }

                @Test
                @DisplayName("Devrait refuser la suppression si ticket d'un autre client")
                void deleteTicketAsClient_forbidden_not_owner() {
                        Client otherClient = Client.builder().id(999L).build();
                        testTicket.setClient(otherClient);

                        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
                        when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));

                        assertThatThrownBy(() -> ticketService.deleteTicketAsClient(100L, clientUser, "127.0.0.1"))
                                .isInstanceOf(ForbiddenException.class);
                }

                @Test
                @DisplayName("Devrait refuser la suppression si ticket déjà en traitement")
                void deleteTicketAsClient_refuse_processed_status() {
                        testTicket.setStatus(TicketStatus.IN_PROGRESS);
                        testTicket.setAssignedTo(null);

                        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
                        when(clientRepository.findByUserId(5L)).thenReturn(Optional.of(testClient));

                        assertThatThrownBy(() -> ticketService.deleteTicketAsClient(100L, clientUser, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class);
                        verify(ticketRepository, never()).delete(any(Ticket.class));
                }

                @Test
                @DisplayName("Devrait supprimer definitivement un ticket vierge cote admin")
                void hardDeleteTicketAsAdmin_success() throws IOException {
                        testTicket.setStatus(TicketStatus.NEW);
                        testTicket.setAssignedTo(null);
                        ReflectionTestUtils.setField(ticketService, "ticketUploadDir", tempDir.toString());
                        Path ticketFolder = Files.createDirectories(tempDir.resolve("100"));
                        Files.writeString(ticketFolder.resolve("orphan.txt"), "temporary attachment residue");

                        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
                        when(commentRepository.countByTicketId(100L)).thenReturn(0L);
                        when(attachmentRepository.countByTicketId(100L)).thenReturn(0L);
                        when(historyRepository.countByTicketId(100L)).thenReturn(1L);
                        when(slaTimelineRepository.countByTicket_Id(100L)).thenReturn(0L);
                        when(incidentRepository.countByTicketId(100L)).thenReturn(0L);
                        when(incidentRepository.countByTickets_Id(100L)).thenReturn(0L);
                        when(notificationRepository.deleteByReferenceTypeAndReferenceId("TICKET", 100L)).thenReturn(2L);

                        ticketService.hardDeleteTicketAsAdmin(
                                100L,
                                adminUser,
                                "127.0.0.1",
                                hardDeleteRequest(100L)
                        );

                        verify(ticketRepository).delete(testTicket);
                        verify(notificationRepository).deleteByReferenceTypeAndReferenceId("TICKET", 100L);
                        verify(sensitiveActionVerificationService).verifyHardDeleteAuthorization(
                                eq(adminUser),
                                eq(100L),
                                any(AdminHardDeleteRequest.class),
                                contains("ticket")
                        );
                        assertThat(Files.exists(ticketFolder)).isFalse();
                }

                @Test
                @DisplayName("Devrait refuser le hard delete si le ticket contient deja des commentaires")
                void hardDeleteTicketAsAdmin_refuse_when_comments_exist() {
                        testTicket.setStatus(TicketStatus.NEW);
                        testTicket.setAssignedTo(null);

                        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
                        when(commentRepository.countByTicketId(100L)).thenReturn(2L);

                        assertThatThrownBy(() -> ticketService.hardDeleteTicketAsAdmin(
                                100L,
                                adminUser,
                                "127.0.0.1",
                                hardDeleteRequest(100L)
                        ))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("commentaires");
                        verify(ticketRepository, never()).delete(any(Ticket.class));
                }

                @Test
                @DisplayName("Devrait refuser le hard delete si le ticket est lie a un incident")
                void hardDeleteTicketAsAdmin_refuse_when_linked_to_incident() {
                        testTicket.setStatus(TicketStatus.NEW);
                        testTicket.setAssignedTo(null);

                        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
                        when(commentRepository.countByTicketId(100L)).thenReturn(0L);
                        when(attachmentRepository.countByTicketId(100L)).thenReturn(0L);
                        when(historyRepository.countByTicketId(100L)).thenReturn(1L);
                        when(slaTimelineRepository.countByTicket_Id(100L)).thenReturn(0L);
                        when(incidentRepository.countByTicketId(100L)).thenReturn(1L);
                        when(incidentRepository.countByTickets_Id(100L)).thenReturn(0L);

                        assertThatThrownBy(() -> ticketService.hardDeleteTicketAsAdmin(
                                100L,
                                adminUser,
                                "127.0.0.1",
                                hardDeleteRequest(100L)
                        ))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("incident");
                        verify(ticketRepository, never()).delete(any(Ticket.class));
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

        private AdminHardDeleteRequest hardDeleteRequest(long id) {
                return AdminHardDeleteRequest.builder()
                                .confirmationKeyword("SUPPRIMER")
                                .confirmationTargetId(String.valueOf(id))
                                .currentPassword("Password1!")
                                .build();
        }
}
