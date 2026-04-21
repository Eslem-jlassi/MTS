# SPRINT 1 BASELINE - Professionnalisation visible et fiabilisation faible risque

## Objectif
Ce baseline couvre uniquement Sprint 1 avec des changements visibles et a faible risque, en conservant les flux existants client/agent/manager/admin.

## Contraintes respecte
- Zero breaking change cible sur les parcours fonctionnels existants.
- Backend conserve le role de source de verite RBAC/securite.
- Toute evolution de schema/donnees SQL est faite via Flyway.
- Pas de refonte metier: uniquement harmonisation, garde-fous d affichage, lisibilite.

## Synthese des changements

### 1) Identite produit et donnees demo harmonisees
- Alignement des comptes demo MTS Telecom sur MySQL/H2.
- Harmonisation des clients/services/tickets visibles sur baseline MTS.
- Password demo commun documente: Password1!.
- H2 conserve son mode demo local (DataInitializer, flyway desactive en profil h2).

Fichiers principaux:
- server/src/main/resources/db/migration/V36__professionalize_demo_baseline.sql
- server/src/main/java/com/billcom/mts/config/DataInitializer.java
- client/src/demo/demoData.ts
- client/src/pages/LoginPage.tsx

### 2) Corrections UI/UX visibles (FR coherence + texte corrompu)
- Nettoyage de libelles moji/encodage dans les zones visibles.
- Fallback d affichage des tableaux rendu propre (-- au lieu de caractere corrompu).
- Recherche base de connaissances etendue pour couvrir explicitement le contenu des reponses.

Fichiers principaux:
- client/src/components/ui/DataTable.tsx
- client/src/demo/demoInterceptor.ts
- client/src/pages/KnowledgeBasePage.tsx

### 3) Normalisation formatting produit
- Consolidation des formats dates/heures/pourcentages via utilitaires communs.
- Affichage plus robuste sur valeurs null/indefinies pour eviter NaN/undefined visibles.

Fichiers principaux:
- client/src/utils/formatters.ts
- client/src/pages/SlaPage.tsx
- client/src/pages/ReportsPage.tsx
- client/src/pages/TicketDetail.tsx
- client/src/pages/dashboard/ManagerDashboard.tsx

### 4) Amelioration visible des rapports
- Resume executif rendu plus lisible dans UI.
- PDF/CSV report generation nettoyee sans changement de logique metier.
- Branding/texte harmonise MTS Telecom sur les sorties visibles.

Fichiers principaux:
- client/src/pages/ReportsPage.tsx
- server/src/main/java/com/billcom/mts/service/ReportGenerationService.java
- server/src/main/java/com/billcom/mts/config/OpenApiConfig.java

### 5) Fiabilisation faible risque (audit/timezone/docker)
- Correctif endpoint detail audit (recherche par id directe cote backend).
- Timezone par defaut alignee Europe/Paris (runtime + defaults business hours).
- Persistance docker alignee pour uploads/avatars/reports.

Fichiers principaux:
- server/src/main/java/com/billcom/mts/controller/AuditLogController.java
- server/src/main/java/com/billcom/mts/service/AuditLogService.java
- server/src/main/resources/application.yaml
- server/src/main/resources/db/migration/V37__align_business_hours_defaults.sql
- docker-compose.yml
- INTEGRATION_DOCKER/docker-compose-full.yml

## Tests cibles Sprint 1

### Frontend
- Login smoke: prefill demo credentials.
  - client/src/pages/LoginPage.test.tsx
- Role dashboards smoke: client/agent/manager/admin.
  - client/src/pages/dashboard/Dashboard.test.tsx
- Ticket creation smoke.
  - client/src/components/tickets/CreateTicketModal.test.tsx
- Ticket detail smoke.
  - client/src/pages/TicketDetail.test.tsx
- Audit page smoke.
  - client/src/pages/AuditLogPage.test.tsx
- Reports page smoke + executive summary panel.
  - client/src/pages/ReportsPage.test.tsx
- IA indisponible fallback visible.
  - client/src/components/chatbot/useChatbotConversation.test.ts

### Backend
- Audit RBAC + detail by id.
  - server/src/test/java/com/billcom/mts/controller/AuditLogControllerRbacTest.java
- Report generation baseline.
  - server/src/test/java/com/billcom/mts/service/ReportGenerationServiceTest.java

## Validation manuelle (checklist soutenance)
1. Login avec comptes demo documentes (admin/manager/agent/client) et mot de passe Password1!.
2. Verifier dashboard par role sans regression de navigation.
3. Creer un ticket puis ouvrir son detail et verifier affichages SLA/date.
4. Ouvrir Journal d Audit, verifier table + modal detail.
5. Ouvrir Rapports, afficher resume executif, telecharger PDF/CSV.
6. Simuler indisponibilite IA et verifier message fallback utilisateur.
7. Redemarrer docker compose et verifier persistance des fichiers uploades.

## Risques residuels connus
- Jeux de donnees de test backend historiques conservent certains anciens emails de fixture (hors UI demo).
- Certaines zones de commentaires techniques peuvent encore contenir du texte legacy non visible utilisateur.
- Le rendu PDF depend de la police disponible dans l environnement d execution.

## Plan de rollback
1. Rollback applicatif: revenir au commit precedent Sprint 1.
2. Rollback DB: restaurer snapshot base avant V36/V37 ou appliquer migration corrective inverse si necessaire.
3. Rollback compose: retirer volume backend_uploads dans les compose concernes si besoin de retour strict.
4. Rejouer la batterie de smoke tests apres rollback.
