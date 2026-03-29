package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatbotAnalysisDto {

    private String summary;

    @JsonProperty("probable_cause")
    private String probableCause;

    @JsonProperty("known_resolution")
    private String knownResolution;

    private String workaround;
    private String impact;

    @JsonProperty("next_action")
    private String nextAction;

    @JsonProperty("clarification_needed")
    private Boolean clarificationNeeded;

    @JsonProperty("missing_information")
    private List<String> missingInformation = List.of();

    private String caution;

    @JsonProperty("draft_ticket_title")
    private String draftTicketTitle;
}
