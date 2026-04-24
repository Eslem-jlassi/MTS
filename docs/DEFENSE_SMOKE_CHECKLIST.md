# Checklist Smoke Defense

Cette checklist complete le smoke HTTP rapide pour un deploiement defense-ready.

## Avant lancement

- `.env` provient de `.env.defense.example`
- tous les secrets `CHANGE_ME_*` ont ete remplaces
- `COMPOSE_FRONTEND_BASE_URL`, `COMPOSE_CORS_ALLOWED_ORIGINS`, `COMPOSE_WS_ALLOWED_ORIGIN_PATTERNS` et `COMPOSE_REACT_APP_API_URL` sont coherents
- `COMPOSE_COOKIE_SECURE=true`
- si verification email activee :
  - `COMPOSE_MAIL_ENABLED=true`
  - `COMPOSE_AUTH_REQUIRE_EMAIL_VERIFICATION=true`
  - SMTP reel renseigne et teste

## Lancement

```bash
docker compose -f docker-compose.yml -f docker-compose.defense.yml up -d --build
```

Ou sous Windows :

```bat
scripts\deploy\start-defense-stack.bat
```

## Verifications techniques immediates

- `docker compose -f docker-compose.yml -f docker-compose.defense.yml ps` montre `mysql`, `backend`, `frontend`, `sentiment-service`, `duplicate-service`, `ai-chatbot` en etat sain
- `phpmyadmin` n'apparait pas sans activation explicite du profil `dev-tools`
- `http://localhost:8080/actuator/health` repond `UP`
- `http://127.0.0.1:8000/health` repond
- `http://127.0.0.1:8001/health` repond
- `http://127.0.0.1:8002/health` repond
- le frontend charge sans erreur bloquante

## Verifications fonctionnelles minimales

- connexion admin/manager fonctionne avec auth par cookie
- inscription publique reste limitee au role `CLIENT`
- si verification email est activee :
  - inscription client cree un compte non verifie
  - le mail de verification est recu
  - le lien de verification fonctionne
  - le renvoi de verification fonctionne
- ALLIE n'apparait pas dans l'UI admin
- exports et notifications principales ne regressent pas

## Verifications de defense / securite

- aucun acces public phpMyAdmin expose dans le profil defense-ready
- aucun secret par defaut `CHANGE_ME_*` ne reste en place
- les cookies de session sont emis avec le mode securise attendu pour l'environnement vise
- les origines CORS/WebSocket ne contiennent que les domaines frontend attendus

## Verifications de persistance

- un upload ticket ou avatar reste present apres redemarrage des conteneurs
- un export rapport reste present dans le volume backend
- les logs backend restent disponibles dans `backend_logs`
- les donnees MySQL restent presentes apres `docker compose down` puis `up`

## Commandes utiles

```bash
docker compose -f docker-compose.yml -f docker-compose.defense.yml ps
docker compose -f docker-compose.yml -f docker-compose.defense.yml logs backend --tail 200
docker compose -f docker-compose.yml -f docker-compose.defense.yml down
```
