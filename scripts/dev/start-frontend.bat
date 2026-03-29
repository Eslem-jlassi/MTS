@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
set "CLIENT_DIR=%ROOT_DIR%client"

if not exist "%CLIENT_DIR%\package.json" (
    echo ERREUR: Projet frontend introuvable dans "%CLIENT_DIR%".
    exit /b 1
)

cd /d "%CLIENT_DIR%"

if not exist "node_modules" (
    echo [Frontend] Installation des dependances npm...
    call npm install
    if errorlevel 1 (
        echo ERREUR: npm install a echoue.
        exit /b 1
    )
)

if not defined REACT_APP_API_URL set "REACT_APP_API_URL=http://localhost:8080/api"
if not defined REACT_APP_DEMO_MODE set "REACT_APP_DEMO_MODE=false"

echo ====================================================
echo   MTS TELECOM - Frontend local
echo ====================================================
echo   URL UI  : http://localhost:3000
echo   API URL : %REACT_APP_API_URL%
echo ====================================================
echo.

call npm start
