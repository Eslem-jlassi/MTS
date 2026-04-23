package com.billcom.mts.service.managercopilot;

import com.billcom.mts.dto.managercopilot.ManagerCopilotScoreRequestDto;
import org.springframework.stereotype.Component;

@Component
public class AllieKnnFeatureBuilder {

    /**
     * Builds the explicit KNN feature vector sent to ai-chatbot.
     * The goal is not to hide the model behind UI heuristics:
     * manager-facing recommendations must come from a readable backend payload.
     */
    public ManagerCopilotScoreRequestDto.CaseDto buildCase(AllieKnnFeatureInput input) {
        return ManagerCopilotScoreRequestDto.CaseDto.builder()
                .caseId(input.caseId())
                .title(input.title())
                .serviceName(input.serviceName())
                .ticketNumber(input.ticketNumber())
                .features(ManagerCopilotScoreRequestDto.FeatureSetDto.builder()
                        .priority(input.priority())
                        .status(input.status())
                        .ageHours(input.ageHours())
                        .slaRemainingMinutes(input.slaRemainingMinutes())
                        .slaBreached(input.slaBreached())
                        .serviceDegraded(input.serviceDegraded())
                        .similarTicketCount(input.similarTicketCount())
                        .probableMassIncident(input.probableMassIncident())
                        .duplicateConfidence(input.duplicateConfidence())
                        .frustrationScore(input.frustrationScore())
                        .backlogOpenTickets(input.backlogOpenTickets())
                        .agentOpenTicketCount(input.agentOpenTicketCount())
                        .incidentLinked(input.incidentLinked())
                        .businessImpact(input.businessImpact())
                        .serviceCriticality(input.serviceCriticality())
                        .assigned(input.assigned())
                        .build())
                .build();
    }

    public record AllieKnnFeatureInput(
            String caseId,
            String title,
            String serviceName,
            String ticketNumber,
            String priority,
            String status,
            Double ageHours,
            Double slaRemainingMinutes,
            Boolean slaBreached,
            Boolean serviceDegraded,
            Double similarTicketCount,
            Boolean probableMassIncident,
            Double duplicateConfidence,
            Double frustrationScore,
            Double backlogOpenTickets,
            Double agentOpenTicketCount,
            Boolean incidentLinked,
            String businessImpact,
            String serviceCriticality,
            Boolean assigned
    ) {
    }
}
