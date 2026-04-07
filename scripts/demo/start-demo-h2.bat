@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"

echo ====================================================
echo   MTS TELECOM - Lancement demo rapide
echo ====================================================
echo   Scenario : backend H2 + frontend local + services IA locaux
echo ====================================================
echo.

call "%ROOT_DIR%scripts\dev\start-ai-services.bat"
timeout /t 8 /nobreak >nul

start "MTS Backend H2" cmd /k "call ""%ROOT_DIR%scripts\dev\start-backend-h2.bat"""
timeout /t 12 /nobreak >nul

start "MTS Frontend" cmd /k "call ""%ROOT_DIR%scripts\dev\start-frontend.bat"""

echo.
echo Verification smoke de la demo en cours (peut prendre quelques secondes)...
timeout /t 18 /nobreak >nul
call "%ROOT_DIR%scripts\deploy\smoke-post-deploy.bat"
if errorlevel 1 (
	echo ATTENTION: Une ou plusieurs verifications smoke sont en erreur.
	echo Conseil: attendre 20 a 30 secondes puis relancer scripts\deploy\smoke-post-deploy.bat
)

echo.
echo ====================================================
echo   Environnement demo H2 lance
echo ====================================================
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8080
echo   H2       : http://localhost:8080/h2-console
echo ====================================================
pause
