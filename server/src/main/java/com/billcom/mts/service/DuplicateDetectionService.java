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
        String unavailableMessage = "La detection de doublons est indisponible pour le moment. Verifiez que le service Python tourne sur "
                + duplicateBaseUrl
                + ".";

        return post(
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
                },
                this::unavailableResponse,
                "Le service de detection a repondu avec un corps vide.",
                unavailableMessage,
                "La detection de doublons a rencontre une erreur temporaire. Reessayez apres avoir relance le microservice."
        );
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
