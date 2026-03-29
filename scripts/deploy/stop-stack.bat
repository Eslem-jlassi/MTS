@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"

pushd "%ROOT_DIR%"

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose down
) else (
    docker-compose down
)

popd
