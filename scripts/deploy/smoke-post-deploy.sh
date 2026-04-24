#!/usr/bin/env bash

set -euo pipefail

FRONTEND_URL="${SMOKE_FRONTEND_URL:-http://localhost}"
BACKEND_HEALTH_URL="${SMOKE_BACKEND_HEALTH_URL:-http://localhost:8080/actuator/health}"
SYSTEM_HEALTH_URL="${SMOKE_SYSTEM_HEALTH_URL:-http://localhost:8080/api/system/health}"
API_BASE_URL="${SMOKE_API_BASE_URL:-http://localhost:8080/api}"
FRONTEND_DASHBOARD_URL="${SMOKE_FRONTEND_DASHBOARD_URL:-${FRONTEND_URL%/}/dashboard}"

FAILURES=0

check_url() {
  local name="$1"
  local url="$2"

  if curl -fsS --max-time 15 "$url" >/dev/null; then
    echo "[OK] $name - $url"
  else
    echo "[FAIL] $name - $url"
    FAILURES=$((FAILURES + 1))
  fi
}

authenticated_probe() {
  local label="$1"
  local email="$2"
  local password="$3"
  local check_url_value="$4"
  local cookie_jar

  cookie_jar="$(mktemp)"
  trap 'rm -f "$cookie_jar"' RETURN

  if ! curl -fsS --max-time 20 \
    -c "$cookie_jar" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    "${API_BASE_URL%/}/auth/login" >/dev/null; then
    echo "[FAIL] $label login - ${API_BASE_URL%/}/auth/login"
    FAILURES=$((FAILURES + 1))
    return
  fi

  if curl -fsS --max-time 15 -b "$cookie_jar" "$check_url_value" >/dev/null; then
    echo "[OK] $label probe - $check_url_value"
  else
    echo "[FAIL] $label probe - $check_url_value"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "===================================================="
echo "  MTS TELECOM - Smoke post-deploy (Linux)"
echo "===================================================="

check_url "Frontend" "$FRONTEND_URL"
check_url "Frontend dashboard shell" "$FRONTEND_DASHBOARD_URL"
check_url "Backend actuator health" "$BACKEND_HEALTH_URL"
check_url "Backend readable system health" "$SYSTEM_HEALTH_URL"

if [[ -n "${SMOKE_EMAIL:-}" && -n "${SMOKE_PASSWORD:-}" ]]; then
  authenticated_probe "Generic session" "$SMOKE_EMAIL" "$SMOKE_PASSWORD" "${API_BASE_URL%/}/auth/me"
fi

if [[ -n "${SMOKE_MANAGER_EMAIL:-}" && -n "${SMOKE_MANAGER_PASSWORD:-}" ]]; then
  authenticated_probe \
    "Manager Copilot" \
    "$SMOKE_MANAGER_EMAIL" \
    "$SMOKE_MANAGER_PASSWORD" \
    "${API_BASE_URL%/}/manager-ai/copilot/dashboard"
fi

if [[ "$FAILURES" -eq 0 ]]; then
  echo "[OK] Smoke post-deploy termine sans erreur."
  exit 0
fi

echo "[FAIL] Smoke post-deploy: $FAILURES verification(s) en erreur."
exit 1
