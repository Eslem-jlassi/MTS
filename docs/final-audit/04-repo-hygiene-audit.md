# Repo Hygiene Audit

Audit date: 2026-04-12

Scope:
- no code or runtime cleanup performed
- conclusions based on repository inspection only
- focus on root-level artifacts, docs/scripts duplication, deployment references, and obvious dependency cleanup candidates

Classification rules used in this audit:
- source of truth: active code, config, docs, or scripts used by the official product/runtime flow
- generated evidence: outputs captured from QA, smoke, build, or manual verification
- obsolete duplicate: a second file carrying the same responsibility as an active source-of-truth file
- legacy: historical or explanatory material outside the official current flow

## Executive Summary

The main hygiene problems are not in application code. They are in repository presentation and artifact discipline:

- the repo root contains many tracked QA/status artifacts that are not source-of-truth
- some tracked QA files contain live cookie/session evidence and should not remain in the repo root
- `INTEGRATION_DOCKER/` and `INTEGRATION_JAVA/` are compatibility/legacy material, not active runtime sources
- active doc indexes still point to missing `docs/API_CONTRACTS.md` and `docs/RBAC_MATRIX.md`
- there are overlapping readiness/checklist documents with no single clearly demoted archive path
- `sentiment-service/START_SENTIMENT_SERVICE.bat` appears to contain two concatenated script bodies
- dependency manifests contain several likely-unused or duplicate-responsibility packages, but none should be removed before defense without a small validation pass

## Root-Level Classification

### Source of truth at repo root

- `README.md`
- `AGENTS.md`
- `.env.example`
- `.gitignore`
- `docker-compose.yml`
- `pom.xml`
- directories:
- `client/`
- `server/`
- `sentiment-service/`
- `duplicate-service/`
- `ai-chatbot/`
- `scripts/`
- `docs/`

Notes:
- `pom.xml` at root is a real parent/aggregator POM, even though the main app module is `server/`.
- root `.env` is a local runtime file, not repo source-of-truth, but it is a legitimate local entrypoint for Compose.

### Active runtime-local but not repo source-of-truth

- `.env`
- `.venv/`
- `.sixth/`
- `logs/`

Notes:
- `logs/` is not just clutter. `server/src/main/resources/application.yaml` writes backend logs to `logs/mts-telecom.log`, so this path must stay unless logging config is changed.
- `.sixth/` appears to be local tooling metadata, not product code.

### Generated evidence and status clutter at repo root

Tracked generated artifacts observed:
- `qa_%u.cookies`
- `qa_*.txt`
- `sprint4_p0_*.json`
- `sprint4_p0_*.txt`
- `build-status.txt`
- `tsc-status.txt`
- `foo-status.txt`
- `docker_ready.status`
- `docker_info_check.txt`

Ignored/untracked generated artifacts observed:
- root `*.log` files such as `build-output.log`, `ai_build_plain.log`, `duplicate_build.log`, `sentiment_build.log`, `tsc-output.log`
- `logs/ai/*.log`
- `logs/backend-targeted-tests.log`

Important security finding:
- direct inspection of `qa_admin_current.txt` shows stored `mts_auth_token` and `mts_refresh_token` cookie values
- these QA artifacts are not harmless screenshots or summaries; they include live-looking auth/session material

## Files That Must Stay

