package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.ai.SentimentAnalysisRequestDto;
import com.billcom.mts.dto.ai.SentimentAnalysisResponseDto;
import com.billcom.mts.service.SentimentAnalysisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/sentiment")
@RequiredArgsConstructor
public class AiSentimentController {

    private final SentimentAnalysisService sentimentAnalysisService;

    @PostMapping("/analyze")
    public ResponseEntity<SentimentAnalysisResponseDto> analyze(@Valid @RequestBody SentimentAnalysisRequestDto request) {
        return ResponseEntity.ok(sentimentAnalysisService.analyze(request));
    }

    @GetMapping("/health")
    public ResponseEntity<AiServiceHealthDto> health() {
        return ResponseEntity.ok(sentimentAnalysisService.healthCheck());
    }
}
