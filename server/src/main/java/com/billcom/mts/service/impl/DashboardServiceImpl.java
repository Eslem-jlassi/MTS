package com.billcom.mts.service.impl;

import com.billcom.mts.dto.dashboard.DashboardStats;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.IncidentRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import com.billcom.mts.dto.dashboard.DashboardStats.DailyTrendPoint;
import com.billcom.mts.dto.dashboard.DashboardStats.PreviousPeriodSnapshot;

/**
 * Dashboard statistics service — fully populated for all roles.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final IncidentRepository incidentRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @Override
    public DashboardStats getDashboardStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        // Count by status
        Map<TicketStatus, Long> statusCounts = getStatusCounts();
        
        // Count by priority
        Map<TicketPriority, Long> priorityCounts = getPriorityCounts();

        // Calculate totals
        long totalTickets = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        long activeTickets = statusCounts.entrySet().stream()
            .filter(e -> e.getKey() != TicketStatus.CLOSED && e.getKey() != TicketStatus.CANCELLED)
            .mapToLong(Map.Entry::getValue)
            .sum();

        // SLA and resolution stats
        long slaBreachedCount = ticketRepository.countSlaBreached();
        long unassignedCount = ticketRepository.countUnassigned();
        long createdToday = ticketRepository.countCreatedBetween(startOfDay, endOfDay);
        long resolvedToday = ticketRepository.countResolvedBetween(startOfDay, endOfDay);
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        long resolvedThisMonth = ticketRepository.countResolvedBetween(startOfMonth, endOfDay);
        
        Double avgResolutionHours = ticketRepository.getAverageResolutionTimeHours();
        Double slaComplianceRate = calculateSlaComplianceRate();

        long activeIncidentsCount = countIncidentByStatus(IncidentStatus.OPEN)
            + countIncidentByStatus(IncidentStatus.IN_PROGRESS);

        // Grouped data for charts
        Map<String, Long> ticketsByStatus = statusCounts.entrySet().stream()
            .collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue));

        Map<String, Long> ticketsByPriority = priorityCounts.entrySet().stream()
            .collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue));

        Map<String, Long> ticketsByService = getServiceCounts();

        // Agent stats
        List<DashboardStats.AgentStats> agentStatsList = buildAgentStats();

        // Recent tickets (last 10)
        List<DashboardStats.RecentTicket> recentTickets = ticketRepository.findTop10ByOrderByCreatedAtDesc()
            .stream()
            .map(t -> DashboardStats.RecentTicket.builder()
                .id(t.getId())
                .ticketNumber(t.getTicketNumber())
                .title(t.getTitle())
                .status(t.getStatus().name())
                .priority(t.getPriority().name())
                .clientName(t.getClient() != null ? t.getClient().getUser().getFullName() : null)
                .createdAt(t.getCreatedAt() != null ? t.getCreatedAt().format(DATE_FMT) : null)
                .build())
            .collect(Collectors.toList());

        // Critical tickets
        List<DashboardStats.CriticalTicket> criticalList = ticketRepository.findActiveCriticalTickets()
            .stream()
            .map(t -> {
                long remaining = t.getDeadline() != null 
                    ? ChronoUnit.MINUTES.between(LocalDateTime.now(), t.getDeadline()) : 0;
                return DashboardStats.CriticalTicket.builder()
                    .id(t.getId())
                    .ticketNumber(t.getTicketNumber())
                    .title(t.getTitle())
                    .serviceName(t.getService() != null ? t.getService().getName() : null)
                    .assignedTo(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "Non assigné")
                    .slaRemainingMinutes(remaining)
                    .breached(remaining < 0 || (t.getBreachedSla() != null && t.getBreachedSla()))
                    .build();
            })
            .collect(Collectors.toList());

        // Premium: trend series (7j / 30j) and previous period comparison
        List<DailyTrendPoint> trend7 = buildDailyTrend(7);
        List<DailyTrendPoint> trend30 = buildDailyTrend(30);
        PreviousPeriodSnapshot previous = buildPreviousPeriodSnapshot();

        return DashboardStats.builder()
            .totalTickets(totalTickets)
            .activeTickets(activeTickets)
            .newTickets(statusCounts.getOrDefault(TicketStatus.NEW, 0L))
            .inProgressTickets(statusCounts.getOrDefault(TicketStatus.IN_PROGRESS, 0L))
            .pendingTickets(statusCounts.getOrDefault(TicketStatus.PENDING, 0L))
            .resolvedTickets(statusCounts.getOrDefault(TicketStatus.RESOLVED, 0L))
            .closedTickets(statusCounts.getOrDefault(TicketStatus.CLOSED, 0L))
            .criticalCount(priorityCounts.getOrDefault(TicketPriority.CRITICAL, 0L))
            .highCount(priorityCounts.getOrDefault(TicketPriority.HIGH, 0L))
            .mediumCount(priorityCounts.getOrDefault(TicketPriority.MEDIUM, 0L))
            .lowCount(priorityCounts.getOrDefault(TicketPriority.LOW, 0L))
            .slaBreachedCount(slaBreachedCount)
            .unassignedCount(unassignedCount)
            .createdToday(createdToday)
            .resolvedToday(resolvedToday)
            .resolvedThisMonth(resolvedThisMonth)
            .averageResolutionTimeHours(avgResolutionHours != null ? avgResolutionHours : 0.0)
            .slaComplianceRate(slaComplianceRate != null ? slaComplianceRate : 1.0)
            .activeIncidentsCount(activeIncidentsCount)
            // Grouped data
            .ticketsByStatus(ticketsByStatus)
            .ticketsByPriority(ticketsByPriority)
            .ticketsByService(ticketsByService)
            .agentStats(agentStatsList)
            .recentTickets(recentTickets)
            .criticalTicketsList(criticalList)
            .trendLast7Days(trend7)
            .trendLast30Days(trend30)
            .previousPeriodSnapshot(previous)
            .build();
    }

    /**
     * Build daily trend data for the last N days (created, resolved per day).
     */
    private List<DailyTrendPoint> buildDailyTrend(int days) {
        List<DailyTrendPoint> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            LocalDateTime start = d.atStartOfDay();
            LocalDateTime end = start.plusDays(1);
            long created = ticketRepository.countCreatedBetween(start, end);
            long resolved = ticketRepository.countResolvedBetween(start, end);
            result.add(DailyTrendPoint.builder()
                .date(d.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .created(created)
                .resolved(resolved)
                .active(0L)
                .build());
        }
        return result;
    }

    /**
     * Build previous period snapshot (last month) for comparison.
     */
    private PreviousPeriodSnapshot buildPreviousPeriodSnapshot() {
        LocalDate now = LocalDate.now();
        LocalDate startLastMonth = now.minusMonths(1).withDayOfMonth(1);
        LocalDate endLastMonth = startLastMonth.plusMonths(1).minusDays(1);
        LocalDateTime start = startLastMonth.atStartOfDay();
        LocalDateTime end = endLastMonth.plusDays(1).atStartOfDay();

        long resolvedLastMonth = ticketRepository.countResolvedBetween(start, end);
        long createdLastMonth = ticketRepository.countCreatedBetween(start, end);

        return PreviousPeriodSnapshot.builder()
            .resolvedThisMonth(resolvedLastMonth)
            .activeTickets(0L)
            .totalTickets(createdLastMonth)
            .slaBreachedCount(0L)
            .build();
    }

    @Override
    public DashboardStats getAgentDashboardStats(Long agentId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        long assignedActive = ticketRepository.countActiveByAssignedTo(agentId);
        long resolvedToday = ticketRepository.countResolvedTodayByAgent(agentId, startOfDay, endOfDay);
        long slaBreached = ticketRepository.countSlaBreachedByAgent(agentId);

        return DashboardStats.builder()
            .activeTickets(assignedActive)
            .resolvedToday(resolvedToday)
            .slaBreachedCount(slaBreached)
            .build();
    }

    @Override
    public DashboardStats getClientDashboardStats(Long clientId) {
        long totalTickets = ticketRepository.countByClientId(clientId);
        long activeTickets = ticketRepository.countActiveByClientId(clientId);
        long resolvedTickets = ticketRepository.countResolvedByClientId(clientId);

        return DashboardStats.builder()
            .totalTickets(totalTickets)
            .activeTickets(activeTickets)
            .resolvedTickets(resolvedTickets)
            .build();
    }

    @Override
    public DashboardStats getMyDashboardStats(User currentUser) {
        return switch (currentUser.getRole()) {
            case ADMIN, MANAGER -> getDashboardStats();
            case AGENT -> getAgentDashboardStats(currentUser.getId());
            case CLIENT -> {
                Client client = clientRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new BadRequestException("User does not have a client profile"));
                yield getClientDashboardStats(client.getId());
            }
        };
    }

    // ========== Private Methods ==========

    private Map<TicketStatus, Long> getStatusCounts() {
        List<Object[]> results = ticketRepository.countByStatusGrouped();
        Map<TicketStatus, Long> countMap = new HashMap<>();
        for (Object[] row : results) {
            countMap.put((TicketStatus) row[0], (Long) row[1]);
        }
        return countMap;
    }

    private Map<TicketPriority, Long> getPriorityCounts() {
        List<Object[]> results = ticketRepository.countByPriorityGrouped();
        Map<TicketPriority, Long> countMap = new HashMap<>();
        for (Object[] row : results) {
            countMap.put((TicketPriority) row[0], (Long) row[1]);
        }
        return countMap;
    }

    private Map<String, Long> getServiceCounts() {
        List<Object[]> results = ticketRepository.countByServiceGrouped();
        Map<String, Long> countMap = new LinkedHashMap<>();
        for (Object[] row : results) {
            countMap.put((String) row[0], (Long) row[1]);
        }
        return countMap;
    }

    /**
     * Builds per-agent performance stats using repository aggregation queries.
     */
    private List<DashboardStats.AgentStats> buildAgentStats() {
        // Get assigned counts per agent
        Map<Long, Long> assignedCounts = new HashMap<>();
        for (Object[] row : ticketRepository.countByAgentGrouped()) {
            assignedCounts.put((Long) row[0], (Long) row[1]);
        }

        // Get avg resolution time per agent
        Map<Long, Double> avgResolution = new HashMap<>();
        for (Object[] row : ticketRepository.getAverageResolutionTimeByAgent()) {
            avgResolution.put((Long) row[0], row[1] != null ? ((Number) row[1]).doubleValue() : null);
        }

        // Merge all agent IDs
        Set<Long> agentIds = new HashSet<>();
        agentIds.addAll(assignedCounts.keySet());
        agentIds.addAll(avgResolution.keySet());

        List<DashboardStats.AgentStats> result = new ArrayList<>();
        for (Long agentId : agentIds) {
            User agent = userRepository.findById(agentId).orElse(null);
            if (agent == null || agent.getRole() != UserRole.AGENT) continue;

            long active = ticketRepository.countActiveByAssignedTo(agentId);

            result.add(DashboardStats.AgentStats.builder()
                .agentId(agentId)
                .agentName(agent.getFullName())
                .assignedTickets(assignedCounts.getOrDefault(agentId, 0L))
                .resolvedTickets(assignedCounts.getOrDefault(agentId, 0L) - active)
                .averageResolutionTimeHours(avgResolution.getOrDefault(agentId, 0.0))
                .build());
        }
        return result;
    }

    private Double calculateSlaComplianceRate() {
        long total = ticketRepository.countResolvedOrClosedTickets();
        if (total == 0) return 1.0;
        
        long breached = ticketRepository.countSlaBreachedResolvedTickets();
        return 1.0 - ((double) breached / total);
    }

    private long countIncidentByStatus(IncidentStatus status) {
        return incidentRepository != null ? incidentRepository.countByStatus(status) : 0L;
    }
}
