package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MassiveIncidentDetectionRequestDto {

    @JsonProperty("hours_back")
    private Integer hoursBack = 72;

    @JsonProperty("similarity_threshold")
    private Double similarityThreshold = 0.72;

    @JsonProperty("min_cluster_size")
    private Integer minClusterSize = 3;

    @JsonProperty("time_window_minutes")
    private Integer timeWindowMinutes = 180;

    @JsonProperty("max_candidates")
    private Integer maxCandidates = 3;

    @JsonProperty("service_name")
    private String serviceName;

    @JsonProperty("query_hint")
    private String queryHint;

    @JsonProperty("reference_time")
    private String referenceTime;
}
