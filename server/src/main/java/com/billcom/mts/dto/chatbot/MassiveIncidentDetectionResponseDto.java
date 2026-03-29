package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class MassiveIncidentDetectionResponseDto {

    @JsonProperty("evaluated_tickets")
    private Integer evaluatedTickets;

    @JsonProperty("candidates_found")
    private Integer candidatesFound;

    private List<MassiveIncidentCandidateDto> candidates = List.of();

    public static MassiveIncidentDetectionResponseDto empty() {
        MassiveIncidentDetectionResponseDto response = new MassiveIncidentDetectionResponseDto();
        response.setEvaluatedTickets(0);
        response.setCandidatesFound(0);
        response.setCandidates(List.of());
        return response;
    }
}
