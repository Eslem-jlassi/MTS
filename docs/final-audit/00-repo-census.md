# Repo Census

Audit date: 2026-04-12

This note is based on the requested repository reading plus source inspection across `client`, `server`, `sentiment-service`, `duplicate-service`, `ai-chatbot`, `scripts`, and `docs`.

Scope rule used for this pass:
- Application code was not modified.
- Statements below are marked by repository evidence unless explicitly called out as inference or missing evidence.

## Module Map

| Module | Stack | Main responsibility | Key evidence |
| --- | --- | --- | --- |
| `client` | React + TypeScript + CRA + MUI + Redux Toolkit | Browser UI, route protection, session bootstrap, dashboards, ticket/incidents/reports pages, client chatbot widget, manager copilot widget | `client/src/App.tsx`, `client/src/api`, `client/src/components/layout/MainLayout.tsx`, `client/src/pages` |
| `server` | Spring Boot 3.3 + Spring Security + JPA + WebSocket + Flyway | Main business API, auth/cookies, RBAC, persistence, SLA/escalation, incidents, reports, notifications, audit, AI gateways | `server/src/main/java/com/billcom/mts/controller`, `service`, `security`, `entity`, `repository` |
| `sentiment-service` | FastAPI + transformers/torch + rules engine | Ticket classification and sentiment analysis with BERT-first hybrid fallback to rules | `sentiment-service/app/main.py`, `classifier.py` |
| `duplicate-service` | FastAPI + sentence-transformers + sklearn fallback | Duplicate ticket detection and mass-incident signal detection | `duplicate-service/app/main.py`, `duplicate_detector.py` |
| `ai-chatbot` | FastAPI + sentence-transformers + FAISS | RAG chatbot for client assistance plus massive incident detection from ticket datasets | `ai-chatbot/app.py`, `chat_response_builder.py`, `massive_incident_detector.py` |
| `scripts` | Windows batch scripts | Official local/dev/demo/deploy entry points and smoke checks | `scripts/dev`, `scripts/demo`, `scripts/deploy` |
| `docs` | Markdown | Repo docs, architecture/deployment/demo guidance, audit progress notes | `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/final-audit/progress` |

## Structure And Responsibilities

### `client`

- `src/api`: typed API clients, cookie-based axios client, auth services, chatbot/sentiment/duplicate/manager-copilot adapters.
- `src/components`: reusable UI, including `chatbot`, `manager-copilot`, `tickets`, `layout`, `auth`.
- `src/pages`: routed screens for login/register, dashboards, tickets, services, clients, users, incidents, reports, SLA, audit.
- `src/redux`: auth/session state and async bootstrap.
- `src/demo`: demo-mode interceptor and seed data for an in-browser simulated backend.
- Responsibility split observed: routing and role UX in the client, authorization truth in the backend.

### `server`

- `controller`: REST surface by domain.
- `service` and `service/impl`: domain workflows, gateways, scheduled jobs, deletion rules, SLA logic.
- `security`: JWT filter, auth entrypoints, role enforcement.
- `entity` and `repository`: persistent model and data access.
- `config`: security config, Swagger, WebSocket, seed/init, app properties wiring.
- Responsibility split observed: backend is the system-of-record for permissions, workflow constraints, audit, and persistence.

### `sentiment-service`

- `app/main.py`: FastAPI app and `/health`, `/classify`, `/analyze`.
- `app/classifier.py`: hybrid classification pipeline, BERT offline-first with rules fallback.
- `app/rules.py`, `config.py`, `utils.py`, `schemas.py`: telecom-specific rule engine and response shaping.
- Responsibility observed: this service is no longer just "sentiment"; it also returns category, service, urgency, criticality, reasoning, risk flags, and missing information.

### `duplicate-service`

- `app/main.py`: FastAPI app and `/health`, `/detect-duplicates`.
- `app/duplicate_detector.py`: embeddings, cosine similarity, TF-IDF fallback, mass-incident heuristics.
- `app/config.py`, `utils.py`, `schemas.py`: thresholds, request/response contracts, normalization.
- Responsibility observed: duplicate detection is semantic and can degrade to TF-IDF if sentence-transformers is unavailable.

### `ai-chatbot`

- `app.py`: FastAPI app, startup loading of FAISS index and metadata, `/chat`, `/massive-incidents/detect`, `/health`.
- `chat_response_builder.py`: localized answer shaping, summary/impact/next-step/caution structure.
- `massive_incident_detector.py`: ticket clustering and candidate incident detection.
- `data` and `index`: checked-in datasets and prebuilt RAG assets.
- `scripts`: dataset prep and vector index generation utilities.

### `scripts`

