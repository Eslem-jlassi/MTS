@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"

pushd "%ROOT_DIR%"

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose logs -f --tail=200 backend frontend mysql sentiment-service duplicate-service ai-chatbot
) else (
    docker-compose logs -f --tail=200 backend frontend mysql sentiment-service duplicate-service ai-chatbot
)

popd