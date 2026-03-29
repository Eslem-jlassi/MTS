@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
set "SERVER_DIR=%ROOT_DIR%server"

if not exist "%SERVER_DIR%\pom.xml" (
    echo ERREUR: Projet backend introuvable dans "%SERVER_DIR%".
    exit /b 1
)

if not defined DB_URL set "DB_URL=jdbc:mysql://localhost:3306/mts_telecom_db"
if not defined DB_USERNAME set "DB_USERNAME=mts_user"
if not defined DB_PASSWORD set "DB_PASSWORD=mts_password"
if not defined COOKIE_SECURE set "COOKIE_SECURE=false"
if not defined CORS_ALLOWED_ORIGINS set "CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"
if not defined WS_ALLOWED_ORIGIN_PATTERNS set "WS_ALLOWED_ORIGIN_PATTERNS=http://localhost:3000,http://127.0.0.1:3000"
if not defined AI_AUTOSTART_ENABLED set "AI_AUTOSTART_ENABLED=false"
if not defined AI_SENTIMENT_BASE_URL set "AI_SENTIMENT_BASE_URL=http://127.0.0.1:8000"
if not defined AI_DUPLICATE_BASE_URL set "AI_DUPLICATE_BASE_URL=http://127.0.0.1:8001"
if not defined AI_CHATBOT_BASE_URL set "AI_CHATBOT_BASE_URL=http://127.0.0.1:8002"

set "PORT_8080_PID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do set "PORT_8080_PID=%%p"
if defined PORT_8080_PID (
    echo ERREUR: Le port 8080 est deja utilise. PID %PORT_8080_PID%
    echo Fermez le processus existant ou lancez: taskkill /PID %PORT_8080_PID% /F
    exit /b 1
)

echo ====================================================
echo   MTS TELECOM - Backend local (MySQL)
echo ====================================================
echo   URL API : http://localhost:8080
echo   Swagger : http://localhost:8080/swagger-ui.html
echo   DB URL  : %DB_URL%
echo ====================================================
echo.

cd /d "%SERVER_DIR%"
mvn spring-boot:run
