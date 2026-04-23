package com.billcom.mts.service.managercopilot;

import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreRequestDto;
import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreResponseDto;
import com.billcom.mts.service.ManagerCopilotAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AllieKnnRecommendationService {

    private static final int DEFAULT_K = 5;

    private final ManagerCopilotAiService managerCopilotAiService;

    public ManagerCopilotScoreResponseDto scoreCases(List<ManagerCopilotScoreRequestDto.CaseDto> cases) {
        if (cases == null || cases.isEmpty()) {
            return ManagerCopilotScoreResponseDto.unavailable(
                    "Aucun cas manager n'a ete transmis au scoring supervise ALLIE."
            );
        }

        return managerCopilotAiService.scoreCases(
                ManagerCopilotScoreRequestDto.builder()
                        .k(DEFAULT_K)
                        .cases(cases)
                        .build()
        );
    }
}
