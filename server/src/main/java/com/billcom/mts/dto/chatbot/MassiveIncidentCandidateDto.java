package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class MassiveIncidentCandidateDto {

    @JsonProperty("detected_service")
    private String detectedService;

    @JsonProperty("cluster_size")
    private Integer clusterSize;

    @JsonProperty("likely_incident_title")
    private String likelyIncidentTitle;

    @JsonProperty("confidence_level")
    private String confidenceLevel;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    @JsonProperty("cluster_start")
    private String clusterStart;

    @JsonProperty("cluster_end")
    private String clusterEnd;

    @JsonProperty("ticket_ids")
    private List<String> ticketIds;

    @JsonProperty("detection_reason")
    private String detectionReason;

    private String recommendation;
}
