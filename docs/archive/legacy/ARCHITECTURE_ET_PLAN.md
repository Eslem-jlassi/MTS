# MTS Telecom – Analyse existante, architecture cible et plan d’exécution

**Lead Full-Stack (Spring Boot + React) + Product Designer**  
Billcom Consulting – PFE 2026

---

## 1) Scanner le projet – Résumé de l’existant

### 1.1 Backend (`server/`)

| Élément | État |
|--------|------|
| **Stack** | Spring Boot 3.2, Java 17, MySQL, JPA/Hibernate, Flyway, JWT (jjwt 0.12), MapStruct, Lombok |
| **Package** | `com.billcom.mts` |
| **Sécurité** | JWT + RefreshToken (RefreshTokenService, JwtService, JwtAuthenticationFilter), MtsUserDetailsService, SecurityConfig |
| **API** | OpenAPI/Swagger (springdoc-openapi-starter-webmvc-ui), CORS (WebConfig) |
| **Temps réel** | WebSocket/STOMP (WebSocketConfig, WebSocketAuthInterceptor) |
| **Controllers** | AuthController, TicketController, DashboardController, NotificationController, ReportController, ServiceController (TelecomService), UserController |
| **DTOs** | auth (LoginRequest, RegisterRequest, AuthResponse), ticket (Create, Assign, Comment, StatusChange, Response), dashboard (DashboardStats), notification (NotificationResponse), report (Request/Response), service (Request/Response), user (UserResponse, UserUpdateRequest), common (ApiError, PageResponse) |
| **Entities** | User, Role, Client, TelecomService, Ticket, TicketComment, TicketHistory, Notification, Report, RefreshToken, **ChatbotLog**, **Message** |
| **Enums** | UserRole, TicketStatus, TicketPriority, TicketCategory, TicketAction, ServiceStatus, ServiceCategory, ServiceType, NotificationType, ReportType, Severity |
| **Exception** | GlobalExceptionHandler, BadRequestException, ForbiddenException, ResourceNotFoundException, UnauthorizedException |
| **Migrations** | Flyway : V1 (init_schema avec users, clients, services, tickets, ticket_comments, ticket_history, refresh_tokens, **chatbot_logs**, **messages**), V2 seed, V5–V15 (enums, notifications, reports, roles, etc.) |
| **À retirer** | ChatbotLog, ChatbotLogRepository, Message, MessageRepository ; migration V8 (chatbot_logs) ; toute référence chatbot. |

**Points forts :**  
RBAC (UserRole), workflow ticket (NEW → IN_PROGRESS → PENDING/ESCALATED → RESOLVED → CLOSED/CANCELLED), SLA (slaHours, deadline, breachedSla, isOverdue, isSlaWarning), commentaires avec `is_internal`, historique ticket, notifications in-app + WebSocket, rapports (upload), refresh token.

**Manques / à renforcer :**  
Workflow sans “Assigné” / “En attente tiers” explicites ; pas d’entité Incident ; pas de Company/Entreprise (multi-tenant) ; pas de champs cause racine / solution / catégorie finale / temps passé / impact sur Ticket ; pas de RFC7807 ; pas de pièces jointes ticket ; pas de macros/templates ; pas de KPI services (dispo, latence, MTTR) ni topologie.

### 1.2 Frontend (`client/`)

| Élément | État |
|--------|------|
| **Stack** | React 18, TypeScript, Redux Toolkit, React Router 6, Tailwind, MUI partiel (@mui/material, @mui/icons-material), Framer Motion, Recharts, STOMP/sockjs (@stomp/stompjs, sockjs-client) |
| **Structure** | `src/api` (authService, client, clientService, dashboardService, notificationService, reportService, telecomServiceService, ticketService, userService), `src/components` (auth, layout, tickets, ui), `src/context` (ThemeContext), `src/hooks`, `src/pages`, `src/redux/slices`, `src/theme`, `src/types` |
| **Layout** | MainLayout : sidebar (collapsible), topbar (theme toggle, notifications, user menu), pas de breadcrumb explicite |
| **Pages** | Login, Register, Dashboard, TicketList, TicketDetail, ClientsPage, ServicesPage, ReportsPage, UsersPage, ProfilePage, SettingsPage, **ChatbotPage** (à retirer), ErrorPage, NoPage |
| **Design** | Design tokens dans `theme/index.ts` (primary navy, status colors), Tailwind + classes `ds-*` (ds-page, ds-card, ds-border, etc.), dark/light via ThemeContext |
| **RBAC** | RoleBasedRoute, navigation filtrée par `user.role` (Clients/Services/Rapports/Utilisateurs selon rôle) |
| **Notifications** | useWebSocketNotifications, notificationsSlice (fetchUnreadCount, fetchUnreadNotifications, markAsRead), centre de notifications dans la topbar |

