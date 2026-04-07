package com.billcom.mts.dto.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DuplicateDetectionResponseDto {

    private boolean available = true;
    private String message;

    @JsonProperty("is_duplicate")
    private boolean isDuplicate;

    @JsonProperty("possible_mass_incident")
    private boolean possibleMassIncident;

    @JsonProperty("duplicate_confidence")
    private double duplicateConfidence;

    private Double confidence;

    @JsonProperty("matched_tickets")
    private List<MatchedTicketDto> matchedTickets = new ArrayList<>();

    private String reasoning;
    private String recommendation;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("fallback_mode")
    private String fallbackMode;

    @JsonProperty("reasoning_steps")
    private List<String> reasoningSteps = new ArrayList<>();

    @JsonProperty("recommended_actions")
    private List<String> recommendedActions = new ArrayList<>();

    @JsonProperty("risk_flags")
    private List<String> riskFlags = new ArrayList<>();

    @JsonProperty("missing_information")
    private List<String> missingInformation = new ArrayList<>();

    private List<String> sources = new ArrayList<>();

    @JsonProperty("latency_ms")
    private Double latencyMs;

    public static DuplicateDetectionResponseDto unavailable(String message) {
        DuplicateDetectionResponseDto response = new DuplicateDetectionResponseDto();
        response.setAvailable(false);
        response.setMessage(message);
        response.setConfidence(0.0);
        response.setReasoning(message);
        response.setRecommendation(message);
        response.setModelVersion("duplicate-detector-1.1.0");
        response.setFallbackMode("service_unavailable");
        response.setReasoningSteps(List.of("Service duplicate indisponible, fallback backend active."));
        response.setRecommendedActions(List.of("Relancer le microservice duplicate puis relancer la verification."));
        response.setRiskFlags(List.of("SERVICE_UNAVAILABLE"));
        response.setMissingInformation(List.of());
        response.setSources(List.of("gateway-fallback"));
        response.setLatencyMs(0.0);
        return response;
    }

    @Data
    @NoArgsConstructor
    public static class MatchedTicketDto {

        @JsonProperty("ticket_id")
        private Long ticketId;

        private String title;

        @JsonProperty("similarity_score")
        private Double similarityScore;

        @JsonProperty("duplicate_level")
        private String duplicateLevel;
    }
}
