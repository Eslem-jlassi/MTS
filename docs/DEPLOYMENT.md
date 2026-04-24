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
3. Si Google OAuth n'est pas utilise :
   - laisser `GOOGLE_CLIENT_ID` et `REACT_APP_GOOGLE_OAUTH_CLIENT_ID` vides
   - laisser `REACT_APP_GOOGLE_OAUTH_ENABLED=false`
4. Si Google OAuth est utilise :
   - renseigner `GOOGLE_CLIENT_ID` et `REACT_APP_GOOGLE_OAUTH_CLIENT_ID` avec la meme valeur
   - definir `REACT_APP_GOOGLE_OAUTH_ENABLED=true`
   - verifier que `REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS` contient l'origine frontend reelle

Pour un profil defense-ready ou production-like :

1. Partir de `.env.defense.example`.
2. Renseigner obligatoirement :
   - `COMPOSE_JWT_SECRET`
   - `COMPOSE_DB_*`
   - `COMPOSE_FRONTEND_BASE_URL`
   - `COMPOSE_REACT_APP_API_URL`
   - `COMPOSE_CORS_ALLOWED_ORIGINS`
   - `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS`
   - `COMPOSE_COOKIE_SECURE=true`
3. Le profil `docker-compose.defense.yml` force par defaut :
   - `COMPOSE_MAIL_ENABLED=true`
   - `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=true`
4. Renseigner obligatoirement un SMTP reel valide (`COMPOSE_MAIL_HOST`, `COMPOSE_MAIL_USERNAME`, `COMPOSE_MAIL_PASSWORD`, `COMPOSE_MAIL_FROM`) avant lancement.
5. Si Google OAuth est actif en defense-ready :
   - renseigner `COMPOSE_GOOGLE_CLIENT_ID` et `COMPOSE_REACT_APP_GOOGLE_OAUTH_CLIENT_ID` avec la meme valeur
   - definir `COMPOSE_REACT_APP_GOOGLE_OAUTH_ENABLED=true`
   - aligner `COMPOSE_REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS` sur l'origine publique frontend

Regle de coherence URL/CORS :

- `COMPOSE_FRONTEND_BASE_URL` = origine publique du frontend, sans suffixe `/api`
- `COMPOSE_CORS_ALLOWED_ORIGINS` = origine(s) frontend autorisee(s) seulement
- `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS` = meme logique que CORS pour le navigateur
- `COMPOSE_REACT_APP_API_URL` = URL publique du backend avec suffixe `/api`

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

### 4) Profil defense-ready

Commande compose additive :

```bash
docker compose -f docker-compose.yml -f docker-compose.defense.yml up -d --build
```

Helper Windows :

```bat
scripts\deploy\start-defense-stack.bat
```

Ce profil :
- conserve les memes services applicatifs et healthchecks
- retire `phpMyAdmin` du flux public par defaut
- force un parametrage explicite pour les URLs publiques, CORS et cookies securises
- conserve la persistance Docker pour MySQL, uploads backend et logs backend

Arret :

```bat
scripts\deploy\stop-defense-stack.bat
```

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

Pour un deploiement defense-ready avec domaines/ports differents, le smoke script accepte ces surcharges optionnelles :

- `SMOKE_FRONTEND_URL`
- `SMOKE_BACKEND_HEALTH_URL`
- `SMOKE_BACKEND_SWAGGER_URL`
- `SMOKE_SENTIMENT_URL`
- `SMOKE_DUPLICATE_URL`
- `SMOKE_CHATBOT_URL`

## Verification post-lancement

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:8080`
- Swagger : `http://localhost:8080/swagger-ui.html`
- phpMyAdmin : `http://localhost:8081`
- Sentiment : `http://127.0.0.1:8000/health`
- Doublons : `http://127.0.0.1:8001/health`
- Chatbot : `http://127.0.0.1:8002/health`

## Test local SMTP (verification + reset)

Objectif : valider rapidement l'envoi reel d'emails sans dependre d'un fournisseur externe.

1. Lancer Mailpit localement :

```bash
docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit
```

2. Configurer le backend (`.env`) :
   - `MAIL_ENABLED=true`
   - `MAIL_HOST=localhost`
   - `MAIL_PORT=1025`
   - `MAIL_SMTP_AUTH=false`
   - `MAIL_SMTP_STARTTLS_ENABLE=false`
   - `AUTH_REQUIRE_EMAIL_VERIFICATION=true`
   - `FRONTEND_BASE_URL=http://localhost:3000`

3. Redemarrer backend + frontend.

4. Scenario verification email (inscription CLIENT) :
   - creer un compte depuis `/register`
   - verifier l'affichage "Compte cree, verifiez votre boite mail"
   - ouvrir `http://localhost:8025`, recuperer l'email de verification
   - cliquer le lien `/verify-email?token=...`
   - confirmer le statut "Email verifie"

5. Scenario reset mot de passe :
   - demander un reset depuis `/forgot-password`
   - recuperer l'email dans Mailpit et ouvrir le lien `/reset-password?token=...`
   - definir un nouveau mot de passe conforme
   - verifier la connexion avec le nouveau mot de passe

6. Tests d'erreur UX :
   - reutiliser un lien deja consomme -> message "Lien invalide"
   - attendre expiration ou modifier le token -> message "Lien expire" ou "Lien invalide"
   - verifier la disponibilite du bouton "Renvoyer l'email de verification"

## Volumes persistants

La stack conteneurisee conserve deja :

- `mysql_data` : donnees MySQL
- `backend_uploads` : pieces jointes, avatars et exports backend
- `backend_logs` : logs backend

Le profil defense-ready reutilise ces volumes sans changer le comportement applicatif.

## Procedure concise defense-ready

1. Copier `.env.defense.example` vers `.env`.
2. Remplacer tous les secrets et domaines d'exemple.
3. Verifier que `COMPOSE_FRONTEND_BASE_URL`, `COMPOSE_CORS_ALLOWED_ORIGINS`, `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS` et `COMPOSE_REACT_APP_API_URL` sont coherents.
4. Verifier le SMTP reel (host, credentials, from) car la verification email client est active par defaut en profil defense-ready.
5. Lancer `scripts\deploy\start-defense-stack.bat` ou la commande compose avec `docker-compose.defense.yml`.
6. Executer le smoke post-deploy puis la checklist defense : `docs/DEFENSE_SMOKE_CHECKLIST.md`.

## Politique scripts

- Scripts officiels : `scripts/dev`, `scripts/demo`, `scripts/deploy`
- Scripts historiques non officiels : `scripts/legacy`
- Ne pas utiliser de scripts hors de ces repertoires pour la soutenance ou le deploiement

## Source de verite de deploiement

- `docker-compose.yml` (racine) est la source de verite de la stack conteneurisee.
- `docker-compose.defense.yml` est un override additif pour la soutenance / profil production-like.
- `docs/archive/integration/INTEGRATION_DOCKER/docker-compose-full.yml` est conserve uniquement pour compatibilite documentaire.
