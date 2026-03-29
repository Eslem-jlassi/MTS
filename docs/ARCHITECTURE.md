# Architecture - MTS Telecom

## Vue d'ensemble

MTS est une plateforme de supervision telecom et de support client composee de cinq blocs techniques :

1. un frontend React pour les parcours utilisateur
2. un backend Spring Boot pour le coeur metier, la securite et l'orchestration
3. une base MySQL avec migrations Flyway
4. un microservice IA de sentiment/classification
5. un microservice IA de detection de doublons et un chatbot RAG

## Topologie reelle

| Bloc | Technologie | Role | Port local |
|---|---|---|---|
| Frontend | React 18 + TypeScript + Redux Toolkit | UI, routes, dashboards, formulaires, notifications | `3000` |
| Backend | Spring Boot 3 + Spring Security + JPA + WebSocket | API metier, auth, RBAC, audit, SLA, orchestration IA | `8080` |
| Base de donnees | MySQL 8 / H2 profil local | persistance metier et seeds | `3306` |
| Sentiment service | FastAPI / Python | classification et sentiment | `8000` |
| Duplicate service | FastAPI / Python | detection de tickets similaires | `8001` |
| AI chatbot | FastAPI / Python | chatbot RAG et detection d'incidents massifs | `8002` |

## Architecture fonctionnelle

### Frontend

Le frontend couvre les parcours suivants :

- dashboards par role
- tickets liste/detail/kanban/drawer
- clients, services, incidents, SLA, rapports
- profil, compte, notifications, audit, administration
- chatbot IA et mode demo explicite

Composants structurants :

- `App.tsx` : routes et gardes UI
- `components/layout/` : shell applicatif
- `redux/` : etat global
- `api/` : couche d'appel HTTP
- `hooks/usePermissions.ts` : miroir UI des permissions backend
- `hooks/useWebSocketNotifications.ts` : notifications temps reel

### Backend

Le backend est organise autour de controllers REST, services metier, repositories JPA et configuration de securite.

Controllers principaux :

- `AuthController`
- `UserController`
- `ClientController`
- `TicketController`
- `DashboardController`
- `ServiceController`
- `IncidentController`
- `ReportController`
- `NotificationController`
- `AuditLogController`
- `BusinessHoursController`
- `SlaPolicyController`
- `SlaEscalationController`
- `MacroController`
- `QuickReplyTemplateController`
- `AiSentimentController`
- `AiDuplicateController`
- `ChatbotController`

Services metier structurants :

- authentification, refresh tokens, OAuth Google
- gestion des tickets, workflow, commentaires, pieces jointes, exports
- incidents, services et supervision
- dashboard, rapports, notifications, audit
- politiques SLA, business hours, escalade
- orchestration des microservices IA

### Base de donnees

La persistance est geree par :

- JPA/Hibernate pour les entites metier
- Flyway pour la creation et l'evolution du schema
- seeds SQL MySQL et `DataInitializer` pour H2
- stockage fichier local pour les rapports et certains uploads

## Flux techniques majeurs

### Authentification navigateur

- le frontend utilise `withCredentials=true`
- le backend emet des cookies HttpOnly pour la session navigateur
- `GET /api/auth/me` et `GET /api/users/me` servent au bootstrap de session
- `POST /api/auth/refresh` repose sur le cookie de refresh
- Google OAuth reste branche via le backend

### Notifications temps reel

- le backend expose `/ws`
- l'auth WebSocket est verifiee cote backend
- le frontend ouvre la connexion pour remonter notifications et compteurs

### Ticketing et SLA

- un ticket est cree par un client
- manager/admin peuvent assigner
- agent traite si le ticket lui est assigne
- l'historique et les commentaires restent traces
- les politiques SLA, business hours et escalades alimentent la supervision

### IA

- `AiSentimentController` appelle `sentiment-service`
- `AiDuplicateController` appelle `duplicate-service`
- `ChatbotController` appelle `ai-chatbot`
- le backend reste la couche d'orchestration et de securite vis-a-vis du frontend

## Modes d'execution

### Local recommande

- `scripts/dev/start-local.bat`
- MySQL en Docker
- backend, frontend et IA en local

### Demo rapide

- `scripts/demo/start-demo-h2.bat`
- backend H2 local
- frontend et IA en local

### Stack conteneurisee

- `docker compose up -d --build`
- source de verite de deploiement : `docker-compose.yml`

## Decisions d'architecture a retenir pour la soutenance

- backend = source de verite securite et RBAC
- mode demo explicite et non cache
- chatbot et microservices IA reels dans le depot
- architecture modulaire mais deployable depuis un seul depot
- conservation de la tracabilite via audit, historique ticket et politique de suppression professionnelle
