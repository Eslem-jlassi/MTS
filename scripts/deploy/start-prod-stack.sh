#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-.env.prod}"
COMPOSE_FILE="${2:-docker-compose.prod.yml}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[FAIL] Docker n'est pas installe sur cette machine."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[FAIL] Le plugin Docker Compose est indisponible."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[FAIL] Fichier d'environnement introuvable: $ENV_FILE"
  echo "Copiez .env.prod.example vers .env.prod puis ajustez les valeurs."
  exit 1
fi

echo "===================================================="
echo "  MTS TELECOM - Production stack startup"
echo "===================================================="
echo "Env file  : $ENV_FILE"
echo "Compose   : $COMPOSE_FILE"
echo

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo
echo "[OK] Stack production demarree."
echo "Verifiez ensuite :"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE ps"
echo "  ./scripts/deploy/smoke-post-deploy.sh"
