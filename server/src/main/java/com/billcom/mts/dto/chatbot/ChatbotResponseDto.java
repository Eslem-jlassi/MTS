package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatbotResponseDto {

    private boolean available = true;
    private String message;
    private String answer;
    private String confidence;

    @JsonProperty("top_score")
    private Double topScore;

    @JsonProperty("service_detected")
    private String serviceDetected;

    @JsonProperty("service_detection_confidence")
    private String serviceDetectionConfidence;

    @JsonProperty("response_language")
    private String responseLanguage;

    private ChatbotAnalysisDto analysis;

    private List<ChatbotResultDto> results = List.of();

    @JsonProperty("massive_incident_candidate")
    private MassiveIncidentCandidateDto massiveIncidentCandidate;

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

    public static ChatbotResponseDto unavailable(String message) {
        ChatbotResponseDto response = new ChatbotResponseDto();
        response.setAvailable(false);
        response.setMessage(message);
        response.setAnswer("Le chatbot IA est indisponible pour le moment.");
        response.setConfidence("low");
        response.setServiceDetected("N/A");
        response.setServiceDetectionConfidence("low");
        response.setResponseLanguage("fr");
        response.setResults(List.of());
        response.setMassiveIncidentCandidate(null);
        response.setModelVersion("rag-chatbot-1.2.0");
        response.setFallbackMode("service_unavailable");
        response.setReasoningSteps(List.of("Chatbot indisponible, fallback backend active."));
        response.setRecommendedActions(List.of("Relancer le microservice ai-chatbot puis reessayer."));
        response.setRiskFlags(List.of("SERVICE_UNAVAILABLE"));
        response.setMissingInformation(List.of());
        response.setSources(List.of("gateway-fallback"));
        response.setLatencyMs(0.0);
        return response;
    }
}
