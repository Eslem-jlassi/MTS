# DEFENSE READY - Jury Demo Pack

## Objective
Deliver a smooth 7 to 10 minute jury demo with stable flows, clear technical narrative, and fallback paths.

## Recommended Demo Timeline (7-10 min)

### 0:00 - 1:00 | Context + architecture
- Show product goal: telecom supervision + support operations.
- Mention stack: React, Spring Boot, MySQL, 3 Python AI services.

### 1:00 - 3:00 | Client flow
- Login as client.
- Open dashboard.
- Create or open a ticket.
- Show SLA and timeline visibility.

### 3:00 - 5:00 | Support flow (manager then agent)
- Login as manager.
- Assign ticket.
- Login as agent.
- Add comment and move status.

### 5:00 - 6:30 | Monitoring and operations
- Open services health page.
- Show incident visibility and SLA awareness.
- Open audit logs and explain traceability.

### 6:30 - 8:00 | AI value
- Show chatbot response and explainability fields.
- Show sentiment/duplicate insights in ticket workflow.

### 8:00 - 10:00 | Security and resilience close
- Explain backend RBAC source of truth.
- Explain hard-delete strong confirmation guardrail.
- Mention smoke checks and fallback if AI is unavailable.

## Screen Order to Present
1. Login page
2. Client dashboard
3. Ticket list + ticket detail
4. Manager dashboard
5. Agent ticket handling
6. Services/health page
7. Audit page
8. Chatbot panel and AI-assisted sections
9. Swagger (technical backup proof)

## Accounts to Use
Common password:
- Password1!

Accounts:
- admin@mts-telecom.ma
- manager@mts-telecom.ma
- karim.agent@mts-telecom.ma
- layla.agent@mts-telecom.ma
- support@atlas-distribution.ma
- dsi@sahara-connect.ma

## Data to Freeze Before Defense
- Keep one ticket in NEW for assignment demo.
- Keep one ticket in IN_PROGRESS for status transition demo.
- Keep one resolved ticket for timeline/SLA proof.
- Keep at least one AI-relevant telecom issue text for chatbot and duplicate checks.
- Avoid mass cleanup right before demo to preserve deterministic records.

## Plan B if AI Is Unavailable
Primary fallback path:
- Continue full demo on core product value:
  - auth and RBAC
  - ticketing lifecycle
  - service monitoring
  - audit and governance

Operational fallback steps:
1. run scripts/deploy/smoke-post-deploy.bat
2. if one AI health endpoint is down, state degraded mode explicitly
3. continue non-AI flow and show backend resilience
4. keep Swagger open to prove API readiness

Expected jury message:
- AI is additive, not a single point of failure for core operations.

## Probable Jury Questions and Suggested Technical Answers

Q1. How do you prevent role escalation from frontend?
A. Role authorization is enforced backend-side in Spring Security and method/controller guards; frontend only reflects permissions.

Q2. What happens if one AI microservice is down?
A. Gateway returns safe fallback payloads, UI remains operational, and core ticketing/supervision flows continue.

Q3. How do you ensure deployment reproducibility?
A. Official compose + official scripts + env template + smoke checks are the standard runbook.

Q4. How is sensitive deletion controlled?
A. Strong confirmation plus re-authentication (password or verification code), with audit trace and dependency checks.

Q5. How do you verify post-deploy health quickly?
A. Dedicated smoke script checks frontend, backend health, swagger, and AI health endpoints in one command.

Q6. What is your rollback approach?
A. Stop stack, restore previous image/tag set, restart, and rerun smoke checks.

## Last-Minute Pre-Defense Checklist
- Run scripts/deploy/smoke-post-deploy.bat
- Keep scripts/deploy/show-stack-logs.bat ready in a terminal
- Open Swagger and one audit view before entering room
- Keep a backup browser profile logged in per role
