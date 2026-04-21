# Reality Check After First Pass

Date: 2026-04-13

## Scope

- Read `AGENTS.md`.
- Read the existing files in `docs/final-audit/`.
- Compared the latest reported issues with the current codebase state.
- Used the latest screenshots as current-state evidence for the AI and floating-assistant failures.
- Did not modify application code.
- Did not run a fresh browser e2e reproduction in this task.

## Evidence Used

- `AGENTS.md`
- `docs/final-audit/00-repo-census.md`
- `docs/final-audit/01-non-regression-contract.md`
- `docs/final-audit/02-auth-rbac-email-audit.md`
- `docs/final-audit/03-ui-critical-audit.md`
- `docs/final-audit/04-repo-hygiene-audit.md`
- `docs/final-audit/05-baseline-checks.md`
- `docs/final-audit/06-repo-deep-clean.md`
- `docs/final-audit/DEFENSE_READY_FINAL.md`
- Latest screenshots provided in the task
- Current frontend/backend/AI integration files inspected directly

## Reality Summary

- Still clearly reproduced:
  - ALLIE visible in admin context
  - floating assistant scroll/overflow problems
  - assignment dropdown clipping
  - knowledge base weak/static UI
  - services page still weak compared to available backend capabilities
  - audit page and audit detail modal still incomplete
  - AI microservice unavailability remains visible in the UI, with localhost/port leakage
- Partially reproduced:
  - ticket hard-delete is implemented, but still feels missing in common admin paths because it is exposed only in a narrow list-case
  - client hard-delete looks wired, but live failures are still plausible because backend blockers are strict
- Confirmed broken from current implementation:
  - user hard-delete frontend/backend contract is mismatched
- Not directly reproduced as a wiring bug from code inspection:
  - incident hard-delete path exists end-to-end, so current failure is more likely runtime/data/constraint related than a missing button or missing API call

## Delta Versus Prior Audit Notes

- `03-ui-critical-audit.md` was directionally correct: the ALLIE leak and dropdown/scroll issues are still real in current code.
- `DEFENSE_READY_FINAL.md` is too optimistic on definitive delete closure:
  - ticket hard-delete exists
  - incident hard-delete exists
  - client hard-delete exists but is still heavily blocker-driven
  - user hard-delete is still broken at the frontend/backend contract level
- The previous audit notes that AI test baselines pass, but the latest screenshots show that live local AI reachability is still broken in the current working state.

## Issue-by-Issue Check

### 1. Manager ALLIE still visible in admin pages

- Status: Reproduced from current code.
- Likely root cause:
  - duplicated widened role checks still allow `ADMIN`
  - the leak is not limited to the floating widget
  - `TicketDrawer` also treats admin as manager context
- Likely frontend files:
  - `client/src/components/layout/MainLayout.tsx`
  - `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
  - `client/src/components/tickets/TicketDrawer.tsx`
- Likely backend files:
  - None likely. This is primarily a frontend RBAC leak.
- Type:
  - RBAC leak
  - regression

### 2. Manager assistant UI still broken (scroll, overflow, floating panel)

- Status: Reproduced from the latest screenshot and current CSS/component structure.
- Likely root cause:
  - floating assistant shells are fixed to bottom-right and remain visually heavy on shorter viewports
  - panel sizing is width-driven more than height-driven
  - internal scroll ownership is not clean enough
  - the open-state shell still competes with floating controls/decorative layers
- Likely frontend files:
  - `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
  - `client/src/components/manager-copilot/ManagerCopilotStyles.css`
  - `client/src/components/manager-copilot/ManagerCopilotMainPanel.tsx`
  - `client/src/components/manager-copilot/ManagerCopilotPanelParts.tsx`
- Likely backend files:
  - None likely.
- Type:
  - UI-only
  - regression

### 3. Definitive ticket delete action missing for admin

