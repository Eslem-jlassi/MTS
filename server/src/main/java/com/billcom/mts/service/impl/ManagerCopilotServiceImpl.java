package com.billcom.mts.service.impl;

import com.billcom.mts.dto.ai.DuplicateDetectionRequestDto;
import com.billcom.mts.dto.ai.DuplicateDetectionResponseDto;
import com.billcom.mts.dto.ai.SentimentAnalysisRequestDto;
import com.billcom.mts.dto.ai.SentimentAnalysisResponseDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentCandidateDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionRequestDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionResponseDto;
import com.billcom.mts.dto.managercopilot.ManagerCopilotDashboardResponse;
import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreRequestDto;
import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreResponseDto;
import com.billcom.mts.entity.Incident;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import com.billcom.mts.enums.ServiceCriticality;
import com.billcom.mts.enums.ServiceStatus;
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
import com.billcom.mts.service.ManagerCopilotService;
import com.billcom.mts.service.SentimentAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ManagerCopilotServiceImpl implements ManagerCopilotService {

    private static final int MAX_CANDIDATES = 6;
    private static final int MAX_PRIORITY_TICKETS = 4;
    private static final int MAX_DIRECT_INCIDENT_SIGNALS = 3;
    private static final int MAX_INCIDENT_SIGNALS = 4;
    private static final int MAX_ASSIGNMENT_SIGNALS = 3;
    private static final int MAX_SLA_ALERTS = 4;
    private static final int MAX_QUICK_ACTIONS = 5;
    private static final Set<TicketStatus> ACTIVE_TICKET_STATUSES = EnumSet.of(
            TicketStatus.NEW,
            TicketStatus.ASSIGNED,
            TicketStatus.IN_PROGRESS,
            TicketStatus.PENDING,
            TicketStatus.PENDING_THIRD_PARTY,
            TicketStatus.ESCALATED
    );
    private static final Set<IncidentStatus> ACTIVE_INCIDENT_STATUSES = EnumSet.of(
            IncidentStatus.OPEN,
            IncidentStatus.IN_PROGRESS
    );

    private final TicketRepository ticketRepository;
    private final IncidentRepository incidentRepository;
    private final TelecomServiceRepository telecomServiceRepository;
    private final UserRepository userRepository;
    private final DuplicateDetectionService duplicateDetectionService;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final ChatbotService chatbotService;
    private final ManagerCopilotAiService managerCopilotAiService;

    @Override
    public ManagerCopilotDashboardResponse getDashboardSummary(String period, Long serviceId, Long clientId) {
        LocalDateTime now = LocalDateTime.now();
        List<Ticket> activeTickets = filterTickets(ticketRepository.findActiveTickets(), serviceId, clientId);
        List<Incident> activeIncidents = filterIncidents(incidentRepository.findActive(), serviceId, clientId);
        Set<Long> referencedServiceIds = collectReferencedServiceIds(activeTickets, activeIncidents, serviceId);
        List<TelecomService> activeServices = filterServices(
                telecomServiceRepository.findActiveOrderByHealthPriority(),
                serviceId,
                clientId,
                referencedServiceIds
        );

        Map<Long, Long> agentLoads = loadAgentLoads();
        List<User> activeAgents = userRepository.findActiveByRole(UserRole.AGENT);
        Map<Long, List<Incident>> incidentsByServiceId = groupIncidentsByService(activeIncidents);
        Set<Long> incidentTicketIds = collectIncidentTicketIds(activeIncidents);
        Map<Long, MassiveIncidentCandidateDto> massIncidentByServiceId = buildMassIncidentCache(activeServices, activeIncidents);
        int backlogOpenTickets = activeTickets.size();

        List<Ticket> rankedTickets = activeTickets.stream()
                .sorted(Comparator.comparingInt((Ticket ticket) ->
                        computeBaseScore(ticket, incidentsByServiceId, incidentTicketIds, now)).reversed())
                .limit(MAX_CANDIDATES)
                .toList();

        List<TicketAiContext> ticketContexts = rankedTickets.stream()
                .map(ticket -> buildTicketContext(
                        ticket,
                        agentLoads,
                        activeAgents,
                        activeTickets,
                        incidentsByServiceId,
                        incidentTicketIds,
                        massIncidentByServiceId,
                        backlogOpenTickets,
                        now
                ))
                .toList();

        ScoreBundle scoreBundle = scoreTicketContexts(ticketContexts);

        List<TelecomService> servicesAtRisk = activeServices.stream()
                .filter(service -> service.getStatus() == ServiceStatus.DOWN || service.getStatus() == ServiceStatus.DEGRADED)
                .toList();

        List<ManagerCopilotDashboardResponse.SignalDto> priorityTickets = buildPrioritySignals(ticketContexts, scoreBundle);
        List<ManagerCopilotDashboardResponse.SignalDto> probableIncidents =
                buildProbableIncidentSignals(activeIncidents, ticketContexts, scoreBundle);
        List<ManagerCopilotDashboardResponse.SignalDto> assignments =
                buildAssignmentSignals(ticketContexts, scoreBundle);
        List<ManagerCopilotDashboardResponse.SignalDto> slaAlerts = buildSlaAlertSignals(ticketContexts, scoreBundle);
        List<ManagerCopilotDashboardResponse.QuickActionDto> quickActions =
                buildQuickActions(priorityTickets, probableIncidents, slaAlerts, servicesAtRisk);
        List<ManagerCopilotDashboardResponse.MetricDto> metrics =
                buildMetrics(priorityTickets, probableIncidents, assignments, slaAlerts, servicesAtRisk);

        String summary = buildSummary(priorityTickets, probableIncidents, slaAlerts, servicesAtRisk, activeTickets.size());
        List<String> featureSummary = ticketContexts.stream()
                .map(ticketContext -> scoreBundle.resultsByCaseId().get(caseId(ticketContext)))
                .filter(Objects::nonNull)
                .flatMap(result -> safeList(result.getFeatureSummary()).stream())
                .distinct()
                .limit(6)
                .toList();

        List<String> reasoningSteps = new ArrayList<>();
        reasoningSteps.add("Snapshot ALLIE calcule cote backend a partir des tickets, incidents, SLA et services.");
        if (period != null && !period.isBlank()) {
            reasoningSteps.add("Filtre period recu: " + period + " (snapshot operationnel temps reel).");
        }
        reasoningSteps.addAll(scoreBundle.reasoningSteps());
        reasoningSteps.add("Validation finale manager requise avant toute action.");

        int urgentCount = countCriticalSignals(priorityTickets, probableIncidents, slaAlerts);
        String mode = scoreBundle.knnBacked() ? "live" : "degraded";

        return ManagerCopilotDashboardResponse.builder()
                .available(true)
                .mode(mode)
                .generatedAt(now.toString())
                .summary(summary)
                .executiveSummary(summary)
                .modelVersion(scoreBundle.modelVersion())
                .inferenceMode(scoreBundle.inferenceMode())
                .confidenceScore(scoreBundle.confidenceScore())
                .featureSummary(featureSummary)
                .reasoningSteps(reasoningSteps)
                .recommendedActions(quickActions.stream().map(ManagerCopilotDashboardResponse.QuickActionDto::getLabel).toList())
                .urgentCount(urgentCount)
                .metrics(metrics)
                .decisionAreas(buildDecisionAreas(summary, priorityTickets, probableIncidents, assignments, slaAlerts))
                .whyCards(buildWhyCards(priorityTickets, probableIncidents, assignments, slaAlerts))
                .priorityTickets(priorityTickets)
                .probableIncidents(probableIncidents)
                .assignments(assignments)
                .slaAlerts(slaAlerts)
                .quickActions(quickActions)
                .build();
    }

    private List<Ticket> filterTickets(List<Ticket> tickets, Long serviceId, Long clientId) {
        return tickets.stream()
                .filter(ticket -> ACTIVE_TICKET_STATUSES.contains(ticket.getStatus()))
                .filter(ticket -> serviceId == null || Objects.equals(ticket.getService().getId(), serviceId))
                .filter(ticket -> clientId == null || Objects.equals(ticket.getClient().getId(), clientId))
                .toList();
    }

    private List<Incident> filterIncidents(List<Incident> incidents, Long serviceId, Long clientId) {
        return incidents.stream()
                .filter(incident -> ACTIVE_INCIDENT_STATUSES.contains(incident.getStatus()))
                .filter(incident -> serviceId == null || incidentMatchesService(incident, serviceId))
                .filter(incident -> clientId == null || incidentMatchesClient(incident, clientId))
                .toList();
    }

    private List<TelecomService> filterServices(
            List<TelecomService> services,
            Long serviceId,
            Long clientId,
            Set<Long> referencedServiceIds
    ) {
        return services.stream()
                .filter(service -> serviceId == null || Objects.equals(service.getId(), serviceId))
                .filter(service -> clientId == null || referencedServiceIds.isEmpty() || referencedServiceIds.contains(service.getId()))
                .toList();
    }

    private Set<Long> collectReferencedServiceIds(List<Ticket> tickets, List<Incident> incidents, Long serviceId) {
        if (serviceId != null) {
            return Set.of(serviceId);
        }

        Set<Long> serviceIds = new LinkedHashSet<>();
        tickets.stream()
                .map(ticket -> ticket.getService() != null ? ticket.getService().getId() : null)
                .filter(Objects::nonNull)
                .forEach(serviceIds::add);

        incidents.forEach(incident -> {
            if (incident.getService() != null && incident.getService().getId() != null) {
                serviceIds.add(incident.getService().getId());
            }
            safeCollection(incident.getAffectedServices()).stream()
                    .map(TelecomService::getId)
                    .filter(Objects::nonNull)
                    .forEach(serviceIds::add);
        });
        return serviceIds;
    }

    private boolean incidentMatchesService(Incident incident, Long serviceId) {
        if (incident.getService() != null && Objects.equals(incident.getService().getId(), serviceId)) {
            return true;
        }
        return safeCollection(incident.getAffectedServices()).stream()
                .anyMatch(service -> Objects.equals(service.getId(), serviceId));
    }

    private boolean incidentMatchesClient(Incident incident, Long clientId) {
        if (incident.getTicket() != null
                && incident.getTicket().getClient() != null
                && Objects.equals(incident.getTicket().getClient().getId(), clientId)) {
            return true;
        }
        return safeCollection(incident.getTickets()).stream()
                .anyMatch(ticket -> ticket.getClient() != null && Objects.equals(ticket.getClient().getId(), clientId));
    }

    private Map<Long, Long> loadAgentLoads() {
        Map<Long, Long> loads = new HashMap<>();
        for (User agent : userRepository.findActiveByRole(UserRole.AGENT)) {
            loads.put(agent.getId(), ticketRepository.countActiveByAssignedTo(agent.getId()));
        }
        return loads;
    }

    private Map<Long, List<Incident>> groupIncidentsByService(List<Incident> incidents) {
        Map<Long, List<Incident>> incidentsByService = new LinkedHashMap<>();
        for (Incident incident : incidents) {
            if (incident.getService() != null && incident.getService().getId() != null) {
                incidentsByService.computeIfAbsent(incident.getService().getId(), ignored -> new ArrayList<>()).add(incident);
            }
            for (TelecomService service : safeCollection(incident.getAffectedServices())) {
                if (service.getId() != null) {
                    incidentsByService.computeIfAbsent(service.getId(), ignored -> new ArrayList<>()).add(incident);
                }
            }
        }
        return incidentsByService;
    }

    private Set<Long> collectIncidentTicketIds(List<Incident> incidents) {
        Set<Long> ticketIds = new LinkedHashSet<>();
        for (Incident incident : incidents) {
            if (incident.getTicket() != null && incident.getTicket().getId() != null) {
                ticketIds.add(incident.getTicket().getId());
            }
            for (Ticket ticket : safeCollection(incident.getTickets())) {
                if (ticket.getId() != null) {
                    ticketIds.add(ticket.getId());
                }
            }
        }
        return ticketIds;
    }

    private Map<Long, MassiveIncidentCandidateDto> buildMassIncidentCache(
            List<TelecomService> activeServices,
            List<Incident> activeIncidents
    ) {
        Map<Long, MassiveIncidentCandidateDto> candidatesByService = new HashMap<>();
        Set<Long> serviceIds = new LinkedHashSet<>();
        activeServices.stream()
                .map(TelecomService::getId)
                .filter(Objects::nonNull)
                .forEach(serviceIds::add);
        activeIncidents.stream()
                .map(incident -> incident.getService() != null ? incident.getService().getId() : null)
                .filter(Objects::nonNull)
                .forEach(serviceIds::add);

        for (Long currentServiceId : serviceIds) {
            TelecomService service = activeServices.stream()
                    .filter(item -> Objects.equals(item.getId(), currentServiceId))
                    .findFirst()
                    .orElse(null);
            if (service == null) {
                continue;
            }

            MassiveIncidentDetectionRequestDto request = new MassiveIncidentDetectionRequestDto();
            request.setServiceName(service.getName());
            request.setQueryHint(service.getName());
            request.setMaxCandidates(1);

            MassiveIncidentDetectionResponseDto response = chatbotService.detectMassiveIncidents(request);
            if (!response.isAvailable() || response.getCandidates() == null || response.getCandidates().isEmpty()) {
                continue;
            }

            candidatesByService.put(currentServiceId, response.getCandidates().get(0));
        }

        return candidatesByService;
    }

    private TicketAiContext buildTicketContext(
            Ticket ticket,
            Map<Long, Long> agentLoads,
            List<User> activeAgents,
            List<Ticket> activeTickets,
            Map<Long, List<Incident>> incidentsByServiceId,
            Set<Long> incidentTicketIds,
            Map<Long, MassiveIncidentCandidateDto> massIncidentByServiceId,
            int backlogOpenTickets,
            LocalDateTime now
    ) {
        TelecomService service = ticket.getService();
        boolean incidentLinked = incidentTicketIds.contains(ticket.getId())
                || incidentsByServiceId.containsKey(service.getId());
        MassiveIncidentCandidateDto massIncidentCandidate = massIncidentByServiceId.get(service.getId());
        DuplicateDetectionResponseDto duplicateResponse = analyzeDuplicates(ticket, activeTickets);
        SentimentAnalysisResponseDto sentimentResponse = sentimentAnalysisService.analyze(
                new SentimentAnalysisRequestDto(ticket.getTitle(), ticket.getDescription())
        );

        double ageHours = ticket.getCreatedAt() != null
                ? Duration.between(ticket.getCreatedAt(), now).toMinutes() / 60.0
                : 0.0;
        double slaRemainingMinutes = ticket.getSlaRemainingMinutes();
        boolean slaBreached = Boolean.TRUE.equals(ticket.getBreachedSla()) || ticket.isOverdue() || slaRemainingMinutes < 0;
        boolean serviceDegraded = service.getStatus() == ServiceStatus.DEGRADED || service.getStatus() == ServiceStatus.DOWN;
        double similarTicketCount = duplicateResponse.getMatchedTickets() != null
                ? duplicateResponse.getMatchedTickets().size()
                : 0.0;
        boolean probableMassIncident = duplicateResponse.isPossibleMassIncident() || massIncidentCandidate != null;
        double duplicateConfidence = duplicateResponse.getDuplicateConfidence();
        double frustrationScore = deriveFrustrationScore(sentimentResponse);
        double agentOpenTicketCount = ticket.getAssignedTo() != null
                ? agentLoads.getOrDefault(ticket.getAssignedTo().getId(), 0L)
                : 0L;
        String businessImpact = resolveBusinessImpact(ticket, service, incidentsByServiceId.get(service.getId()));
        String serviceCriticality = service.getCriticality() != null
                ? service.getCriticality().name()
                : ServiceCriticality.MEDIUM.name();
        AgentRecommendation suggestedAgent = recommendAgent(ticket, activeAgents, agentLoads);

        return new TicketAiContext(
                ticket,
                service,
                computeBaseScore(ticket, incidentsByServiceId, incidentTicketIds, now),
                incidentLinked,
                duplicateResponse,
                sentimentResponse,
                massIncidentCandidate,
                ageHours,
                slaRemainingMinutes,
                slaBreached,
                serviceDegraded,
                similarTicketCount,
                probableMassIncident,
                duplicateConfidence,
                frustrationScore,
                backlogOpenTickets,
                agentOpenTicketCount,
                businessImpact,
                serviceCriticality,
                ticket.getAssignedTo() != null,
                suggestedAgent
        );
    }

    private DuplicateDetectionResponseDto analyzeDuplicates(Ticket ticket, List<Ticket> activeTickets) {
        List<Ticket> recentTickets = activeTickets.stream()
                .filter(other -> !Objects.equals(other.getId(), ticket.getId()))
                .filter(other -> other.getService() != null
                        && ticket.getService() != null
                        && Objects.equals(other.getService().getId(), ticket.getService().getId()))
                .limit(8)
                .toList();

        if (recentTickets.isEmpty()) {
            DuplicateDetectionResponseDto response = new DuplicateDetectionResponseDto();
            response.setAvailable(true);
            response.setDuplicate(false);
            response.setPossibleMassIncident(false);
            response.setDuplicateConfidence(0.0);
            response.setConfidence(0.0);
            response.setReasoning("Aucun ticket comparable recent sur le meme service.");
            response.setRecommendation("Surveiller le dossier dans le flux standard.");
            return response;
        }

        DuplicateDetectionRequestDto.NewTicketDto newTicket = new DuplicateDetectionRequestDto.NewTicketDto();
        newTicket.setTitle(ticket.getTitle());
        newTicket.setDescription(ticket.getDescription());
        newTicket.setService(ticket.getService() != null ? ticket.getService().getName() : null);
        newTicket.setClientId(ticket.getClient() != null ? ticket.getClient().getId() : null);
        newTicket.setCreatedAt(ticket.getCreatedAt() != null ? ticket.getCreatedAt().toString() : null);

        List<DuplicateDetectionRequestDto.RecentTicketDto> recentTicketDtos = recentTickets.stream()
                .map(other -> {
                    DuplicateDetectionRequestDto.RecentTicketDto dto = new DuplicateDetectionRequestDto.RecentTicketDto();
                    dto.setId(other.getId());
                    dto.setTitle(other.getTitle());
                    dto.setDescription(other.getDescription());
                    dto.setService(other.getService() != null ? other.getService().getName() : null);
                    dto.setStatus(other.getStatus() != null ? other.getStatus().name() : null);
                    dto.setCreatedAt(other.getCreatedAt() != null ? other.getCreatedAt().toString() : null);
                    return dto;
                })
                .toList();

        DuplicateDetectionRequestDto request = new DuplicateDetectionRequestDto();
        request.setNewTicket(newTicket);
        request.setRecentTickets(recentTicketDtos);
        return duplicateDetectionService.detectDuplicates(request);
    }

    private AgentRecommendation recommendAgent(Ticket ticket, List<User> activeAgents, Map<Long, Long> agentLoads) {
        return activeAgents.stream()
                .filter(agent -> ticket.getAssignedTo() == null || !Objects.equals(agent.getId(), ticket.getAssignedTo().getId()))
                .sorted(Comparator
                        .comparingLong((User agent) -> agentLoads.getOrDefault(agent.getId(), 0L))
                        .thenComparing(User::getLastName, Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(User::getFirstName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .findFirst()
                .map(agent -> new AgentRecommendation(agent.getId(), agent.getFullName(), agentLoads.getOrDefault(agent.getId(), 0L)))
                .orElse(null);
    }

    private int computeBaseScore(
            Ticket ticket,
            Map<Long, List<Incident>> incidentsByServiceId,
            Set<Long> incidentTicketIds,
            LocalDateTime now
    ) {
        int score = switch (ticket.getPriority()) {
            case CRITICAL -> 95;
            case HIGH -> 58;
            case MEDIUM -> 28;
            case LOW -> 8;
        };

        score += switch (ticket.getStatus()) {
            case ESCALATED -> 34;
            case IN_PROGRESS -> 15;
            case NEW -> 16;
            case ASSIGNED -> 12;
            case PENDING_THIRD_PARTY -> 14;
            case PENDING -> 10;
            case RESOLVED, CLOSED, CANCELLED -> 0;
        };

        if (Boolean.TRUE.equals(ticket.getBreachedSla()) || ticket.isOverdue()) {
            score += 120;
        } else if (ticket.isSlaWarning()) {
            score += 34;
        }

        if (ticket.getAssignedTo() == null) {
            score += 18;
        }

        if (ticket.getService() != null) {
            if (ticket.getService().getStatus() == ServiceStatus.DOWN) {
                score += 42;
            } else if (ticket.getService().getStatus() == ServiceStatus.DEGRADED) {
                score += 24;
            }
        }

        if (incidentTicketIds.contains(ticket.getId())
                || (ticket.getService() != null && incidentsByServiceId.containsKey(ticket.getService().getId()))) {
            score += 26;
        }

        if (ticket.getCreatedAt() != null) {
            long ageHours = Math.max(0, Duration.between(ticket.getCreatedAt(), now).toHours());
            score += (int) Math.min(ageHours * 1.5, 30);
        }

        return score;
    }

    private double deriveFrustrationScore(SentimentAnalysisResponseDto sentimentResponse) {
        if (sentimentResponse == null || !sentimentResponse.isAvailable()) {
            return 0.0;
        }

        double score = 0.0;
        String normalizedSentiment = normalize(sentimentResponse.getSentiment());

        if (Boolean.TRUE.equals(sentimentResponse.getIsAngry())) {
            score = Math.max(score, 0.92);
        }
        if ("urgent_emotional".equalsIgnoreCase(sentimentResponse.getPriorityFlag())) {
            score = Math.max(score, 0.88);
        }
        if (normalizedSentiment.contains("tres negatif") || normalizedSentiment.contains("very negative")) {
            score = Math.max(score, 0.86);
        } else if (normalizedSentiment.contains("negatif") || normalizedSentiment.contains("negative")) {
            score = Math.max(score, 0.72);
        }

        if (sentimentResponse.getStars() != null) {
            score = Math.max(score, Math.max(0.0, (5.0 - sentimentResponse.getStars()) / 4.0));
        }
        if (sentimentResponse.getConfidence() != null && sentimentResponse.getConfidence() > 0.0 && score > 0.0) {
            score = Math.min(1.0, score * Math.max(0.65, sentimentResponse.getConfidence()));
        }

        return round(score);
    }

    private String resolveBusinessImpact(Ticket ticket, TelecomService service, List<Incident> serviceIncidents) {
        String explicitImpact = normalize(ticket.getImpact());
        if (List.of("critical", "high", "medium", "low").contains(explicitImpact)) {
            return explicitImpact.toUpperCase(Locale.ROOT);
        }

        if (ticket.getPriority() == TicketPriority.CRITICAL
                || service.getCriticality() == ServiceCriticality.CRITICAL
                || safeCollection(serviceIncidents).stream().anyMatch(incident -> incident.getSeverity() == Severity.CRITICAL)) {
            return "CRITICAL";
        }
        if (ticket.getPriority() == TicketPriority.HIGH
                || service.getCriticality() == ServiceCriticality.HIGH
                || safeCollection(serviceIncidents).stream().anyMatch(incident -> incident.getSeverity() == Severity.MAJOR)) {
            return "HIGH";
        }
        if (ticket.getPriority() == TicketPriority.MEDIUM || service.getCriticality() == ServiceCriticality.MEDIUM) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private ScoreBundle scoreTicketContexts(List<TicketAiContext> ticketContexts) {
        if (ticketContexts.isEmpty()) {
            return new ScoreBundle(Map.of(), false, "manager-copilot-knn-1.0.0", "degraded_rules", 0.0,
                    List.of("Aucun ticket actif n'a ete retenu pour le scoring supervise."));
        }

        ManagerCopilotScoreRequestDto request = ManagerCopilotScoreRequestDto.builder()
                .k(5)
                .cases(ticketContexts.stream().map(this::toScoreCase).toList())
                .build();

        ManagerCopilotScoreResponseDto response = managerCopilotAiService.scoreCases(request);
        Map<String, ManagerCopilotScoreResponseDto.ResultDto> resultsByCaseId = new LinkedHashMap<>();

        if (response.isAvailable()) {
            for (ManagerCopilotScoreResponseDto.ResultDto result : safeList(response.getResults())) {
                resultsByCaseId.put(result.getCaseId(), result);
            }
        }

        boolean knnBacked = response.isAvailable() && "knn".equalsIgnoreCase(response.getInferenceMode());
        for (TicketAiContext context : ticketContexts) {
            resultsByCaseId.computeIfAbsent(caseId(context), ignored -> fallbackScore(context));
        }

        List<String> reasoningSteps = new ArrayList<>();
        reasoningSteps.addAll(safeList(response.getReasoningSteps()));
        if (!response.isAvailable()) {
            reasoningSteps.add("Fallback backend actif: recommandations deterministes basees sur le contexte ticket.");
        }

        double aggregateConfidence;
        if (response.getConfidenceScore() != null && response.isAvailable()) {
            aggregateConfidence = response.getConfidenceScore();
        } else {
            aggregateConfidence = round(resultsByCaseId.values().stream()
                    .map(ManagerCopilotScoreResponseDto.ResultDto::getConfidenceScore)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0));
        }

        return new ScoreBundle(
                resultsByCaseId,
                knnBacked,
                response.getModelVersion() != null ? response.getModelVersion() : "manager-copilot-knn-1.0.0",
                response.getInferenceMode() != null ? response.getInferenceMode() : "degraded_rules",
                round(aggregateConfidence),
                reasoningSteps
        );
    }

    private ManagerCopilotScoreRequestDto.CaseDto toScoreCase(TicketAiContext context) {
        return ManagerCopilotScoreRequestDto.CaseDto.builder()
                .caseId(caseId(context))
                .title(context.ticket().getTitle())
                .serviceName(context.service().getName())
                .ticketNumber(context.ticket().getTicketNumber())
                .features(ManagerCopilotScoreRequestDto.FeatureSetDto.builder()
                        .priority(context.ticket().getPriority().name())
                        .status(context.ticket().getStatus().name())
                        .ageHours(context.ageHours())
                        .slaRemainingMinutes(context.slaRemainingMinutes())
                        .slaBreached(context.slaBreached())
                        .serviceDegraded(context.serviceDegraded())
                        .similarTicketCount(context.similarTicketCount())
                        .probableMassIncident(context.probableMassIncident())
                        .duplicateConfidence(context.duplicateConfidence())
                        .frustrationScore(context.frustrationScore())
                        .backlogOpenTickets(context.backlogOpenTickets())
                        .agentOpenTicketCount(context.agentOpenTicketCount())
                        .incidentLinked(context.incidentLinked())
                        .businessImpact(context.businessImpact())
                        .serviceCriticality(context.serviceCriticality())
                        .assigned(context.assigned())
                        .build())
                .build();
    }

    private ManagerCopilotScoreResponseDto.ResultDto fallbackScore(TicketAiContext context) {
        String predictedAction = "MONITOR";
        double confidenceScore = 0.55;

        if (context.probableMassIncident() || (context.serviceDegraded() && context.similarTicketCount() >= 3)) {
            predictedAction = "OPEN_INCIDENT";
            confidenceScore = context.probableMassIncident() ? 0.82 : 0.72;
        } else if (context.slaBreached() || context.slaRemainingMinutes() < 0) {
            predictedAction = "ESCALATE";
            confidenceScore = 0.8;
        } else if (context.assigned() && context.agentOpenTicketCount() >= 8 && context.backlogOpenTickets() >= 18) {
            predictedAction = "REASSIGN";
            confidenceScore = 0.68;
        } else if ("CRITICAL".equalsIgnoreCase(context.ticket().getPriority().name())
                && (context.frustrationScore() >= 0.75 || context.incidentLinked())) {
            predictedAction = "PREPARE_SUMMARY";
            confidenceScore = 0.64;
        }

        return ManagerCopilotScoreResponseDto.ResultDto.builder()
                .caseId(caseId(context))
                .predictedAction(predictedAction)
                .confidenceScore(round(confidenceScore))
                .confidenceLevel(confidenceLevel(confidenceScore))
                .nearestExamples(List.of())
                .featureSummary(buildFeatureSummary(context))
                .reasoning("Mode degrade ALLIE: recommendation issue d'un fallback deterministe cote backend.")
                .inferenceMode("degraded_rules")
                .modelVersion("manager-copilot-knn-1.0.0")
                .fallbackMode("backend_rules")
                .build();
    }

    private List<ManagerCopilotDashboardResponse.SignalDto> buildPrioritySignals(
            List<TicketAiContext> ticketContexts,
            ScoreBundle scoreBundle
    ) {
        return ticketContexts.stream()
                .map(context -> buildTicketSignal(context, scoreBundle.resultsByCaseId().get(caseId(context))))
                .filter(signal -> {
                    String action = safeText(signal.getPredictedAction());
                    return List.of("ESCALATE", "PREPARE_SUMMARY", "MONITOR").contains(action)
                            || "critical".equalsIgnoreCase(signal.getTone())
                            || "warning".equalsIgnoreCase(signal.getTone());
                })
                .sorted(signalComparator())
                .limit(MAX_PRIORITY_TICKETS)
                .toList();
    }

    private List<ManagerCopilotDashboardResponse.SignalDto> buildProbableIncidentSignals(
            List<Incident> activeIncidents,
            List<TicketAiContext> ticketContexts,
            ScoreBundle scoreBundle
    ) {
        List<ManagerCopilotDashboardResponse.SignalDto> signals = new ArrayList<>();

        activeIncidents.stream()
                .sorted(Comparator.comparingInt((Incident incident) -> incidentSeverityRank(incident.getSeverity()))
                        .thenComparing(Incident::getStartedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(MAX_DIRECT_INCIDENT_SIGNALS)
                .forEach(incident -> signals.add(ManagerCopilotDashboardResponse.SignalDto.builder()
                        .id("incident-" + incident.getId())
                        .eyebrow(incident.getIncidentNumber() != null ? incident.getIncidentNumber() : "Incident actif")
                        .title(incident.getTitle())
                        .description("Incident deja ouvert sur " + safeText(
                                incident.getService() != null ? incident.getService().getName() : "service transverse"
                        ) + ".")
                        .href("/incidents/" + incident.getId())
                        .tone(incident.getSeverity() == Severity.CRITICAL ? "critical" : "warning")
                        .confidence("high")
                        .meta(incident.getService() != null ? incident.getService().getName() : "Supervision active")
                        .tags(List.of(incident.getSeverity().name(), incident.getStatus().name()))
                        .ctaLabel("Ouvrir l'incident")
                        .recommendation("Valider la communication et le pilotage global autour de cet incident.")
                        .whyMatters("Un incident deja ouvert change la lecture du portefeuille et la coordination manager.")
                        .signalKind("incident")
                        .incidentId(incident.getId())
                        .serviceId(incident.getService() != null ? incident.getService().getId() : null)
                        .serviceName(incident.getService() != null ? incident.getService().getName() : null)
                        .status(incident.getStatus().name())
                        .build()));

        Set<String> seenKeys = signals.stream()
                .map(signal -> signal.getServiceId() != null ? "service:" + signal.getServiceId() : signal.getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (TicketAiContext context : ticketContexts) {
            ManagerCopilotScoreResponseDto.ResultDto result = scoreBundle.resultsByCaseId().get(caseId(context));
            if (result == null) {
                continue;
            }
            boolean shouldRaiseIncident = "OPEN_INCIDENT".equalsIgnoreCase(result.getPredictedAction())
                    || context.probableMassIncident()
                    || context.similarTicketCount() >= 3;
            if (!shouldRaiseIncident) {
                continue;
            }

            String key = "service:" + context.service().getId();
            if (seenKeys.contains(key)) {
                continue;
            }
            seenKeys.add(key);

            String incidentTitle = context.massIncidentCandidate() != null
                    ? safeText(context.massIncidentCandidate().getLikelyIncidentTitle())
                    : context.service().getName() + " montre un faisceau de tickets";

            signals.add(ManagerCopilotDashboardResponse.SignalDto.builder()
                    .id("incident-signal-" + context.ticket().getId())
                    .eyebrow("Incident probable")
                    .title(incidentTitle)
                    .description(safeText(result.getReasoning()))
                    .href("/health?serviceId=" + context.service().getId())
                    .tone(context.service().getStatus() == ServiceStatus.DOWN ? "critical" : "warning")
                    .confidence(normalizeConfidence(result))
                    .meta(context.service().getName() + " - " + (int) context.similarTicketCount() + " ticket(s) similaires")
                    .tags(compactTags(
                            actionLabel(result.getPredictedAction()),
                            context.service().getStatus().name(),
                            context.serviceCriticality()
                    ))
                    .ctaLabel("Voir la supervision")
                    .recommendation(context.massIncidentCandidate() != null
                            ? safeText(context.massIncidentCandidate().getRecommendation())
                            : "Verifier s'il faut ouvrir un incident global et centraliser la communication.")
                    .whyMatters("Plusieurs tickets semblent converger vers une cause commune sur un service degrade.")
                    .signalKind("incident")
                    .ticketId(context.ticket().getId())
                    .ticketNumber(context.ticket().getTicketNumber())
                    .serviceId(context.service().getId())
                    .serviceName(context.service().getName())
                    .confidenceScore(result.getConfidenceScore())
                    .inferenceMode(result.getInferenceMode())
                    .modelVersion(result.getModelVersion())
                    .predictedAction(result.getPredictedAction())
                    .featureSummary(safeList(result.getFeatureSummary()))
                    .nearestExamples(toNearestExamples(result))
                    .status(context.ticket().getStatus().name())
                    .build());
        }

        return signals.stream()
                .sorted(signalComparator())
                .limit(MAX_INCIDENT_SIGNALS)
                .toList();
    }

    private List<ManagerCopilotDashboardResponse.SignalDto> buildAssignmentSignals(
            List<TicketAiContext> ticketContexts,
            ScoreBundle scoreBundle
    ) {
        return ticketContexts.stream()
                .map(context -> {
                    ManagerCopilotScoreResponseDto.ResultDto result = scoreBundle.resultsByCaseId().get(caseId(context));
                    if (result == null
                            || !"REASSIGN".equalsIgnoreCase(result.getPredictedAction())
                            || context.suggestedAgent() == null) {
                        return null;
                    }

                    return ManagerCopilotDashboardResponse.SignalDto.builder()
                            .id("assignment-" + context.ticket().getId())
                            .eyebrow(context.ticket().getTicketNumber())
                            .title("Reaffecter vers " + context.suggestedAgent().agentName())
                            .description(safeText(result.getReasoning()))
                            .href("/tickets/" + context.ticket().getId() + "?drawerFocus=assign")
                            .tone(context.ticket().getPriority() == TicketPriority.CRITICAL ? "critical" : "info")
                            .confidence(normalizeConfidence(result))
                            .meta(context.service().getName() + " - charge proposee " + context.suggestedAgent().activeTickets() + " ticket(s)")
                            .tags(compactTags(
                                    actionLabel(result.getPredictedAction()),
                                    context.ticket().getPriority().name(),
                                    "Charge " + (int) context.agentOpenTicketCount()
                            ))
                            .ctaLabel("Preparer l'affectation")
                            .recommendation("Valider la reaffectation vers " + context.suggestedAgent().agentName() + " pour lisser la charge.")
                            .whyMatters("La recommendation supervisee privilegie un agent moins charge pour proteger le MTTR equipe.")
                            .signalKind("assignment")
                            .ticketId(context.ticket().getId())
                            .ticketNumber(context.ticket().getTicketNumber())
                            .serviceId(context.service().getId())
                            .serviceName(context.service().getName())
                            .priority(context.ticket().getPriority().name())
                            .status(context.ticket().getStatus().name())
                            .recommendedAgent(context.suggestedAgent().agentName())
                            .recommendedAgentId(context.suggestedAgent().agentId())
                            .confidenceScore(result.getConfidenceScore())
                            .inferenceMode(result.getInferenceMode())
                            .modelVersion(result.getModelVersion())
                            .predictedAction(result.getPredictedAction())
                            .featureSummary(safeList(result.getFeatureSummary()))
                            .nearestExamples(toNearestExamples(result))
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(signalComparator())
                .limit(MAX_ASSIGNMENT_SIGNALS)
                .toList();
    }

    private List<ManagerCopilotDashboardResponse.SignalDto> buildSlaAlertSignals(
            List<TicketAiContext> ticketContexts,
            ScoreBundle scoreBundle
    ) {
        return ticketContexts.stream()
                .filter(context -> context.slaBreached()
                        || context.slaRemainingMinutes() <= 90
                        || context.ticket().isSlaWarning())
                .sorted(Comparator.comparingDouble(TicketAiContext::slaRemainingMinutes))
                .map(context -> {
                    ManagerCopilotScoreResponseDto.ResultDto result = scoreBundle.resultsByCaseId().get(caseId(context));
                    return ManagerCopilotDashboardResponse.SignalDto.builder()
                            .id("sla-" + context.ticket().getId())
                            .eyebrow(context.ticket().getTicketNumber())
                            .title(context.ticket().getTitle())
                            .description(buildSlaDescription(context))
                            .href("/tickets/" + context.ticket().getId() + "?drawerTab=sla")
                            .tone(context.slaBreached() ? "critical" : "warning")
                            .confidence(result != null ? normalizeConfidence(result) : "medium")
                            .meta(context.service().getName())
                            .tags(compactTags(
                                    context.ticket().getPriority().name(),
                                    context.slaBreached() ? "Hors SLA" : "SLA a surveiller"
                            ))
                            .ctaLabel("Ouvrir la vue SLA")
                            .recommendation(buildSlaRecommendation(context, result))
                            .whyMatters("Une decision manager prise avant la rupture SLA protege le client et le reporting.")
                            .signalKind("sla")
                            .ticketId(context.ticket().getId())
                            .ticketNumber(context.ticket().getTicketNumber())
                            .serviceId(context.service().getId())
                            .serviceName(context.service().getName())
                            .priority(context.ticket().getPriority().name())
                            .status(context.ticket().getStatus().name())
                            .confidenceScore(result != null ? result.getConfidenceScore() : null)
                            .inferenceMode(result != null ? result.getInferenceMode() : null)
                            .modelVersion(result != null ? result.getModelVersion() : null)
                            .predictedAction(result != null ? result.getPredictedAction() : null)
                            .featureSummary(result != null ? safeList(result.getFeatureSummary()) : buildFeatureSummary(context))
                            .nearestExamples(result != null ? toNearestExamples(result) : List.of())
                            .build();
                })
                .limit(MAX_SLA_ALERTS)
                .toList();
    }

    private ManagerCopilotDashboardResponse.SignalDto buildTicketSignal(
            TicketAiContext context,
            ManagerCopilotScoreResponseDto.ResultDto result
    ) {
        String predictedAction = result != null ? result.getPredictedAction() : "MONITOR";
        String tone = deriveTicketTone(context, predictedAction);

        return ManagerCopilotDashboardResponse.SignalDto.builder()
                .id("ticket-" + context.ticket().getId())
                .eyebrow(context.ticket().getTicketNumber())
                .title(context.ticket().getTitle())
                .description(result != null ? safeText(result.getReasoning()) : buildTicketDescription(context))
                .href("/tickets/" + context.ticket().getId())
                .tone(tone)
                .confidence(result != null ? normalizeConfidence(result) : "medium")
                .meta(context.service().getName() + " - " + context.ticket().getStatus().name())
                .tags(compactTags(
                        context.ticket().getPriority().name(),
                        context.service().getStatus().name(),
                        actionLabel(predictedAction)
                ))
                .ctaLabel("Ouvrir le ticket")
                .recommendation(buildTicketRecommendation(context, predictedAction))
                .whyMatters(buildTicketWhyMatters(context, predictedAction))
                .signalKind("ticket")
                .ticketId(context.ticket().getId())
                .ticketNumber(context.ticket().getTicketNumber())
                .serviceId(context.service().getId())
                .serviceName(context.service().getName())
                .priority(context.ticket().getPriority().name())
                .status(context.ticket().getStatus().name())
                .confidenceScore(result != null ? result.getConfidenceScore() : null)
                .inferenceMode(result != null ? result.getInferenceMode() : "degraded_rules")
                .modelVersion(result != null ? result.getModelVersion() : "manager-copilot-knn-1.0.0")
                .predictedAction(predictedAction)
                .featureSummary(result != null ? safeList(result.getFeatureSummary()) : buildFeatureSummary(context))
                .nearestExamples(result != null ? toNearestExamples(result) : List.of())
                .build();
    }

    private List<ManagerCopilotDashboardResponse.QuickActionDto> buildQuickActions(
            List<ManagerCopilotDashboardResponse.SignalDto> priorityTickets,
            List<ManagerCopilotDashboardResponse.SignalDto> probableIncidents,
            List<ManagerCopilotDashboardResponse.SignalDto> slaAlerts,
            List<TelecomService> servicesAtRisk
    ) {
        List<ManagerCopilotDashboardResponse.QuickActionDto> actions = new ArrayList<>();

        if (!priorityTickets.isEmpty()) {
            actions.add(ManagerCopilotDashboardResponse.QuickActionDto.builder()
                    .id("open-priority-ticket")
                    .label("Traiter le ticket cle")
                    .description("Ouvre immediatement le ticket recommande en tete de liste.")
                    .href(priorityTickets.get(0).getHref())
                    .tone(priorityTickets.get(0).getTone())
                    .build());
        }
        if (!slaAlerts.isEmpty()) {
            actions.add(ManagerCopilotDashboardResponse.QuickActionDto.builder()
                    .id("review-sla")
                    .label("Voir les SLA critiques")
                    .description("Passe en revue les tickets deja hors SLA ou proches de rupture.")
                    .href("/tickets?slaStatus=BREACHED")
                    .tone("critical")
                    .build());
        }
        if (!probableIncidents.isEmpty()) {
            actions.add(ManagerCopilotDashboardResponse.QuickActionDto.builder()
                    .id("review-incidents")
                    .label("Controler les incidents")
                    .description("Valide s'il faut ouvrir ou relier un incident cote supervision.")
                    .href("/incidents")
                    .tone("warning")
                    .build());
        }
        if (!servicesAtRisk.isEmpty()) {
            actions.add(ManagerCopilotDashboardResponse.QuickActionDto.builder()
                    .id("review-health")
                    .label("Verifier les services")
                    .description("Inspecte les services degrades ou en panne dans la supervision.")
                    .href("/health")
                    .tone("info")
                    .build());
        }

        actions.add(ManagerCopilotDashboardResponse.QuickActionDto.builder()
                .id("open-reports")
                .label("Preparer la synthese")
                .description("Accede au reporting pour consolider le point manager du jour.")
                .href("/reports")
                .tone("neutral")
                .build());

        return actions.stream().limit(MAX_QUICK_ACTIONS).toList();
    }

    private List<ManagerCopilotDashboardResponse.MetricDto> buildMetrics(
            List<ManagerCopilotDashboardResponse.SignalDto> priorityTickets,
            List<ManagerCopilotDashboardResponse.SignalDto> probableIncidents,
            List<ManagerCopilotDashboardResponse.SignalDto> assignments,
            List<ManagerCopilotDashboardResponse.SignalDto> slaAlerts,
            List<TelecomService> servicesAtRisk
    ) {
        return List.of(
                metric("Arbitrages", priorityTickets.size(), containsTone(priorityTickets, "critical") ? "critical" : "info"),
                metric("SLA sous tension", slaAlerts.size(), containsTone(slaAlerts, "critical") ? "critical" : "warning"),
                metric("Incidents probables", probableIncidents.size(), containsTone(probableIncidents, "critical") ? "critical" : "warning"),
                metric("Services a risque", servicesAtRisk.size(), servicesAtRisk.isEmpty() ? "success" : "warning"),
                metric("Reassignations", assignments.size(), assignments.isEmpty() ? "neutral" : "info")
        );
    }

    private ManagerCopilotDashboardResponse.MetricDto metric(String label, int value, String tone) {
        return ManagerCopilotDashboardResponse.MetricDto.builder()
                .label(label)
                .value(String.valueOf(value))
                .tone(tone)
                .build();
    }

    private String buildSummary(
            List<ManagerCopilotDashboardResponse.SignalDto> priorityTickets,
            List<ManagerCopilotDashboardResponse.SignalDto> probableIncidents,
            List<ManagerCopilotDashboardResponse.SignalDto> slaAlerts,
            List<TelecomService> servicesAtRisk,
            int activeTicketCount
    ) {
        long criticalSlaCount = slaAlerts.stream().filter(signal -> "critical".equalsIgnoreCase(signal.getTone())).count();
        long criticalPriorityCount = priorityTickets.stream().filter(signal -> "critical".equalsIgnoreCase(signal.getTone())).count();

        if (criticalSlaCount > 0) {
            return criticalSlaCount + " ticket(s) necessitent un arbitrage SLA immediat, avec "
                    + servicesAtRisk.size() + " service(s) sous surveillance renforcee.";
        }
        if (!probableIncidents.isEmpty()) {
            return probableIncidents.size()
                    + " faisceau(x) incident ressort(ent) de la supervision. Priorisez les "
                    + priorityTickets.size() + " tickets les plus structurants avant escalation.";
        }
        if (criticalPriorityCount > 0) {
            return criticalPriorityCount + " ticket(s) hautement prioritaires ressort(ent) aujourd'hui, dans un portefeuille de "
                    + activeTicketCount + " tickets actifs.";
        }
        return "Supervision stable: " + activeTicketCount + " tickets actifs, "
                + slaAlerts.size() + " alerte(s) SLA et "
                + servicesAtRisk.size() + " service(s) a controler.";
    }

    private List<ManagerCopilotDashboardResponse.DecisionAreaDto> buildDecisionAreas(
            String summary,
            List<ManagerCopilotDashboardResponse.SignalDto> priorityTickets,
            List<ManagerCopilotDashboardResponse.SignalDto> probableIncidents,
            List<ManagerCopilotDashboardResponse.SignalDto> assignments,
            List<ManagerCopilotDashboardResponse.SignalDto> slaAlerts
    ) {
        return List.of(
                decisionArea(
                        "priority",
                        "Priorisation",
                        priorityTickets.isEmpty()
                                ? "Aucun dossier n'appelle de repriorisation immediate"
                                : priorityTickets.size() + " dossier(s) appellent un arbitrage rapide",
                        firstWhy(priorityTickets, "Le copilote met en avant les tickets ou impact metier, risque SLA et contexte service se renforcent."),
                        dominantTone(priorityTickets),
                        dominantConfidence(priorityTickets)
                ),
                decisionArea(
                        "load-balancing",
                        "Charge equipe",
                        assignments.isEmpty()
                                ? "Aucune reallocation urgente n'est detectee"
                                : assignments.size() + " repartition(s) suggeree(s) pour lisser la charge",
                        firstWhy(assignments, "Les recommandations d'affectation cherchent a absorber le flux sans degrader le temps de resolution."),
                        dominantTone(assignments),
                        dominantConfidence(assignments)
                ),
                decisionArea(
                        "incident-watch",
                        "Incident global",
                        probableIncidents.isEmpty()
                                ? "Aucun faisceau critique ne justifie un incident global"
                                : probableIncidents.size() + " signal(s) convergent vers une cause commune",
                        firstWhy(probableIncidents, "Le copilote rapproche tickets, services et incidents actifs pour eviter une reaction trop tardive."),
                        dominantTone(probableIncidents),
                        dominantConfidence(probableIncidents)
                ),
                decisionArea(
                        "sla-prevention",
                        "Risque SLA",
                        slaAlerts.isEmpty()
                                ? "Le portefeuille ne montre pas de derive SLA immediate"
                                : slaAlerts.size() + " ticket(s) sont a proteger avant rupture",
                        firstWhy(slaAlerts, "Les alertes font ressortir les dossiers ou une decision manager peut encore eviter escalation et rupture."),
                        dominantTone(slaAlerts),
                        dominantConfidence(slaAlerts)
                ),
                decisionArea(
                        "executive-brief",
                        "Synthese manager",
                        "Point de situation pret a partager",
                        summary,
                        dominantTone(combineSignals(priorityTickets, probableIncidents, assignments, slaAlerts)),
                        dominantConfidence(combineSignals(priorityTickets, probableIncidents, assignments, slaAlerts))
                )
        );
    }

    private ManagerCopilotDashboardResponse.DecisionAreaDto decisionArea(
            String id,
            String title,
            String headline,
            String description,
            String tone,
            String confidence
    ) {
        return ManagerCopilotDashboardResponse.DecisionAreaDto.builder()
                .id(id)
                .title(title)
                .headline(headline)
                .description(description)
                .tone(tone)
                .confidence(confidence)
                .build();
    }

    private List<ManagerCopilotDashboardResponse.WhyCardDto> buildWhyCards(
            List<ManagerCopilotDashboardResponse.SignalDto> priorityTickets,
            List<ManagerCopilotDashboardResponse.SignalDto> probableIncidents,
            List<ManagerCopilotDashboardResponse.SignalDto> assignments,
            List<ManagerCopilotDashboardResponse.SignalDto> slaAlerts
    ) {
        return List.of(
                whyCard(
                        "why-now",
                        "Fenetre d'action",
                        !slaAlerts.isEmpty()
                                ? "Une decision rapide peut encore eviter une rupture SLA ou contenir une escalation inutile."
                                : !priorityTickets.isEmpty()
                                    ? "Une priorisation precoce reduit le bruit operationnel et concentre l'equipe sur les dossiers structurants."
                                    : "Le portefeuille reste maitrise, ce qui laisse de la marge pour arbitrer les sujets a plus forte valeur.",
                        dominantTone(combineSignals(slaAlerts, priorityTickets))
                ),
                whyCard(
                        "why-balance",
                        "Capacite equipe",
                        !assignments.isEmpty()
                                ? "Repartir plus tot les dossiers sensibles reduit les points de congestion et aide a tenir le MTTR."
                                : "Aucune tension forte de capacite n'est detectee dans la file a cet instant.",
                        dominantTone(assignments)
                ),
                whyCard(
                        "why-correlate",
                        "Lecture transverse",
                        !probableIncidents.isEmpty()
                                ? "Relier plusieurs tickets a une cause commune accelere la communication et evite les traitements en silo."
                                : "Les signaux actuels restent plutot isoles, sans indice fort d'un incident transverse.",
                        dominantTone(probableIncidents)
                )
        );
    }

    private ManagerCopilotDashboardResponse.WhyCardDto whyCard(String id, String title, String description, String tone) {
        return ManagerCopilotDashboardResponse.WhyCardDto.builder()
                .id(id)
                .title(title)
                .description(description)
                .tone(tone)
                .build();
    }

    private String deriveTicketTone(TicketAiContext context, String predictedAction) {
        if (context.slaBreached() || context.ticket().getPriority() == TicketPriority.CRITICAL || "ESCALATE".equalsIgnoreCase(predictedAction)) {
            return "critical";
        }
        if (context.serviceDegraded()
                || context.ticket().getPriority() == TicketPriority.HIGH
                || "PREPARE_SUMMARY".equalsIgnoreCase(predictedAction)
                || "OPEN_INCIDENT".equalsIgnoreCase(predictedAction)) {
            return "warning";
        }
        if ("REASSIGN".equalsIgnoreCase(predictedAction)) {
            return "info";
        }
        return "info";
    }

    private String buildTicketDescription(TicketAiContext context) {
        List<String> reasons = new ArrayList<>();
        if (context.slaBreached()) {
            reasons.add("SLA depasse");
        } else if (context.slaRemainingMinutes() <= 90) {
            reasons.add("SLA proche");
        }
        if (context.ticket().getPriority() == TicketPriority.CRITICAL) {
            reasons.add("Priorite critique");
        } else if (context.ticket().getPriority() == TicketPriority.HIGH) {
            reasons.add("Priorite haute");
        }
        if (context.serviceDegraded()) {
            reasons.add("Service degrade");
        }
        if (context.incidentLinked()) {
            reasons.add("Incident ou cluster relie");
        }
        return reasons.isEmpty() ? "Ticket a surveiller dans la file manager." : String.join(" - ", reasons);
    }

    private String buildTicketRecommendation(TicketAiContext context, String predictedAction) {
        return switch (safeText(predictedAction)) {
            case "ESCALATE" -> "Escalader rapidement ce dossier et securiser la communication client.";
            case "PREPARE_SUMMARY" -> "Preparer une synthese manager avant arbitrage ou communication executive.";
            case "OPEN_INCIDENT" -> "Verifier s'il faut rattacher ou ouvrir un incident global autour de ce service.";
            case "REASSIGN" -> "Reevaluer l'affectation actuelle pour absorber la charge sans delai supplementaire.";
            default -> "Conserver ce ticket dans le radar manager et verifier son prochain jalon.";
        };
    }

    private String buildTicketWhyMatters(TicketAiContext context, String predictedAction) {
        return switch (safeText(predictedAction)) {
            case "ESCALATE" -> "Le delai contractuel et l'impact metier combinent un risque eleve pour le client.";
            case "PREPARE_SUMMARY" -> "Le dossier concentre assez de signaux pour meriter une lecture manager partageable.";
            case "OPEN_INCIDENT" -> "Plusieurs tickets pourraient dependre d'une meme cause racine sur un service degrade.";
            case "REASSIGN" -> "La charge agent actuelle risque de ralentir ce dossier sans benefice operationnel.";
            default -> "Ce ticket ressort comme un bon candidat d'arbitrage au-dessus du bruit operationnel moyen.";
        };
    }

    private String buildSlaDescription(TicketAiContext context) {
        if (context.slaBreached()) {
            return "Le ticket est deja hors SLA"
                    + (context.ticket().getAssignedTo() != null ? " malgre l'affectation actuelle." : ".");
        }
        if (context.slaRemainingMinutes() > 0) {
            return "Temps restant estime: " + formatMinutes(context.slaRemainingMinutes()) + " avant depassement.";
        }
        return "SLA consomme a surveiller de pres, validation manager recommandee.";
    }

    private String buildSlaRecommendation(
            TicketAiContext context,
            ManagerCopilotScoreResponseDto.ResultDto result
    ) {
        String predictedAction = result != null ? result.getPredictedAction() : null;
        if ("ESCALATE".equalsIgnoreCase(predictedAction)) {
            return "Escalader ou reforcer la coordination avant nouvelle derive client.";
        }
        if ("REASSIGN".equalsIgnoreCase(predictedAction) && context.suggestedAgent() != null) {
            return "Etudier une reaffectation vers " + context.suggestedAgent().agentName() + " pour proteger le SLA.";
        }
        return "Decider d'une escalation, d'une reaffectation ou d'un suivi renforce avant rupture.";
    }

    private List<String> buildFeatureSummary(TicketAiContext context) {
        List<String> summary = new ArrayList<>();
        if (context.ticket().getPriority() == TicketPriority.CRITICAL || context.ticket().getPriority() == TicketPriority.HIGH) {
            summary.add("Priorite " + context.ticket().getPriority().name());
        }
        if (context.slaBreached()) {
            summary.add("SLA depasse de " + Math.abs((int) context.slaRemainingMinutes()) + " min");
        } else if (context.slaRemainingMinutes() <= 90) {
            summary.add("SLA restant " + Math.max(0, (int) context.slaRemainingMinutes()) + " min");
        }
        if (context.serviceDegraded()) {
            summary.add("Service degrade ou indisponible");
        }
        if (context.similarTicketCount() >= 2) {
            summary.add((int) context.similarTicketCount() + " ticket(s) similaires");
        }
        if (context.probableMassIncident()) {
            summary.add("Signal incident massif probable");
        }
        if (context.duplicateConfidence() >= 0.7) {
            summary.add("Score doublon eleve (" + String.format(Locale.ROOT, "%.2f", context.duplicateConfidence()) + ")");
        }
        if (context.frustrationScore() >= 0.7) {
            summary.add("Frustration client elevee (" + String.format(Locale.ROOT, "%.2f", context.frustrationScore()) + ")");
        }
        if (context.agentOpenTicketCount() >= 7) {
            summary.add("Charge agent elevee (" + (int) context.agentOpenTicketCount() + " tickets)");
        }
        if (context.incidentLinked()) {
            summary.add("Incident deja relie au service");
        }
        if (summary.isEmpty()) {
            summary.add("Aucun signal dominant au-dessus du bruit operationnel");
        }
        return summary;
    }

    private List<ManagerCopilotDashboardResponse.NearestExampleDto> toNearestExamples(
            ManagerCopilotScoreResponseDto.ResultDto result
    ) {
        return safeList(result.getNearestExamples()).stream()
                .map(example -> ManagerCopilotDashboardResponse.NearestExampleDto.builder()
                        .exampleId(example.getExampleId())
                        .label(example.getLabel())
                        .title(example.getTitle())
                        .summary(example.getSummary())
                        .recommendation(example.getRecommendation())
                        .distance(example.getDistance())
                        .featureSummary(safeList(example.getFeatureSummary()))
                        .build())
                .toList();
    }

    private Comparator<ManagerCopilotDashboardResponse.SignalDto> signalComparator() {
        return Comparator
                .comparingInt((ManagerCopilotDashboardResponse.SignalDto signal) -> toneRank(signal.getTone()))
                .thenComparingInt(signal -> confidenceRank(signal.getConfidence()))
                .thenComparing(signal -> signal.getConfidenceScore() != null ? -signal.getConfidenceScore() : 0.0);
    }

    private int incidentSeverityRank(Severity severity) {
        return switch (severity) {
            case CRITICAL -> 0;
            case MAJOR -> 1;
            case MINOR -> 2;
            case LOW -> 3;
        };
    }

    private int toneRank(String tone) {
        return switch (safeText(tone)) {
            case "critical" -> 0;
            case "warning" -> 1;
            case "info" -> 2;
            case "success" -> 3;
            default -> 4;
        };
    }

    private int confidenceRank(String confidence) {
        return switch (safeText(confidence)) {
            case "high" -> 0;
            case "medium" -> 1;
            default -> 2;
        };
    }

    private int countCriticalSignals(List<ManagerCopilotDashboardResponse.SignalDto>... groups) {
        int total = 0;
        for (List<ManagerCopilotDashboardResponse.SignalDto> group : groups) {
            total += (int) group.stream().filter(signal -> "critical".equalsIgnoreCase(signal.getTone())).count();
        }
        return total;
    }

    private boolean containsTone(List<ManagerCopilotDashboardResponse.SignalDto> signals, String tone) {
        return signals.stream().anyMatch(signal -> tone.equalsIgnoreCase(signal.getTone()));
    }

    @SafeVarargs
    private final List<ManagerCopilotDashboardResponse.SignalDto> combineSignals(
            List<ManagerCopilotDashboardResponse.SignalDto>... groups
    ) {
        List<ManagerCopilotDashboardResponse.SignalDto> combined = new ArrayList<>();
        for (List<ManagerCopilotDashboardResponse.SignalDto> group : groups) {
            combined.addAll(group);
        }
        return combined;
    }

    private String dominantTone(List<ManagerCopilotDashboardResponse.SignalDto> signals) {
        if (containsTone(signals, "critical")) {
            return "critical";
        }
        if (containsTone(signals, "warning")) {
            return "warning";
        }
        if (containsTone(signals, "info")) {
            return "info";
        }
        if (containsTone(signals, "success")) {
            return "success";
        }
        return "neutral";
    }

    private String dominantConfidence(List<ManagerCopilotDashboardResponse.SignalDto> signals) {
        if (signals.stream().anyMatch(signal -> "high".equalsIgnoreCase(signal.getConfidence()))) {
            return "high";
        }
        if (signals.stream().anyMatch(signal -> "medium".equalsIgnoreCase(signal.getConfidence()))) {
            return "medium";
        }
        return "low";
    }

    private String firstWhy(List<ManagerCopilotDashboardResponse.SignalDto> signals, String fallback) {
        return signals.stream()
                .map(ManagerCopilotDashboardResponse.SignalDto::getWhyMatters)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(fallback);
    }

    private String normalizeConfidence(ManagerCopilotScoreResponseDto.ResultDto result) {
        if (result == null) {
            return "low";
        }
        if (result.getConfidenceLevel() != null && !result.getConfidenceLevel().isBlank()) {
            return result.getConfidenceLevel().toLowerCase(Locale.ROOT);
        }
        return confidenceLevel(result.getConfidenceScore() != null ? result.getConfidenceScore() : 0.0);
    }

    private String confidenceLevel(double score) {
        if (score >= 0.75) {
            return "high";
        }
        if (score >= 0.5) {
            return "medium";
        }
        return "low";
    }

    private String actionLabel(String predictedAction) {
        return switch (safeText(predictedAction)) {
            case "ESCALATE" -> "Escalader";
            case "REASSIGN" -> "Reassigner";
            case "OPEN_INCIDENT" -> "Ouvrir incident";
            case "PREPARE_SUMMARY" -> "Preparer synthese";
            default -> "Surveiller";
        };
    }

    private List<String> compactTags(String... values) {
        return Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .limit(4)
                .toList();
    }

    private String formatMinutes(double totalMinutes) {
        if (totalMinutes <= 0) {
            return "echeance immediate";
        }
        int hours = (int) totalMinutes / 60;
        int minutes = (int) totalMinutes % 60;
        if (hours <= 0) {
            return minutes + " min";
        }
        if (minutes == 0) {
            return hours + " h";
        }
        return hours + " h " + minutes + " min";
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String safeText(String value) {
        return value != null ? value : "";
    }

    private <T> List<T> safeList(List<T> value) {
        return value != null ? value : List.of();
    }

    private <T> Collection<T> safeCollection(Collection<T> value) {
        return value != null ? value : List.of();
    }

    private String caseId(TicketAiContext context) {
        return "ticket-" + context.ticket().getId();
    }

    private record TicketAiContext(
            Ticket ticket,
            TelecomService service,
            int baseScore,
            boolean incidentLinked,
            DuplicateDetectionResponseDto duplicateResponse,
            SentimentAnalysisResponseDto sentimentResponse,
            MassiveIncidentCandidateDto massIncidentCandidate,
            double ageHours,
            double slaRemainingMinutes,
            boolean slaBreached,
            boolean serviceDegraded,
            double similarTicketCount,
            boolean probableMassIncident,
            double duplicateConfidence,
            double frustrationScore,
            double backlogOpenTickets,
            double agentOpenTicketCount,
            String businessImpact,
            String serviceCriticality,
            boolean assigned,
            AgentRecommendation suggestedAgent
    ) {
    }

    private record AgentRecommendation(Long agentId, String agentName, long activeTickets) {
    }

    private record ScoreBundle(
            Map<String, ManagerCopilotScoreResponseDto.ResultDto> resultsByCaseId,
            boolean knnBacked,
            String modelVersion,
            String inferenceMode,
            double confidenceScore,
            List<String> reasoningSteps
    ) {
    }
}