- `scripts/dev`: local startup flows for frontend, backend, and AI services.
- `scripts/demo`: one-command H2 demo startup.
- `scripts/deploy`: full Docker stack startup, shutdown, logs, smoke verification.
- `scripts/legacy`: older scripts kept outside the official path.

### `docs`

- Active docs cover architecture, deployment, database, demo checklist, and audit progress notes.
- `docs/final-audit/progress` already contains focused findings on admin ticket hard delete and chatbot UX/language.
- Missing doc references are listed under "Unknowns / Missing Evidence".

## Build, Test, Run Commands By Module

| Module | Build / install | Run | Test |
| --- | --- | --- | --- |
| `client` | `npm install`, `npm run build` | `npm start` or `scripts\dev\start-frontend.bat` | `npm run test:ci -- --runInBand --coverage=false`, `npm run lint` |
| `server` | `mvn clean package`, `mvn test` | `mvn spring-boot:run`, `mvn spring-boot:run -Dspring-boot.run.profiles=h2`, or official batch scripts in `scripts/dev` | `mvn test` and targeted test commands documented in repo usage/history |
| `sentiment-service` | `pip install -r requirements.txt` | `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`, or `START_SENTIMENT_SERVICE.bat` | `python -m unittest discover tests` |
| `duplicate-service` | `pip install -r requirements.txt` | `python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`, or `START_DUPLICATE_SERVICE.bat` | `python -m unittest discover tests` |
| `ai-chatbot` | `pip install -r requirements.txt` | `python -m uvicorn app:app --host 127.0.0.1 --port 8002`, or `START_AI_CHATBOT.bat` | `python -m unittest discover tests`, plus `python -m unittest test_chat_response_builder.py` |
| `scripts` | None | `scripts\dev\start-local.bat`, `scripts\demo\start-demo-h2.bat`, `scripts\deploy\start-stack.bat` | `scripts\deploy\smoke-post-deploy.bat` |
| `docs` | None | None | None |

## Main Flows

### Authentication / session / bootstrap

- Frontend bootstrap starts in `client/src/index.tsx`, optionally seeds demo auth, then dispatches `fetchCurrentUser()`.
- Route protection uses `ProtectedRoute`, `PublicRoute`, and `RoleBasedRoute` in `client/src/App.tsx`.
- Axios client uses `withCredentials: true` and a refresh-on-401 queue in `client/src/api/client.ts`.
- Backend auth is cookie-first. `AuthController` sets `mts_auth_token` and `mts_refresh_token` as HttpOnly cookies.
- `/api/auth/me` is the authoritative session bootstrap endpoint.
- Tokens are intentionally removed from response bodies unless `AUTH_EXPOSE_TOKENS_IN_BODY=true`.

### Public signup

- Public signup route is `/register`.
- Frontend only offers role `CLIENT`.
- Backend `/api/auth/register` defaults to `CLIENT` and blocks non-client signup unless `ALLOW_INTERNAL_SIGNUP=true`.
- Email verification can gate session issuance depending on config.
- Google OAuth login also resolves to client accounts and can create/link a client profile.

### Internal user provisioning

- Admin-only internal account creation exists at `/api/users/internal`.
- That path explicitly excludes `CLIENT`; client onboarding is handled through the Clients module.
- Admin-facing client provisioning exists at `/api/clients` and creates both account and client profile.
- There is also admin-only `/api/auth/register/admin`, but operationally the dedicated Users and Clients flows appear to be the intended UI paths.

### Ticket lifecycle

- Client creates ticket through `/api/tickets`.
- Backend assigns ticket number `TKT-<year>-<5digits>`, calculates SLA deadline, writes history and audit.
- Agents can work only on assigned tickets. Managers/admins supervise across tickets. Clients are restricted to their own tickets.
- Status transitions are constrained. `ASSIGNED` cannot be set directly; it is reached through assignment.
- Resolving requires resolution text.
- Comments, internal notes, attachments, history, assignment, unassignment, and exports are supported.
- Client deletion is logical only, and only when ticket is `NEW` and unassigned.
- Admin hard delete is physical and heavily constrained; see "Deletion / sensitive actions".

### SLA / escalation

- SLA defaults are configured in app config and can be overridden by policies.
- Deadline calculation can run in 24/7 mode or business-hours mode.
- Entering `PENDING` pauses SLA; leaving it resumes and extends deadline.
- Scheduled escalation evaluation runs every 5 minutes and can escalate status, priority, assignee, notifications, and audit traces.
- Dedicated controllers exist for business hours, SLA policies, escalation rules, stats, timeline, and manual evaluation.

### Incidents

