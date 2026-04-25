# Deploy Production

Ce guide prepare un deploiement Docker simple, stable et rapide, sans casser le chemin local existant.

La production utilise des fichiers dedies :

- `docker-compose.prod.yml`
- `.env.prod` derive de `.env.prod.example`
- `scripts/deploy/start-prod-stack.sh`
- `scripts/deploy/stop-prod-stack.sh`
- `scripts/deploy/smoke-post-deploy.sh`

## Topologie recommandee

- frontend sur `80`
- backend sur `8080`
- MySQL et microservices IA non exposes publiquement
- `phpMyAdmin` absent de la variante production
- cookies securises avec `COOKIE_SECURE=true`
- CORS et WebSocket pilotes par domaine via variables d'environnement

Pour rester compatible avec l'authentification `cookie-first`, gardez si possible le frontend et le backend sous le meme site logique, par exemple :

- `https://support.example.com`
- `https://api.example.com`

## 1. Prerequis Ubuntu

Mettre le systeme a jour :

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

Installer Docker et le plugin Compose :

```bash
sudo apt-get install -y docker.io docker-compose-plugin curl git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker
```

Verifier l'installation :

```bash
docker --version
docker compose version
```

## 2. Recuperer le projet

```bash
git clone <URL_DU_REPO> mts
cd mts
```

## 3. Preparer l'environnement production

Copier l'exemple :

```bash
cp .env.prod.example .env.prod
```

Remplacer au minimum les variables suivantes :

- `COMPOSE_DB_USERNAME`
- `COMPOSE_DB_PASSWORD`
- `COMPOSE_DB_ROOT_PASSWORD`
- `COMPOSE_JWT_SECRET`
- `COMPOSE_FRONTEND_BASE_URL`
- `COMPOSE_CORS_ALLOWED_ORIGINS`
- `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS`
- `COMPOSE_REACT_APP_API_URL`

Variables importantes :

- `COMPOSE_COOKIE_SECURE=true`
- `COMPOSE_REACT_APP_DEMO_MODE=false`
- `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=true` dans l'exemple prod ; gardez-le si SMTP est configure
- `COMPOSE_AI_SENTIMENT_BASE_URL`, `COMPOSE_AI_DUPLICATE_BASE_URL`, `COMPOSE_AI_CHATBOT_BASE_URL` sont deja parametrables
- si vous activez la verification email reelle, renseignez aussi `COMPOSE_MAIL_HOST`, `COMPOSE_MAIL_PORT`, `COMPOSE_MAIL_USERNAME`, `COMPOSE_MAIL_PASSWORD`, `COMPOSE_MAIL_FROM` et `COMPOSE_MAIL_FROM_NAME`
- pour une validation locale sur poste de dev, l'exemple `.env.prod.example` est deja preconfigure sur `COMPOSE_FRONTEND_PORT=80`, `COMPOSE_BACKEND_PORT=8085`, `COMPOSE_FRONTEND_BASE_URL=http://localhost`, `COMPOSE_CORS_ALLOWED_ORIGINS=http://localhost`, `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS=http://localhost`, `COMPOSE_REACT_APP_API_URL=http://localhost:8085/api`, `COMPOSE_COOKIE_SECURE=false`, `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=false` et `COMPOSE_MAIL_ENABLED=false`
- la validation authentifiee la plus fidele se fait derriere HTTPS ou un reverse proxy TLS, car `COMPOSE_COOKIE_SECURE=true` reste volontairement impose en production

Exemple minimal de reference production :

