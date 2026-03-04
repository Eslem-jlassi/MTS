# Architecture — MTS Telecom Supervisor

---

## 1. Vue d'ensemble

```mermaid
graph TB
    subgraph Client["Frontend — React 18 + TypeScript"]
        SPA["Single Page Application<br/>Port 3000"]
        Redux["Redux Toolkit Store"]
        Axios["Axios HTTP Client<br/>+ JWT Interceptor"]
        WS_Client["WebSocket Client<br/>STOMP.js"]
    end

    subgraph Server["Backend — Spring Boot 3.2"]
        API["REST API<br/>Port 8080"]
        SEC["Spring Security 6<br/>JWT + OAuth2"]
        SVC["Services métier"]
        SLA["SLA Engine<br/>+ Escalation"]
        WS_Server["WebSocket Broker<br/>STOMP"]
        FLYWAY["Flyway Migrations<br/>V1 → V33"]
    end

    subgraph Data["Couche données"]
        MySQL["MySQL 8.0<br/>mts_telecom_db"]
        H2["H2 In-Memory<br/>(profil dev)"]
        FS["File System<br/>uploads/"]
    end

    subgraph Future["Évolution future"]
        CHATBOT["Microservice Chatbot<br/>Python / NLP"]
        CHATBOT_API["API REST chatbot<br/>Port 5000"]
    end

    SPA --> Axios
    SPA --> WS_Client
    Axios -->|"HTTP/JSON"| API
    WS_Client -->|"STOMP/WebSocket"| WS_Server
    API --> SEC
    SEC --> SVC
    SVC --> SLA
    SVC -->|"JPA/Hibernate"| MySQL
    SVC -->|"JPA/Hibernate"| H2
    SVC -->|"Fichiers"| FS
    FLYWAY -->|"Migrations SQL"| MySQL
    WS_Server --> SVC

    CHATBOT_API -.->|"REST<br/>(futur)"| API
    CHATBOT -.-> CHATBOT_API

    style Client fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style Server fill:#dcfce7,stroke:#22c55e,color:#14532d
    style Data fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style Future fill:#f3e8ff,stroke:#a855f7,color:#581c87
```

---

## 2. Architecture backend — Couches

```mermaid
graph LR
    subgraph Presentation["Couche Présentation"]
        CTRL["Controllers<br/>(14 @RestController)"]
        FILTER["Filtres HTTP<br/>JwtAuthFilter<br/>RequestIdFilter"]
        SWAGGER["Swagger UI<br/>/swagger-ui.html"]
    end

    subgraph Business["Couche Métier"]
        SVC_INT["Interfaces Service"]
        SVC_IMPL["Implémentations<br/>(ServiceImpl)"]
        MAPPER["MapStruct Mappers<br/>(Entity ↔ DTO)"]
        VALID["Validateurs<br/>(Bean Validation)"]
    end

    subgraph Persistence["Couche Persistance"]
        REPO["JPA Repositories<br/>(Spring Data)"]
        ENTITY["Entités JPA<br/>(23 @Entity)"]
    end

    subgraph Cross["Transversal"]
        SEC2["Spring Security<br/>@PreAuthorize"]
        EXC["GlobalExceptionHandler<br/>RFC 7807 ProblemDetail"]
        AUDIT["AuditLog Service<br/>Journal immuable"]
        MDC["RequestIdFilter<br/>MDC Correlation"]
    end

    CTRL --> SVC_INT
    FILTER --> CTRL
    SVC_INT --> SVC_IMPL
    SVC_IMPL --> MAPPER
    SVC_IMPL --> VALID
    SVC_IMPL --> REPO
    REPO --> ENTITY

    SEC2 -.-> CTRL
    EXC -.-> CTRL
    AUDIT -.-> SVC_IMPL
    MDC -.-> FILTER

    style Presentation fill:#e0f2fe,stroke:#0284c7
    style Business fill:#ecfdf5,stroke:#059669
    style Persistence fill:#fefce8,stroke:#ca8a04
    style Cross fill:#fce7f3,stroke:#db2777
```

