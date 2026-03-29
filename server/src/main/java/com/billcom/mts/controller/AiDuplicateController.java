package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.ai.DuplicateDetectionRequestDto;
import com.billcom.mts.dto.ai.DuplicateDetectionResponseDto;
import com.billcom.mts.service.DuplicateDetectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/duplicates")
@RequiredArgsConstructor
public class AiDuplicateController {

    private final DuplicateDetectionService duplicateDetectionService;

    @PostMapping("/detect")
    public ResponseEntity<DuplicateDetectionResponseDto> detect(@Valid @RequestBody DuplicateDetectionRequestDto request) {
        return ResponseEntity.ok(duplicateDetectionService.detectDuplicates(request));
    }

    @GetMapping("/health")
    public ResponseEntity<AiServiceHealthDto> health() {
        return ResponseEntity.ok(duplicateDetectionService.healthCheck());
    }
}
