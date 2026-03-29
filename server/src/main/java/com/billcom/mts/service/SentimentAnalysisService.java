package com.billcom.mts.service;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.ai.SentimentAnalysisRequestDto;
import com.billcom.mts.dto.ai.SentimentAnalysisResponseDto;
import com.billcom.mts.service.ai.AiGatewaySupport;
import com.billcom.mts.service.ai.LocalAiServiceManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class SentimentAnalysisService extends AiGatewaySupport {

    private static final String SERVICE_NAME = "sentiment-service";

    private final String sentimentBaseUrl;

    public SentimentAnalysisService(
            RestTemplate restTemplate,
            LocalAiServiceManager localAiServiceManager,
            @Value("${ai.sentiment.base-url}") String sentimentBaseUrl
    ) {
        super(restTemplate, localAiServiceManager);
        this.sentimentBaseUrl = trimTrailingSlash(sentimentBaseUrl);
    }

    public SentimentAnalysisResponseDto analyze(SentimentAnalysisRequestDto request) {
        String unavailableMessage = "L'analyse IA est indisponible pour le moment. Verifiez que le service Python tourne sur "
                + sentimentBaseUrl
                + ".";

        return post(
                SERVICE_NAME,
                sentimentBaseUrl,
                "/analyze",
                buildPayload(request),
                SentimentAnalysisResponseDto.class,
                body -> {
                    body.setAvailable(true);
                    body.setMessage(null);
                },
                this::unavailableResponse,
                "Le service d'analyse IA a repondu avec un corps vide.",
                unavailableMessage,
                "L'analyse IA a rencontre une erreur temporaire. Reessayez apres avoir relance le microservice."
        );
    }

    public AiServiceHealthDto healthCheck() {
        return healthCheck(
                SERVICE_NAME,
                sentimentBaseUrl,
                "/health",
                "Le service de sentiment ne repond pas sur " + sentimentBaseUrl + "."
        );
    }

    private Map<String, Object> buildPayload(SentimentAnalysisRequestDto request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", request.getTitle());
        payload.put("description", request.getDescription());

        String text = request.getTitle();
        if (StringUtils.hasText(request.getDescription())) {
            text = request.getTitle() + "\n" + request.getDescription();
        }
        payload.put("text", text);
        return payload;
    }

    private SentimentAnalysisResponseDto unavailableResponse(String message) {
        return SentimentAnalysisResponseDto.unavailable(message);
    }

}
