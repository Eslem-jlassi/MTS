package com.billcom.mts.controller;

import com.billcom.mts.dto.managercopilot.ManagerCopilotDashboardResponse;
import com.billcom.mts.service.ManagerCopilotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/manager-ai/copilot")
@RequiredArgsConstructor
@Tag(name = "Manager Copilot", description = "Manager-only supervised ALLIE cockpit")
public class ManagerCopilotController {

    private final ManagerCopilotService managerCopilotService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Get manager copilot dashboard snapshot")
    public ManagerCopilotDashboardResponse getDashboard(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long clientId
    ) {
        return managerCopilotService.getDashboardSummary(period, serviceId, clientId);
    }
}
