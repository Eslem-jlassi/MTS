package com.billcom.mts.dto.managercopilot;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ManagerCopilotScoreResponseDto {

    @Builder.Default
    private boolean available = true;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("inference_mode")
    private String inferenceMode;

    @JsonProperty("fallback_mode")
    private String fallbackMode;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    @JsonProperty("confidence_level")
    private String confidenceLevel;

    @Builder.Default
    private List<ResultDto> results = new ArrayList<>();

    @Builder.Default
    @JsonProperty("reasoning_steps")
    private List<String> reasoningSteps = new ArrayList<>();

    public static ManagerCopilotScoreResponseDto unavailable(String message) {
        return ManagerCopilotScoreResponseDto.builder()
                .available(false)
                .modelVersion("manager-copilot-knn-1.0.0")
                .inferenceMode("degraded_rules")
                .fallbackMode("service_unavailable")
                .confidenceScore(0.0)
                .confidenceLevel("low")
                .results(List.of())
                .reasoningSteps(List.of(message))
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ResultDto {
        @JsonProperty("case_id")
        private String caseId;

        @JsonProperty("predicted_action")
        private String predictedAction;

        @JsonProperty("confidence_score")
        private Double confidenceScore;

        @JsonProperty("confidence_level")
        private String confidenceLevel;

        @Builder.Default
        @JsonProperty("nearest_examples")
        private List<NearestExampleDto> nearestExamples = new ArrayList<>();

        @Builder.Default
        @JsonProperty("feature_summary")
        private List<String> featureSummary = new ArrayList<>();

        private String reasoning;

        @JsonProperty("inference_mode")
        private String inferenceMode;

        @JsonProperty("model_version")
        private String modelVersion;

        @JsonProperty("fallback_mode")
        private String fallbackMode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class NearestExampleDto {
        @JsonProperty("example_id")
        private String exampleId;

        private String label;
        private String title;
        private String summary;
        private String recommendation;
        private Double distance;

        @Builder.Default
        @JsonProperty("feature_summary")
        private List<String> featureSummary = new ArrayList<>();
    }
}
