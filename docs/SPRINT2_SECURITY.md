# Sprint 2 - Securite & Gouvernance (Zero Breaking Change)

## Objectif
Renforcer la securite sans casser les flux existants:
- verification email reelle de bout en bout
- hard-delete admin ticket/incident avec confirmation forte + re-auth
- rate limiting actif sur les endpoints auth sensibles
- couverture de tests ciblee backend/frontend

## Resume des changements

### 1. Verification email (E2E)
Etat actuel consolide:
- inscription avec `emailVerificationRequired/emailVerificationSent`
- login bloque si compte non verifie (local/password)
- verification via token avec expiration
- renvoi de lien de verification

Ce sprint preserve et durcit ce flux sans regression OAuth Google.

### 2. Hard delete admin securise (ticket + incident)
Nouveautes:
- payload backend obligatoire de confirmation forte:
  - mot-cle exact: `SUPPRIMER`
  - saisie de l'ID exact de la ressource
- re-auth obligatoire:
  - compte local: mot de passe admin
  - compte OAuth: code email a usage unique
- endpoint de challenge pour OAuth:
  - `POST /api/tickets/{id}/hard-delete/challenge`
  - `POST /api/incidents/{id}/hard-delete/challenge`
- audit enrichi avec snapshot metier (dependances, mode de re-auth, metadata de suppression)
- suppression transactionnelle preservee

### 3. Hardening rate limiting auth
Mise en place d'un rate limiter in-memory reel cote backend sur:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/resend-verification`

Retour en 429 via `TooManyRequestsException` + `Retry-After`.

### 4. RBAC renforce
`SecurityConfig` durci explicitement pour:
- `DELETE /api/tickets/*/hard-delete` -> ADMIN
- `POST /api/tickets/*/hard-delete/challenge` -> ADMIN
- `DELETE /api/incidents/*/hard-delete` -> ADMIN
- `POST /api/incidents/*/hard-delete/challenge` -> ADMIN

## Fichiers modifies (Sprint 2)

### Backend
- `server/src/main/java/com/billcom/mts/controller/AuthController.java`
- `server/src/main/java/com/billcom/mts/controller/TicketController.java`
- `server/src/main/java/com/billcom/mts/controller/IncidentController.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
- `server/src/main/java/com/billcom/mts/entity/User.java`
- `server/src/main/java/com/billcom/mts/service/EmailService.java`
- `server/src/main/java/com/billcom/mts/service/impl/EmailServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/TicketService.java`
- `server/src/main/java/com/billcom/mts/service/IncidentService.java`
- `server/src/main/java/com/billcom/mts/service/impl/TicketServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/impl/IncidentServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/AuthRateLimitService.java`
- `server/src/main/java/com/billcom/mts/service/SensitiveActionVerificationService.java`
- `server/src/main/java/com/billcom/mts/dto/security/AdminHardDeleteRequest.java`
- `server/src/main/resources/application.yaml`
- `server/src/main/resources/db/migration/V38__add_sensitive_action_verification_fields.sql`

### Frontend
- `client/src/api/ticketService.ts`
- `client/src/api/incidentService.ts`
- `client/src/pages/TicketList.tsx`
- `client/src/pages/IncidentsPage.tsx`
- `client/src/types/index.ts`

### Tests
- `server/src/test/java/com/billcom/mts/controller/AuthControllerTest.java`
- `server/src/test/java/com/billcom/mts/service/AuthRateLimitServiceTest.java`
- `server/src/test/java/com/billcom/mts/service/SensitiveActionVerificationServiceTest.java`
- `server/src/test/java/com/billcom/mts/service/impl/IncidentServiceImplTest.java`
- `server/src/test/java/com/billcom/mts/service/impl/TicketServiceImplTest.java` (maj)
- `server/src/test/java/com/billcom/mts/service/impl/AuthServiceImplTest.java` (maj)
- `client/src/pages/IncidentsPage.test.tsx` (nouveau)
- `client/src/pages/TicketList.test.tsx` (maj)

## Migration Flyway

### V38__add_sensitive_action_verification_fields.sql
```sql
ALTER TABLE users
    ADD COLUMN sensitive_action_code_hash VARCHAR(255) NULL,
    ADD COLUMN sensitive_action_code_expiry DATETIME NULL;
```

## Variables d'environnement ajoutees
- `AUTH_SENSITIVE_ACTION_CODE_EXPIRATION_MINUTES` (defaut 10)
- `AUTH_RATE_LIMIT_LOGIN_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_REGISTER_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_REGISTER_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_FORGOT_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_FORGOT_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_RESET_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_RESET_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_RESEND_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_RESEND_WINDOW_SECONDS`

## Validation executee

### Backend
```bash
cd server
mvn -Dtest=AuthServiceImplTest,AuthControllerTest,AuthRateLimitServiceTest,SensitiveActionVerificationServiceTest,TicketServiceImplTest,IncidentServiceImplTest test
mvn -DskipTests compile
```
Resultat:
- BUILD SUCCESS
- Suites cibles passees (0 echec, 0 erreur)

### Frontend
```bash
cd client
npm test -- --watchAll=false --runInBand --runTestsByPath src/pages/IncidentsPage.test.tsx src/pages/TicketList.test.tsx src/pages/LoginPage.test.tsx src/pages/EmailVerificationPage.test.tsx
```
Resultat:
- 4 suites passees, 29 tests passes
- warnings React `act(...)` deja existants sur TicketList tests (non bloquants)

## QA checklist Sprint 2
- [ ] Register local -> email verification requise
- [ ] Login local non verifie -> bloque + message clair + renvoi verification
- [ ] Verify email token valide -> compte verifie
- [ ] Verify email token expire/invalide -> message explicite
- [ ] Resend verification -> 200 et email envoye
- [ ] Forgot/reset password inchanges
- [ ] Hard delete ticket admin local -> `SUPPRIMER` + ID exact + mot de passe
- [ ] Hard delete ticket admin OAuth -> challenge + code email
- [ ] Hard delete incident admin local -> `SUPPRIMER` + ID exact + mot de passe
- [ ] Hard delete incident admin OAuth -> challenge + code email
- [ ] Audit log contient snapshot enrichi
- [ ] Rate limit actif login/register/forgot/reset/resend (429)
- [ ] Role non-admin -> hard-delete refuse

## Plan de rollback
1. Revenir au commit precedent Sprint 2 si necessaire.
2. Si rollback DB requis, executer une migration corrective qui supprime:
   - `users.sensitive_action_code_hash`
   - `users.sensitive_action_code_expiry`
3. Desactiver temporairement les nouvelles contraintes via config:
   - augmenter fortement les limites `AUTH_RATE_LIMIT_*`
4. Verifier les flux critiques:
   - login/refresh
   - register/verify
   - forgot/reset
   - tickets/incidents CRUD

## Non-regression
- flux OAuth Google conserves
- forgot/reset preserves
- audit trail conserve et enrichi
- suppression logique/archive/reactivation non modifies