**Points forts :**  
Sidebar + topbar, thème clair/sombre, centre de notifications, composants UI (Button, Badge, Card, Modal, Input, EmptyState, Skeleton), Recharts sur le dashboard, création ticket (CreateTicketModal).

**Manques / à renforcer :**  
Breadcrumb, densité (compact/comfortable), tables avec tri/recherche/filtres/pagination/bulk actions, design system unifié (un seul UI kit), empty/loading/error states homogènes, filtres avancés tickets, timeline détail ticket, pièces jointes.

---

## 2) Architecture cible

### 2.1 Backend – Packages cibles (recommandation)

```
com.billcom.mts
├── config/           # Security, Web, OpenAPI, WebSocket, DataInitializer, Mapper, handlers
├── controller/       # Auth, Ticket, Dashboard, Notification, Report, Service, User (+ Incident si ajout)
├── dto/
│   ├── auth/
│   ├── common/       # PageResponse, ApiError → + RFC7807 ProblemDetail
│   ├── dashboard/
│   ├── notification/
│   ├── report/
│   ├── service/
│   ├── ticket/       # + BulkAssign, BulkStatus, MacroRequest, AttachmentResponse...
│   ├── incident/     # (nouveau, si MVP Incident)
│   └── user/
├── entity/           # Supprimer ChatbotLog, Message. Optionnel: Company (multi-tenant), Incident
├── enums/
├── exception/        # + RFC7807 dans GlobalExceptionHandler
├── repository/       # Supprimer ChatbotLogRepository, MessageRepository
├── security/
├── service/
├── service/impl/
├── validation/
└── (optionnel) audit/ # AuditLog entity + service pour “qui a fait quoi”
```

**Multi-tenant léger :**  
Ajouter entité `Company` (id, name, code) et `company_id` sur Client, Ticket, TelecomService (et éventuellement User). Filtrer en backend par `company_id` selon le contexte (utilisateur ou client).

### 2.2 Frontend – Structure cible

```
client/src
├── api/                    # Garder découpage actuel, ajouter endpoints (bulk, macros, attachments)
├── components/
│   ├── auth/               # Login, Register, ProfileSelector, ThemeToggle, RoleBasedRoute
│   ├── layout/             # MainLayout + Breadcrumb (nouveau)
│   ├── ui/                 # Button, Badge, Card, Table, Modal, Form, Toast, EmptyState, Skeleton
│   ├── tickets/            # CreateTicketModal, Toast, + TicketTable, TicketFilters, Timeline, Attachments
│   └── shared/             # (optionnel) DataTable réutilisable avec tri/filtres/pagination
├── context/                # ThemeContext (+ DensityContext si densité)
├── hooks/
├── pages/                  # Retirer ChatbotPage
├── redux/slices/
├── theme/                  # Design system unifié (un seul kit: MUI ou garder Tailwind + tokens)
├── types/
└── utils/                  # (optionnel) formatDate, exportCSV...
```

**UI kit recommandé :**  
Garder **Tailwind + design tokens** déjà en place et **MUI** (déjà en dépendances) pour tables avancées (DataGrid ou Table avec tri/filtres/pagination) et quelques composants (Dialog, Snackbar, Skeleton). Éviter de mélanger AntD/Chakra/shadcn pour rester cohérent.

---

## 3) Proposition UI (structure pages + composants + mini style guide)

### 3.1 Structure des pages et navigation