- root sources of truth:
- `README.md`
- `AGENTS.md`
- `.env.example`
- `.gitignore`
- `docker-compose.yml`
- `pom.xml`
- main modules:
- `client/`
- `server/`
- `sentiment-service/`
- `duplicate-service/`
- `ai-chatbot/`
- official script areas:
- `scripts/dev/`
- `scripts/demo/`
- `scripts/deploy/`
- active documentation:
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/DATABASE.md`
- `docs/DEMO_JURY.md`
- `docs/DEMO_JURY_FINAL_CHECKLIST.md`
- `docs/final-audit/`
- service startup helpers still used by official scripts:
- `sentiment-service/START_SENTIMENT_SERVICE.bat`
- `duplicate-service/START_DUPLICATE_SERVICE.bat`
- `ai-chatbot/START_AI_CHATBOT.bat`
- runtime logging path:
- `logs/` must stay until backend log path changes because `application.yaml` targets `logs/mts-telecom.log`

## Files To Archive

These are not current sources of truth, but they are still useful as history, compatibility material, or one-time proof.

### Legacy integration material

- `INTEGRATION_DOCKER/`
- `INTEGRATION_JAVA/`

Reason:
- `INTEGRATION_DOCKER/docker-compose-full.yml` is a derived duplicate of root `docker-compose.yml`; the main difference is relative build contexts
- it is referenced by docs, but not by active scripts
- `INTEGRATION_JAVA/*` is referenced only by `sentiment-service/README_SOUTENANCE.md`, not by official runtime scripts

### Secondary or overlapping readiness/checklist docs

- `docs/DEPLOY_READY.md`
- `docs/DEFENSE_READY.md`
- `docs/FINAL_QA_CHECKLIST.md`

Reason:
- current active runbook/checklist set is better represented by:
- `docs/DEPLOYMENT.md`
- `docs/DEMO_JURY.md`
- `docs/DEMO_JURY_FINAL_CHECKLIST.md`
- the three files above are still useful historical planning material, but they overlap heavily

### Historical sprint narratives

- `docs/SPRINT1_BASELINE.md`
- `docs/SPRINT2_SECURITY.md`
- `docs/SPRINT3_AI_WOW.md`

Reason:
- they describe completed lots and implementation history, not the current operating runbook

### Legacy service-side sentiment material

- `sentiment-service/README_SOUTENANCE.md`
- `sentiment-service/main_demo.py`
- `sentiment-service/main_simple.py`
- `sentiment-service/requirements_demo.txt`

Reason:
- official startup uses `app.main:app` plus `requirements.txt`
- no official script references the demo/simple entrypoints
- `README_SOUTENANCE.md` documents an older integration path that tells the reader to add WebFlux and copy files from `INTEGRATION_JAVA/`

### Sprint evidence worth keeping only if sanitized and relocated

- `sprint4_p0_*.json`
- `sprint4_p0_*.txt`

Reason:
- these are generated evidence files, not active product inputs
- some may still be useful as audit proof, but they should not stay loose in the repo root

## Files To Delete Safely

These files are not referenced by active scripts, are not source-of-truth, and can be removed without affecting runtime behavior.

### High-priority sensitive/generated artifacts

- `qa_%u.cookies`
- `qa_*.txt`

Reason:
- they are generated QA/auth artifacts
- one inspected file contains auth cookies directly
- they should be removed from the working tree and from git tracking rather than archived in-place

### Status crumbs with no active reference

- `build-status.txt`
- `tsc-status.txt`
- `foo-status.txt`
- `docker_ready.status`

Reason:
- these are tiny one-off status markers with no active script or doc references found

### Local ignored log outputs

- root `*.log`
- `logs/ai/*.log`
- `logs/backend-targeted-tests.log`

Reason:
- these are runtime/build outputs only
- they are already mostly covered by `.gitignore`

### Likely disposable deployment-check outputs if summarized elsewhere

- `docker_info_check.txt`

Reason:
- no active reference found
- the repo already has stronger deploy guidance in `docs/DEPLOYMENT.md` and audit notes

## Files To Move Out Of Repo Root

### Move to an archive area

- `INTEGRATION_DOCKER/`
- `INTEGRATION_JAVA/`
- `OPTIMISER_STS.md`

Recommended destination:
- `docs/archive/legacy/`
- or a dedicated `docs/archive/integration/`

### Move generated evidence out of root if retained

- `sprint4_p0_*.json`
- `sprint4_p0_*.txt`

Recommended destination:
- outside the main repo flow, for example:
- `docs/archive/evidence/2026-04/`
- or an external QA artifact store

### Move local tooling/runtime noise out of the visible root later

- `.sixth/`
- `.venv/`
- `logs/`

Important note:
- `.sixth/` and `.venv/` are local-only and not product artifacts
- `logs/` cannot move safely before defense unless `application.yaml`, docs, and any operator expectations are updated

## Scripts / Docs That Need Updating If Cleanup Happens

### Must update if `INTEGRATION_*` moves or is archived

- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/DEPLOY_READY.md`
- `docs/SPRINT1_BASELINE.md`
- `sentiment-service/README_SOUTENANCE.md`

### Must update because active doc indexes currently contain dead links

- `README.md`
- `docs/README.md`
- `docs/archive/legacy/README.md`

Dead-link problem observed:
- `docs/API_CONTRACTS.md` is referenced but absent
- `docs/RBAC_MATRIX.md` is referenced but absent

### Must update if readiness/checklist docs are consolidated

- `docs/DEFENSE_READY.md`
- `docs/FINAL_QA_CHECKLIST.md`
- `docs/DEMO_JURY_FINAL_CHECKLIST.md`
- `docs/DEPLOYMENT.md`

### Must update if log path or runtime artifact location changes

- `server/src/main/resources/application.yaml`
- `docs/FINAL_QA_CHECKLIST.md`
- `docs/DEPLOYMENT.md`

### Must update if root structure is cleaned aggressively

- `AGENTS.md`
- `docs/final-audit/00-repo-census.md`

### Script issue to fix separately, not delete

- `sentiment-service/START_SENTIMENT_SERVICE.bat`

Reason:
- the file appears to contain two concatenated script bodies
- it is still referenced by `scripts/dev/start-ai-services.bat`, so this is a cleanup/repair task, not a deletion candidate

## Dependency Cleanup Candidates

These are candidates only. They should not be removed before defense without a tiny verification pass.

### Client candidates

Likely unused by import search:
- `@material-tailwind/react`
- `@mui/material`
- `@mui/icons-material`
- `@headlessui/react`
- `react-markdown`
- `remark-gfm`
- `ajv`
- `assert`
- `yaml`
- `web-vitals`

Why flagged:
- current `rg` import search found active usage for `recharts`, `react-colorful`, `sockjs-client`, and `@stomp/stompjs`
- the packages above did not appear in current client imports/config search

Scope/misplacement candidates:
- `@types/jest`
- `@types/node`
- `@types/react`
- `@types/react-dom`

Why flagged:
- they are listed under `dependencies` instead of `devDependencies`

Structural cleanup note:
- the client manifest suggests multiple UI stacks at once:
- custom Tailwind/design-system styling
- MUI
- Material Tailwind
- Headless UI
- this is a cleanup candidate after defense, not before

### Server candidates

Likely redundant or currently unused:
- `spring-boot-starter-json`
- `org.mapstruct:mapstruct`
- `org.mapstruct:mapstruct-processor`
- `net.logstash.logback:logstash-logback-encoder`
- `com.google.guava:guava`

Why flagged:
- `spring-boot-starter-web` already brings JSON support
- only `MapperConfig.java` was found for MapStruct; no concrete `@Mapper` interfaces were found
- no logback/logstash config or code usage was found for `logstash-logback-encoder`
- no direct `com.google.common` imports were found for explicit `guava`

Keep for now:
- security, mail, websocket, flyway, PDF, Excel, Google OAuth, and resilience dependencies all have clear code/config usage

### Python candidates

Sentiment-service cleanup candidates:
- `requirements_demo.txt`
- `main_demo.py`
- `main_simple.py`

Why flagged:
- official scripts use `requirements.txt` and `app.main:app`
- no active references were found for the demo/simple entrypoints in official scripts

## Do Now / Later / After Defense

### Do now

- stop adding new QA/status artifacts directly in the repo root
- remove sensitive tracked QA auth artifacts from git tracking first:
- `qa_%u.cookies`
- `qa_*.txt`
- fix active doc dead links or replace them with explicit "missing / to be written" placeholders:
- `docs/API_CONTRACTS.md`
- `docs/RBAC_MATRIX.md`
- choose one active readiness/checklist set for the defense period and demote the rest to archive status

### Later

- archive `INTEGRATION_DOCKER/`, `INTEGRATION_JAVA/`, and `OPTIMISER_STS.md`
- archive or relocate `sprint4_p0_*` evidence out of the repo root
- clean `sentiment-service/START_SENTIMENT_SERVICE.bat`
- archive the sentiment legacy demo/simple files
- tighten `.gitignore` to catch future root clutter patterns such as:
- `qa_*.txt`
- `*.cookies`
- `sprint4_p0_*`
- `*.status`

### After defense

- perform dependency cleanup for the client and server candidates listed above
- decide whether `logs/` should move to a less prominent runtime location and update config/docs together
- consider moving local tooling folders such as `.sixth/` and `.venv/` outside the visible project root where tooling allows
- consolidate overlapping historical docs into clearer archive folders

## Bottom Line

The repository is functionally organized, but its presentation is being dragged down by tracked QA/session artifacts, duplicate integration folders, overlapping readiness docs, and some obvious dependency drift.

The safest cleanup order is:

1. remove sensitive generated artifacts from the root and from git tracking
2. fix doc dead links and choose one official readiness/checklist path
3. archive legacy integration material and historical one-off docs
4. postpone dependency pruning and runtime-path reshaping until after defense
