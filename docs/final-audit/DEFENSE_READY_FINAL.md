# Defense Ready Final

Date: 2026-04-13

This document is the final defense-readiness note for the current repository state.

It is based on:
- `AGENTS.md`
- `docs/final-audit/00-repo-census.md`
- `docs/final-audit/01-non-regression-contract.md`
- `docs/final-audit/02-auth-rbac-email-audit.md`
- `docs/final-audit/03-ui-critical-audit.md`
- `docs/final-audit/04-repo-hygiene-audit.md`
- `docs/final-audit/05-baseline-checks.md`
- `docs/final-audit/06-repo-deep-clean.md`
- `docs/final-audit/progress/*.md`
- the latest validation runs executed on 2026-04-13

## Current Readiness Summary

The repository is defense-usable, but not "everything green with no caveat".

The strongest confirmed positives are:
- client lint passes
- full client test suite passes
- client production build completes
- Python AI service test baselines pass
- deployment docs and the additive defense compose profile are in place
- auth hardening and destructive-action hardening are implemented and covered by focused tests from previous lots
- repo hygiene and archive cleanup are completed

The main known remaining gaps are:
- backend full test suite still has 3 failing RBAC tests expecting `403` while current behavior returns `400` on ticket hard-delete attempts by non-admins
- ALLIE is still visible to `ADMIN` in the current frontend shell and ticket drawer, so the manager-only invariant is not yet fully restored
- frontend build still emits many pre-existing `prettier/prettier` warnings
- no final browser-driven e2e or full Docker boot smoke was run in this pass

## What Is Fixed

- Public signup is still `CLIENT`-only by intended flow and backend enforcement.
- Real email verification plumbing exists end to end, with resend flow and invalid/expired-token UX handling.
- Full authenticated access is blocked more safely for unverified accounts when verification is enabled.
- Internal account provisioning remains admin-driven.
- Additional admin demotion/deactivation now protects the last active admin on the backend.
- Definitive delete flows for tickets, incidents, and clients keep strong verification, server-side enforcement, and audit expectations.
- Client hard delete was aligned with the same strong confirmation model used for the other destructive flows.
- Client chatbot remains client-only in the main shell.
- Repo cleanup is applied:
  - sensitive QA cookie/session artifacts removed
  - root evidence moved to archive
  - legacy docs and legacy integration material archived
  - active docs and deployment guidance aligned
- A defense deployment path now exists with:
  - `docker-compose.defense.yml`
  - `.env.defense.example`
  - `scripts/deploy/start-defense-stack.bat`
  - `scripts/deploy/stop-defense-stack.bat`
  - `docs/DEFENSE_SMOKE_CHECKLIST.md`

## What Remains Intentionally Deferred

