# Non-Regression Contract

Audit date: 2026-04-12

Purpose:
- define the feature contract that future fixes must preserve before any business code change
- give a practical checklist for manual and automated validation
- make code/doc drift explicit instead of hiding it

Inspection basis for this contract:
- `AGENTS.md`
- `docs/final-audit/00-repo-census.md`
- `docs/DEPLOYMENT.md`
- targeted inspection of current frontend, backend, tests, scripts, and compose files

Rule of interpretation:
- when code and business intent drift, preserve the intended contract below
- do not widen behavior just because current code accidentally allows it

## Checklist

- [ ] Cookie/session auth
- [ ] Public client signup only
- [ ] Admin internal user creation
- [ ] Manager-only ALLIE
- [ ] Admin-only user management
- [ ] Ticket, incident, and client destructive safeguards
- [ ] Ticket comments, history, and SLA
- [ ] Exports
- [ ] Notifications and WebSocket
- [ ] Dark and light mode
- [ ] H2 demo path
- [ ] Docker Compose path

## 1. Cookie / Session Auth

Current expected behavior:
- Browser auth is cookie-first, not local-storage-only.
- Backend sets HttpOnly cookies `mts_auth_token` and `mts_refresh_token`.
- Frontend sends requests with `withCredentials: true`.
- Session bootstrap is based on `/api/auth/me`.
- On `401`, frontend attempts `/api/auth/refresh` and retries queued requests.
- Tokens should not be exposed in response bodies by default.

Primary frontend files:
- `client/src/api/client.ts`
- `client/src/api/authService.ts`
- `client/src/redux/slices/authSlice.ts`
- `client/src/App.tsx`

Primary backend files:
- `server/src/main/java/com/billcom/mts/controller/AuthController.java`
- `server/src/main/java/com/billcom/mts/service/impl/AuthServiceImpl.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
- `server/src/test/java/com/billcom/mts/service/impl/RefreshTokenServiceImplTest.java`

How to validate manually:
- Log in from the browser and confirm the session works after page refresh.
- Confirm cookies are set and logout clears them.
- Confirm a protected route redirects to `/login` when unauthenticated.
- Confirm expired access sessions recover through refresh instead of forcing a full relogin when refresh is still valid.

How to validate automatically if possible:
- Backend: `AuthControllerTest`, `AuthServiceImplTest`, `RefreshTokenServiceImplTest`
- Frontend: `client/src/App.test.tsx`, `client/src/pages/LoginPage.test.tsx`

## 2. Public Client Signup Only

Current expected behavior:
- Public route `/register` is only for `CLIENT`.
- Internal accounts (`AGENT`, `MANAGER`, `ADMIN`) are not self-signup accounts.
- Register page copy must continue to state that internal accounts are created from back-office/admin flows.
- Backend must reject non-client public signup unless the internal-signup override is explicitly enabled.

Primary frontend files:
- `client/src/pages/RegisterPage.tsx`
- `client/src/App.tsx`
- `client/src/api/authService.ts`

Primary backend files:
- `server/src/main/java/com/billcom/mts/controller/AuthController.java`
- `server/src/main/java/com/billcom/mts/service/impl/AuthServiceImpl.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
- `server/src/main/resources/application.yaml`

How to validate manually:
- Open `/register` and confirm only `CLIENT` is available.
- Confirm the page explains that internal accounts are created by an administrator.
- Try to submit a public signup payload with an internal role and confirm the backend rejects it under normal config.

How to validate automatically if possible:
- Existing partial coverage: `AuthControllerTest`, `AuthServiceImplTest`
- No dedicated UI regression test for the role selector restriction was confirmed during this audit, so manual validation remains mandatory

## 3. Admin Internal User Creation

Current expected behavior:
- Only `ADMIN` can create internal users through `/api/users/internal`.
- Internal-user creation must reject `CLIENT` and direct that case to the Clients module.
- Additional admins are created or promoted by an existing admin, not by public signup.

Primary frontend files:
- `client/src/pages/UsersPage.tsx`
- `client/src/api/userService.ts`
- `client/src/App.tsx`
- `client/src/components/layout/MainLayout.tsx`

Primary backend files:
- `server/src/main/java/com/billcom/mts/controller/UserController.java`
- `server/src/main/java/com/billcom/mts/service/impl/AuthServiceImpl.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`

