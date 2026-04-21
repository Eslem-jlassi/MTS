# 05 Baseline Checks

Date: 2026-04-12

## Scope

This baseline pass used the repository's existing commands and the safest local checks available without changing business code.

## Exact commands run

### Repo inspection for Python test discoverability

```powershell
Get-ChildItem sentiment-service\tests -Name
Get-ChildItem duplicate-service\tests -Name
Get-ChildItem ai-chatbot\tests -Name
Get-ChildItem ai-chatbot -Filter test_*.py -Name
```

### Client

Initial attempts that hit sandbox/path issues:

```powershell
C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe -Command "npm run lint"
C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe -Command "npm run test:ci -- --runInBand --coverage=false"
C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe -Command "npm run build"
```

Effective runs:

```powershell
npm run lint
npm run test:ci -- --runInBand --coverage=false
npm run build
```

Working directory:

```text
client/
```

### Server

Initial/attempted commands:

```powershell
mvn "-Dmaven.repo.local=C:\Users\Chak-Tec\Desktop\PFE\server\.m2\repository" test
mvn clean package
```

Effective package retry using the repo-local Maven cache path:

```powershell
mvn "-Dmaven.repo.local=C:\Users\Chak-Tec\Desktop\PFE\server\.m2\repository" clean package
```

Working directory:

```text
server/
```

### Python services

```powershell
C:\Users\Chak-Tec\Desktop\PFE\.venv\Scripts\python.exe -m unittest discover tests
```

Working directories used separately:

```text
sentiment-service/
duplicate-service/
ai-chatbot/
```

Additional ai-chatbot standalone test:

```powershell
C:\Users\Chak-Tec\Desktop\PFE\.venv\Scripts\python.exe -m unittest test_chat_response_builder.py
```

### Test inventory scan used for coverage notes

```powershell
rg --files client/src -g "*test*" -g "*spec*"
rg --files server/src/test
rg --files sentiment-service -g "*test*"
rg --files duplicate-service -g "*test*"
rg --files ai-chatbot -g "*test*"
```

## Pass / fail results

### Client

- `npm run lint`: PASS
- `npm run test:ci -- --runInBand --coverage=false`: FAIL
  - Result summary: 23 suites total, 22 passed, 1 failed
  - Test summary: 95 total, 92 passed, 3 failed
  - Failing file: `client/src/pages/IncidentsPage.test.tsx`
  - Failing cases:
    - `shows destructive action for ADMIN and opens strong confirmation modal`
    - `hides destructive action for non-admin users`
    - `shows OAuth challenge path and requests code`
  - Common symptom: test could not find incident identifier text `INC-00077`
  - Additional warnings during run:
    - React `act(...)` warnings from `client/src/pages/TicketList.tsx`
    - Jest open-handle warning after suite completion
- `npm run build`: PASS WITH WARNINGS
  - Production bundle built successfully
  - Build emitted many `prettier/prettier` warnings, heavily concentrated in:
    - `client/src/components/ui/Drawer.tsx`
    - `client/src/components/ui/Modal.tsx`
    - `client/src/pages/ReportsPage.tsx`
    - `client/src/pages/SlaPage.tsx`
    - `client/src/pages/UsersPage.tsx`
    - smaller warnings in other UI files

### Server

- `mvn "-Dmaven.repo.local=C:\Users\Chak-Tec\Desktop\PFE\server\.m2\repository" test`: FAIL
  - Result summary: 168 tests run, 165 passed, 3 failed, 0 errors, 0 skipped
  - Failing file: `server/src/test/java/com/billcom/mts/controller/TicketControllerRbacTest.java`
  - Failing cases:
    - `clientCannotHardDeleteTicket`
    - `agentCannotHardDeleteTicket`
    - `managerCannotHardDeleteTicket`
  - Failure pattern: tests expected HTTP `403` but current behavior returned `400`
  - Surefire output path:
    - `server/target/surefire-reports`
- `mvn clean package`: FAIL TO RUN IN SANDBOX
  - Could not create local repository at sandbox path `C:\Users\CodexSandboxOffline\.m2\repository`
