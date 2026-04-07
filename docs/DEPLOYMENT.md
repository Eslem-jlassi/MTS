# Guide de lancement et de deploiement

Ce document est la reference officielle pour lancer la plateforme de facon reproductible.

## Prerequis

- Docker Desktop (avec Docker Compose v2)
- Java 17+
- Maven 3.9+
- Node.js 20+
- Python 3.11+

## Variables d'environnement

1. Copier `.env.example` vers `.env` a la racine du depot.
2. Ajuster au minimum :
   - `DB_*` / `COMPOSE_DB_*`
   - `JWT_SECRET` / `COMPOSE_JWT_SECRET`
   - `REACT_APP_API_URL`
3. Laisser Google OAuth vide si non utilise.

## Scenarios officiels

### 1) Local dev (recommande)

Commande Windows :

```bat
scripts\dev\start-local.bat
```

Ce scenario lance :
- MySQL + phpMyAdmin via Docker
- les services IA en local (ports 8000/8001/8002)
- le backend Spring Boot en local (port 8080)
- le frontend React en local (port 3000)

### 2) Demo rapide

Commande Windows :

```bat
scripts\demo\start-demo-h2.bat
```

Ce scenario utilise le backend en profil H2 pour une demo sans MySQL.

### 3) Stack complete conteneurisee

Commande officielle (cross-platform) :

```bash
docker compose up -d --build
```

Alternative Windows :

```bat
scripts\deploy\start-stack.bat
```

Cette commande lance egalement un smoke post-deploy.

Arret :

```bash
docker compose down
```

## Verification operationnelle

Smoke post-deploy (manuel):

```bat
scripts\deploy\smoke-post-deploy.bat
```

Logs stack (backend/frontend/mysql/IA):

```bat
scripts\deploy\show-stack-logs.bat
```

## Verification post-lancement

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:8080`
- Swagger : `http://localhost:8080/swagger-ui.html`
- phpMyAdmin : `http://localhost:8081`
- Sentiment : `http://127.0.0.1:8000/health`
- Doublons : `http://127.0.0.1:8001/health`
- Chatbot : `http://127.0.0.1:8002/health`

## Politique scripts

- Scripts officiels : `scripts/dev`, `scripts/demo`, `scripts/deploy`
- Scripts historiques non officiels : `scripts/legacy`
- Ne pas utiliser de scripts hors de ces repertoires pour la soutenance ou le deploiement

## Source de verite de deploiement

- `docker-compose.yml` (racine) est la source de verite de la stack conteneurisee.
- `INTEGRATION_DOCKER/docker-compose-full.yml` est conserve uniquement pour compatibilite documentaire.