How to validate manually:
- Log in as admin and confirm the Users page is accessible and can create `AGENT`, `MANAGER`, or `ADMIN`.
- Confirm creating a `CLIENT` from the internal-user endpoint is rejected.
- Confirm non-admin roles cannot access `/users` or call `/api/users/internal`.

How to validate automatically if possible:
- Backend: `server/src/test/java/com/billcom/mts/controller/UserControllerTest.java`
- Route/RBAC support is also partially covered by frontend route guards in `App.tsx`

## 4. Manager-Only ALLIE

Current expected behavior:
- Business contract: ALLIE must be manager-only.
- `ADMIN` must not get ALLIE in the UI.
- `CLIENT` and `AGENT` must not get ALLIE either.

Primary frontend files:
- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
- `client/src/api/managerCopilotService.ts`
- `client/src/components/manager-copilot/useManagerCopilot.ts`

Primary backend files:
- No dedicated backend `/manager-ai/copilot/dashboard` implementation was found in the repo
- Effective current fallback depends on existing dashboard, ticket, incident, and service APIs

How to validate manually:
- Log in as `MANAGER` and confirm ALLIE is available.
- Log in as `ADMIN` and confirm ALLIE is not available.
- Log in as `AGENT` and `CLIENT` and confirm ALLIE is not available.

How to validate automatically if possible:
- Current automated gap: no dedicated test was found for the manager-only ALLIE contract
- Closest nearby test: `client/src/components/layout/MainLayout.test.tsx` only verifies client-only chatbot visibility
- Manual validation is mandatory until a dedicated ALLIE visibility test exists

Important drift note:
- Current `MainLayout.tsx` inspection still allows ALLIE for `ADMIN` as well as `MANAGER`
- treat that as drift to be fixed later, not as acceptable contract behavior

## 5. Admin-Only User Management

Current expected behavior:
- User management remains admin-only in navigation, routed pages, and server-side enforcement.
- Non-admins must not access `/users`, user role updates, password admin reset/set flows, activation/deactivation, or user hard delete.

Primary frontend files:
- `client/src/App.tsx`
- `client/src/components/layout/MainLayout.tsx`
- `client/src/pages/UsersPage.tsx`
- `client/src/api/userService.ts`

Primary backend files:
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
- `server/src/main/java/com/billcom/mts/controller/UserController.java`
- `server/src/main/java/com/billcom/mts/service/impl/UserServiceImpl.java`

How to validate manually:
- Confirm only admins see the Users navigation item and can open `/users`.
- Confirm manager, agent, and client are redirected or forbidden.
- Confirm non-admin API calls against `/api/users` admin endpoints return forbidden/unauthorized.

How to validate automatically if possible:
- Backend: `server/src/test/java/com/billcom/mts/controller/UserControllerTest.java`
- Frontend route behavior is partially anchored in `client/src/App.tsx`

## 6. Ticket / Incident / Client Destructive Safeguards

Current expected behavior:
- Ticket hard delete is admin-only, strongly verified, server-enforced, and audited.
- Incident hard delete is admin-only, strongly verified, server-enforced, and audited.
- Client hard delete remains an admin/back-office flow and must keep blocker checks and audit traces.
- Strong confirmation requires the exact keyword `SUPPRIMER`.
- Local admins re-authenticate with current password.
- OAuth admins request and provide a verification code.
- Server-side blockers must continue to prevent unsafe hard deletes.
- Client ticket deletion remains a narrow logical-delete flow, not a broad physical delete.

