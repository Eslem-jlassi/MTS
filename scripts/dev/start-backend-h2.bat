@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
set "SERVER_DIR=%ROOT_DIR%server"

if not exist "%SERVER_DIR%\pom.xml" (
    echo ERREUR: Projet backend introuvable dans "%SERVER_DIR%".
    exit /b 1
)

if not defined COOKIE_SECURE set "COOKIE_SECURE=false"
if not defined CORS_ALLOWED_ORIGINS set "CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"
if not defined WS_ALLOWED_ORIGIN_PATTERNS set "WS_ALLOWED_ORIGIN_PATTERNS=http://localhost:3000,http://127.0.0.1:3000"
if not defined AI_AUTOSTART_ENABLED set "AI_AUTOSTART_ENABLED=false"
if not defined AI_SENTIMENT_BASE_URL set "AI_SENTIMENT_BASE_URL=http://127.0.0.1:8000"
if not defined AI_DUPLICATE_BASE_URL set "AI_DUPLICATE_BASE_URL=http://127.0.0.1:8001"
if not defined AI_CHATBOT_BASE_URL set "AI_CHATBOT_BASE_URL=http://127.0.0.1:8002"

echo ====================================================
echo   MTS TELECOM - Backend local (H2 demo)
echo ====================================================
echo   URL API : http://localhost:8080
echo   Swagger : http://localhost:8080/swagger-ui.html
echo   Console : http://localhost:8080/h2-console
echo ====================================================
echo.

cd /d "%SERVER_DIR%"
mvn spring-boot:run -Dspring-boot.run.profiles=h2