- ALLIE manager-only UI enforcement is still incomplete.
  - Current code still allows ALLIE for `ADMIN` in:
    - `client/src/components/layout/MainLayout.tsx`
    - `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
    - `client/src/components/tickets/TicketDrawer.tsx`
  - This is documented as known drift, not accepted behavior.

- The 3 backend RBAC tests below still fail in the full suite:
  - `TicketControllerRbacTest.clientCannotHardDeleteTicket`
  - `TicketControllerRbacTest.agentCannotHardDeleteTicket`
  - `TicketControllerRbacTest.managerCannotHardDeleteTicket`
  - Current mismatch: expected `403`, actual `400`

- UI critical polish from the dedicated audit is not fully closed:
  - ALLIE overlap/responsive issues
  - chatbot composer/scroll polish
  - ticket drawer clipping/z-index polish
  - final auth visual-direction alignment
  - friendly formatting normalization on every KPI screen

- Full SMTP real-world validation on a live mail provider was not executed in this pass.

- Full Docker runtime smoke and browser e2e remain manual validation steps for defense day.

## Validation Re-Run On 2026-04-13

### Client

- `npm run lint`
  - PASS
- `npm run test:ci -- --runInBand --coverage=false`
  - PASS
  - `25/25` suites passed
  - `100/100` tests passed
  - known non-blocking warnings remain:
    - `act(...)` warnings in `TicketList.test.tsx`
    - Jest open-handle warning after suite completion
- `npm run build`
  - PASS WITH WARNINGS
  - production bundle generated successfully
  - many `prettier/prettier` warnings remain in untouched UI files

### Backend

- `mvn "-Dmaven.repo.local=C:\Users\Chak-Tec\Desktop\PFE\server\.m2\repository" test`
  - FAIL
  - `173` tests run
  - `170` passed
  - `3` failed
  - all 3 failures are the known `TicketControllerRbacTest` status-code mismatch on non-admin hard-delete

### Python services

- `sentiment-service`: PASS
  - `python -m unittest discover tests`
  - `2` tests passed
- `duplicate-service`: PASS WITH WARNING
  - `python -m unittest discover tests`
  - `1` test passed
  - existing deprecation warning on `datetime.utcnow()`
- `ai-chatbot`: PASS
  - `python -m unittest discover tests`
  - `1` test passed
  - `python -m unittest test_chat_response_builder.py`
  - `5` tests passed

### Deployment config

- `docker compose -f docker-compose.yml -f docker-compose.defense.yml config`
  - PASS
  - additive defense profile parses correctly
  - `phpmyadmin` stays out of the default defense render unless explicitly enabled via profile
  - Docker emitted local config access warnings for `C:\Users\Chak-Tec\.docker\config.json`, but config rendering succeeded

## Demo Path By Role

### Client

Recommended path:
1. Login as `support@atlas-distribution.ma` or `dsi@sahara-connect.ma`
2. Show client dashboard
3. Create a ticket
4. Open the ticket detail
5. Show comments, SLA, and history
6. Optionally add a comment or attachment
7. Show the client chatbot for assistance

Talking points:
- public-facing role
- own tickets only
- cookie-based auth
- internal notes hidden from client

### Manager

Recommended path:
1. Login as `manager@mts-telecom.ma`
2. Show dashboard manager
3. Show ticket supervision and assignment
4. Open services / health / incidents
5. Show SLA and reports
6. If ALLIE is shown, present it only from the manager session

Talking points:
- supervision role
- assignment and monitoring
- SLA and reporting
- manager assistant concept

### Agent

Recommended path:
1. Login as `karim.agent@mts-telecom.ma` or `layla.agent@mts-telecom.ma`
2. Show assigned tickets
3. Take in charge / update status
4. Add comment
5. Resolve a ticket if needed

Talking points:
- operational handling role
- assigned-ticket focus
- no hard delete

### Admin

Recommended path:
1. Login as `admin@mts-telecom.ma`
2. Show Users page
3. Create an internal user
4. Show Clients page and client back-office creation
5. Show Audit log
6. Show strong-delete policy using confirmation safeguards

Talking points:
- admin-only user management
- internal provisioning
- audit and destructive safeguards

Important demo rule:
- Because ALLIE is still exposed to `ADMIN` in current UI code, avoid using ALLIE from the admin session during the defense.

## AI Demo Path

Recommended order:
1. Verify health endpoints first:
   - `http://127.0.0.1:8000/health`
   - `http://127.0.0.1:8001/health`
   - `http://127.0.0.1:8002/health`
2. Show the client chatbot from a client session.
3. Ask one clear telecom/support question in French.
4. If desired, show duplicate/sentiment assistance from ticket-related flows.
5. Keep the core business demo independent from AI in case startup is slower than expected.

Talking points:
- Python AI services are modular side services
- Spring Boot stays the business system of record
- AI enriches the experience but does not replace the core workflows

## Fallback Plan If An AI Microservice Is Slow

- Keep the main demo centered on:
  - login/session
  - role separation
  - tickets
  - incidents
  - services/health
  - reports/exports
  - audit
  - strong delete safeguards

- If `ai-chatbot` is slow:
  - confirm `http://127.0.0.1:8002/health`
  - explain that the assistant is an auxiliary microservice and continue with the business demo

- If `sentiment-service` or `duplicate-service` is slow:
  - do not block the role-based ticket lifecycle demo on those calls
  - present them as optional enrichments

- If any AI service is unavailable:
  - explicitly switch to the non-AI path already documented in `docs/DEMO_JURY_FINAL_CHECKLIST.md`
  - keep Swagger and health endpoints open as technical backup

## Exact Environment Variables Needed For Defense Day

Use one of two supported modes.

### A. Local split-process / H2-friendly demo

Minimum backend/runtime env:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `COOKIE_SECURE=false` for plain local HTTP
- `CORS_ALLOWED_ORIGINS`
- `WS_ALLOWED_ORIGIN_PATTERNS`
- `FRONTEND_BASE_URL`
- `REACT_APP_API_URL`

Recommended local AI/env values:
- `AI_AUTOSTART_ENABLED=false`
- `AI_SENTIMENT_BASE_URL=http://127.0.0.1:8000`
- `AI_DUPLICATE_BASE_URL=http://127.0.0.1:8001`
- `AI_CHATBOT_BASE_URL=http://127.0.0.1:8002`

