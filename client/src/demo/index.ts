// =============================================================================
// MTS TELECOM - Demo Mode Barrel Export
// =============================================================================
// Point d'entrée unique pour tout le module démo.
// Import simplifié: import { isDemoMode, DemoBanner, ... } from "./demo";
// =============================================================================

export {
  isDemoMode,
  DEMO_MODE_ACTIVE,
  DEMO_USER,
  DEMO_TOKEN,
  DEMO_LATENCY_MS,
  seedDemoAuth,
} from "./demoConfig";
export {
  DEMO_DATA,
  DEMO_TICKETS,
  DEMO_INCIDENTS,
  DEMO_SERVICES,
  DEMO_USERS,
  DEMO_CLIENTS,
  DEMO_AUDIT_LOGS,
  DEMO_NOTIFICATIONS,
  DEMO_SLA_POLICIES,
  DEMO_AGENT_PERFORMANCE,
  DEMO_DASHBOARD_STATS,
} from "./demoData";
export { installDemoInterceptor } from "./demoInterceptor";
export { default as DemoBanner } from "./DemoBanner";
