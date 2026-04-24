# AGENTS Guide

This file is for future Codex work in this repository.

## Mission

MTS Telecom is a defense-period telecom support platform with:
- a React client for customer and back-office workflows
- a Spring Boot backend for auth, RBAC, tickets, SLA, incidents, reports, notifications, audit, and persistence
- Python AI side services for ticket classification/sentiment, duplicate detection, and RAG chatbot assistance

Primary goal during the defense period:
- keep business behavior stable
- deliver lot-by-lot improvements safely
- avoid large architectural churn

## Stack

- `client`: React, TypeScript, CRA, Redux Toolkit, MUI
- `server`: Spring Boot 3.3, Spring Security, JPA/Hibernate, Flyway, WebSocket
- `sentiment-service`: FastAPI, transformers/torch, rules fallback
- `duplicate-service`: FastAPI, sentence-transformers, sklearn TF-IDF fallback
- `ai-chatbot`: FastAPI, sentence-transformers, FAISS
- local/dev/deploy orchestration: Windows batch scripts plus `docker-compose.yml`

## Repository Structure

Main source-of-truth areas:
- `client/`: frontend app
- `server/`: backend API and business rules
- `sentiment-service/`: ticket classification and sentiment AI service
- `duplicate-service/`: duplicate detection AI service
- `ai-chatbot/`: client assistant chatbot and massive-incident AI service
- `scripts/`: official local/demo/deploy entry points
- `docs/`: architecture, deployment, demo, and audit docs

Important repo note:
- the repo root also contains logs, QA captures, generated artifacts, and runtime leftovers
- do not treat ad hoc root files as architecture or business source-of-truth unless the task explicitly requires them

## First-Step Rules

Before changing code:
1. Read this `AGENTS.md`.
2. Read the relevant local docs and inspect the touched implementation.
3. Reuse existing code paths before introducing new ones.
4. Prefer minimal additive changes over replacement.
5. Stop and realign if a requested change would break an invariant below.

Always inspect existing code before replacing it.
Prefer minimal additive changes.
Do not break existing business behavior unless the task explicitly asks for it.

## Commands By Area

Prefer official repo scripts and existing commands over inventing new startup flows.

### Client

From `client/`:
- lint: `npm run lint`
- test: `npm run test:ci -- --runInBand --coverage=false`
- build: `npm run build`
- local start: `npm start`

Official helper:
- `scripts\dev\start-frontend.bat`

### Server

From `server/`:
- test: `mvn test`
- build/package: `mvn clean package`
- local start with MySQL: `mvn spring-boot:run`
- local start with H2 demo: `mvn spring-boot:run -Dspring-boot.run.profiles=h2`

Official helpers:
- `scripts\dev\start-backend-mysql.bat`
- `scripts\dev\start-backend-h2.bat`

### Python Services

Sentiment service:
- start: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
- smoke: `curl http://127.0.0.1:8000/health`
- Windows helper: `sentiment-service\START_SENTIMENT_SERVICE.bat`

Duplicate service:
- start: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`
- smoke: `curl http://127.0.0.1:8001/health`
- Windows helper: `duplicate-service\START_DUPLICATE_SERVICE.bat`

AI chatbot:
- start: `python -m uvicorn app:app --host 127.0.0.1 --port 8002`
- smoke: `curl http://127.0.0.1:8002/health`
- Windows helper: `ai-chatbot\START_AI_CHATBOT.bat`

AI service bundle helper:
- `scripts\dev\start-ai-services.bat`

### Full Stack / Demo

- local split-process startup: `scripts\dev\start-local.bat`
- demo H2 startup: `scripts\demo\start-demo-h2.bat`
- dockerized stack startup: `scripts\deploy\start-stack.bat`
- dockerized smoke check: `scripts\deploy\smoke-post-deploy.bat`

## Non-Regression Rules

Preserve current API routes, cookie-based auth, and existing database behavior unless a minimal additive migration is strictly necessary.