- `mvn "-Dmaven.repo.local=C:\Users\Chak-Tec\Desktop\PFE\server\.m2\repository" clean package`: FAIL TO COMPLETE
  - Maven attempted to download `org.apache.maven.plugins:maven-clean-plugin:3.3.2`
  - Download failed against Maven Central with `Permission denied: getsockopt`
  - This is an environment/network blocker, not a confirmed application build failure

### Python services

- `sentiment-service`: PASS
  - `python -m unittest discover tests`
  - Result: 2 tests passed
- `duplicate-service`: PASS WITH WARNING
  - `python -m unittest discover tests`
  - Result: 1 test passed
  - Warning:
    - `DeprecationWarning` for `datetime.utcnow()` in `duplicate-service/tests/test_sprint3_contract_metadata.py`
- `ai-chatbot`: PASS
  - `python -m unittest discover tests`
  - Result: 1 test passed
  - `python -m unittest test_chat_response_builder.py`
  - Result: 5 tests passed

## Blockers

### Product-level failing checks

- Client test regression around incidents hard-delete guardrails:
  - `client/src/pages/IncidentsPage.test.tsx`
- Server test regression around hard-delete RBAC response codes:
  - `server/src/test/java/com/billcom/mts/controller/TicketControllerRbacTest.java`

### Environment / execution blockers

- Client `npm` commands initially failed inside the sandbox with:
  - `EPERM: operation not permitted, lstat 'C:\Users\Chak-Tec'`
- Server package command without explicit repo-local cache failed because the sandbox Maven home path was not writable:
  - `C:\Users\CodexSandboxOffline\.m2\repository`
- Server package command with explicit repo-local cache still could not complete because Maven needed network access to fetch `maven-clean-plugin:3.3.2`, and outbound access was blocked

## Env / config blockers

- No Docker Compose integration check was run in this baseline pass
  - Reason: this task was limited to safest existing commands, and the local package/build baseline already produced actionable results without starting the full stack
- No browser-driven UI smoke was run
  - Reason: no checked-in e2e/browser command was discovered in the main module commands used for this pass
- No HTTP `/health` startup smoke was run for the Python services
  - Reason: each service already had a small local unittest target available, which was safer and lower-risk than launching long-lived processes during the baseline pass
- Server package completion remains unresolved until Maven can access the missing plugin artifact, or until that plugin is already cached locally

## Areas with no or weak automated coverage

These notes are based on the checked-in test file layout and the commands above, not on guesswork.

### Client coverage gaps

- No browser/e2e coverage was discovered for:
  - login-to-dashboard session bootstrap
  - cookie refresh/session expiry flows
  - WebSocket live updates
  - export downloads
  - responsive drawer/modal behavior
  - dark/light visual regressions
  - floating assistant layout issues for ALLIE and the client chatbot
- Current client tests are mostly page/component-level Jest tests under `client/src`

### Server coverage gaps

- Current backend tests cover many controllers/services, but this pass did not find automated integration coverage for:
  - Docker Compose boot path
  - H2 demo boot path
  - real SMTP delivery
  - full WebSocket/STOMP integration against a running app
  - end-to-end database migration/package validation under `mvn clean package`

### Python service coverage gaps

- `sentiment-service`
  - Only a minimal metadata/contract-style test file was discovered under `tests/`
  - No HTTP endpoint or `/health` test was run
- `duplicate-service`
  - Only a minimal metadata/contract-style test file was discovered under `tests/`
  - No HTTP endpoint or `/health` test was run
- `ai-chatbot`
  - Unit coverage exists for massive-incident detection and chat response building
  - A helper script test file exists at `ai-chatbot/scripts/test_vector_search.py`, but it was not part of the baseline command set run here

## Recommended interpretation of the baseline

- The repo is not in a "fully green" state today
- The most important product regressions are concentrated in destructive-action/RBAC behavior and incident hard-delete UI tests
- The frontend production build still completes
- The backend package result is currently inconclusive because the environment blocked Maven plugin download
- The Python services have at least a minimal passing local test baseline
