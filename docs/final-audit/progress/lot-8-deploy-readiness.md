# Lot 8 - Preparation au deploiement et reproductibilite propre

## Objectif du lot

Rendre le depot reellement pret a deployer, avec un demarrage unifie, des prerequis explicites et des artefacts minimaux necessaires pour reproduire l'execution.

## Verification de reproductibilite

### Etat constate

- Dockerfiles presents pour tous les modules deployables :
  - `client/Dockerfile`
  - `server/Dockerfile`
  - `sentiment-service/Dockerfile`
  - `duplicate-service/Dockerfile`
  - `ai-chatbot/Dockerfile`
- Manifests Python presents :
  - `sentiment-service/requirements.txt`
  - `duplicate-service/requirements.txt`
  - `ai-chatbot/requirements.txt`
- Compose complet present : `docker-compose.yml`
- Variables d'environnement d'exemple presentes : `.env.example`

### Ecart corrige

- Le script officiel local `scripts/dev/start-ai-services.bat` referencait un script absent (`sentiment-service/START_SENTIMENT_SERVICE.bat`).
- Correction appliquee : ajout de `sentiment-service/START_SENTIMENT_SERVICE.bat` avec creation venv locale si necessaire, installation des dependances et lancement uvicorn.

## Unification du demarrage

Scenario officiel retenu :

1. **Local dev recommande** : `scripts\\dev\\start-local.bat`
2. **Demo rapide** : `scripts\\demo\\start-demo-h2.bat`
3. **Stack complete** : `docker compose up -d --build`

Source de verite de deploiement : `docker-compose.yml` (racine).

## Scripts dangereux / specifiques

- Scripts historiques de maintenance/fix conserves hors flux officiel dans `scripts/legacy/`.
- Les scripts a utiliser pour la soutenance/deploiement sont limites a :
  - `scripts/dev/*`
  - `scripts/demo/*`
  - `scripts/deploy/*`

## Documentation finalisee

- Ajout d'un guide dedie : `docs/DEPLOYMENT.md`
- Mise a jour de `README.md` pour pointer vers le guide officiel et le rapport Lot 8
- Mise a jour de `docs/README.md` pour supprimer les liens obsoletes/non resolus

## Validation finale

Le depot peut etre lance sans dependre d'artefacts obscurs pour les chemins officiels documentes, sous reserve des prerequis explicites (Docker, Java/Maven, Node, Python).

## Commandes officielles

- **Demarrage local** : `scripts\\dev\\start-local.bat`
- **Demarrage stack complete** : `docker compose up -d --build`
- **Arret stack** : `docker compose down`