Primary frontend files:
- `client/src/pages/TicketList.tsx`
- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/pages/IncidentsPage.tsx`
- `client/src/api/ticketService.ts`
- `client/src/api/incidentService.ts`
- `client/src/api/clientService.ts`

Primary backend files:
- `server/src/main/java/com/billcom/mts/service/SensitiveActionVerificationService.java`
- `server/src/main/java/com/billcom/mts/controller/TicketController.java`
- `server/src/main/java/com/billcom/mts/service/impl/TicketServiceImpl.java`
- `server/src/main/java/com/billcom/mts/controller/IncidentController.java`
- `server/src/main/java/com/billcom/mts/service/impl/IncidentServiceImpl.java`
- `server/src/main/java/com/billcom/mts/controller/ClientController.java`
- `server/src/main/java/com/billcom/mts/service/impl/UserServiceImpl.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`

How to validate manually:
- Confirm only admins see hard-delete actions for eligible tickets and incidents.
- Confirm the modal requires `SUPPRIMER`.
- Confirm local admin requires password.
- Confirm OAuth admin requires challenge/code.
- Confirm non-eligible tickets and incidents cannot be hard-deleted.
- Confirm client destructive paths still produce audit traces and preserve blocker logic.

How to validate automatically if possible:
- Backend: `SensitiveActionVerificationServiceTest`, `TicketServiceImplTest`, `IncidentServiceImplTest`
- Frontend: `client/src/pages/TicketList.test.tsx`, `client/src/pages/IncidentsPage.test.tsx`

## 7. Ticket Comments / History / SLA

Current expected behavior:
- Ticket comments can be added through the existing comment flow.
- Internal notes remain hidden from clients.
- Closed or cancelled tickets keep collaboration restrictions.
- Ticket history remains populated and visible through the existing history surfaces.
- SLA deadlines, warnings, breach flags, pause/resume logic, and escalation behaviors must remain coherent.

Primary frontend files:
- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/pages/TicketDetail.tsx`
- `client/src/api/ticketService.ts`
- `client/src/pages/SlaPage.tsx`

Primary backend files:
- `server/src/main/java/com/billcom/mts/controller/TicketController.java`
- `server/src/main/java/com/billcom/mts/service/impl/TicketServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/impl/SlaCalculationServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/impl/EscalationEngineServiceImpl.java`

How to validate manually:
- Create or open a ticket, add a comment, and confirm it appears in the comments tab.
- Confirm clients do not see internal notes.
- Change status through a valid workflow and confirm history updates.
- Put a ticket in `PENDING`, then resume it, and confirm SLA behavior still looks correct.
- Confirm SLA badges and warnings match the ticket state in list and detail views.

How to validate automatically if possible:
- Backend: `server/src/test/java/com/billcom/mts/service/impl/TicketServiceImplTest.java`
- Frontend: `client/src/pages/TicketDetail.test.tsx`, `client/src/pages/TicketList.test.tsx`

## 8. Exports

Current expected behavior:
- Non-client staff users keep access to ticket exports in CSV, Excel, and PDF through existing ticket export flows.
- Managers and admins keep report generation and download behavior through current report flows.
- Export formats, routes, and downloaded file names should remain stable unless the task explicitly targets export behavior.

Primary frontend files:
- `client/src/pages/TicketList.tsx`
- `client/src/api/ticketService.ts`
- `client/src/pages/ReportsPage.tsx`

Primary backend files:
- `server/src/main/java/com/billcom/mts/controller/TicketController.java`
- `server/src/main/java/com/billcom/mts/service/impl/TicketServiceImpl.java`
- `server/src/main/java/com/billcom/mts/controller/ReportController.java`
- `server/src/main/java/com/billcom/mts/service/ReportGenerationService.java`

How to validate manually:
- Log in as a non-client staff user and confirm the export buttons appear on the ticket list.
- Export CSV, Excel, and PDF and confirm downloads are generated.
- Confirm report download still works for allowed roles.

How to validate automatically if possible:
- Frontend: `client/src/pages/TicketList.test.tsx`, `client/src/pages/ReportsPage.test.tsx`
- Backend: `server/src/test/java/com/billcom/mts/service/ReportGenerationServiceTest.java`

## 9. Notifications / WebSocket

Current expected behavior:
- Authenticated users keep access to notification REST endpoints.
- Real-time notifications continue to flow through SockJS/STOMP on `/ws`.
- Frontend subscribes to `/user/queue/notifications` and `/topic/tickets`.
- Notification count, unread list, mark-as-read, and mark-all-as-read remain functional.

Primary frontend files:
- `client/src/components/layout/MainLayout.tsx`
- `client/src/hooks/useWebSocketNotifications.ts`
- `client/src/components/notifications/NotificationCenter.tsx`
- `client/src/pages/NotificationsPage.tsx`
- `client/src/api/notificationService.ts`
- `client/src/redux/slices/notificationsSlice.ts`

