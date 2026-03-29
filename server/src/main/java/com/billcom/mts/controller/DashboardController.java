package com.billcom.mts.controller;

import com.billcom.mts.dto.dashboard.DashboardStats;
import com.billcom.mts.entity.User;
import com.billcom.mts.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for dashboard statistics.
 */
@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard statistics and KPIs")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard statistics for current user based on role")
    public DashboardStats getDashboardStats(Authentication authentication) {
        return dashboardService.getMyDashboardStats(extractUser(authentication));
    }

    @GetMapping("/my-stats")
    @Operation(summary = "Get role-appropriate statistics for current user")
    public DashboardStats getMyStats(Authentication authentication) {
        return dashboardService.getMyDashboardStats(extractUser(authentication));
    }

    @GetMapping("/agent/{agentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #agentId == authentication.principal.id")
    @Operation(summary = "Get statistics for a specific agent")
    public DashboardStats getAgentStats(@PathVariable Long agentId) {
        return dashboardService.getAgentDashboardStats(agentId);
    }

    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get statistics for a specific client")
    public DashboardStats getClientStats(@PathVariable Long clientId) {
        return dashboardService.getClientDashboardStats(clientId);
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return new User();
    }
}
