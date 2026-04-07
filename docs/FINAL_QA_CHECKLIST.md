# FINAL QA CHECKLIST - Sprint 4 Go/No-Go

## Instructions
Mark each item as done before defense or deployment.
Any blocking item left unchecked means NO-GO.

## Lot A - Deployment Readiness
- [ ] .env is filled for target environment
- [ ] JWT secret is not default
- [ ] CORS and websocket origins are restricted for target domain
- [ ] docker compose up -d --build succeeds
- [ ] backend_uploads volume persists files after restart
- [ ] backend_logs volume persists backend log file after restart
- [ ] SMTP variables are configured if email verification is enabled
- [ ] scripts/deploy/smoke-post-deploy.bat exits code 0

## Lot B - Demo Readiness
- [ ] all demo accounts can log in with Password1!
- [ ] one client ticket can be created during dry run
- [ ] manager-to-agent assignment works
- [ ] agent status transition works
- [ ] audit page displays actionable records
- [ ] full story can be demonstrated in 7-10 minutes
- [ ] fallback branch without AI has been rehearsed

## Lot C - Observability / Operations
- [ ] all compose health checks are green
- [ ] backend log file is generated under logs/
- [ ] scripts/deploy/show-stack-logs.bat works
- [ ] smoke script reports all critical endpoints reachable
- [ ] at least one operator can execute runbook without project author help

## Lot D - Documentation Finalization
- [ ] docs/DEPLOY_READY.md reviewed
- [ ] docs/DEFENSE_READY.md reviewed
- [ ] docs/FINAL_QA_CHECKLIST.md reviewed
- [ ] docs/DEPLOYMENT.md is still aligned with scripts
- [ ] no outdated password/account references remain in final docs

## Smoke URLs to Validate
- [ ] http://localhost:3000
- [ ] http://localhost:8080/actuator/health
- [ ] http://localhost:8080/swagger-ui.html
- [ ] http://127.0.0.1:8000/health
- [ ] http://127.0.0.1:8001/health
- [ ] http://127.0.0.1:8002/health

## Go/No-Go Decision
Go only if all blocking checks are green.

- [ ] GO
- [ ] NO-GO

## Sign-off
- Technical owner:
- Demo owner:
- Date:
- Notes:
