# Auth / RBAC / Email Audit

Audit date: 2026-04-12

Scope:
- no business code changes
- conclusions based on current code, config, tests, compose, and existing audit docs
- target is a defense-safe model with minimal additive follow-up work only

Primary evidence reviewed:
- `server/src/main/java/com/billcom/mts/controller/AuthController.java`
- `server/src/main/java/com/billcom/mts/service/impl/AuthServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/EmailService.java`
- `server/src/main/java/com/billcom/mts/service/impl/EmailServiceImpl.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
- `server/src/main/java/com/billcom/mts/security/JwtAuthenticationFilter.java`
- `server/src/main/java/com/billcom/mts/controller/UserController.java`
- `server/src/main/java/com/billcom/mts/controller/ClientController.java`
- `server/src/main/java/com/billcom/mts/service/impl/UserServiceImpl.java`
- `server/src/main/java/com/billcom/mts/service/SensitiveActionVerificationService.java`
- `server/src/main/java/com/billcom/mts/config/DataInitializer.java`
- `server/src/main/resources/application.yaml`
- `server/src/main/resources/application-h2.yaml`
- `server/src/main/resources/db/migration/V31__add_oauth_provider_columns.sql`
- `server/src/main/resources/db/migration/V32__add_quick_replies_and_auth_flows.sql`
- `server/src/main/resources/db/migration/V35__add_email_verification_expiry.sql`
- `server/src/main/resources/db/migration/V38__add_sensitive_action_verification_fields.sql`
- `client/src/api/client.ts`
- `client/src/api/authService.ts`
- `client/src/api/authFlowService.ts`
- `client/src/redux/slices/authSlice.ts`
- `client/src/pages/RegisterPage.tsx`
- `client/src/pages/EmailVerificationPage.tsx`
- `client/src/pages/UsersPage.tsx`
- `client/src/App.tsx`
- `docker-compose.yml`
- `server/pom.xml`
- selected auth / user / email verification tests

## Direct Answers From The Code

| Question | Answer | Evidence |
| --- | --- | --- |
| Is public signup currently intended only for `CLIENT` accounts? | Yes. This is the current intended model in both UI and backend defaults. | `RegisterPage.tsx` only offers `CLIENT`; `AuthServiceImpl.register()` defaults to `CLIENT` and rejects non-client signup unless `mts.allow-internal-signup=true`; `docker-compose.yml` sets `ALLOW_INTERNAL_SIGNUP=false`. |
| How are `MANAGER` / `AGENT` / `ADMIN` accounts currently provisioned? | Through admin-only back-office flows, not public signup. | `UsersPage.tsx` exposes only internal roles `AGENT`, `MANAGER`, `ADMIN`; `UserController#createInternalUser()` is `ADMIN` only; `SecurityConfig` protects `/api/users/internal` and `/api/auth/register/admin`; `/api/users/{id}/role` is admin-only for promotion. |
| Is email verification already partially implemented? | Yes. It is more than a stub: DB fields, backend endpoints, service logic, frontend page, resend flow, and tests already exist. | `AuthController`, `AuthServiceImpl`, `EmailVerificationPage.tsx`, migrations `V32` and `V35`, tests in `AuthControllerTest`, `AuthServiceImplTest`, `EmailVerificationPage.test.tsx`. |
| What SMTP / mail pieces already exist? | Real SMTP wiring already exists. | `spring-boot-starter-mail` in `server/pom.xml`; `spring.mail.*` + `app.mail.*` in `application.yaml`; `EmailService` / `EmailServiceImpl`; compose SMTP env passthrough in `docker-compose.yml`. |
| Where is the source of truth for RBAC? | The backend. The frontend mirrors role intent but is not authoritative. | `SecurityConfig` request rules, controller `@PreAuthorize`, service/controller business guards. Frontend `App.tsx`, `RoleBasedRoute`, `usePermissions`, and menu visibility are convenience mirrors only. |

## Current Implementation

### 1. Authentication and session model

