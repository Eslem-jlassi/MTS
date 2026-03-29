@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"

echo ====================================================
echo   MTS TELECOM - Lancement local officiel
echo ====================================================
echo   Scenario : MySQL via Docker + backend/frontend/IA en local
echo ====================================================
echo.

pushd "%ROOT_DIR%"

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose up -d mysql phpmyadmin
) else (
    docker-compose version >nul 2>&1
    if errorlevel 1 (
        echo ERREUR: Docker Compose est requis pour demarrer MySQL localement.
        popd
        exit /b 1
    )
    docker-compose up -d mysql phpmyadmin
)

if errorlevel 1 (
    echo ERREUR: Impossible de demarrer MySQL via Docker Compose.
    popd
    exit /b 1
)

call "%ROOT_DIR%scripts\dev\start-ai-services.bat"
timeout /t 8 /nobreak >nul

start "MTS Backend" cmd /k "call ""%ROOT_DIR%scripts\dev\start-backend-mysql.bat"""
timeout /t 12 /nobreak >nul

start "MTS Frontend" cmd /k "call ""%ROOT_DIR%scripts\dev\start-frontend.bat"""

popd

echo.
echo ====================================================
echo   Environnement local lance
echo ====================================================
echo   Frontend  : http://localhost:3000
echo   Backend   : http://localhost:8080
echo   Swagger   : http://localhost:8080/swagger-ui.html
echo   MySQL     : localhost:3306
echo   phpMyAdmin: http://localhost:8081
echo   Sentiment : http://127.0.0.1:8000/health
echo   Doublons  : http://127.0.0.1:8001/health
echo   Chatbot   : http://127.0.0.1:8002/health
echo ====================================================
pause