Preserve these invariants:
1. Public signup is only for `CLIENT` accounts.
2. `MANAGER`, `AGENT`, and `ADMIN` are internal accounts.
3. The first `ADMIN` is bootstrap/manual; additional admins are created or promoted by an existing admin.
4. Manager-only assistant ALLIE must never appear in admin UI.
5. Admin-only user management must stay admin-only.
6. Destructive delete flows for tickets, incidents, and clients must keep double verification, server-side enforcement, and audit logging.
7. Dark mode and light mode must both remain functional.
8. H2 demo path and `docker-compose` path must remain usable.
9. Exports, notifications, and WebSocket behavior must not regress.

Important evidence note:
- the repo census found drift around ALLIE visibility in the current client layout
- treat manager-only ALLIE visibility as the protected invariant for future work
- do not widen ALLIE exposure, and do not leave new admin exposure behind

## Role Constraints

- `CLIENT` is the only public/self-signup role.
- Internal back-office roles are `AGENT`, `MANAGER`, `ADMIN`.
- Do not introduce any flow that lets the public self-create `AGENT`, `MANAGER`, or `ADMIN`.
- Keep admin creation/promotion under existing admin control.
- Keep admin-only user management admin-only in routes, UI, and server-side enforcement.
- Do not loosen ticket, incident, report, or audit permissions without explicit approval.

## Auth Constraints

- Preserve cookie-first authentication.
- Preserve refresh-token flow and `/api/auth/me` bootstrap behavior.
- Do not switch auth to local-storage-only or bearer-header-only patterns.
- Do not rename or casually break existing auth routes.
- Preserve current email verification and Google OAuth behavior unless the task explicitly targets auth.
- Do not expose sensitive tokens in response bodies by default.

## Destructive Action Constraints

- Never weaken destructive flows to client-side confirmation only.
- Keep hard-delete authorization enforced on the server.
- Keep audit traces for destructive actions.
- Keep double verification semantics for destructive delete flows.
- Do not remove the re-auth or challenge steps from hard-delete flows.
- Do not widen destructive permissions to non-admin roles unless the task explicitly and safely requires it.

## UI Constraints

- Reuse current pages, components, and patterns before adding new abstractions.
- Do not do a global redesign before defense.
- Keep both light and dark themes working.
- Preserve current route map and role-gated navigation unless the task explicitly targets navigation.
- Be careful in `TicketDrawer` and other large UI files; make narrow edits.
- Preserve current accessibility and feedback patterns where already present.
- Keep client chatbot behavior client-only.
- Keep ALLIE manager-only.

## Deployment Constraints

- Keep both the H2 demo workflow and the Docker Compose workflow functional.
- Do not break existing ports, health endpoints, or startup scripts without a strong reason.
- Preserve `docker-compose.yml` service relationships unless the task explicitly requires a minimal change.
- Preserve backend uploads/log behavior and database persistence expectations.
- Prefer additive environment variables over breaking renames.
- Do not introduce defense-period changes that require a framework migration or large deployment rewrite.

## No Mega-Refactor Before Defense

Do not perform framework migrations before defense.

Examples of forbidden defense-period refactors unless the user explicitly asks and accepts risk:
- CRA to Vite
- router rewrite
- global backend architecture redesign
- sweeping auth model rewrite
- replacement of ticket workflow core
- large-scale state-management migration

## Preferred Change Style

- Prefer minimal additive changes.
- Always inspect existing code before replacing it.
- Extend current services, DTOs, routes, and components before creating parallel systems.
- Keep patches local to the touched lot.
- Avoid opportunistic cleanup outside the task.
- If you find a broader issue, document it and stop unless the task includes it.

## How To Work Lot By Lot

For each lot:
1. Read this file and inspect the exact touched area first.
2. Trace the current flow end to end before editing.
3. Identify which invariants apply to that lot.
4. Make the smallest change that solves the lot.
5. Run only the relevant checks for the touched area.
6. Report what changed, what was run, what passed, and what still looks risky.
7. Stop after that lot. Do not continue to the next lot automatically.

## Check Selection Rule

Run only relevant checks for the area you touched.

Examples:
- frontend-only change: run client lint/test/build as needed for the touched surface
- backend-only change: run relevant server tests/build
- Python AI change: run the affected service smoke check and relevant unit tests if present
- docs-only change: no app build is required; verify the documentation file itself

## Output Expectations For Future Tasks

At the end of a task, report:
- files changed
- commands run
- test/build/lint results
- remaining risks

If a task is docs-only, say that no business code changed and no app build/test was necessary unless you actually ran one.