- Browser auth is cookie-first.
- `AuthController` writes `mts_auth_token` and `mts_refresh_token` as HttpOnly cookies.
- Access cookie path is `/`; refresh cookie path is `/api/auth/refresh`.
- `JwtAuthenticationFilter` accepts both `Authorization: Bearer ...` and the auth cookie, which helps Swagger and non-browser tooling without changing the browser model.
- Frontend Axios is configured with `withCredentials: true`.
- Session bootstrap is `/api/auth/me`.
- On `401`, the frontend attempts `/auth/refresh`, retries queued requests, and clears the local session if refresh fails.
- Login, register, forgot-password, reset-password, and resend-verification are rate-limited by `AuthRateLimitService` using client IP keyed in-memory windows.
- Tokens are intentionally removed from browser response bodies unless `AUTH_EXPOSE_TOKENS_IN_BODY=true`.

Primary files:
- Frontend: `client/src/api/client.ts`, `client/src/api/authService.ts`, `client/src/redux/slices/authSlice.ts`, `client/src/App.tsx`
- Backend: `AuthController.java`, `JwtAuthenticationFilter.java`, `AuthServiceImpl.java`, `RefreshTokenServiceImpl.java`, `SecurityConfig.java`, `AuthRateLimitService.java`

### 2. Public signup and Google signup

- Public route is `/register`.
- The register UI only exposes `CLIENT`.
- The page copy explicitly says internal accounts are created by an administrator from back-office.
- Backend `register()` resolves missing role to `CLIENT`.
- Backend rejects non-client signup unless `mts.allow-internal-signup=true`.
- When email verification is required, signup creates the user but does not issue browser session tokens.
- Google login is also client-only for self-service onboarding:
- existing accounts can be linked to Google
- new Google accounts are created as `CLIENT`
- Google accounts are treated as email-verified only when Google says the email is verified

Primary files:
- Frontend: `RegisterPage.tsx`, `authService.ts`, `authSlice.ts`
- Backend: `AuthController.java`, `AuthServiceImpl.java`, `SecurityConfig.java`

### 3. Internal account provisioning

- Admin back-office creation of internal users exists and is the current intended path.
- `UsersPage.tsx` only offers `AGENT`, `MANAGER`, and `ADMIN` in the internal creation form.
- `UserController#createInternalUser()` rejects `CLIENT` and instructs the caller to use the Clients module.
- Client back-office creation is handled separately in `ClientController#createClient()`, which calls admin registration logic with role `CLIENT`.
- There is also an admin-only `/api/auth/register/admin` route, but the operational UI path appears to be:
- internal staff via `/api/users/internal`
- clients via `/api/clients`
- additional admins via `/api/users/internal` or `/api/users/{id}/role`
- first admin is bootstrap/manual, not public signup. In H2 demo mode it is seeded by `DataInitializer`.

Primary files:
- Frontend: `UsersPage.tsx`
- Backend: `UserController.java`, `ClientController.java`, `AuthController.java`, `AuthServiceImpl.java`, `SecurityConfig.java`, `DataInitializer.java`

### 4. Email verification, password reset, and mail layer

- The `users` table already contains:
- `password_reset_token`
- `password_reset_token_expiry`
- `email_verified`
- `email_verification_token`
- `email_verification_token_expiry`
- `oauth_provider`
- `oauth_provider_id`
- `sensitive_action_code_hash`
- `sensitive_action_code_expiry`
- `AuthServiceImpl` already implements:
- `forgotPassword()`
- `resetPassword()`
- `verifyEmail()`
- `resendVerificationEmail()`
- `prepareEmailVerification()`
- `markUserAsVerified()`
- `ensureEmailVerifiedForPasswordLogin()`
- `EmailServiceImpl` already sends:
- password reset emails
- email verification emails
- sensitive admin verification codes
- ticket notifications
- Email verification and password reset are hard failures when mail is required and SMTP is not configured.
- This matters for more than signup:
- client verification depends on mail
- password reset depends on mail
- OAuth admin hard-delete verification depends on mail

Important config behavior:
- `app.mail.enabled` gates actual sending
- `app.auth.require-email-verification` defaults to `${AUTH_REQUIRE_EMAIL_VERIFICATION:${MAIL_ENABLED:false}}`
- `docker-compose.yml` currently defaults `MAIL_ENABLED=false`
- `docker-compose.yml` currently defaults `AUTH_REQUIRE_EMAIL_VERIFICATION=false`
- SMTP env passthrough already exists in compose

