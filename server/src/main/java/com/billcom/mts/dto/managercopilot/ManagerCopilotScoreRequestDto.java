package com.billcom.mts.dto.managercopilot;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ManagerCopilotScoreRequestDto {

    @Builder.Default
    private Integer k = 5;

    @Builder.Default
    private List<CaseDto> cases = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CaseDto {
        @JsonProperty("case_id")
        private String caseId;

        private String title;

        @JsonProperty("service_name")
        private String serviceName;

        @JsonProperty("ticket_number")
        private String ticketNumber;

        private FeatureSetDto features;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FeatureSetDto {
        private String priority;
        private String status;

        @JsonProperty("age_hours")
        private Double ageHours;

        @JsonProperty("sla_remaining_minutes")
        private Double slaRemainingMinutes;

        @JsonProperty("sla_breached")
        private Boolean slaBreached;

        @JsonProperty("service_degraded")
        private Boolean serviceDegraded;

        @JsonProperty("similar_ticket_count")
        private Double similarTicketCount;

        @JsonProperty("probable_mass_incident")
        private Boolean probableMassIncident;

        @JsonProperty("duplicate_confidence")
        private Double duplicateConfidence;

        @JsonProperty("frustration_score")
        private Double frustrationScore;

        @JsonProperty("backlog_open_tickets")
        private Double backlogOpenTickets;

        @JsonProperty("agent_open_ticket_count")
        private Double agentOpenTicketCount;

        @JsonProperty("incident_linked")
        private Boolean incidentLinked;

        @JsonProperty("business_impact")
        private String businessImpact;

        @JsonProperty("service_criticality")
        private String serviceCriticality;

        private Boolean assigned;
    }
}