- Incident management is staff-only.
- Incidents have their own numbering, timeline, notes, post-mortem, linked tickets, and linked affected services.
- Active incidents are effectively `OPEN` or `IN_PROGRESS`.
- Admin hard delete exists and clears many-to-many relations before deletion.

### Reports

- Managers/admins can upload, reupload, generate, publish, unpublish, download, and delete reports.
- Generated reports can be PDF or CSV and are persisted both on disk and in the database.
- KPI generation includes ticket and incident metrics plus an executive summary engine.
- Important drift: controller comments say report consultation is for all authenticated users, but `SecurityConfig` restricts `/api/reports/**` to `ADMIN` and `MANAGER`.

### Chatbot / client assistant

- `ChatbotWidget` is mounted only for `CLIENT`.
- Frontend calls backend `/api/chatbot/ask`.
- Backend gateway forwards to `ai-chatbot` `/chat`, enriches with massive-incident signals, and surfaces availability/fallback data.
- Response model includes structured reasoning, recommendations, risk flags, sources, and language metadata.

### Manager assistant ALLIE

- `ManagerCopilotWidget` is mounted for `MANAGER` and `ADMIN`.
- Frontend names this assistant `ALLIE`.
- Frontend attempts `/manager-ai/copilot/dashboard`.
- No backend endpoint for `/manager-ai/copilot` was found in `server/src/main/java`.
- Observed fallback path: the frontend synthesizes a local manager snapshot from dashboard, tickets, incidents, and service health APIs when the dedicated endpoint fails.

### Deletion / sensitive actions

- Ticket hard delete and incident hard delete require strong verification through `SensitiveActionVerificationService`.
- Required confirmation keyword is `SUPPRIMER`.
- Local admin accounts re-authenticate with password.
- OAuth admin accounts must request and enter an emailed code.
- Ticket hard delete blockers include status, assignee, comments, attachments, history, SLA timeline, and linked incidents.
- User/client hard delete blockers include self-delete protections, last-admin protection, and dependency checks across tickets, comments, reports, audit logs, and client-profile rules.

## Role Map

| Role | Primary surface | Main capabilities observed |
| --- | --- | --- |
| `CLIENT` | Public signup, own dashboard/tickets, chatbot | Own tickets only, create ticket, comment on own ticket, see non-internal history/comments, logical delete on very narrow conditions |
| `AGENT` | Ticket handling, incidents | Work only on assigned tickets, change allowed statuses, comment, add attachments, participate in incidents, no hard delete |
| `MANAGER` | Supervision, SLA, reports, incidents, services, ALLIE | Global ticket supervision, assignment, service health, incident management, reports, SLA rules, manager copilot |
| `ADMIN` | Full back-office | Everything managers can do plus users, audit, hard delete flows, stronger config/admin surfaces |

## Auth / RBAC Overview

- Backend is the source of truth for authorization. Frontend mirrors role intent but should not be treated as authoritative.
- Security is JWT-based with HttpOnly cookies plus refresh token rotation.
- Public auth endpoints include login, register, Google auth, refresh, forgot/reset password, verify email, resend verification.
- Protected domain APIs are mostly role-scoped in `SecurityConfig`.
- Notable hard restrictions include the following:
- `POST /api/tickets` is `CLIENT` only.
- Ticket assignment is `ADMIN`/`MANAGER`.
- Ticket status change is `ADMIN`/`MANAGER`/`AGENT`.
- Hard-delete routes for tickets and incidents are `ADMIN` only.
- Users module is `ADMIN` only.
- Reports are effectively `ADMIN`/`MANAGER` only.
- UI RBAC exists in `App.tsx`, `MainLayout.tsx`, `RoleBasedRoute`, `usePermissions.ts`, and some page-level conditions.

## AI Integration Map

| Capability | UI / caller | Backend gateway | Python service | Observed behavior |
| --- | --- | --- | --- | --- |
| Ticket classification and sentiment | `client/src/components/tickets/TicketDrawer.tsx` via `sentimentService` | `/api/ai/sentiment/analyze` | `sentiment-service` `/analyze` and `/classify` | Manual or UI-triggered analysis from ticket screens; gateway normalizes fallback metadata |
| Duplicate detection | `client/src/components/tickets/TicketDrawer.tsx` via `duplicateService` | `/api/ai/duplicates/detect` | `duplicate-service` `/detect-duplicates` | Manual or UI-triggered duplicate scan from ticket screens; includes mass-incident signal |
| Client assistant chatbot | `ChatbotWidget` | `/api/chatbot/ask`, `/api/chatbot/massive-incidents/detect`, `/api/chatbot/health` | `ai-chatbot` `/chat`, `/massive-incidents/detect`, `/health` | RAG answer with localized sections and massive-incident candidate enrichment |
| Manager assistant ALLIE | `ManagerCopilotWidget` and dashboard components | Intended `/manager-ai/copilot/dashboard` | No backend service found | Effective behavior appears frontend heuristic fallback, not a dedicated backend AI service |

