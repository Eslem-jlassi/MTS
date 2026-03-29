package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.chatbot.ChatbotRequestDto;
import com.billcom.mts.dto.chatbot.ChatbotResponseDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionRequestDto;
import com.billcom.mts.dto.chatbot.MassiveIncidentDetectionResponseDto;
import com.billcom.mts.service.ChatbotService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(@Qualifier("chatbotServiceClient") ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping("/ask")
    public ResponseEntity<ChatbotResponseDto> ask(@Valid @RequestBody ChatbotRequestDto request) {
        ChatbotResponseDto response = chatbotService.askChatbot(
                request.getQuestion(),
                request.getTopK(),
                request.getPreferredLanguage()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/massive-incidents/detect")
    public ResponseEntity<MassiveIncidentDetectionResponseDto> detectMassiveIncidents(
            @RequestBody MassiveIncidentDetectionRequestDto request
    ) {
        return ResponseEntity.ok(chatbotService.detectMassiveIncidents(request));
    }

    @GetMapping("/health")
    public ResponseEntity<AiServiceHealthDto> health() {
        return ResponseEntity.ok(chatbotService.healthCheck());
    }
}
