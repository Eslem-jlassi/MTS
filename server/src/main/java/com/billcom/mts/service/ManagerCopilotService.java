package com.billcom.mts.service;

import com.billcom.mts.dto.managercopilot.ManagerCopilotDashboardResponse;

public interface ManagerCopilotService {

    ManagerCopilotDashboardResponse getDashboardSummary(String period, Long serviceId, Long clientId);
}
