package com.billcom.mts.dto.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

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
        return response;
    }
}
