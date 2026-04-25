# MTS Telecom Supervision Platform

Plateforme de supervision telecom et de support client, construite pour la periode de soutenance avec un frontend React, un backend Spring Boot et des services IA Python specialises.

## Architecture

- `client/` : application React + TypeScript + Redux Toolkit + MUI
- `server/` : API Spring Boot, RBAC, tickets, SLA, incidents, audit, notifications, WebSocket
- `sentiment-service/` : classification/sentiment de tickets
- `duplicate-service/` : detection de tickets similaires
- `ai-chatbot/` : assistant IA, recherche documentaire et signaux incident massif
- `docker-compose.yml` : stack conteneurisee locale/officielle
- `docker-compose.prod.yml` : variante production Docker simple
- `scripts/` : points d'entree `dev`, `demo`, `deploy`
- `docs/` : architecture, deploiement, soutenance, limitations et archives

## Lancement local

### Option recommandee

```bat
scripts\dev\start-local.bat
```

Ce flux lance :

1. MySQL et phpMyAdmin via Docker
2. les services IA Python en local
3. le backend Spring Boot en local
4. le frontend React en local

### Lancement manuel par module

Frontend :

```bat
cd client
npm install
npm start
```

Backend :

```bat
cd server
mvn spring-boot:run
```

Services IA :

```bat
cd sentiment-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bat
cd duplicate-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

```bat
cd ai-chatbot
python -m uvicorn app:app --host 127.0.0.1 --port 8002
```

### Demo rapide H2

```bat
scripts\demo\start-demo-h2.bat
```

## Lancement Docker

```bash
docker compose up -d --build
```

Arret :

```bash
docker compose down
```

Helper Windows :

```bat
scripts\deploy\start-stack.bat
```

### Variante production Docker

```bash
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Pour la demo locale stable, l'exemple `.env.prod.example` est deja aligne sur :

- `COMPOSE_FRONTEND_PORT=80`
- `COMPOSE_BACKEND_PORT=8085`
- `COMPOSE_FRONTEND_BASE_URL=http://localhost`
- `COMPOSE_CORS_ALLOWED_ORIGINS=http://localhost`
- `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS=http://localhost`
- `COMPOSE_REACT_APP_API_URL=http://localhost:8085/api`
- `COMPOSE_COOKIE_SECURE=false`
- `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=false`
- `COMPOSE_MAIL_ENABLED=false`

### Demo locale stable

Le frontend de demo est maintenant compile hors Docker puis servi par `nginx` via `client/Dockerfile.demo`. Cela evite les `npm install` instables pendant le build Docker.

```bash
cd client
npm install --legacy-peer-deps
npm run build:demo
cd ..
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build
```

`npm run build:demo` force l'URL API locale `http://localhost:8085/api`, garde `REACT_APP_DEMO_MODE=false` et masque proprement Google OAuth tant qu'aucun `REACT_APP_GOOGLE_OAUTH_CLIENT_ID` n'est fourni. Si un Client ID est defini avant le build, Google OAuth reste disponible sur `http://localhost`.

Pour un test Google OAuth local complet :

- definir `REACT_APP_GOOGLE_OAUTH_CLIENT_ID`
- definir `REACT_APP_GOOGLE_OAUTH_ENABLED=true`
- definir `GOOGLE_CLIENT_ID` cote backend avec le meme Client ID
- ajouter `http://localhost` dans Google Cloud Console > `Authorized JavaScript origins`

Le `Dockerfile` standard du frontend reste disponible pour une CI/CD complete avec un reseau stable.

Si Docker Hub est lent ou retourne un `TLS handshake timeout` sur le frontend standard, prechargez manuellement les images de base :

```bash
docker pull node:20-bookworm-slim
docker pull nginx:1.27
```

Guide detaille :

- [docs/DEPLOY_PROD.md](docs/DEPLOY_PROD.md)

## Variables minimales

Pour le local :

1. Copier `.env.example` vers `.env`
2. adapter au minimum :
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `DB_ROOT_PASSWORD`
   - `JWT_SECRET`
   - `REACT_APP_API_URL` si votre backend n'est pas sur `http://localhost:8080/api`

Pour un profil production / defense :

- partir de `.env.production.example` ou `.env.defense.example`
- pour la variante Docker production, partir de `.env.prod.example`
- remplacer tous les `CHANGE_ME_*`
- garder `ALLOW_INTERNAL_SIGNUP=false`
- garder `AUTH_EXPOSE_TOKENS_IN_BODY=false`
- activer `COMPOSE_COOKIE_SECURE=true`

### Verification email

Le projet dispose deja d'une verification email reelle pour les nouvelles inscriptions `CLIENT`.

- backend : generation de token, expiration, activation du compte apres verification
- frontend : page `/verify-email` avec retours succes/erreur
- email : envoi SMTP via variables `MAIL_*` ou `COMPOSE_MAIL_*`

Pour l'activer :

1. configurer `MAIL_ENABLED=true` ou `COMPOSE_MAIL_ENABLED=true`
2. renseigner l'hote SMTP, l'identifiant et le mot de passe
3. definir `FRONTEND_BASE_URL` ou `COMPOSE_FRONTEND_BASE_URL`
4. passer `AUTH_REQUIRE_EMAIL_VERIFICATION=true` ou `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=true`

Variables SMTP minimales :

- `MAIL_HOST` / `COMPOSE_MAIL_HOST`
- `MAIL_PORT` / `COMPOSE_MAIL_PORT`
- `MAIL_USERNAME` / `COMPOSE_MAIL_USERNAME`
- `MAIL_PASSWORD` / `COMPOSE_MAIL_PASSWORD`
- `MAIL_FROM` / `COMPOSE_MAIL_FROM`
- `MAIL_FROM_NAME` / `COMPOSE_MAIL_FROM_NAME`

## URLs utiles

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:8080`
- Swagger : `http://localhost:8080/swagger-ui.html`
- phpMyAdmin : `http://localhost:8081`
- Sentiment service : `http://127.0.0.1:8000/health`
- Duplicate service : `http://127.0.0.1:8001/health`
- AI chatbot : `http://127.0.0.1:8002/health`

## Comptes de demo

- Les comptes seedes sont definis dans les seeds backend MySQL/H2.
- Les identifiants de demo et mots de passe associes sont a presenter uniquement dans le cadre de la demo locale.
- Ne pas reutiliser ces comptes ni ces mots de passe hors environnement de demonstration.

## Smoke test

```bat
scripts\deploy\smoke-post-deploy.bat
```

Verification minimale :

1. ouvrir le frontend
2. verifier `/api/auth/me`
3. ouvrir le dashboard selon un role seed
4. creer ou consulter un ticket
5. verifier les healthchecks des 3 services IA

## Non-regression importantes

- La source de verite RBAC reste le backend Spring Boot.
- L'auth navigateur reste `cookie-first`.
- ALLIE reste reserve au role `MANAGER`.
- Les suppressions destructives restent controlees cote serveur avec audit.
- Le mode demo et le chemin Docker doivent rester fonctionnels.

## Documentation utile

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/DEPLOY_PROD.md](docs/DEPLOY_PROD.md)
- [docs/SOUTENANCE_LAST_MILE.md](docs/SOUTENANCE_LAST_MILE.md)
- [docs/DEFENSE_SMOKE_CHECKLIST.md](docs/DEFENSE_SMOKE_CHECKLIST.md)
- [docs/KNOWN_LIMITATIONS_FINAL.md](docs/KNOWN_LIMITATIONS_FINAL.md)
- [docs/archive/legacy/README.md](docs/archive/legacy/README.md)