```dotenv
COMPOSE_FRONTEND_PORT=80
COMPOSE_BACKEND_PORT=8080
COMPOSE_DB_NAME=mts_telecom_db
COMPOSE_DB_USERNAME=mts_prod
COMPOSE_DB_PASSWORD=CHANGE_ME_DB_PASSWORD
COMPOSE_DB_ROOT_PASSWORD=CHANGE_ME_DB_ROOT_PASSWORD
COMPOSE_JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET_MIN_64_CHARS
COMPOSE_COOKIE_SECURE=true
COMPOSE_FRONTEND_BASE_URL=https://support.example.com
COMPOSE_CORS_ALLOWED_ORIGINS=https://support.example.com
COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS=https://support.example.com
COMPOSE_REACT_APP_API_URL=https://api.example.com/api
COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=true
COMPOSE_MAIL_ENABLED=true
COMPOSE_MAIL_HOST=smtp.example.com
COMPOSE_MAIL_USERNAME=no-reply@example.com
COMPOSE_MAIL_PASSWORD=CHANGE_ME_SMTP_PASSWORD
```

Exemple minimal pour validation locale :

```dotenv
COMPOSE_FRONTEND_PORT=80
COMPOSE_BACKEND_PORT=8085
COMPOSE_DB_NAME=mts_telecom_db
COMPOSE_DB_USERNAME=mts_user
COMPOSE_DB_PASSWORD=CHANGE_ME_DB_PASSWORD
COMPOSE_DB_ROOT_PASSWORD=CHANGE_ME_DB_ROOT_PASSWORD
COMPOSE_JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET_MIN_64_CHARS
COMPOSE_FRONTEND_BASE_URL=http://localhost
COMPOSE_CORS_ALLOWED_ORIGINS=http://localhost
COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS=http://localhost
COMPOSE_REACT_APP_API_URL=http://localhost:8085/api
COMPOSE_COOKIE_SECURE=false
COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=false
COMPOSE_MAIL_ENABLED=false
```

## 4. Demarrer la stack production

Commande directe :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Pour la demo locale stable, precompilez d'abord le frontend hors Docker :

```bash
cd client
npm install --legacy-peer-deps
npm run build:demo
cd ..
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build
```

`npm run build:demo` injecte l'URL API locale `http://localhost:8085/api`, garde `REACT_APP_DEMO_MODE=false` et masque Google OAuth tant qu'aucun `REACT_APP_GOOGLE_OAUTH_CLIENT_ID` n'est fourni. Si vous renseignez un Client ID avant le build, Google OAuth reste disponible sur `http://localhost`.

Pour un test Google OAuth local complet :

- definir `REACT_APP_GOOGLE_OAUTH_CLIENT_ID`
- definir `REACT_APP_GOOGLE_OAUTH_ENABLED=true`
- definir `GOOGLE_CLIENT_ID` cote backend avec le meme Client ID
- ajouter `http://localhost` dans Google Cloud Console > `Authorized JavaScript origins`

Le `client/Dockerfile.demo` embarque uniquement `nginx` et le contenu de `client/build`, ce qui evite les timeouts `npm` dans Docker. Le `client/Dockerfile` standard reste utilisable pour une vraie CI/CD avec reseau stable.

Si Docker Hub retourne un `TLS handshake timeout` lors du build frontend, le blocage est externe au repo. Prechargez alors les images de base puis relancez le build :

```bash
docker pull node:20-bookworm-slim
docker pull nginx:1.27
docker compose --env-file .env.prod -f docker-compose.prod.yml build --no-cache frontend
```

Note sur les microservices IA en Docker de demo :

- `ai-chatbot`, `duplicate-service` et `sentiment-service` utilisent des `requirements.docker.txt` alleges pour eviter le telechargement de dependances lourdes (`sentence-transformers`, `torch`, `transformers`) pendant le build.
- en mode Docker demo, `duplicate-service` demarre en fallback TF-IDF si SentenceTransformers n'est pas precharge, `sentiment-service` demarre en mode `rules_only`, et `ai-chatbot` reste disponible en mode degrade tout en conservant la brique ALLIE/KNN.
- pour activer le mode complet BERT / SentenceTransformer / RAG, utilisez les `requirements.txt` complets et pretelechargez les modeles dans l'environnement cible.

