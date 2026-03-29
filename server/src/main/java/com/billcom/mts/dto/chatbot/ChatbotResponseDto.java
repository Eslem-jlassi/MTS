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
        return response;
    }
}
