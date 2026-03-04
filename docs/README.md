# MTS — Mobile Telecom Supervisor

**Système de supervision et ticketing intelligent pour opérateurs télécom**

> Projet de Fin d'Études — Billcom Consulting (Tunisie) — Intégrateur Ericsson

---

## 1. Objectifs du projet

MTS est une plateforme professionnelle de gestion d'incidents critiques destinée aux opérateurs télécom. Elle répond aux besoins suivants :

| Objectif | Description |
|----------|-------------|
| **Gestion des incidents** | Créer, suivre et résoudre les incidents impactant les services télécom (ex : panne BSCS facturation, coupure réseau) |
| **Suivi SLA** | Appliquer des politiques SLA configurables par priorité/service, avec alertes à 75 % et détection automatique des dépassements |
| **Audit & traçabilité** | Historique immuable de chaque action (ticket, incident, utilisateur) conforme aux exigences ITSM |
| **Supervision réseau** | Topologie des services, monitoring de santé, gestion des dépendances inter-services |
| **Reporting** | Rapports générés/uploadés avec résumé exécutif, export PDF/CSV/Excel |
| **Authentification sécurisée** | JWT avec refresh token rotatif + Google OAuth 2.0 |

---

## 2. Stack technique

| Couche | Technologies | Version |
|--------|-------------|---------|
| **Backend** | Spring Boot · Spring Security 6 · Spring Data JPA · Flyway · WebSocket/STOMP | 3.2.0 / Java 17 |
| **Frontend** | React · TypeScript · Redux Toolkit · TailwindCSS · Axios · Framer Motion · Recharts | 18.x / TS 4.9 |
| **Auth** | JWT (jjwt) · Google OAuth 2.0 · BCrypt | 0.12.3 |
| **Base de données** | MySQL 8.0 (prod) · H2 in-memory (dev) | 8.0 |
| **Migrations** | Flyway (V1–V33) | auto |
| **API Docs** | springdoc-openapi / Swagger UI | 2.3.0 |
| **Qualité** | JUnit 5 · Spring Security Test · React Testing Library · Spotless · ESLint · Prettier | — |
| **Infra** | Docker Compose (MySQL + phpMyAdmin) | — |
| **Autres** | Apache POI (Excel) · OpenPDF · Resilience4j · logstash-logback-encoder · MapStruct | — |

---

## 3. Modules fonctionnels

```
┌─────────────────────────────────────────────────────────┐
│                      MTS Platform                       │
├───────────┬───────────┬────────────┬────────────────────┤
│ Ticketing │ Incidents │ SLA Engine │ Supervision réseau │
├───────────┼───────────┼────────────┼────────────────────┤
│ Reporting │ Audit Log │ RBAC/Auth  │ Notifications WS   │
└───────────┴───────────┴────────────┴────────────────────┘
```

| Module | Description |
|--------|-------------|
| **Ticketing** | CRUD tickets, workflow multi-statut (OPEN → IN_PROGRESS → RESOLVED → CLOSED), commentaires client/internes, pièces jointes, macros, actions en masse |
| **Incidents** | Incidents liés aux services, timeline, post-mortem, liaison tickets/services affectés |
| **SLA Engine** | Politiques SLA par priorité/service, calcul pause/reprise (heures ouvrées), escalade automatique configurable |
| **Supervision réseau** | Topologie des services télécom, dépendances parent/enfant, historique de statut (UP/DEGRADED/DOWN) |
| **Reporting** | Génération et upload de rapports, résumé exécutif avec KPI, filtres avancés, export multi-format |
| **Audit Log** | Journal immuable : qui a fait quoi, quand, sur quelle entité, avec l'ancien/nouveau état |
| **RBAC** | 4 rôles hiérarchiques (CLIENT < AGENT < MANAGER < ADMIN), `@PreAuthorize` sur chaque endpoint |
| **Notifications** | Temps réel via WebSocket/STOMP, badge count, marquage lu/non-lu |

---

## 4. Rôles et permissions (RBAC)

