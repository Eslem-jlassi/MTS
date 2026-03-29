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

    @JsonProperty("matched_tickets")
    private List<MatchedTicketDto> matchedTickets = new ArrayList<>();

    private String reasoning;
    private String recommendation;

    public static DuplicateDetectionResponseDto unavailable(String message) {
        DuplicateDetectionResponseDto response = new DuplicateDetectionResponseDto();
        response.setAvailable(false);
        response.setMessage(message);
        response.setReasoning(message);
        response.setRecommendation(message);
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