### Détail des couches

| Couche | Rôle | Exemples |
|--------|------|----------|
| **Controller** | Point d'entrée HTTP, validation `@Valid`, sécurité `@PreAuthorize`, délégation au service | `TicketController`, `AuthController`, `IncidentController` |
| **DTO** | Objets de transfert — découplent l'API des entités JPA | `TicketCreateRequest`, `TicketResponse`, `LoginRequest` |
| **Service** | Logique métier, orchestration, calculs SLA, gestion de l'escalade | `TicketServiceImpl`, `SlaCalculationServiceImpl`, `EscalationEngineServiceImpl` |
| **Mapper** | Conversion automatique Entity ↔ DTO via MapStruct | `TicketMapper`, `UserMapper`, `IncidentMapper` |
| **Repository** | Accès données (CRUD + requêtes personnalisées JPQL/Native) | `TicketRepository`, `UserRepository`, `IncidentRepository` |
| **Entity** | Modèle de données JPA, annotations Hibernate, relations | `Ticket`, `User`, `Incident`, `SlaConfig` |
| **Exception** | Gestion centralisée des erreurs → `ProblemDetail` (RFC 7807) avec `traceId` | `GlobalExceptionHandler`, `ResourceNotFoundException` |
| **Security** | Filtre JWT, provider de tokens, `@PreAuthorize` sur chaque endpoint | `JwtAuthenticationFilter`, `JwtService` |

---

## 3. Architecture frontend

```mermaid
graph TB
    subgraph App["React App"]
        Router["React Router 6<br/>Routes protégées"]
    end

    subgraph Pages["Pages (25)"]
        DASH["Dashboards<br/>(Admin/Manager/Agent/Client)"]
        TICK["Tickets<br/>(Liste + Détail + Kanban)"]
        INC["Incidents<br/>(Liste + Détail + Création)"]
        SRV["Services<br/>(Gestion + Topologie)"]
        RPT["Rapports"]
        ADM["Admin<br/>(Users, Clients, SLA, Audit)"]
    end

    subgraph Components["Composants"]
        UI["Design System<br/>(Button, Card, Modal, DataTable…)"]
        LAYOUT["Layout<br/>(MainLayout, Breadcrumb)"]
        AUTH_C["Auth<br/>(AuthLayout, RoleBasedRoute)"]
        NOTIF["NotificationCenter<br/>(WebSocket)"]
    end

    subgraph State["État global"]
        STORE["Redux Store"]
        SLICES["Slices<br/>(auth, tickets, dashboard, notifications)"]
        THUNKS["Async Thunks<br/>(fetchTickets, login…)"]
    end

    subgraph API_Layer["Couche API"]
        CLIENT["Axios Client<br/>+ JWT Interceptor"]
        SERVICES["18 services<br/>(authService, ticketService…)"]
    end

    Router --> Pages
    Pages --> Components
    Pages --> State
    STORE --> SLICES
    SLICES --> THUNKS
    THUNKS --> API_Layer
    CLIENT --> SERVICES

    style App fill:#ede9fe,stroke:#7c3aed
    style Pages fill:#dbeafe,stroke:#3b82f6
    style Components fill:#dcfce7,stroke:#22c55e
    style State fill:#fef3c7,stroke:#f59e0b
    style API_Layer fill:#fce7f3,stroke:#ec4899
```

### Structure des dossiers frontend

