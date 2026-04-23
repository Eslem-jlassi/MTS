package com.billcom.mts.service.managercopilot;

import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreResponseDto;
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
public class KnnDecisionResult {

    private String caseId;
    private String predictedAction;
    private Double confidenceScore;
    private String confidenceLevel;

    @Builder.Default
    private List<ManagerCopilotScoreResponseDto.NearestExampleDto> nearestExamples = new ArrayList<>();

    @Builder.Default
    private List<String> featureSummary = new ArrayList<>();

    private String reasoning;
    private String inferenceMode;
    private String modelVersion;
    private String fallbackMode;

    public static KnnDecisionResult fromDto(ManagerCopilotScoreResponseDto.ResultDto source) {
        return KnnDecisionResult.builder()
                .caseId(source.getCaseId())
                .predictedAction(source.getPredictedAction())
                .confidenceScore(source.getConfidenceScore())
                .confidenceLevel(source.getConfidenceLevel())
                .nearestExamples(source.getNearestExamples() != null ? source.getNearestExamples() : List.of())
                .featureSummary(source.getFeatureSummary() != null ? source.getFeatureSummary() : List.of())
                .reasoning(source.getReasoning())
                .inferenceMode(source.getInferenceMode())
                .modelVersion(source.getModelVersion())
                .fallbackMode(source.getFallbackMode())
                .build();
    }
}
