package com.billcom.mts.service;

import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreResponseDto;
import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreRequestDto;
import com.billcom.mts.service.ai.AiGatewaySupport;
import com.billcom.mts.service.ai.LocalAiServiceManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class ManagerCopilotAiService extends AiGatewaySupport {

    private static final String SERVICE_NAME = "ai-chatbot";

    private final String chatbotBaseUrl;

    public ManagerCopilotAiService(
            RestTemplate restTemplate,
            LocalAiServiceManager localAiServiceManager,
            @Value("${ai.chatbot.base-url}") String chatbotBaseUrl
    ) {
        super(restTemplate, localAiServiceManager);
        this.chatbotBaseUrl = trimTrailingSlash(chatbotBaseUrl);
    }

    public ManagerCopilotScoreResponseDto scoreCases(ManagerCopilotScoreRequestDto request) {
        String unavailableMessage = "Le scoring ALLIE KNN est indisponible pour le moment.";

        return post(
                SERVICE_NAME,
                chatbotBaseUrl,
                "/manager-copilot/score",
                request,
                ManagerCopilotScoreResponseDto.class,
                body -> {
                    if (body.getResults() == null) {
                        body.setResults(List.of());
                    }
                    if (body.getReasoningSteps() == null) {
                        body.setReasoningSteps(List.of());
                    }
                    if (body.getModelVersion() == null || body.getModelVersion().isBlank()) {
                        body.setModelVersion("manager-copilot-knn-1.0.0");
                    }
                    if (body.getInferenceMode() == null || body.getInferenceMode().isBlank()) {
                        body.setInferenceMode("knn");
                    }
                    if (body.getFallbackMode() == null || body.getFallbackMode().isBlank()) {
                        body.setFallbackMode("gateway_unspecified");
                    }
                    if (body.getConfidenceLevel() == null || body.getConfidenceLevel().isBlank()) {
                        body.setConfidenceLevel("low");
                    }
                    if (body.getConfidenceScore() == null) {
                        body.setConfidenceScore(0.0);
                    }

                    body.getResults().forEach(result -> {
                        if (result.getNearestExamples() == null) {
                            result.setNearestExamples(List.of());
                        }
                        if (result.getFeatureSummary() == null) {
                            result.setFeatureSummary(List.of());
                        }
                    });
                },
                ManagerCopilotScoreResponseDto::unavailable,
                "Le scoring ALLIE KNN a repondu avec un corps vide.",
                unavailableMessage,
                "Le scoring ALLIE KNN a rencontre une erreur temporaire."
        );
    }
}