Primary backend files:
- `server/src/main/java/com/billcom/mts/config/WebSocketConfig.java`
- `server/src/main/java/com/billcom/mts/config/WebSocketAuthInterceptor.java`
- `server/src/main/java/com/billcom/mts/controller/NotificationController.java`
- `server/src/main/java/com/billcom/mts/service/NotificationService.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`

How to validate manually:
- Log in as an authenticated user and open the notification center.
- Trigger a notification-producing event such as ticket creation, assignment, or comment.
- Confirm the unread count updates and the notification page remains usable.
- Confirm a logged-out or unauthenticated browser does not receive protected notification data.

How to validate automatically if possible:
- Backend: `NotificationControllerTest`, `NotificationServiceTest`
- Frontend: `client/src/components/layout/MainLayout.test.tsx` at least confirms the layout uses the notification and WebSocket hook wiring

## 10. Dark / Light Mode

Current expected behavior:
- Both light mode and dark mode remain functional.
- Theme changes continue to be applied through `ThemeContext`.
- Theme state continues to persist in local storage under the current mechanism.
- Theme toggle remains accessible in the current shell/layout.

Primary frontend files:
- `client/src/context/ThemeContext.tsx`
- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/auth/AuthLayout.tsx`

Primary backend files:
- None required for current theme behavior

How to validate manually:
- Toggle theme from the main layout.
- Refresh the page and confirm the selected theme persists.
- Check both auth screens and protected screens for obvious readability regressions.

How to validate automatically if possible:
- Existing indirect coverage: `client/src/App.test.tsx`, `client/src/components/layout/MainLayout.test.tsx` both wrap with `ThemeProvider`
- No dedicated toggle-and-persist regression test was confirmed during this audit, so manual validation remains important

## 11. H2 Demo Path

Current expected behavior:
- The H2 demo workflow remains runnable through official scripts.
- Backend H2 profile remains usable for demo without MySQL.
- Frontend and local AI services must still work in the H2 demo path.
- The H2 console remains available on the documented backend route.

Primary frontend files:
- `client/.env.demo`
- `client/src/demo/*`

Primary backend files:
- `server/src/main/resources/application-h2.yaml`
- `server/src/main/java/com/billcom/mts/config/DataInitializer.java`

Primary script/docs files:
- `scripts/demo/start-demo-h2.bat`
- `scripts/dev/start-backend-h2.bat`
- `docs/DEPLOYMENT.md`

How to validate manually:
- Run `scripts\demo\start-demo-h2.bat`.
- Confirm frontend, backend, AI health endpoints, and H2 console are reachable.
- Confirm demo credentials still work and a few core screens load.

How to validate automatically if possible:
- Scripted smoke exists: `scripts\deploy\smoke-post-deploy.bat`
- No dedicated fully automated H2 end-to-end contract test was found in the repo

## 12. Docker Compose Path

Current expected behavior:
- `docker-compose.yml` remains the source of truth for the containerized stack.
- Compose path continues to bring up MySQL, phpMyAdmin, AI services, backend, and frontend together.
- Health checks, ports, volumes, and service dependencies remain operational.
- Cookie/session auth, upload paths, and AI gateway URLs must still work in compose mode.

Primary frontend files:
- `client/Dockerfile`
- `client/nginx.conf`
- `client/.env.sample`

Primary backend files:
- `server/Dockerfile`
- `server/src/main/resources/application.yaml`

Primary script/docs files:
- `docker-compose.yml`
- `scripts/deploy/start-stack.bat`
- `scripts/deploy/smoke-post-deploy.bat`
- `docs/DEPLOYMENT.md`

How to validate manually:
- Run the official Docker startup path.
- Confirm frontend, backend, swagger, phpMyAdmin, and AI health endpoints respond.
- Confirm login still works and at least one authenticated screen loads.

How to validate automatically if possible:
- Scripted smoke exists: `scripts\deploy\smoke-post-deploy.bat`
- The compose file already encodes health checks for MySQL, AI services, backend, and frontend

## Use This Contract During Future Fixes

- Inspect the relevant frontend and backend files before editing.
- Reuse existing routes, cookies, DTOs, and flows instead of replacing them.
- Run only the checks relevant to the touched area.
- If a fix touches any contract item above, explicitly revalidate that item before closing the task.
