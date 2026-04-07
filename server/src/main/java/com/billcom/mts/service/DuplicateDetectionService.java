package com.billcom.mts.service;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.ai.DuplicateDetectionRequestDto;
import com.billcom.mts.dto.ai.DuplicateDetectionResponseDto;
import com.billcom.mts.service.ai.AiGatewaySupport;
import com.billcom.mts.service.ai.LocalAiServiceManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Service
public class DuplicateDetectionService extends AiGatewaySupport {

    private static final String SERVICE_NAME = "duplicate-service";

    private final String duplicateBaseUrl;

    public DuplicateDetectionService(
            RestTemplate restTemplate,
            LocalAiServiceManager localAiServiceManager,
            @Value("${ai.duplicate.base-url}") String duplicateBaseUrl
    ) {
        super(restTemplate, localAiServiceManager);
        this.duplicateBaseUrl = trimTrailingSlash(duplicateBaseUrl);
    }

    public DuplicateDetectionResponseDto detectDuplicates(DuplicateDetectionRequestDto request) {
        long startedAt = System.nanoTime();
        String unavailableMessage = "La detection de doublons est indisponible pour le moment. Verifiez que le service Python tourne sur "
                + duplicateBaseUrl
                + ".";

        DuplicateDetectionResponseDto response = post(
                SERVICE_NAME,
                duplicateBaseUrl,
                "/detect-duplicates",
                request,
                DuplicateDetectionResponseDto.class,
                body -> {
                    body.setAvailable(true);
                    body.setMessage(null);
                    if (body.getMatchedTickets() == null) {
                        body.setMatchedTickets(Collections.emptyList());
                    }
                    if (body.getConfidence() == null) {
                        body.setConfidence(body.getDuplicateConfidence());
                    }
                    if (body.getModelVersion() == null || body.getModelVersion().isBlank()) {
                        body.setModelVersion("duplicate-detector-1.1.0");
                    }
                    if (body.getFallbackMode() == null || body.getFallbackMode().isBlank()) {
                        body.setFallbackMode("gateway_unspecified");
                    }
                    if (body.getReasoningSteps() == null) {
                        body.setReasoningSteps(List.of());
                    }
                    if (body.getRecommendedActions() == null) {
                        body.setRecommendedActions(List.of());
                    }
                    if (body.getRiskFlags() == null) {
                        body.setRiskFlags(List.of());
                    }
                    if (body.getMissingInformation() == null) {
                        body.setMissingInformation(List.of());
                    }
                    if (body.getSources() == null) {
                        body.setSources(List.of());
                    }
                },
                this::unavailableResponse,
                "Le service de detection a repondu avec un corps vide.",
                unavailableMessage,
                "La detection de doublons a rencontre une erreur temporaire. Reessayez apres avoir relance le microservice."
        );

        double elapsedMs = (System.nanoTime() - startedAt) / 1_000_000.0;
        if (response.getLatencyMs() == null || response.getLatencyMs() <= 0.0) {
            response.setLatencyMs(elapsedMs);
        }
        return response;
    }

    public AiServiceHealthDto healthCheck() {
        return healthCheck(
                SERVICE_NAME,
                duplicateBaseUrl,
                "/health",
                "Le service de doublons ne repond pas sur " + duplicateBaseUrl + "."
        );
    }

    private DuplicateDetectionResponseDto unavailableResponse(String message) {
        return DuplicateDetectionResponseDto.unavailable(message);
    }

}
