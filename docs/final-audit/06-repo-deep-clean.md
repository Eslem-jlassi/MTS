# Repo Deep Clean

Date: 2026-04-12

Objectif:
- nettoyer la racine sans toucher au comportement metier
- sortir du flux principal les artefacts generes et les docs historiques
- conserver des chemins explicites pour les archives utiles

## Actions appliquees

### Racine nettoyee

Supprime de la racine:
- `qa_%u.cookies`
- `qa_admin_at_mts-telecom_ma.txt`
- `qa_admin_at_mts-telecom_ma_txt`
- `qa_admin_current.txt`
- `qa_admin_fresh.txt`
- `qa_admin_fresh_cmd.txt`
- `qa_admin_live.txt`
- `qa_agent_current.txt`
- `qa_agent_live.txt`
- `qa_client_live.txt`
- `qa_dsi_at_sahara-connect_ma.txt`
- `qa_dsi_at_sahara-connect_ma_txt`
- `qa_dsi_sahara_retry.txt`
- `qa_karim_agent_at_mts-telecom_ma.txt`
- `qa_karim_agent_at_mts-telecom_ma_txt`
- `qa_layla_agent_at_mts-telecom_ma.txt`
- `qa_layla_agent_at_mts-telecom_ma_txt`
- `qa_manager_at_mts-telecom_ma.txt`
- `qa_manager_at_mts-telecom_ma_txt`
- `qa_manager_current.txt`
- `qa_manager_live.txt`
- `qa_support_at_atlas-distribution_ma.txt`
- `qa_support_at_atlas-distribution_ma_txt`
- `qa_support_current.txt`
- `build-status.txt`
- `tsc-status.txt`
- `foo-status.txt`
- `docker_ready.status`
- `docker_info_check.txt`
- `ai_build_plain.log`
- `build-output.log`
- `duplicate_build.log`
- `duplicate_build_plain.log`
- `sentiment_build.log`
- `tsc-output.log`

Justification:
- artefacts generes
- aucune reference active trouvee dans les scripts officiels
- les fichiers `qa_*` et `*.cookies` ne devaient pas etre conserves car ils pouvaient contenir des informations de session

### Artefacts QA/evidence deplaces

Deplaces vers `docs/archive/evidence/2026-04-root-artifacts/`:
- `sprint4_p0_ai_chatbot.json`
- `sprint4_p0_ai_chatbot_ask.json`
- `sprint4_p0_ai_chatbot_fallback.json`
- `sprint4_p0_ai_chatbot_health.json`
- `sprint4_p0_ai_duplicate.json`
- `sprint4_p0_ai_duplicate_detect.json`
- `sprint4_p0_ai_duplicate_health.json`
- `sprint4_p0_ai_massive.json`
- `sprint4_p0_ai_massive_detect.json`
- `sprint4_p0_ai_sentiment.json`
- `sprint4_p0_ai_sentiment_analyze.json`
- `sprint4_p0_ai_sentiment_health.json`
- `sprint4_p0_audit_recent.json`
- `sprint4_p0_auth_checks.log`
- `sprint4_p0_compose_ps.txt`
- `sprint4_p0_compose_ps_after_restart.txt`
- `sprint4_p0_login_admin.json`
- `sprint4_p0_logs_volume_after_restart.txt`
- `sprint4_p0_logs_volume_before_restart.txt`
- `sprint4_p0_me_admin.json`
- `sprint4_p0_persistence_after.txt`
- `sprint4_p0_persistence_before.txt`
- `sprint4_p0_reports_all.json`
- `sprint4_p0_restart_output.txt`
- `sprint4_p0_smoke_final2.log`
- `sprint4_p0_start_stack.log`
- `sprint4_p0_start_stack_final.log`
- `sprint4_p0_start_stack_final2.log`
- `sprint4_p0_start_stack_tail.log`
- `sprint4_p0_ticket_assign.json`
- `sprint4_p0_ticket_comment.json`
- `sprint4_p0_ticket_create.json`
- `sprint4_p0_ticket_status.json`
- `sprint4_p0_uploads_volume_after_restart.txt`
- `sprint4_p0_uploads_volume_before_restart.txt`
- `sprint4_p0_users.json`
- `sprint4_p0_volumes.txt`

Justification:
- preuves utiles de verification, mais pas source de verite
- nettoyage de la racine sans perte d'historique de verification

### Integrations historiques deplacees

Deplaces vers `docs/archive/integration/`:
- `INTEGRATION_DOCKER/`
- `INTEGRATION_JAVA/`

Justification:
- materiel de compatibilite documentaire uniquement
- non utilise par les scripts officiels de lancement/deploiement

### Documentation legacy deplacee

Deplaces vers `docs/archive/legacy/`:
- `OPTIMISER_STS.md`
- `DEPLOY_READY.md`
- `DEFENSE_READY.md`
- `FINAL_QA_CHECKLIST.md`
- `SPRINT1_BASELINE.md`
- `SPRINT2_SECURITY.md`
- `SPRINT3_AI_WOW.md`

Justification:
- documents historiques, redondants ou remplaces
- les chemins actifs restants sont `docs/DEPLOYMENT.md`, `docs/DEMO_JURY.md`, `docs/DEMO_JURY_FINAL_CHECKLIST.md`

## Docs actives renforcees

Ajoute:
- `docs/API_CONTRACTS.md`
- `docs/RBAC_MATRIX.md`

But:
- eliminer les liens morts deja signales dans les audits
- donner un point d'entree minimal, stable et coherent pour les futurs lots

Mis a jour:
- `README.md`
- `docs/README.md`
- `docs/DEPLOYMENT.md`
- `docs/archive/evidence/README.md`
- `docs/archive/integration/README.md`
- `docs/archive/legacy/README.md`
- `sentiment-service/README_SOUTENANCE.md`
- `.gitignore`

## Dependances

Aucune dependance retiree dans ce lot.

Justification:
- le scan confirme plusieurs candidats probables cote frontend et backend
- mais la suppression propre demanderait aussi la regeneration/validation des lockfiles et un passage de verification plus large
- avant soutenance, le choix le plus sur est de documenter ces candidats plutot que de lancer une purge speculatrice

## Arbre resume apres nettoyage

Racine active:
- `README.md`
- `AGENTS.md`
- `.env.example`
- `docker-compose.yml`
- `client/`
- `server/`
- `sentiment-service/`
- `duplicate-service/`
- `ai-chatbot/`
- `scripts/`
- `docs/`

Archives:
- `docs/archive/legacy/`
- `docs/archive/integration/`
- `docs/archive/evidence/`

Conserve volontairement:
- `logs/` car le backend ecrit encore dans `logs/mts-telecom.log`
- `.venv/` et `.sixth/` comme outillage local hors flux produit
- `.env` car il reste necessaire au lancement local/compose
- `sentiment-service/main_demo.py`, `sentiment-service/main_simple.py` et `sentiment-service/requirements_demo.txt` car le Dockerfile et la documentation microservice les referencent encore

## Verification manuelle attendue

- verifier que `README.md` et `docs/README.md` orientent bien vers les docs actives
- verifier que `docker-compose.yml` et les scripts officiels restent inchanges
- verifier que la racine ne contient plus d'artefacts QA/status historiques
