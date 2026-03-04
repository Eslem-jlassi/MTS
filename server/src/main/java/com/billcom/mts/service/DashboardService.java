package com.billcom.mts.service;

import com.billcom.mts.dto.dashboard.DashboardStats;
import com.billcom.mts.entity.User;

/**
 * Service interface for dashboard statistics.
 */
public interface DashboardService {

    /**
     * Get comprehensive dashboard statistics (ADMIN, MANAGER).
     */
    DashboardStats getDashboardStats();

    /**
     * Get dashboard statistics for a specific agent.
     */
    DashboardStats getAgentDashboardStats(Long agentId);

    /**
     * Get dashboard statistics for a specific client.
     */
    DashboardStats getClientDashboardStats(Long clientId);

    /**
     * Get role-appropriate dashboard stats for current user.
     */
    DashboardStats getMyDashboardStats(User currentUser);
}
