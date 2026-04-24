package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.service.ChatbotService;
import com.billcom.mts.service.DuplicateDetectionService;
import com.billcom.mts.service.SentimentAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemHealthController {

    private final JdbcTemplate jdbcTemplate;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final DuplicateDetectionService duplicateDetectionService;
    private final ChatbotService chatbotService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> database = databaseHealth();
        AiServiceHealthDto sentiment = sentimentAnalysisService.healthCheck();
        AiServiceHealthDto duplicate = duplicateDetectionService.healthCheck();
        AiServiceHealthDto chatbot = chatbotService.healthCheck();

        boolean databaseUp = Boolean.TRUE.equals(database.get("available"));
        boolean allAiAvailable = isServiceAvailable(sentiment)
                && isServiceAvailable(duplicate)
                && isServiceAvailable(chatbot);
        String overallStatus = databaseUp ? (allAiAvailable ? "UP" : "DEGRADED") : "DOWN";

        Map<String, Object> services = new LinkedHashMap<>();
        services.put("database", database);
        services.put("sentiment", aiServiceHealth(sentiment));
        services.put("duplicate", aiServiceHealth(duplicate));
        services.put("chatbot", aiServiceHealth(chatbot));
        services.put("allie", allieHealth(chatbot));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("application", "mts-telecom-backend");
        body.put("status", overallStatus);
        body.put("timestamp", Instant.now().toString());
        body.put("summary", healthSummary(overallStatus, databaseUp, allAiAvailable));
        body.put("services", services);

        HttpStatus responseStatus = "DOWN".equals(overallStatus) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
        return ResponseEntity.status(responseStatus).body(body);
    }

    private Map<String, Object> databaseHealth() {
        Map<String, Object> body = new LinkedHashMap<>();

        try {
            Integer probe = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            boolean available = probe != null && probe == 1;
            body.put("status", available ? "UP" : "DOWN");
            body.put("available", available);
            body.put("message", available
                    ? "Base de donnees joignable."
                    : "La base de donnees ne repond pas correctement au probe SQL.");
        } catch (Exception ex) {
            body.put("status", "DOWN");
            body.put("available", false);
            body.put("message", "La base de donnees est indisponible: " + ex.getMessage());
        }

        return body;
    }

    private Map<String, Object> aiServiceHealth(AiServiceHealthDto health) {
        Map<String, Object> body = new LinkedHashMap<>();
        boolean available = isServiceAvailable(health);

        body.put("service", health != null ? health.getService() : "unknown");
        body.put("status", available ? "UP" : "DEGRADED");
        body.put("available", available);

        if (health != null && health.getVersion() != null) {
            body.put("version", health.getVersion());
        }
        if (health != null && health.getModelName() != null) {
            body.put("modelName", health.getModelName());
        }
        if (health != null && health.getMode() != null) {
            body.put("mode", health.getMode());
        }

        body.put("message", health != null && health.getMessage() != null
                ? health.getMessage()
                : available
                    ? "Service disponible."
                    : "Service indisponible.");

        return body;
    }

    private Map<String, Object> allieHealth(AiServiceHealthDto chatbot) {
        boolean available = isServiceAvailable(chatbot);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", available ? "UP" : "DEGRADED");
        body.put("available", available);
        body.put("provider", "ai-chatbot");
        body.put("message", available
                ? "ALLIE peut consolider les signaux manager."
                : "ALLIE est degrade car le service ai-chatbot ne repond pas.");
        return body;
    }

    private String healthSummary(String overallStatus, boolean databaseUp, boolean allAiAvailable) {
        if ("DOWN".equals(overallStatus)) {
            return "Le backend est indisponible car la base de donnees ne repond pas.";
        }

        if (databaseUp && !allAiAvailable) {
            return "Le backend est joignable mais au moins un microservice IA est degrade.";
        }

        return "Le backend et les services IA essentiels sont disponibles.";
    }

    private boolean isServiceAvailable(AiServiceHealthDto health) {
        return health != null && health.isAvailable();
    }
}