- **Layout commun :** Sidebar (icônes + libellés, collapsible) + Topbar (breadcrumb, recherche globale optionnelle, densité, thème, notifications, profil).
- **Breadcrumb :** `Accueil > Tickets > Détail #TKT-2024-001` (généré par route + métadonnées).
- **Header de page :** Titre (h1) + description courte (texte secondaire) + actions primaires (ex. “Créer un ticket”, “Exporter”).
- **Tables :** Une seule source de vérité “DataTable” réutilisable : tri par colonne, recherche texte, filtres (statut, priorité, catégorie, service, client, assigné, SLA, dates), pagination (taille page 10/25/50), colonnes affichables/masquables, actions par ligne (assigner, statut, escalader) + actions groupées (bulk assign, bulk status, export).
- **Détail ticket :** Blocs clairs : Résumé (titre, statut, priorité, SLA, assigné) ; Timeline (audit) ; Commentaires (onglet client vs notes internes) ; Pièces jointes (upload + liste avec contrôle d’accès).
- **Dashboard :** KPI cards (SLA compliance, temps moyen résolution, tickets actifs, incidents actifs, top services en panne) + graphiques (Recharts) + export.

### 3.2 Composants réutilisables (inventaire cible)

| Composant | Rôle |
|-----------|------|
| Button | Variants: primary, secondary, ghost, danger; sizes: sm, md, lg |
| Badge | Statut (vert/orange/rouge/gris), compteurs |
| Card | Conteneur avec titre optionnel, bordure, ombre |
| Table / DataTable | En-têtes cliquables (tri), filtres, pagination, selection, bulk actions |
| Modal | Création/édition, confirmation suppression |
| Form | Champs avec label, erreur, required (cohérent avec design tokens) |
| Toast | Notifications éphémères (succès/erreur/info) |
| EmptyState | Illustration + message + action primaire |
| Skeleton | Chargement listes/cards |
| Breadcrumb | Fil d’Ariane depuis la route |

### 3.3 Mini style guide (à respecter partout)

- **Couleurs :** Primary `#0B1F3A` (navy), Secondary `#1D4ED8`, Accent `#0EA5E9` ; statuts success/warning/error selon `theme/index.ts`.
- **Typo :** Inter/IBM Plex Sans ; titres page 1.5rem, section 1.25rem, corps 0.875rem, caption 0.75rem.
- **Espacement :** Grille 8px (xs 4 → 2xl 48).
- **Contrastes :** Texte principal / secondaire / muted pour accessibilité ; focus visible sur tous les contrôles.
- **États :** Loading (Skeleton), empty (EmptyState), error (message + retry).
- **Densité :** Option “compact” (padding réduit, ligne table plus fine) vs “comfortable” (actuel).

---

## 4) Todo-list technique ordonnée (étapes)

### Phase 0 – Nettoyage (sans casser l’existant) ✅ FAIT

1. **Supprimer tout ce qui est chatbot**
   - Front : route `/chatbot` retirée dans `App.tsx`, lien sidebar “Assistant IA” retiré dans `MainLayout.tsx`, page `ChatbotPage.tsx` supprimée ; dans `AuthLayout.tsx` la feature “Chatbot IA intégré” remplacée par “Rapports & analytics”.
   - Back : `ChatbotLog.java`, `ChatbotLogRepository.java`, `Message.java`, `MessageRepository.java` supprimés.
   - DB : Migration **V16__drop_chatbot_and_messages_tables.sql** ajoutée (DROP TABLE chatbot_logs, messages) pour ne plus conserver ces tables.

### Phase 1 – Backend : Sécurité, erreurs, pagination ✅ FAIT

2. **RFC7807** : `GlobalExceptionHandler` renvoie désormais un corps RFC 7807 (`ProblemDetail`) avec `Content-Type: application/problem+json` (title, status, detail, instance, timestamp, properties.validationErrors).
3. **Pagination / tri** : Les list endpoints (tickets, users, services, reports) utilisent déjà `Pageable` et `Page` ; le frontend consomme `content`, `number`, `size`, `totalElements`, etc.
4. **RBAC strict** : `@PreAuthorize` déjà en place sur les controllers ; `getTicketByNumber` sécurisé via `getTicketByNumberSecured(ticketNumber, user)` (accès CLIENT = ses tickets uniquement).
5. **JWT + refresh** : Logout révoque le refresh token ; refresh avec rotation ; 401 géré côté front (intercepteur Axios + refresh).

### Phase 2 – Backend : Ticketing enterprise (partiel ✅)

