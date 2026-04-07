# MTS Telecom Supervision Platform

Plateforme intelligente de supervision des services telecoms et de support client.

Le depot contient une application React, un backend Spring Boot, trois briques IA Python, une base MySQL, un mode demo explicite et une premiere chaine de lancement/deploiement reproductible.

## Modules presents

- Ticketing multi-profils avec historique, commentaires, pieces jointes, SLA et exports
- Supervision des services telecoms, sante, topologie et historique de statut
- Incidents, timeline, post-mortem et liaison tickets/services
- Dashboards par role, rapports et audit
- Gestion utilisateurs, clients, comptes, preferences et notifications
- IA de sentiment/classification, detection de doublons et chatbot RAG

## Structure du depot

- `client` : frontend React + TypeScript
- `server` : backend Spring Boot + Flyway + WebSocket
- `sentiment-service` : microservice IA de classification et sentiment
- `duplicate-service` : microservice IA de detection de doublons
- `ai-chatbot` : chatbot RAG et detection d'incidents massifs
- `docker-compose.yml` : stack conteneurisee officielle
- `scripts/` : scripts officiels `dev`, `demo`, `deploy`
- `docs/` : documentation technique, soutenance, audit et archives

## Lancement officiel

### Scenario local recommande

```bat
scripts\dev\start-local.bat
```

Ce scenario demarre :

1. MySQL et phpMyAdmin via Docker
2. les 3 services IA en local
3. le backend Spring Boot en local
4. le frontend React en local

### Scenario demo rapide

```bat
scripts\demo\start-demo-h2.bat
```

Ce scenario garde le frontend et les microservices IA en local, avec backend H2 pour une demo rapide sans MySQL Docker.

### Scenario stack complete conteneurisee

```bash
docker compose up -d --build
```

Alternative Windows :

```bat
scripts\deploy\start-stack.bat
```

Arret :

```bash
docker compose down
```

Ou :

```bat
scripts\deploy\stop-stack.bat
```

## URLs utiles

| Composant | URL |
|---|---|
| Frontend local | `http://localhost:3000` |
| Backend | `http://localhost:8080` |
| Swagger | `http://localhost:8080/swagger-ui.html` |
| phpMyAdmin | `http://localhost:8081` |
| Sentiment IA | `http://127.0.0.1:8000/health` |
| Doublons IA | `http://127.0.0.1:8001/health` |
| Chatbot IA | `http://127.0.0.1:8002/health` |

## Comptes de demonstration

### MySQL / migrations Flyway

- Emails seedes dans `V2__seed_data.sql`
- Mot de passe commun : `Password1!`

### H2 / DataInitializer

- Emails seedes dans `DataInitializer`
- Mot de passe commun : `Password1!`

## Verification post-deploy rapide

```bat
scripts\deploy\smoke-post-deploy.bat
```

## Mode demo frontend

Le mode demo est volontairement explicite.

- Activer : copier `client/.env.demo` vers `client/.env`, puis lancer `npm start`
- Desactiver : remettre `REACT_APP_DEMO_MODE=false` ou utiliser `client/.env.sample`
- Le mode demo ne s'active plus via `?demo=true`
- Les routes non mockees doivent continuer a echouer visiblement pour ne pas masquer un bug API

## Documentation principale

- [Index documentation](docs/README.md)
- [Guide de lancement/deploiement](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contrats API](docs/API_CONTRACTS.md)
- [Matrice RBAC](docs/RBAC_MATRIX.md)
- [Base de donnees](docs/DATABASE.md)
- [Guide soutenance](docs/DEMO_JURY.md)
- [Checklist soutenance finale](docs/DEMO_JURY_FINAL_CHECKLIST.md)
- [Readiness deploiement (Lot 8)](docs/final-audit/progress/lot-8-deploy-readiness.md)
- [Progression des lots](docs/final-audit/progress/)

## Notes importantes

- Le backend navigateur suit un modele `cookie-first` avec cookies HttpOnly.
- La source de verite RBAC est le backend, pas l'UI.
- `docker-compose.yml` est la source de verite du lancement conteneurise.
- `INTEGRATION_DOCKER/docker-compose-full.yml` reste un fichier de compatibilite documentaire.
- Les scripts historiques non officiels ont ete sortis du flux principal et archives dans `scripts/legacy/` quand ils n'etaient plus utiles au runtime.
