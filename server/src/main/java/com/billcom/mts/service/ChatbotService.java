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
                },
                this::unavailableResponse,
                "Le chatbot IA a repondu avec un corps vide.",
                unavailableMessage,
                "Le chatbot IA a rencontre une erreur temporaire. Reessayez apres avoir relance le microservice."
        );

        enrichWithMassiveIncidentCandidate(question, chatbotResponse);
        return chatbotResponse;
    }

    public MassiveIncidentDetectionResponseDto detectMassiveIncidents(MassiveIncidentDetectionRequestDto request) {
        MassiveIncidentDetectionRequestDto payload = request != null ? request : new MassiveIncidentDetectionRequestDto();

        return post(
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
                },
                ignored -> MassiveIncidentDetectionResponseDto.empty(),
                "Le detecteur d'incidents massifs a repondu avec un corps vide.",
                "Le detecteur d'incidents massifs est indisponible pour le moment.",
                "Le detecteur d'incidents massifs a rencontre une erreur temporaire."
        );
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