Ou via helper :

```bash
./scripts/deploy/start-prod-stack.sh .env.prod
```

## 5. Verification immediate

Etat des conteneurs :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

Logs backend :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend --tail 200
```

Smoke de disponibilite :

```bash
./scripts/deploy/smoke-post-deploy.sh
```

Avec verification authentifiee optionnelle :

```bash
SMOKE_EMAIL=manager@example.com \
SMOKE_PASSWORD='CHANGE_ME_PASSWORD' \
SMOKE_MANAGER_EMAIL=manager@example.com \
SMOKE_MANAGER_PASSWORD='CHANGE_ME_PASSWORD' \
./scripts/deploy/smoke-post-deploy.sh
```

## 6. Endpoints de sante utiles

- frontend : `http://<host>:${COMPOSE_FRONTEND_PORT}`
- backend actuator : `http://<host>:${COMPOSE_BACKEND_PORT}/actuator/health`
- backend readable health : `http://<host>:${COMPOSE_BACKEND_PORT}/api/system/health`

Le endpoint `/api/system/health` donne une vue lisible du backend, de la base, des services IA et de la disponibilite ALLIE.

## 7. Checklist post-deploy

Infra :

1. `docker compose ... ps` montre `mysql`, `backend`, `frontend`, `sentiment-service`, `duplicate-service`, `ai-chatbot` en etat sain.
2. `/actuator/health` retourne `UP`.
3. `/api/system/health` retourne `UP` ou `DEGRADED`, jamais `DOWN`.
4. le volume `prod_backend_uploads` existe.
5. le volume `prod_backend_logs` existe.

Validation fonctionnelle manuelle :

1. login avec un compte reel ou seed connu
2. ouverture du dashboard
3. creation d'un ticket cote client
4. prise en charge / assignation selon les roles
5. passage du ticket a `RESOLVED`
6. verification du drawer ticket et de la liste
7. verification manager copilot / ALLIE
8. creation / consultation d'un incident
9. verification des notifications et de la sante globale

## 8. Variables requises

Obligatoires :

- `COMPOSE_DB_NAME`
- `COMPOSE_DB_USERNAME`
- `COMPOSE_DB_PASSWORD`
- `COMPOSE_DB_ROOT_PASSWORD`
- `COMPOSE_JWT_SECRET`
- `COMPOSE_FRONTEND_BASE_URL`
- `COMPOSE_CORS_ALLOWED_ORIGINS`
- `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS`
- `COMPOSE_REACT_APP_API_URL`

Souvent utiles :

- `COMPOSE_FRONTEND_PORT`
- `COMPOSE_BACKEND_PORT`
- `COMPOSE_SERVER_FORWARD_HEADERS_STRATEGY`
- `COMPOSE_BACKEND_JAVA_OPTS`
- `COMPOSE_MAIL_*`
- `COMPOSE_GOOGLE_CLIENT_ID`
- `COMPOSE_REACT_APP_GOOGLE_OAUTH_CLIENT_ID`
- `COMPOSE_REACT_APP_CHATBOT_MASCOT_URL`

## 9. Rollback simple

Arreter la stack courante :

```bash
./scripts/deploy/stop-prod-stack.sh .env.prod
```

Revenir au dernier commit ou tag stable :

```bash
git checkout <last-known-good-tag-or-commit>
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Si une migration SQL irreversible a ete appliquee, restaurez d'abord la sauvegarde MySQL correspondante.

## 10. Notes de securite minimales

- ne versionnez jamais le vrai `.env.prod`
- gardez `ALLOW_INTERNAL_SIGNUP=false`
- gardez `AUTH_EXPOSE_TOKENS_IN_BODY=false`
- gardez `COMPOSE_COOKIE_SECURE=true`
- n'exposez pas `phpMyAdmin` en production
- n'exposez pas MySQL ni les microservices IA publiquement si ce n'est pas strictement necessaire