Important evidence note:
- Repository docs for the old sentiment flow describe backend-side AI invocation during ticket creation.
- Source search did not show `TicketServiceImpl.createTicket(...)` calling `SentimentAnalysisService` or `DuplicateDetectionService`.
- Observed current usage is from frontend ticket screens, not automatic ticket-creation orchestration.

## Deployment Surfaces

### Local split-process development

- Official path: `scripts\dev\start-local.bat`.
- MySQL and phpMyAdmin run through Docker Compose.
- Backend, frontend, and the three AI services run locally in separate processes.
- Expected ports are:
- MySQL `3306`
- phpMyAdmin `8081`
- sentiment-service `8000`
- duplicate-service `8001`
- ai-chatbot `8002`
- backend `8080`
- frontend `3000`

### H2 demo mode

- Official path: `scripts\demo\start-demo-h2.bat`.
- Backend runs with profile `h2`.
- AI services and frontend still run locally.
- H2 console is exposed through backend on `/h2-console`.

### Full containerized stack

- Official path: `scripts\deploy\start-stack.bat`.
- `docker-compose.yml` defines `mysql`, `phpmyadmin`, `sentiment-service`, `duplicate-service`, `ai-chatbot`, `backend`, and `frontend`.
- Frontend is served by nginx from the built React bundle and mapped to host port `3000`.
- Backend persists uploads/logs to Docker volumes.
- MySQL persists data to `mysql_data`.

### Configuration surfaces

- Frontend environment samples: `client/.env.sample`, `client/.env.demo`.
- Backend runtime config: `server/src/main/resources/application.yaml`, `application-h2.yaml`.
- Compose-time env injection happens in `docker-compose.yml`.
- AI services depend on local Python envs for local mode and Dockerfiles for container mode.
- `ai-chatbot` additionally depends on checked-in RAG assets under `data` and `index`.

## Top Technical Risks

- Seed/demo drift risk: H2 `DataInitializer` uses `@mts-telecom.ma` and Moroccan demo identities, while Flyway `V2__seed_data.sql` still contains older `@billcom.tn` identities and related references.
- Contract/documentation drift risk: `docs/README.md` references `docs/RBAC_MATRIX.md` and `docs/API_CONTRACTS.md`, but both files are absent.
- Architecture drift risk around ALLIE: frontend expects `/manager-ai/copilot/dashboard`, but no backend endpoint exists in the repo.
- AI integration drift risk: service docs describe backend AI on ticket creation, but observed source usage is manual from frontend ticket analysis surfaces.
- Change-risk concentration: `client/src/components/tickets/TicketDrawer.tsx` is 2351 lines and `server/.../TicketServiceImpl.java` is 1669 lines, making ticket behavior highly coupled and hard to change safely.
- Access-rule drift risk: report controller comments and actual `SecurityConfig` rules do not match.
- Runtime dependency risk: AI services are offline-first and depend on cached models or prebuilt FAISS assets; missing local assets can push them into degraded or unavailable modes.
- Auth/cookie environment risk: cookie-first auth, CORS, refresh-path scoping, and Google OAuth origins all need environment alignment across local, demo, and Docker deployments.

## Top UI Risks

- Ticket UI concentration risk: `TicketDrawer` carries analysis, assignment, comments, SLA, history, attachments, and manager-copilot context in one large component.
- Frontend RBAC duplication risk: route-level, menu-level, hook-level, and page-level role checks can drift from backend truth.
- Assistant-state clarity risk: chatbot and ALLIE both expose fallback/degraded modes, but the actual execution path is not always obvious to the user.
- Demo/prod confusion risk: login defaults and demo affordances can leak into local non-demo workflows if environment toggles are mis-set.
- Overlay/layout density risk: notification systems, chatbot widget, and manager widget all mount in the main layout and may compete for space, especially on smaller screens.

## Unknowns / Missing Evidence

- Missing docs explicitly referenced by repo docs are:
- `docs/RBAC_MATRIX.md`
- `docs/API_CONTRACTS.md`
- No backend implementation found for `/manager-ai/copilot/dashboard`; this may be intentionally deferred, removed, or located outside the repo.
- No repository evidence was found that ticket creation currently auto-calls sentiment or duplicate detection on the backend.
- The exact intended MySQL demo account set is unclear because docs/checklists and Flyway seed contents do not currently align.
- Report read-access intent is unclear because controller comments and actual security rules differ.
