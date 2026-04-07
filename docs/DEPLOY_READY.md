# DEPLOY READY - Sprint 4 Finalization

## Scope
Sprint 4 targets stability, deployment quality, demo fluidity, observability, and final documentation.
No major business feature is added.

Hard constraints:
- zero breaking change
- no functional workflow rewrite
- backend RBAC/security remains source of truth

## Sprint 4 Plan (4 lots)

### Lot A - Deployment Readiness
Files/modules impacted:
- docker-compose.yml
- INTEGRATION_DOCKER/docker-compose-full.yml
- .env.example
- scripts/deploy/start-stack.bat
- scripts/deploy/stop-stack.bat
- scripts/deploy/smoke-post-deploy.bat
- scripts/deploy/show-stack-logs.bat

Quick wins:
- explicit backend upload directory mapping for tickets/avatars/reports
- SMTP environment passthrough in compose
- persistent backend logs volume
- post-deploy smoke script wired to start-stack

Risks:
- SMTP credentials missing in env at runtime
- endpoint warm-up delay may fail early smoke checks
- wrong CORS/origin values in deployment env

Acceptance criteria:
- docker compose up -d --build succeeds
- backend, frontend, and 3 AI services expose healthy endpoints
- uploads and reports persist after container restart
- smoke script exits with code 0

What we can show to jury:
- one-command startup using scripts/deploy/start-stack.bat
- automatic smoke validation
- centralized stack logs command

### Lot B - Demo Readiness
Files/modules impacted:
- scripts/demo/start-demo-h2.bat
- docs/DEMO_JURY.md
- docs/DEMO_JURY_FINAL_CHECKLIST.md
- docs/DEFENSE_READY.md

Quick wins:
- deterministic demo script with smoke validation
- fixed account set per role
- strict 7-10 min scenario with fallback branch

Risks:
- role mismatch if wrong account used during demo
- data drift if seed dataset is modified before defense
- local machine resource contention during live run

Acceptance criteria:
- full scenario can be executed in under 10 minutes
- each role path works without hidden setup
- fallback path works when one AI service is unavailable

What we can show to jury:
- role-based journey end-to-end
- business continuity even with AI degraded mode
- auditable and secure operations on sensitive actions

### Lot C - Observability / Operations
Files/modules impacted:
- docker-compose.yml
- INTEGRATION_DOCKER/docker-compose-full.yml
- server/src/main/resources/application.yaml
- scripts/deploy/show-stack-logs.bat
- scripts/deploy/smoke-post-deploy.bat

Quick wins:
- log rotation options for all main services
- backend file logs persisted in backend_logs volume
- operational smoke checks for critical URLs

Risks:
- low observability if logs are not consulted during incident
- false negatives during cold starts

Acceptance criteria:
- logs available from both docker logs and backend log file
- operations team can run smoke checks in one command
- health checks stay green under normal load

What we can show to jury:
- live logs tail for backend/frontend/AI/mysql
- green health status matrix

### Lot D - Final Documentation
Files/modules impacted:
- docs/DEPLOY_READY.md
- docs/DEFENSE_READY.md
- docs/FINAL_QA_CHECKLIST.md
- docs/DEPLOYMENT.md

Quick wins:
- single source of truth for runbook and defense narrative
- explicit go/no-go checklist
- known fallback procedures documented

Risks:
- stale docs if not aligned with scripts/env
- team inconsistency if multiple launch methods are used

Acceptance criteria:
- all launch, smoke, and fallback instructions are documented
- accounts, scenario timing, and freeze data are explicit
- final checklist can be executed by a different operator

What we can show to jury:
- controlled engineering process from dev to deployment
- clear quality gates and rollback discipline

## Current Readiness Matrix

Already ready:
- compose stack with health checks for mysql, backend, frontend, and AI services
- backend public actuator health endpoint
- official scripts for dev/demo/deploy flows
- documented demo accounts and role-based scenario

Completed in this Sprint 4 preparation:
- SMTP passthrough variables added in compose
- explicit upload dir env mapping (tickets/avatars/reports)
- backend logs persisted via backend_logs volume
- post-deploy smoke script created and integrated into start-stack
- stack logs helper script created
- demo H2 startup script now runs smoke checks

Still required before production deployment:
- fill real secrets and SMTP credentials in deployment env
- lock production CORS/origin values
- verify DNS/TLS and reverse proxy policy
- run final pre-defense smoke on target machine

## Operational Runbook

Containerized startup:
- scripts/deploy/start-stack.bat

Containerized stop:
- scripts/deploy/stop-stack.bat

Post-deploy smoke:
- scripts/deploy/smoke-post-deploy.bat

Live logs:
- scripts/deploy/show-stack-logs.bat

Quick rollback:
1. scripts/deploy/stop-stack.bat
2. revert to previous compose image/tag set
3. restart stack
4. rerun smoke-post-deploy