| Fonctionnalité | CLIENT | AGENT | MANAGER | ADMIN |
|----------------|:------:|:-----:|:-------:|:-----:|
| Créer un ticket | ✅ | — | — | — |
| Voir ses tickets | ✅ | — | — | — |
| Voir tickets assignés | — | ✅ | — | — |
| Voir tous les tickets | — | — | ✅ | ✅ |
| Changer statut ticket | — | ✅ | ✅ | ✅ |
| Assigner / désassigner | — | — | ✅ | ✅ |
| Actions en masse (bulk) | — | — | ✅ | ✅ |
| Export CSV/Excel/PDF | — | ✅ | ✅ | ✅ |
| Gérer incidents | — | ✅ | ✅ | ✅ |
| Configurer SLA | — | — | — | ✅ |
| Voir stats SLA | — | — | ✅ | ✅ |
| Gérer services télécom | — | — | — | ✅ |
| Gérer utilisateurs | — | — | — | ✅ |
| Gérer clients | — | — | — | ✅ |
| Audit logs | — | — | — | ✅ |
| Rapports (upload/générer) | — | — | ✅ | ✅ |
| Dashboard KPI complet | — | — | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ |

> Détail complet : voir [RBAC_MATRIX.md](RBAC_MATRIX.md)

---

## 5. Installation locale

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| JDK | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| npm | 9+ |
| Docker & Docker Compose | récent |

### 5.1 Base de données

**Option A — MySQL via Docker (recommandé) :**

```bash
# Depuis la racine du projet
docker-compose up -d
```

| Service | URL | Accès |
|---------|-----|-------|
| MySQL 8.0 | `localhost:3306` | DB : `mts_telecom_db` |
| phpMyAdmin | http://localhost:8081 | Interface admin DB |

**Option B — H2 en mémoire (démo rapide) :**

Aucune config nécessaire — utiliser le profil `h2` au lancement (voir ci-dessous).

### 5.2 Backend

