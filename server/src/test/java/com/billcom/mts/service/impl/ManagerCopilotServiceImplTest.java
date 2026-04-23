package com.billcom.mts.service.impl;

import com.billcom.mts.dto.ai.DuplicateDetectionResponseDto;
import com.billcom.mts.dto.ai.SentimentAnalysisResponseDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentCandidateDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionResponseDto;
import com.billcom.mts.dto.managercopilot.ManagerCopilotDashboardResponse;
import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreResponseDto;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.ServiceCriticality;
import com.billcom.mts.enums.ServiceStatus;
import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.IncidentRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.service.ChatbotService;
import com.billcom.mts.service.DuplicateDetectionService;
import com.billcom.mts.service.ManagerCopilotAiService;
import com.billcom.mts.service.SentimentAnalysisService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagerCopilotServiceImplTest {

    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private TelecomServiceRepository telecomServiceRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DuplicateDetectionService duplicateDetectionService;
    @Mock
    private SentimentAnalysisService sentimentAnalysisService;
    @Mock
    private ChatbotService chatbotService;
    @Mock
    private ManagerCopilotAiService managerCopilotAiService;

    @InjectMocks
    private ManagerCopilotServiceImpl managerCopilotService;

    private TelecomService bscsService;
    private User assignedAgent;
    private User alternateAgent;
    private Client client;
    private Ticket primaryTicket;
    private Ticket peerTicket;

    @BeforeEach
    void setUp() {
        User clientUser = User.builder()
                .id(20L)
                .firstName("Client")
                .lastName("Demo")
                .email("client@billcom.tn")
                .role(UserRole.CLIENT)
                .isActive(true)
                .build();

        client = Client.builder()
                .id(30L)
                .user(clientUser)
                .clientCode("CLI-2026-00030")
                .companyName("Demo Corp")
                .build();

        assignedAgent = User.builder()
                .id(10L)
                .firstName("Alice")
                .lastName("Agent")
                .email("alice.agent@billcom.tn")
                .role(UserRole.AGENT)
                .isActive(true)
                .build();

        alternateAgent = User.builder()
                .id(11L)
                .firstName("Bob")
                .lastName("Backup")
                .email("bob.backup@billcom.tn")
                .role(UserRole.AGENT)
                .isActive(true)
                .build();

        bscsService = TelecomService.builder()
                .id(7L)
                .name("BSCS Billing")
                .category(ServiceCategory.BILLING)
                .status(ServiceStatus.DEGRADED)
                .criticality(ServiceCriticality.CRITICAL)
                .isActive(true)
                .createdBy(assignedAgent)
                .build();

        LocalDateTime now = LocalDateTime.now();

        primaryTicket = Ticket.builder()
                .id(1L)
                .ticketNumber("TKT-2026-00001")
                .title("Facturation BSCS indisponible")
                .description("Plusieurs clients remontent la meme panne de facturation.")
                .client(client)
                .service(bscsService)
                .assignedTo(assignedAgent)
                .createdBy(client.getUser())
                .category(TicketCategory.PANNE)
                .priority(TicketPriority.HIGH)
                .status(TicketStatus.IN_PROGRESS)
                .slaHours(8)
                .createdAt(now.minusHours(6))
                .deadline(now.plusHours(2))
                .breachedSla(false)
                .build();

        peerTicket = Ticket.builder()
                .id(2L)
                .ticketNumber("TKT-2026-00002")
                .title("Erreur facture BSCS")
                .description("Ticket similaire sur le meme service.")
                .client(client)
                .service(bscsService)
                .createdBy(client.getUser())
                .assignedTo(null)
                .category(TicketCategory.PANNE)
                .priority(TicketPriority.MEDIUM)
                .status(TicketStatus.NEW)
                .slaHours(24)
                .createdAt(now.minusHours(2))
                .deadline(now.plusHours(22))
                .breachedSla(false)
                .build();
    }

    @Test
    @DisplayName("Construit un snapshot KNN supervise avec incident probable et quick actions backend")
    void getDashboardSummary_buildsSupervisedSnapshot() {
        when(ticketRepository.findActiveTickets()).thenReturn(List.of(primaryTicket, peerTicket));
        when(incidentRepository.findActive()).thenReturn(List.of());
        when(telecomServiceRepository.findActiveOrderByHealthPriority()).thenReturn(List.of(bscsService));
        when(userRepository.findActiveByRole(UserRole.AGENT)).thenReturn(List.of(assignedAgent, alternateAgent));
        when(ticketRepository.countActiveByAssignedTo(assignedAgent.getId())).thenReturn(8L);
        when(ticketRepository.countActiveByAssignedTo(alternateAgent.getId())).thenReturn(2L);

        DuplicateDetectionResponseDto duplicateResponse = new DuplicateDetectionResponseDto();
        duplicateResponse.setAvailable(true);
        duplicateResponse.setPossibleMassIncident(true);
        duplicateResponse.setDuplicateConfidence(0.88);
        DuplicateDetectionResponseDto.MatchedTicketDto matched = new DuplicateDetectionResponseDto.MatchedTicketDto();
        matched.setTicketId(peerTicket.getId());
        matched.setTitle(peerTicket.getTitle());
        matched.setSimilarityScore(0.88);
        matched.setDuplicateLevel("HIGH");
        duplicateResponse.setMatchedTickets(List.of(matched));
        when(duplicateDetectionService.detectDuplicates(any())).thenReturn(duplicateResponse);

        SentimentAnalysisResponseDto sentimentResponse = new SentimentAnalysisResponseDto();
        sentimentResponse.setAvailable(true);
        sentimentResponse.setSentiment("NEGATIVE");
        sentimentResponse.setStars(1);
        sentimentResponse.setIsAngry(true);
        sentimentResponse.setConfidence(0.9);
        when(sentimentAnalysisService.analyze(any())).thenReturn(sentimentResponse);

        MassiveIncidentCandidateDto candidateDto = new MassiveIncidentCandidateDto();
        candidateDto.setDetectedService("BSCS Billing");
        candidateDto.setClusterSize(4);
        candidateDto.setLikelyIncidentTitle("Cluster tickets BSCS facture");
        candidateDto.setConfidenceLevel("high");
        candidateDto.setConfidenceScore(0.84);
        candidateDto.setRecommendation("Ouvrir un incident global et centraliser la communication.");

        MassiveIncidentDetectionResponseDto massIncidentResponse = new MassiveIncidentDetectionResponseDto();
        massIncidentResponse.setAvailable(true);
        massIncidentResponse.setCandidatesFound(1);
        massIncidentResponse.setCandidates(List.of(candidateDto));
        when(chatbotService.detectMassiveIncidents(any())).thenReturn(massIncidentResponse);

        ManagerCopilotScoreResponseDto.ResultDto resultDto = ManagerCopilotScoreResponseDto.ResultDto.builder()
                .caseId("ticket-1")
                .predictedAction("OPEN_INCIDENT")
                .confidenceScore(0.81)
                .confidenceLevel("high")
                .reasoning("L'action Ouvrir un incident ressort sur 2/3 voisin(s) proches.")
                .inferenceMode("knn")
                .modelVersion("manager-copilot-knn-1.0.0")
                .featureSummary(List.of("Service degrade ou indisponible", "4 ticket(s) similaires"))
                .nearestExamples(List.of(
                        ManagerCopilotScoreResponseDto.NearestExampleDto.builder()
                                .exampleId("seed-inc-001")
                                .label("OPEN_INCIDENT")
                                .title("Cluster tickets BSCS facture")
                                .summary("Plusieurs tickets similaires convergent sur BSCS.")
                                .recommendation("Ouvrir un incident global.")
                                .distance(0.18)
                                .featureSummary(List.of("Service degrade ou indisponible"))
                                .build()
                ))
                .build();

        ManagerCopilotScoreResponseDto aiResponse = ManagerCopilotScoreResponseDto.builder()
                .available(true)
                .modelVersion("manager-copilot-knn-1.0.0")
                .inferenceMode("knn")
                .fallbackMode("knn_primary")
                .confidenceScore(0.81)
                .confidenceLevel("high")
                .results(List.of(resultDto))
                .reasoningSteps(List.of("KNN supervise execute sur 1 cas manager."))
                .build();
        when(managerCopilotAiService.scoreCases(any())).thenReturn(aiResponse);

        ManagerCopilotDashboardResponse response = managerCopilotService.getDashboardSummary("WEEK", 7L, null);

        assertThat(response.getMode()).isEqualTo("live");
        assertThat(response.getInferenceMode()).isEqualTo("knn");
        assertThat(response.getModelVersion()).isEqualTo("manager-copilot-knn-1.0.0");
        assertThat(response.getProbableIncidents()).isNotEmpty();
        assertThat(response.getProbableIncidents().get(0).getPredictedAction()).isEqualTo("OPEN_INCIDENT");
        assertThat(response.getProbableIncidents().get(0).getNearestExamples()).hasSize(1);
        assertThat(response.getQuickActions()).extracting(ManagerCopilotDashboardResponse.QuickActionDto::getLabel)
                .contains("Controler les incidents", "Preparer la synthese");
        assertThat(response.getReasoningSteps()).anyMatch(step -> step.contains("KNN supervise"));
    }

    @Test
    @DisplayName("Bascule en mode degrade backend si le modele KNN est indisponible")
    void getDashboardSummary_fallsBackWhenAiUnavailable() {
        Ticket breachedTicket = Ticket.builder()
                .id(3L)
                .ticketNumber("TKT-2026-00003")
                .title("Lien critique hors SLA")
                .description("Incident critique client enterprise.")
                .client(client)
                .service(bscsService)
                .assignedTo(assignedAgent)
                .createdBy(client.getUser())
                .category(TicketCategory.PANNE)
                .priority(TicketPriority.CRITICAL)
                .status(TicketStatus.IN_PROGRESS)
                .slaHours(4)
                .createdAt(LocalDateTime.now().minusHours(8))
                .deadline(LocalDateTime.now().minusMinutes(30))
                .breachedSla(true)
                .build();

        when(ticketRepository.findActiveTickets()).thenReturn(List.of(breachedTicket));
        when(incidentRepository.findActive()).thenReturn(List.of());
        when(telecomServiceRepository.findActiveOrderByHealthPriority()).thenReturn(List.of(bscsService));
        when(userRepository.findActiveByRole(UserRole.AGENT)).thenReturn(List.of(assignedAgent, alternateAgent));
        when(ticketRepository.countActiveByAssignedTo(assignedAgent.getId())).thenReturn(9L);
        when(ticketRepository.countActiveByAssignedTo(alternateAgent.getId())).thenReturn(2L);
        when(sentimentAnalysisService.analyze(any())).thenReturn(SentimentAnalysisResponseDto.unavailable("sentiment down"));
        when(chatbotService.detectMassiveIncidents(any())).thenReturn(MassiveIncidentDetectionResponseDto.empty());
        when(managerCopilotAiService.scoreCases(any())).thenReturn(ManagerCopilotScoreResponseDto.unavailable("ai unavailable"));

        ManagerCopilotDashboardResponse response = managerCopilotService.getDashboardSummary(null, null, null);

        assertThat(response.getMode()).isEqualTo("degraded");
        assertThat(response.getInferenceMode()).isEqualTo("degraded_rules");
        assertThat(response.getPriorityTickets()).isNotEmpty();
        assertThat(response.getPriorityTickets().get(0).getPredictedAction()).isEqualTo("ESCALATE");
        assertThat(response.getSlaAlerts()).isNotEmpty();
        assertThat(response.getReasoningSteps()).anyMatch(step -> step.contains("Fallback backend actif"));
    }
}
