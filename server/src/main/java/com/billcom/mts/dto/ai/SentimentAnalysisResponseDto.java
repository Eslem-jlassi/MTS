package com.billcom.mts.dto.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SentimentAnalysisResponseDto {

    private boolean available = true;
    private String message;
    private String category;
    private String priority;
    private String service;
    private String urgency;
    private String sentiment;
    private String criticality;
    private Double confidence;
    private String reasoning;
    private Double score;
    private String label;
    private String details;
    private Integer stars;

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

    @JsonProperty("is_angry")
    private Boolean isAngry;

    @JsonProperty("priority_flag")
    private String priorityFlag;

    public static SentimentAnalysisResponseDto unavailable(String message) {
        SentimentAnalysisResponseDto response = new SentimentAnalysisResponseDto();
        response.setAvailable(false);
        response.setMessage(message);
        response.setCategory("N/A");
        response.setPriority("LOW");
        response.setService("N/A");
        response.setUrgency("NORMAL");
        response.setSentiment("UNAVAILABLE");
        response.setCriticality("NORMAL");
        response.setConfidence(0.0);
        response.setReasoning(message);
        response.setDetails(message);
        response.setLabel("SERVICE_UNAVAILABLE");
        response.setScore(0.0);
        response.setStars(0);
        response.setIsAngry(false);
        response.setPriorityFlag("SERVICE_UNAVAILABLE");
        response.setModelVersion("sentiment-hybrid-2.1.0");
        response.setFallbackMode("service_unavailable");
        response.setReasoningSteps(List.of("Service sentiment indisponible, fallback backend active."));
        response.setRecommendedActions(List.of("Relancer le microservice sentiment puis reessayer l'analyse."));
        response.setRiskFlags(List.of("SERVICE_UNAVAILABLE"));
        response.setMissingInformation(List.of());
        response.setSources(List.of("gateway-fallback"));
        response.setLatencyMs(0.0);
        return response;
    }
}
