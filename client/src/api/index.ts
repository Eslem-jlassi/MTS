// =============================================================================
// MTS TELECOM - API Services Index
// =============================================================================

export { default as api, getErrorMessage } from "./client";
export { default as authService } from "./authService";
export { default as chatbotService } from "./chatbotService";
export { default as ticketService } from "./ticketService";
export { default as dashboardService } from "./dashboardService";
export { default as userService } from "./userService";
export { default as clientService } from "./clientService";
export { default as telecomServiceService } from "./telecomServiceService";
export { default as slaService } from "./slaService";
export { notificationService } from "./notificationService";
export { macroService } from "./macroService";
export { incidentService } from "./incidentService";
export { auditService } from "./auditService";
export { escalationService } from "./escalationService";
export { businessHoursService } from "./businessHoursService";
export { reportService } from "./reportService";
export { authFlowService } from "./authFlowService";
export { buildManagerDashboardData } from "./managerDashboardAdapter";
export type { ManagerDashboardData, ManagerKpis } from "./managerDashboardAdapter";
