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

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down

echo "[OK] Stack production arretee."
