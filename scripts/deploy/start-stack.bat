@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"

echo ====================================================
echo   MTS TELECOM - Stack complete conteneurisee
echo ====================================================
echo.

pushd "%ROOT_DIR%"

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose up -d --build
) else (
    docker-compose version >nul 2>&1
    if errorlevel 1 (
        echo ERREUR: Docker Compose est requis pour le deploiement local conteneurise.
        popd
        exit /b 1
    )
    docker-compose up -d --build
)

if errorlevel 1 (
    echo ERREUR: Le lancement de la stack complete a echoue.
    popd
    exit /b 1
)

popd

echo.
echo Verification de readiness en cours...
call "%ROOT_DIR%scripts\deploy\smoke-post-deploy.bat"
if errorlevel 1 (
    echo.
    echo ERREUR: La stack est demarree mais le smoke post-deploy a echoue.
    echo Consultez les logs: scripts\deploy\show-stack-logs.bat
    exit /b 1
)

echo.
echo ====================================================
echo   Stack conteneurisee demarree
echo ====================================================
echo   Frontend  : http://localhost:3000
echo   Backend   : http://localhost:8080
echo   Swagger   : http://localhost:8080/swagger-ui.html
echo   MySQL     : localhost:3306
echo   phpMyAdmin: http://localhost:8081
echo ====================================================
pause
