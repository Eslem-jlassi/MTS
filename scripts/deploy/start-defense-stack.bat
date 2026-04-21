@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
set "COMPOSE_FILES=-f docker-compose.yml -f docker-compose.defense.yml"

echo ====================================================
echo   MTS TELECOM - Stack defense-ready
echo ====================================================
echo.

pushd "%ROOT_DIR%"

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose %COMPOSE_FILES% up -d --build
) else (
    docker-compose version >nul 2>&1
    if errorlevel 1 (
        echo ERREUR: Docker Compose est requis pour le deploiement defense-ready.
        popd
        exit /b 1
    )
    docker-compose %COMPOSE_FILES% up -d --build
)

if errorlevel 1 (
    echo ERREUR: Le lancement defense-ready a echoue.
    popd
    exit /b 1
)

popd

echo.
echo Verification de readiness defense en cours...
call "%ROOT_DIR%scripts\deploy\smoke-post-deploy.bat"
if errorlevel 1 (
    echo.
    echo ERREUR: La stack defense-ready est demarree mais le smoke a echoue.
    echo Consultez les logs: scripts\deploy\show-stack-logs.bat
    exit /b 1
)

echo.
echo ====================================================
echo   Stack defense-ready demarree
echo ====================================================
echo   Frontend  : verifier la valeur COMPOSE_FRONTEND_BASE_URL
echo   Backend   : verifier la valeur COMPOSE_REACT_APP_API_URL
echo   phpMyAdmin: desactive hors profil dev-tools
echo ====================================================
pause