If real email verification is demonstrated:
- `MAIL_ENABLED=true`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_FROM_NAME`
- `MAIL_SMTP_AUTH`
- `MAIL_SMTP_STARTTLS_ENABLE`
- `MAIL_SMTP_STARTTLS_REQUIRED`
- `MAIL_SMTP_CONNECTION_TIMEOUT_MS`
- `MAIL_SMTP_TIMEOUT_MS`
- `MAIL_SMTP_WRITE_TIMEOUT_MS`
- `AUTH_REQUIRE_EMAIL_VERIFICATION=true`
- `EMAIL_VERIFICATION_EXPIRATION_HOURS`

Optional but useful:
- `GOOGLE_CLIENT_ID`
- `REACT_APP_GOOGLE_OAUTH_CLIENT_ID`
- `REACT_APP_GOOGLE_OAUTH_ENABLED`
- `REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS`
- `AUTH_RATE_LIMIT_*`
- `PASSWORD_RESET_EXPIRATION_HOURS`
- `AUTH_SENSITIVE_ACTION_CODE_EXPIRATION_MINUTES`

### B. Docker defense-ready profile

Start from `.env.defense.example`.

Required compose variables:
- `COMPOSE_DB_PORT`
- `COMPOSE_DB_NAME`
- `COMPOSE_DB_USERNAME`
- `COMPOSE_DB_PASSWORD`
- `COMPOSE_DB_ROOT_PASSWORD`
- `COMPOSE_JWT_SECRET`
- `COMPOSE_COOKIE_SECURE=true`
- `COMPOSE_FRONTEND_BASE_URL`
- `COMPOSE_CORS_ALLOWED_ORIGINS`
- `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS`
- `COMPOSE_REACT_APP_API_URL`

Required invariants:
- `ALLOW_INTERNAL_SIGNUP=false`
- `AUTH_EXPOSE_TOKENS_IN_BODY=false`
- `COMPOSE_REACT_APP_DEMO_MODE=false`

If real email verification is enabled in compose:
- `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=true`
- `COMPOSE_MAIL_ENABLED=true`
- `COMPOSE_MAIL_HOST`
- `COMPOSE_MAIL_PORT`
- `COMPOSE_MAIL_USERNAME`
- `COMPOSE_MAIL_PASSWORD`
- `COMPOSE_MAIL_FROM`
- `COMPOSE_MAIL_FROM_NAME`
- `COMPOSE_MAIL_SMTP_AUTH`
- `COMPOSE_MAIL_SMTP_STARTTLS_ENABLE`
- `COMPOSE_MAIL_SMTP_STARTTLS_REQUIRED`
- `COMPOSE_MAIL_SMTP_CONNECTION_TIMEOUT_MS`
- `COMPOSE_MAIL_SMTP_TIMEOUT_MS`
- `COMPOSE_MAIL_SMTP_WRITE_TIMEOUT_MS`
- `COMPOSE_MANAGEMENT_HEALTH_MAIL_ENABLED=false`

Optional compose variables:
- `COMPOSE_GOOGLE_CLIENT_ID`
- `COMPOSE_REACT_APP_GOOGLE_OAUTH_CLIENT_ID`
- `COMPOSE_REACT_APP_GOOGLE_OAUTH_ENABLED`
- `COMPOSE_REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS`
- `COMPOSE_TICKETS_UPLOAD_DIR`
- `COMPOSE_USERS_AVATAR_UPLOAD_DIR`
- `COMPOSE_REPORTS_UPLOAD_DIR`

## Practical Defense-Day Recommendation

- Preferred primary path:
  - `scripts\dev\start-local.bat`
- Preferred quick fallback:
  - `scripts\demo\start-demo-h2.bat`
- Preferred container fallback:
  - `scripts\deploy\start-defense-stack.bat`

Keep open:
- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/DEMO_JURY_FINAL_CHECKLIST.md`
- `docs/DEFENSE_SMOKE_CHECKLIST.md`
- Swagger on `http://localhost:8080/swagger-ui.html`

## Bottom Line

The project is defense-demonstrable today, with a strong functional core:
- auth/session
- RBAC
- tickets
- incidents
- reports
- audit
- AI side services
- deployment guidance

But the final truth is not "fully closed with zero caveat".

The two most important known items still visible at repo level are:
- manager-only ALLIE is not fully restored in the UI
- backend full test suite still contains 3 RBAC status-code expectation failures on ticket hard-delete by non-admins

Those items should be spoken about honestly if raised, while keeping the live demo centered on the stable, already-verified business flows.