- Status: Partially reproduced.
- Likely root cause:
  - the hard-delete action does exist in `TicketList.tsx`
  - but it is visible only when `isAdmin && status === NEW && !assignedToId`
  - there is no equivalent hard-delete affordance in `TicketDrawer.tsx`
  - in practice this still makes the action feel "missing" in common admin flows
- Likely frontend files:
  - `client/src/pages/TicketList.tsx`
  - `client/src/components/tickets/TicketDrawer.tsx`
  - `client/src/api/ticketService.ts`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/controller/TicketController.java`
  - `server/src/main/java/com/billcom/mts/service/impl/TicketServiceImpl.java`
- Type:
  - UI-only discoverability gap
  - regression

### 4. Definitive incident delete failing

- Status: Not reproduced as a missing binding or missing API path from code inspection.
- Likely root cause:
  - frontend and backend contract look aligned
  - if the live flow is still failing, the more likely cause is runtime data state, persistence constraint, or a delete-time relation edge case
  - the current implementation clears `tickets` and `affectedServices` before delete, so the path is not obviously missing
- Likely frontend files:
  - `client/src/pages/IncidentsPage.tsx`
  - `client/src/api/incidentService.ts`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/controller/IncidentController.java`
  - `server/src/main/java/com/billcom/mts/service/impl/IncidentServiceImpl.java`
  - `server/src/main/java/com/billcom/mts/entity/Incident.java`
- Type:
  - likely regression
  - not an obvious API mismatch from current code

### 5. Definitive client delete failing

- Status: Partially reproduced, but not as an obvious wiring bug.
- Likely root cause:
  - frontend sends the strong-confirmation payload correctly
  - backend route expects the same payload correctly
  - current live failures are more likely caused by hard-delete blockers on client-linked data
  - `UserServiceImpl.collectHardDeleteBlockers()` explicitly refuses deletion when the client still owns tickets
- Likely frontend files:
  - `client/src/pages/ClientsPage.tsx`
  - `client/src/api/clientService.ts`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/controller/ClientController.java`
  - `server/src/main/java/com/billcom/mts/service/impl/UserServiceImpl.java`
  - `server/src/main/java/com/billcom/mts/service/SensitiveActionVerificationService.java`
- Type:
  - backend blocker / regression perception
  - not an obvious API mismatch

### 6. Definitive user delete failing

- Status: Reproduced from current code.
- Likely root cause:
  - frontend calls `DELETE /users/{id}/hard-delete` with no request body
  - backend hard-delete route is defined with `@RequestBody`
  - frontend modal only asks for the keyword, but does not capture/send id re-entry, password, or verification code
  - this path is currently out of line with the stronger destructive-action model used elsewhere
- Likely frontend files:
  - `client/src/pages/UsersPage.tsx`
  - `client/src/api/userService.ts`
  - `client/src/components/ui/ConfirmModal.tsx`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/controller/UserController.java`
  - `server/src/main/java/com/billcom/mts/service/impl/UserServiceImpl.java`
  - `server/src/main/java/com/billcom/mts/dto/security/AdminHardDeleteRequest.java`
- Type:
  - binding bug
  - API mismatch
  - regression

### 7. Assignment dropdown UI still clipped/broken

- Status: Reproduced from current code.
- Likely root cause:
  - dropdown is absolutely positioned inside a locally clipped scroll region
  - `Drawer.tsx` already wraps content in `overflow-y-auto`
  - `TicketDrawer.tsx` introduces another scrolling/clipping surface
  - dropdown z-index is only local (`z-20`) and does not escape the clipping context
- Likely frontend files:
  - `client/src/components/tickets/TicketDrawer.tsx`
  - `client/src/components/ui/Drawer.tsx`
- Likely backend files:
  - None likely.
- Type:
  - UI-only
  - regression

### 8. Knowledge base UI still unsatisfactory

- Status: Reproduced from current implementation.
- Likely root cause:
  - page is still a static FAQ surface
  - only a small hardcoded set of questions exists
  - search is only local text filtering
  - there is no richer content model, no article detail view, and no stronger troubleshooting flow
- Likely frontend files:
  - `client/src/pages/KnowledgeBasePage.tsx`