| Dossier | Contenu | Fichiers clés |
|---------|---------|---------------|
| `api/` | 18 services Axios, client HTTP centralisé, intercepteurs JWT/refresh | `client.ts`, `ticketService.ts`, `authService.ts` |
| `components/ui/` | Design system : 16 composants réutilisables | `Button`, `Card`, `DataTable`, `Modal`, `Badge`, `Input`, `Select` |
| `components/layout/` | Structure de page : sidebar, topbar, breadcrumb | `MainLayout`, `PageHeader`, `Breadcrumb` |
| `components/auth/` | Authentification : layout, route protégée, sélecteur de profil | `AuthLayout`, `RoleBasedRoute`, `ThemeToggle` |
| `pages/` | 25 pages organisées par domaine fonctionnel | Dashboards (4), Tickets (3), Incidents (3), Services, Reports… |
| `redux/` | Store Redux Toolkit + slices + thunks asynchrones | `authSlice`, `ticketsSlice`, `dashboardSlice` |
| `hooks/` | Hooks personnalisés | `usePermissions`, `useDarkMode`, `useWebSocketNotifications` |
| `context/` | Contextes React (thème, langue, toasts) | `ThemeContext`, `LanguageContext`, `ToastContext` |
| `demo/` | Mode démo autonome (intercepteur Axios, données simulées) | `demoInterceptor.ts`, `demoData.ts` |

---

## 4. Flux d'authentification

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant DB as Base de données

    U->>F: Saisie email + mot de passe
    F->>B: POST /api/auth/login
    B->>DB: Vérifier credentials (BCrypt)
    DB-->>B: User trouvé
    B->>B: Générer accessToken (15 min)
    B->>B: Générer refreshToken (7 jours)
    B->>DB: Stocker refreshToken (rotation)
    B-->>F: { accessToken, refreshToken, user }
    F->>F: Stocker dans Redux + localStorage

    Note over F,B: Requêtes suivantes

    F->>B: GET /api/tickets<br/>Authorization: Bearer {accessToken}
    B->>B: JwtAuthFilter → valider token
    B-->>F: 200 OK + données

    Note over F,B: Token expiré

    F->>B: Requête échoue (401)
    F->>B: POST /api/auth/refresh<br/>{ refreshToken }
    B->>DB: Valider + rotation refreshToken
    B-->>F: Nouveau { accessToken, refreshToken }
    F->>F: Mettre à jour tokens
    F->>B: Rejouer requête originale
```

---

## 5. Flux SLA & Escalade

```mermaid
graph TD
    A["Ticket créé"] --> B["SLA calculé<br/>(priorité × service × heures ouvrées)"]
    B --> C{"Deadline = now + SLA"}
    C --> D["Suivi continu"]
    D --> E{"75% du SLA écoulé ?"}
    E -->|Oui| F["⚠️ Alerte SLA Approaching<br/>Notification manager"]
    E -->|Non| D
    F --> G{"100% du SLA écoulé ?"}
    G -->|Oui| H["🔴 SLA Breached<br/>breachedSla = true"]
    H --> I["Évaluation règles d'escalade"]
    I --> J["Actions automatiques :<br/>— Changer priorité<br/>— Notifier superviseur<br/>— Réassigner"]
    G -->|Non| D

    style H fill:#fee2e2,stroke:#ef4444
    style F fill:#fef3c7,stroke:#f59e0b
    style A fill:#dbeafe,stroke:#3b82f6
```

---

## 6. Microservice chatbot (évolution future)

Le système est conçu pour accueillir un microservice chatbot indépendant :

```
┌───────────────────┐     REST/JSON      ┌──────────────────┐
│  Frontend React   │ ◄───────────────► │  Backend Spring  │
│  (chat widget)    │                    │  Boot 3.2        │
└───────────────────┘                    └────────┬─────────┘
                                                  │ REST
                                         ┌────────▼─────────┐
                                         │  Chatbot Service  │
                                         │  Python + NLP     │
                                         │  Port 5000        │
                                         └──────────────────┘
```

| Aspect | Détail |
|--------|--------|
| **Technologie** | Python (FastAPI ou Flask) + modèle NLP (Rasa / HuggingFace) |
| **Communication** | API REST entre Spring Boot et le chatbot |
| **Fonctions** | Triage automatique des tickets, suggestions de résolution, FAQ intelligente |
| **Intégration** | Le backend Spring Boot sert de gateway — le frontend n'appelle jamais le chatbot directement |

> Les tables `chatbot_logs` et `messages` ont été supprimées (V16) car le module chatbot n'est pas encore implémenté. Elles seront recréées dans le microservice dédié.
