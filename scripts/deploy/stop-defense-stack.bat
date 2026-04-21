@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
set "COMPOSE_FILES=-f docker-compose.yml -f docker-compose.defense.yml"

pushd "%ROOT_DIR%"

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose %COMPOSE_FILES% down
) else (
    docker-compose %COMPOSE_FILES% down
)

popd