Primary files:
- Backend: `EmailService.java`, `EmailServiceImpl.java`, `AuthServiceImpl.java`, `SensitiveActionVerificationService.java`, `application.yaml`, migrations `V31`, `V32`, `V35`, `V38`
- Frontend: `EmailVerificationPage.tsx`, `authFlowService.ts`

### 5. RBAC source of truth

- The authoritative RBAC layer is backend request security plus server-side business checks.
- `SecurityConfig` protects:
- public auth routes
- admin-only registration and user management
- client-only ticket creation
- manager/admin client and report access
- admin-only hard deletes
- Controllers add `@PreAuthorize` for user-management endpoints.
- Service and controller logic adds additional business rules that pure route RBAC does not cover.
- The frontend mirrors this with:
- route guards in `App.tsx`
- `RoleBasedRoute`
- menu filtering in `MainLayout`
- helper permissions in `usePermissions`
- UI role checks are useful for UX but can drift; they are not the trust boundary.

Primary files:
- Backend: `SecurityConfig.java`, `UserController.java`, `ClientController.java`, domain controllers and services
- Frontend: `App.tsx`, `RoleBasedRoute.tsx`, `MainLayout.tsx`, `usePermissions.ts`

### 6. Destructive safeguards that must stay preserved

- Ticket / incident destructive flows already require strong confirmation and server-side enforcement.
- `SensitiveActionVerificationService` requires:
- exact keyword `SUPPRIMER`
- exact resource id re-entry
- password re-auth for local admins
- email code for OAuth admins
- This audit treats those safeguards as non-negotiable.
- Auth / provisioning changes must not weaken:
- double verification
- server-side delete blockers
- audit logging
- client / ticket / incident delete constraints

Primary files:
- Backend: `SensitiveActionVerificationService.java`, `TicketController.java`, `IncidentController.java`, `UserServiceImpl.java`
- Existing contract: `docs/final-audit/01-non-regression-contract.md`

## Gaps And Risks

### 1. Email verification is implemented, but not guaranteed on by default

- The feature exists end to end.
- The main gap is operational: default compose settings currently keep `MAIL_ENABLED=false` and `AUTH_REQUIRE_EMAIL_VERIFICATION=false`.
- Result: the codebase supports real verification, but a default deployment can still run without it unless env is explicitly set.

### 2. Public internal signup is still technically unlockable by config

- `AuthServiceImpl.register()` is safe by default.
- But `mts.allow-internal-signup` exists as an override.
- That is acceptable for controlled environments, but it is a defense risk if accidentally enabled in the wrong deployment.

### 3. "Last admin" protection is incomplete today

- `UserServiceImpl` protects the last admin against hard delete.
- The same protection is not visible in the current `updateUserRole()` or `deactivateUser()` paths.
- Current risk:
- an admin can demote the last remaining admin
- an admin can deactivate the last remaining admin
- this is an admin-lifecycle gap, not a public-signup gap

### 4. First-admin bootstrap is operational, not an explicit one-time workflow

- Current model already blocks public admin creation.
- H2 has a seeded admin and production expects bootstrap/manual setup.
- That matches the intended policy, but it is convention and ops process rather than a dedicated bootstrap state machine.

### 5. Frontend RBAC duplication can drift from backend truth

- Route checks, menu checks, widget checks, and permission hooks duplicate role logic.
- This is already a known repo-wide risk.
- The safe interpretation remains: backend is the source of truth.

### 6. Mail availability affects more than signup

- If SMTP is missing, client verification cannot be "real".
- Password reset becomes non-functional.
- OAuth admin destructive verification codes cannot be delivered.
- For defense, mail should be treated as a platform dependency, not just a nice-to-have feature.

### 7. Documentation drift still exists

- `README.md` and `docs/README.md` reference `docs/RBAC_MATRIX.md`, but the file is absent.
- That increases the chance that future UI-only changes diverge from backend RBAC.

## Safe Target Model For A Defense-Ready Version

The recommended target model is:

- `CLIENT`
- public signup remains available
- public signup results in `CLIENT` only
- real email verification is required before the account is treated as fully active for password login
- Google self-signup/login remains `CLIENT` only

- `MANAGER` / `AGENT`
- created by `ADMIN` from back-office only
- no public self-signup
- reuse existing admin creation paths instead of inventing parallel flows

