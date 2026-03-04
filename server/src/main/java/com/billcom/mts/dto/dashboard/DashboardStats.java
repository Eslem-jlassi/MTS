package com.billcom.mts.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Dashboard statistics response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {

    // ========== Ticket Counts ==========
    
    private Long totalTickets;
    private Long activeTickets;
    private Long newTickets;
    private Long inProgressTickets;
    private Long resolvedTickets;
    private Long closedTickets;
    private Long pendingTickets;

    // ========== Priority Counts ==========
    
    private Long criticalCount;
    private Long highCount;
    private Long mediumCount;
    private Long lowCount;

    // ========== SLA Stats ==========
    
    private Long slaBreachedCount;
    private Long unassignedCount;
    private Double slaComplianceRate;

    /** Nombre d'incidents actifs (supervision services). */
    private Long activeIncidentsCount;

    // ========== Performance ==========
    
    private Double averageResolutionTimeHours;
    private Long createdToday;
    private Long resolvedToday;
    /** Nombre de tickets résolus dans le mois en cours (pour KPI dashboard). */
    private Long resolvedThisMonth;

    // ========== Grouped Data (for charts) ==========
    
    private Map<String, Long> ticketsByStatus;
    private Map<String, Long> ticketsByPriority;
    private Map<String, Long> ticketsByService;
    private List<AgentStats> agentStats;

    // ========== Recent Activity ==========
    
    private List<RecentTicket> recentTickets;
    private List<CriticalTicket> criticalTicketsList;

    // ========== Premium: Comparison & Trends ==========
    
    /** Données par jour pour sparklines (7 derniers jours). */
    private List<DailyTrendPoint> trendLast7Days;
    /** Données par jour pour tendance 30j. */
    private List<DailyTrendPoint> trendLast30Days;
    /** Statistiques de la période précédente (ex: mois dernier) pour comparaison. */
    private PreviousPeriodSnapshot previousPeriodSnapshot;

    // ========== Nested Classes ==========

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTrendPoint {
        private String date;
        private Long created;
        private Long resolved;
        private Long active;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviousPeriodSnapshot {
        private Long resolvedThisMonth;
        private Long activeTickets;
        private Long totalTickets;
        private Long slaBreachedCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentStats {
        private Long agentId;
        private String agentName;
        private Long assignedTickets;
        private Long resolvedTickets;
        private Double averageResolutionTimeHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentTicket {
        private Long id;
        private String ticketNumber;
        private String title;
        private String status;
        private String priority;
        private String clientName;
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CriticalTicket {
        private Long id;
        private String ticketNumber;
        private String title;
        private String serviceName;
        private String assignedTo;
        private Long slaRemainingMinutes;
        private Boolean breached;
    }
}
