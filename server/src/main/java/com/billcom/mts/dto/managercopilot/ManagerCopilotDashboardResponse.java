package com.billcom.mts.dto.managercopilot;

import com.fasterxml.jackson.annotation.JsonInclude;
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
public class ManagerCopilotDashboardResponse {

    @Builder.Default
    private boolean available = true;

    @Builder.Default
    private String mode = "live";

    private String generatedAt;
    private String summary;
    private String executiveSummary;
    private String modelVersion;
    private String inferenceMode;
    private Double confidenceScore;

    @Builder.Default
    private List<String> featureSummary = new ArrayList<>();

    @Builder.Default
    private List<String> reasoningSteps = new ArrayList<>();

    @Builder.Default
    private List<String> recommendedActions = new ArrayList<>();

    @Builder.Default
    private int urgentCount = 0;

    @Builder.Default
    private List<MetricDto> metrics = new ArrayList<>();

    @Builder.Default
    private List<DecisionAreaDto> decisionAreas = new ArrayList<>();

    @Builder.Default
    private List<WhyCardDto> whyCards = new ArrayList<>();

    @Builder.Default
    private List<SignalDto> priorityTickets = new ArrayList<>();

    @Builder.Default
    private List<SignalDto> probableIncidents = new ArrayList<>();

    @Builder.Default
    private List<SignalDto> assignments = new ArrayList<>();

    @Builder.Default
    private List<SignalDto> slaAlerts = new ArrayList<>();

    @Builder.Default
    private List<QuickActionDto> quickActions = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MetricDto {
        private String label;
        private String value;
        private String tone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DecisionAreaDto {
        private String id;
        private String title;
        private String headline;
        private String description;
        private String tone;
        private String confidence;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class WhyCardDto {
        private String id;
        private String title;
        private String description;
        private String tone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class QuickActionDto {
        private String id;
        private String label;
        private String description;
        private String href;
        private String tone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class NearestExampleDto {
        private String exampleId;
        private String label;
        private String title;
        private String summary;
        private String recommendation;
        private Double distance;

        @Builder.Default
        private List<String> featureSummary = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SignalDto {
        private String id;
        private String eyebrow;
        private String title;
        private String description;
        private String href;
        private String tone;
        private String confidence;
        private String meta;

        @Builder.Default
        private List<String> tags = new ArrayList<>();

        private String ctaLabel;
        private String recommendation;
        private String whyMatters;
        private String signalKind;
        private Long ticketId;
        private String ticketNumber;
        private Long incidentId;
        private Long serviceId;
        private String serviceName;
        private String priority;
        private String status;
        private String recommendedAgent;
        private Long recommendedAgentId;
        private Double confidenceScore;
        private String inferenceMode;
        private String modelVersion;
        private String predictedAction;

        @Builder.Default
        private List<String> featureSummary = new ArrayList<>();

        @Builder.Default
        private List<NearestExampleDto> nearestExamples = new ArrayList<>();
    }
}