- first `ADMIN`
- bootstrap/manual only
- never public
- H2/demo seed is acceptable as demo bootstrap evidence

- additional `ADMIN`
- created or promoted by an existing `ADMIN` only
- server-side protection must ensure the system cannot be left without an active admin

- RBAC
- backend remains the source of truth
- frontend stays aligned but does not become authoritative

- auth/session
- keep cookie-first auth
- keep current routes
- keep refresh flow and `/api/auth/me` bootstrap
- avoid any auth architecture rewrite before defense

- delete and sensitive actions
- preserve current double-verification flows
- preserve `SUPPRIMER` keyword confirmation
- preserve password / email-code re-auth
- preserve server-side blockers and audit logging

## Minimal Implementation Plan

This is the smallest defense-safe plan implied by the current codebase.

### Lot A. Lock the environment to the intended policy

- Keep `ALLOW_INTERNAL_SIGNUP=false` in defense, compose, and demo-facing envs unless a very specific local-only reason exists.
- For any environment where public signup is demonstrated, set:
- `MAIL_ENABLED=true`
- valid SMTP credentials
- `AUTH_REQUIRE_EMAIL_VERIFICATION=true`
- confirm `FRONTEND_BASE_URL` points to the actual UI origin

### Lot B. Reuse the existing flows instead of adding new ones

- Keep public signup on `/api/auth/register` for `CLIENT` only.
- Keep email verification on `/api/auth/verify-email` and `/api/auth/resend-verification`.
- Keep internal staff creation on `/api/users/internal`.
- Keep client back-office creation on `/api/clients`.
- Keep admin creation / promotion under existing admin-only routes.
- Do not replace cookie auth with a new token transport model.

### Lot C. Close the admin-lifecycle gap with minimal backend logic

- Add targeted server-side guards so the last active admin cannot be:
- demoted to another role
- deactivated
- optionally self-demoted if that would orphan admin access
- This should be a small additive change in user service/controller logic, not a redesign.
- No database migration should be needed for this guard.

### Lot D. Validate real mail-backed auth flows

- Run an end-to-end verification of:
- client register -> verification email sent
- verify token valid -> account verified
- resend verification -> new token sent
- local password login blocked while unverified
- password reset mail sent and token accepted
- OAuth admin challenge email for sensitive delete still works when mail is enabled

### Lot E. Keep regression scope tight

- Revalidate the non-regression contract in `docs/final-audit/01-non-regression-contract.md`.
- Especially recheck:
- cookie/session auth
- public client signup only
- admin-only internal user creation
- admin-only user management
- delete double-verification and audit safeguards
- dark/light mode
- H2 demo path
- docker-compose path

## Recommended Validation Surface For Future Code Lots

Backend tests already worth reusing:
- `server/src/test/java/com/billcom/mts/controller/AuthControllerTest.java`
- `server/src/test/java/com/billcom/mts/service/impl/AuthServiceImplTest.java`
- `server/src/test/java/com/billcom/mts/service/impl/RefreshTokenServiceImplTest.java`
- `server/src/test/java/com/billcom/mts/controller/UserControllerTest.java`
- `server/src/test/java/com/billcom/mts/controller/ClientControllerTest.java`
- `server/src/test/java/com/billcom/mts/service/SensitiveActionVerificationServiceTest.java`

Frontend tests already worth reusing:
- `client/src/App.test.tsx`
- `client/src/pages/LoginPage.test.tsx`
- `client/src/pages/EmailVerificationPage.test.tsx`
- `client/src/components/layout/MainLayout.test.tsx`

Recommended missing or weak coverage for a future minimal code lot:
- server-side test that rejects demoting the last active admin
- server-side test that rejects deactivating the last active admin
- explicit test that public signup rejects non-client roles under normal config
- explicit UI test that `/register` only exposes `CLIENT`

## Bottom Line

The repository already contains the core of the desired model:
- cookie-first auth
- client-only public signup by default
- admin-only internal provisioning
- real email verification plumbing
- backend RBAC source of truth

The main defense gap is not missing architecture. It is operational hardening plus one important admin-lifecycle safeguard:
- enable and validate real SMTP-backed verification where public signup is used
- keep internal signup disabled
- prevent loss of the last active admin
- preserve the existing destructive-action safeguards exactly as they are