- Likely backend files:
  - None currently. The page is effectively frontend-only/static.
- Type:
  - UI-only
  - product incompleteness

### 9. Services UI still weak

- Status: Reproduced from current implementation.
- Likely root cause:
  - the page is still mostly a CRUD/list/cards/table screen
  - it does not exploit the richer backend service-health and status-history capabilities
  - no stronger service detail/supervision storytelling is visible in the page itself
  - this looks more like an underused API surface than a missing backend capability
- Likely frontend files:
  - `client/src/pages/ServicesPage.tsx`
  - `client/src/api/telecomServiceService.ts`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/controller/ServiceController.java`
  - `server/src/main/java/com/billcom/mts/service/impl/TelecomServiceServiceImpl.java`
- Type:
  - UI-only
  - underused backend capability

### 10. Audit page and audit detail modal still imperfect

- Status: Reproduced from current implementation.
- Likely root cause:
  - the page advertises advanced search but exposes only a subset of likely useful filters
  - row click does not call `auditService.getAuditLog(id)` and relies on the table row payload already in memory
  - detail modal renders old/new values as raw `<pre>` blocks with no stronger formatting/searchability
  - table descriptions are heavily truncated, so the modal becomes more important than it currently is
- Likely frontend files:
  - `client/src/pages/AuditLogPage.tsx`
  - `client/src/api/auditService.ts`
  - `client/src/components/ui/Modal.tsx`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/controller/AuditLogController.java`
  - backend seems available, but is only partially leveraged by the page
- Type:
  - UI-only
  - binding gap
  - regression

## Cross-Cutting AI Microservices Check

This was not one of the explicit numbered issue bullets, but it is part of the current broken reality shown in the screenshots and should be recorded here.

### AI chatbot unavailable in floating assistant

- Status: Reproduced from screenshot and current error-flow code.
- Likely root cause:
  - local `ai-chatbot` service is not running or not reachable on `127.0.0.1:8002` in the current live state
  - current frontend/backend messaging still leaks raw localhost/port details directly into the UI
- Likely frontend files:
  - `client/src/components/chatbot/ChatbotWidget.tsx`
  - `client/src/components/chatbot/useChatbotConversation.ts`
  - `client/src/api/client.ts`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/service/ChatbotService.java`
  - `server/src/main/resources/application.yaml`
  - `scripts/dev/start-ai-services.bat`
- Type:
  - service availability problem
  - error-messaging leak

### Ticket drawer AI sentiment and duplicate checks unavailable

- Status: Reproduced from screenshot and current auto-analysis code.
- Likely root cause:
  - sentiment and duplicate services are not reachable in the current live state
  - `TicketDrawer` auto-triggers both services on open, so failures are very visible
  - current backend messages still expose `127.0.0.1:8000` and `127.0.0.1:8001`
- Likely frontend files:
  - `client/src/components/tickets/TicketDrawer.tsx`
  - `client/src/api/sentimentService.ts`
  - `client/src/api/duplicateService.ts`
  - `client/src/api/client.ts`
- Likely backend files:
  - `server/src/main/java/com/billcom/mts/service/SentimentAnalysisService.java`
  - `server/src/main/java/com/billcom/mts/service/DuplicateDetectionService.java`
  - `server/src/main/resources/application.yaml`
  - `scripts/dev/start-ai-services.bat`
- Type:
  - service availability problem
  - error-messaging leak

## Bottom Line

- The latest reported issues are not obsolete. Several of them are still real in the current codebase.
- The most clearly confirmed current defects are:
  - ALLIE admin leak
  - assistant overflow/clipping
  - assignment dropdown clipping
  - user hard-delete contract mismatch
  - live AI unavailability with localhost leakage
- The most important "not fully fixed despite prior audit optimism" item is user hard-delete.
- The most likely "looks broken live, but not obviously broken in static wiring" items are incident hard-delete and client hard-delete.
- No application code was changed in this task. This file is a reality-check report only.
