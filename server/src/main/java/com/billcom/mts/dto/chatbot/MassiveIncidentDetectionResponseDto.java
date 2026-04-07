package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class MassiveIncidentDetectionResponseDto {

    private boolean available = true;

    @JsonProperty("evaluated_tickets")
    private Integer evaluatedTickets;

    @JsonProperty("candidates_found")
    private Integer candidatesFound;

    private List<MassiveIncidentCandidateDto> candidates = List.of();

    private String confidence;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("fallback_mode")
    private String fallbackMode;

    @JsonProperty("reasoning_steps")
    private List<String> reasoningSteps = List.of();

    @JsonProperty("recommended_actions")
    private List<String> recommendedActions = List.of();

    @JsonProperty("risk_flags")
    private List<String> riskFlags = List.of();

    @JsonProperty("missing_information")
    private List<String> missingInformation = List.of();

    private List<String> sources = List.of();

    @JsonProperty("latency_ms")
    private Double latencyMs;

    public static MassiveIncidentDetectionResponseDto empty() {
        MassiveIncidentDetectionResponseDto response = new MassiveIncidentDetectionResponseDto();
        response.setAvailable(false);
        response.setEvaluatedTickets(0);
        response.setCandidatesFound(0);
        response.setCandidates(List.of());
        response.setConfidence("low");
        response.setModelVersion("massive-detector-1.1.0");
        response.setFallbackMode("service_unavailable");
        response.setReasoningSteps(List.of("Detecteur d'incidents massifs indisponible."));
        response.setRecommendedActions(List.of("Relancer le service ai-chatbot avant une nouvelle detection."));
        response.setRiskFlags(List.of("SERVICE_UNAVAILABLE"));
        response.setMissingInformation(List.of());
        response.setSources(List.of("gateway-fallback"));
        response.setLatencyMs(0.0);
        return response;
    }
}