6. **Workflow statuts** ✅ : Aligner avec la mission (Nouveau → Assigné → En cours → En attente client → En attente tiers → Résolu → Clos + Réouverture). Ajouter statut `ASSIGNED` si absent, et `PENDING_THIRD_PARTY` ; mettre à jour `TicketStatus` enum + `canTransitionTo` / `getAllowedTransitions`.
7. **Champs ticket** : Ajouter cause racine, solution, catégorie finale, temps passé, impact (entity + DTO + migration Flyway).
8. **Commentaires** : Déjà `is_internal` ; s’assurer exposition claire “client vs notes internes” dans DTO et API.
9. **Pièces jointes** : Entity `TicketAttachment` (ticket_id, file_name, stored_path, uploaded_by, size, content_type) ; endpoint upload/download avec contrôle d’accès ; migration.
10. **Timeline** : S’appuyer sur `TicketHistory` ; endpoint ou champ dans TicketResponse pour liste d’événements (créé, assigné, statut, priorité, commentaire, pièce jointe, SLA).
11. **Filtres avancés** : Liste tickets avec filtres (statut, priorité, catégorie, service, client, assigné, SLA OK/à risque/dépassé, plage de dates).
12. **Bulk actions** : Endpoints assigner en masse, changer statut en masse, changer priorité en masse, export CSV (tickets filtrés).
13. **Macros / quick replies** : Entity `Macro` (contenu, nom, rôle) ; CRUD minimal + endpoint “appliquer macro” sur un ticket (ex. remplir champ solution ou commentaire).

### Phase 3 – Backend : SLA, escalade, notifications

14. **SLA configurable** : Table ou config par priorité et par service (sla_hours) ; calcul deadline et “à risque” (< 20 % temps restant).
15. **Escalade auto** : Règle simple (ex. si SLA dépassé ou à risque → passer en ESCALATED ou créer notification manager).
16. **Notifications** : In-app (déjà) + email (déjà EmailService) ; optionnel push navigateur.
17. **Temps réel** : Coaqénsolider WebSocket/STOMP pour événements (nouveau ticket, assignation, statut, SLA à risque).

### Phase 4 – Backend : Supervision services “crédible”

18. **Incident** : Entity Incident (gravité, statut, période, cause, services impactés) ; lien optionnel ticket parent / sous-tickets ; endpoints CRUD + liste.
19. **KPI services** : Champs ou table (disponibilité, latence, erreurs, MTTR) ; simulés ou stockés ; exposés dans ServiceResponse et dashboard.
20. **Topologie** : Table `service_dependency` (parent_id, child_id) ; endpoint “graphe” pour page Topologie (front : affichage basique).

### Phase 5 – Backend : Reporting pro

21. **Rapports générés** : En plus de l’upload PDF, générer rapports (hebdo/mensuel) basés sur tickets/incidents ; stockage métadonnées + fichier ; liste + filtres + permissions.
22. **Export** : CSV/Excel + PDF pour rapports et liste tickets ; contrôle d’accès par rôle.

### Phase 6 – Backend : Multi-tenant et audit

23. **Company** : Entity Company ; liaison Client/User (et optionnellement Ticket, TelecomService) ; filtre par company_id dans les requêtes.
24. **Audit log** : Table audit_log (entity, entity_id, action, user_id, timestamp, détails) ; écriture sur tickets/incidents/services/users critiques.

### Phase 7 – Frontend : UI/UX pro

25. **Breadcrumb** : Composant + intégration dans MainLayout (dérivé de la route).
26. **Header de page** : Composant PageHeader (titre, description, actions) ; l’utiliser sur toutes les pages.
27. **DataTable** : Composant réutilisable (tri, recherche, filtres, pagination, colonnes configurables, actions ligne + bulk).
28. **Tickets** : TicketList avec DataTable + filtres avancés + bulk actions ; TicketDetail avec Timeline, onglets commentaires vs notes internes, pièces jointes.
29. **Densité** : Option compact/comfortable (context ou préférence utilisateur) ; appliquer aux tables et espacements.
30. **Empty / Loading / Error** : États homogènes (EmptyState, Skeleton, message erreur + retry) sur toutes les listes et détails.
31. **Design system** : Unifier sur MUI + Tailwind tokens ; documenter dans `theme/index.ts` ou README.