```bash
cd server

# Avec MySQL (Docker lancé)
mvn spring-boot:run

# Ou avec H2 (sans Docker)
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

| Ressource | URL |
|-----------|-----|
| API REST | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |

> Flyway exécute automatiquement les 33 migrations au premier démarrage.

### 5.3 Frontend

```bash
cd client
npm install
npm start
```

| Ressource | URL |
|-----------|-----|
| Application | http://localhost:3000 |
| Mode démo (sans backend) | http://localhost:3000?demo=true |

> Le proxy CRA redirige `/api/*` vers `localhost:8080`.

### 5.4 Variables d'environnement (optionnel)

```env
# client/.env (optionnel — Google OAuth)
REACT_APP_GOOGLE_CLIENT_ID=<votre-client-id-google>
REACT_APP_DEMO_MODE=false
```

```yaml
# server/src/main/resources/application.yaml — déjà configuré
# Modifier uniquement si nécessaire (port MySQL, credentials, etc.)
```

---

## 6. Scripts disponibles

### Backend (Maven)

| Commande | Description |
|----------|-------------|
| `mvn spring-boot:run` | Lancer le backend (profil MySQL) |
| `mvn spring-boot:run -Dspring-boot.run.profiles=h2` | Lancer en mode H2 |
| `mvn clean compile` | Compiler sans exécuter |
| `mvn test` | Exécuter tous les tests (31 tests : DTO + RBAC) |
| `mvn test -Dtest="DtoValidationTest"` | Tests de validation DTO (16 tests) |
| `mvn test -Dtest="TicketControllerRbacTest"` | Tests RBAC endpoints (15 tests) |
| `mvn spotless:check` | Vérifier le formatage Java |
| `mvn spotless:apply` | Appliquer le formatage automatique |

### Frontend (npm)

| Commande | Description |
|----------|-------------|
| `npm start` | Serveur de développement (port 3000) |
| `npm run build` | Build production optimisé |
| `npm test` | Tests unitaires en mode watch |
| `npm run test:ci` | Tests CI avec couverture |
| `npm run lint` | Vérifier ESLint (0 warning toléré) |
| `npm run lint:fix` | Corriger automatiquement ESLint |
| `npm run format` | Formater avec Prettier |
| `npm run format:check` | Vérifier le formatage Prettier |

### Docker

| Commande | Description |
|----------|-------------|
| `docker-compose up -d` | Démarrer MySQL + phpMyAdmin |
| `docker-compose down` | Arrêter les conteneurs |
| `docker-compose down -v` | Arrêter + supprimer les volumes (reset DB) |

---

## 7. Structure du projet

```
PFE/
├── docs/                          # Documentation projet
│   ├── README.md                  # Ce fichier
│   ├── ARCHITECTURE.md            # Diagrammes d'architecture
│   ├── DATABASE.md                # Schéma DB + migrations
│   ├── API_CONTRACTS.md           # Contrats API + payloads
│   ├── DEMO_JURY.md               # Guide de démonstration
│   └── RBAC_MATRIX.md             # Matrice RBAC détaillée
├── server/                        # Backend Spring Boot
│   ├── pom.xml
│   └── src/main/java/com/billcom/mts/
│       ├── config/                # Filtres, sécurité, WebSocket
│       ├── controller/            # 14 REST controllers
│       ├── dto/                   # Request/Response DTOs
│       ├── entity/                # 23 entités JPA
│       ├── enums/                 # Statuts, priorités, rôles
│       ├── exception/             # GlobalExceptionHandler (RFC 7807)
│       ├── mapper/                # MapStruct mappers
│       ├── repository/            # Spring Data JPA repositories
│       ├── security/              # JWT filter, provider, UserDetails
│       ├── service/               # Logique métier (interfaces + impl)
│       └── validation/            # Validateurs personnalisés
├── client/                        # Frontend React
│   ├── package.json
│   └── src/
│       ├── api/                   # Services Axios (18 modules)
│       ├── components/            # Composants réutilisables
│       │   ├── ui/                # Design system (Button, Card, Modal…)
│       │   ├── layout/            # MainLayout, Breadcrumb, PageHeader
│       │   ├── auth/              # AuthLayout, RoleBasedRoute
│       │   ├── tickets/           # Filtres, bulk actions, drawer
│       │   └── notifications/     # NotificationCenter
│       ├── pages/                 # 25 pages (dashboard, tickets, incidents…)
│       ├── redux/                 # Store + slices (auth, tickets, dashboard…)
│       ├── hooks/                 # Hooks personnalisés
│       ├── context/               # Theme, Language, Toast
│       ├── types/                 # Interfaces TypeScript
│       └── demo/                  # Mode démo (intercepteur Axios)
└── docker-compose.yml             # MySQL 8.0 + phpMyAdmin
```

---

## 8. Tests

| Suite | Technologie | Nombre | Cible |
|-------|-------------|--------|-------|
| **DtoValidationTest** | JUnit 5 + Bean Validation | 16 tests | Validation des DTOs (LoginRequest, RegisterRequest, TicketCreateRequest, IncidentRequest, SlaPolicyRequest) |
| **TicketControllerRbacTest** | JUnit 5 + @WebMvcTest + Spring Security Test | 15 tests | RBAC sur les endpoints tickets (CLIENT, AGENT, MANAGER, ADMIN, non-authentifié) |
| **LoginPage.test.tsx** | React Testing Library | 6 tests | Rendu formulaire, validation, toggle mot de passe, affichage erreurs |
| **TicketList.test.tsx** | React Testing Library | 10 tests | Loading, état vide, affichage tickets, recherche, badges priorité/statut, SLA, pagination |

---

## 9. Liens vers la documentation

| Document | Contenu |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diagrammes Mermaid (front/back/DB), layers, flux de données |
| [DATABASE.md](DATABASE.md) | Schéma ER complet, description des tables, historique des migrations |
| [API_CONTRACTS.md](API_CONTRACTS.md) | Routes principales, méthodes HTTP, payloads JSON d'exemple |
| [DEMO_JURY.md](DEMO_JURY.md) | Scénarios de démonstration par rôle pour la soutenance |
| [RBAC_MATRIX.md](RBAC_MATRIX.md) | Matrice détaillée des permissions par rôle et endpoint |
| [GOOGLE_OAUTH_SETUP.md](../GOOGLE_OAUTH_SETUP.md) | Configuration Google OAuth 2.0 |
