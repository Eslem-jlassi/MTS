package com.billcom.mts.service;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.chatbot.ChatbotRequestDto;
import com.billcom.mts.dto.chatbot.ChatbotResponseDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentCandidateDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionRequestDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionResponseDto;
import com.billcom.mts.service.ai.AiGatewaySupport;
import com.billcom.mts.service.ai.LocalAiServiceManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service("chatbotServiceClient")
public class ChatbotService extends AiGatewaySupport {

    private static final String SERVICE_NAME = "ai-chatbot";

    private final String chatbotBaseUrl;

    public ChatbotService(
            RestTemplate restTemplate,
            LocalAiServiceManager localAiServiceManager,
            @Value("${ai.chatbot.base-url}") String chatbotBaseUrl
    ) {
        super(restTemplate, localAiServiceManager);
        this.chatbotBaseUrl = trimTrailingSlash(chatbotBaseUrl);
    }

    public ChatbotResponseDto askChatbot(String question, Integer topK) {
        return askChatbot(question, topK, null);
    }

    public ChatbotResponseDto askChatbot(String question, Integer topK, String preferredLanguage) {
        long startedAt = System.nanoTime();
        ChatbotRequestDto request = new ChatbotRequestDto(question, topK != null ? topK : 5, preferredLanguage);
        String unavailableMessage = "Le chatbot IA est indisponible pour le moment. Verifiez que `ai-chatbot` tourne sur "
                + chatbotBaseUrl
                + ".";

        ChatbotResponseDto chatbotResponse = post(
                SERVICE_NAME,
                chatbotBaseUrl,
                "/chat",
                request,
                ChatbotResponseDto.class,
                body -> {
                    body.setAvailable(true);
                    body.setMessage(null);
                    if (body.getModelVersion() == null || body.getModelVersion().isBlank()) {
                        body.setModelVersion("rag-chatbot-1.2.0");
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
                "Le chatbot IA a repondu avec un corps vide.",
                unavailableMessage,
                "Le chatbot IA a rencontre une erreur temporaire. Reessayez apres avoir relance le microservice."
        );

        double elapsedMs = (System.nanoTime() - startedAt) / 1_000_000.0;
        if (chatbotResponse.getLatencyMs() == null || chatbotResponse.getLatencyMs() <= 0.0) {
            chatbotResponse.setLatencyMs(elapsedMs);
        }

        enrichWithMassiveIncidentCandidate(question, chatbotResponse);
        return chatbotResponse;
    }

    public MassiveIncidentDetectionResponseDto detectMassiveIncidents(MassiveIncidentDetectionRequestDto request) {
        long startedAt = System.nanoTime();
        MassiveIncidentDetectionRequestDto payload = request != null ? request : new MassiveIncidentDetectionRequestDto();

        MassiveIncidentDetectionResponseDto response = post(
                SERVICE_NAME,
                chatbotBaseUrl,
                "/massive-incidents/detect",
                payload,
                MassiveIncidentDetectionResponseDto.class,
                body -> {
                    if (body.getCandidates() == null) {
                        body.setCandidates(java.util.List.of());
                    }
                    if (body.getCandidatesFound() == null) {
                        body.setCandidatesFound(body.getCandidates().size());
                    }
                    if (body.getEvaluatedTickets() == null) {
                        body.setEvaluatedTickets(0);
                    }
                    if (body.getConfidence() == null || body.getConfidence().isBlank()) {
                        body.setConfidence("low");
                    }
                    if (body.getModelVersion() == null || body.getModelVersion().isBlank()) {
                        body.setModelVersion("massive-detector-1.1.0");
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
                ignored -> MassiveIncidentDetectionResponseDto.empty(),
                "Le detecteur d'incidents massifs a repondu avec un corps vide.",
                "Le detecteur d'incidents massifs est indisponible pour le moment.",
                "Le detecteur d'incidents massifs a rencontre une erreur temporaire."
        );

        double elapsedMs = (System.nanoTime() - startedAt) / 1_000_000.0;
        if (response.getLatencyMs() == null || response.getLatencyMs() <= 0.0) {
            response.setLatencyMs(elapsedMs);
        }
        return response;
    }

    public AiServiceHealthDto healthCheck() {
        return healthCheck(SERVICE_NAME, chatbotBaseUrl, "/health", "Le chatbot ne repond pas sur " + chatbotBaseUrl + ".");
    }

    private ChatbotResponseDto unavailableResponse(String message) {
        return ChatbotResponseDto.unavailable(message);
    }

    private void enrichWithMassiveIncidentCandidate(String question, ChatbotResponseDto chatbotResponse) {
        if (chatbotResponse == null || !chatbotResponse.isAvailable()) {
            return;
        }

        String confidence = chatbotResponse.getConfidence() != null ? chatbotResponse.getConfidence().trim().toLowerCase() : "";
        String serviceDetected = chatbotResponse.getServiceDetected();

        if ("low".equals(confidence) || serviceDetected == null || serviceDetected.isBlank() || "N/A".equalsIgnoreCase(serviceDetected)) {
            return;
        }

        MassiveIncidentDetectionRequestDto request = new MassiveIncidentDetectionRequestDto();
        request.setServiceName(serviceDetected);
        request.setQueryHint(question);
        request.setHoursBack(72);
        request.setSimilarityThreshold(0.72);
        request.setMinClusterSize(3);
        request.setTimeWindowMinutes(180);
        request.setMaxCandidates(1);

        MassiveIncidentDetectionResponseDto detection = detectMassiveIncidents(request);
        if (detection.getCandidates() == null || detection.getCandidates().isEmpty()) {
            return;
        }

        MassiveIncidentCandidateDto topCandidate = detection.getCandidates().get(0);
        chatbotResponse.setMassiveIncidentCandidate(topCandidate);
    }
}