### Phase 8 – Frontend : Fonctionnalités métier

32. **Dashboard** : KPIs + graphiques (Recharts) + export ; indicateurs SLA, incidents, top services.
33. **Macros** : UI pour choisir et appliquer une macro sur un ticket (agents).
34. **Notifications** : Centre déjà présent ; s’assurer lien vers ticket/rapport et marquage lu.

### Phase 9 – Qualité et livraison

35. **Tests** : Backend – tests unitaires services (Ticket, Auth, Dashboard, etc.) et tests controllers (MockMvc) ; au moins smoke tests sur endpoints critiques.
36. **Seed data** : Données de démo cohérentes (users par rôle, clients, services, tickets, 1–2 rapports) dans V2 ou script dédié.
37. **Documentation** : README (setup, variables d’env, run local, docker-compose optionnel, endpoints principaux, rôles) ; OpenAPI à jour.
38. **Checklist** : Vérification sécurité (RBAC, JWT, CORS), perf (pagination, index DB), UX (focus, contrast, responsive, empty/error states).

---

## 5) Fichiers à modifier / ajouter (résumé)

- **Supprimés (Phase 0 – fait) :**  
  `client/src/pages/ChatbotPage.tsx`  
  `server/.../entity/ChatbotLog.java`, `Message.java`  
  `server/.../repository/ChatbotLogRepository.java`, `MessageRepository.java`

- **Modifiés (Phase 0 – fait) :**  
  `client/src/App.tsx` (route et import chatbot retirés)  
  `client/src/components/layout/MainLayout.tsx` (lien “Assistant IA” et icône Bot retirés)  
  `client/src/components/auth/AuthLayout.tsx` (“Chatbot IA intégré” → “Rapports & analytics”)

- **Ajouté (Phase 0 – fait) :**  
  `server/src/main/resources/db/migration/V16__drop_chatbot_and_messages_tables.sql`

- **Phase 1 – fait :**  
  - Backend : `dto/common/ProblemDetail.java` (RFC 7807) ; `GlobalExceptionHandler` retourne `ProblemDetail` + `Content-Type: application/problem+json` ; `TicketService.getTicketByNumberSecured` + contrôle d’accès sur GET par numéro.  
  - Frontend : `types/index.ts` (interface `ProblemDetail`) ; `api/client.ts` (`getErrorMessage` gère `detail` et `message`).

- **À fournir ensuite (par phase) :**  
  Migrations Flyway (nouveaux champs ticket, attachments, company, audit, SLA, macros, incidents, KPI) ; DTOs et endpoints (bulk, macros, attachments, filtres) ; composants React (Breadcrumb, PageHeader, DataTable, Timeline, etc.) ; README et checklist.

---

## 6) Checklist de vérification (à valider en fin de projet)

- [ ] **Tests** : Services et controllers principaux (auth, ticket, dashboard, report generation) passent.
- [ ] **Sécurité** : RBAC sur tous les endpoints ; JWT + refresh ; pas de données cross-tenant sans filtre company.
- [ ] **Perf** : Pagination sur toutes les listes ; index sur colonnes filtrées/triées.
- [ ] **UX** : Focus visible, contrastes, responsive ; empty/loading/error sur chaque page liste/détail ; Breadcrumb + PageHeader.
- [ ] **Docs** : README à jour ; OpenAPI reflète les endpoints ; rôles documentés.

---

## 7) Implémentation des phases 5 à 9 (réalisée)

- **Phase 5** : Rapports générés (POST /api/reports/generate), export CSV/Excel/PDF tickets, source UPLOADED/GENERATED sur Report.
- **Phase 6** : Entity Company, table audit_log, company_id sur clients/users/tickets/services, AuditService + AuditController.
- **Phase 7** : Breadcrumb (MainLayout), PageHeader, DataTable (composant UI), utilisation PageHeader sur TicketList.
- **Phase 8** : Export tickets (boutons CSV/Excel/PDF), génération rapport (modal Rapports), APIs reportService.generate, ticketService.exportExcel/exportPdf.
- **Phase 9** : Test ReportGenerationServiceTest, README mis à jour (endpoints rapports/audit, export), checklist mise à jour.

---

*Document généré dans le cadre du plan de professionnalisation MTS Telecom – sans développement du microservice chatbot.*
