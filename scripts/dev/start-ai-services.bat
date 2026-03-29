@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
set "SENTIMENT_SCRIPT=%ROOT_DIR%sentiment-service\START_SENTIMENT_SERVICE.bat"
set "DUPLICATE_SCRIPT=%ROOT_DIR%duplicate-service\START_DUPLICATE_SERVICE.bat"
set "CHATBOT_SCRIPT=%ROOT_DIR%ai-chatbot\START_AI_CHATBOT.bat"

if not exist "%SENTIMENT_SCRIPT%" (
    echo ERREUR: Script sentiment introuvable.
    exit /b 1
)

if not exist "%DUPLICATE_SCRIPT%" (
    echo ERREUR: Script duplicate introuvable.
    exit /b 1
)

if not exist "%CHATBOT_SCRIPT%" (
    echo ERREUR: Script chatbot introuvable.
    exit /b 1
)

echo ====================================================
echo   MTS TELECOM - Demarrage des services IA
echo ====================================================
echo.

start "MTS AI Sentiment" cmd /k "call ""%SENTIMENT_SCRIPT%"""
timeout /t 3 /nobreak >nul

start "MTS AI Duplicates" cmd /k "call ""%DUPLICATE_SCRIPT%"""
timeout /t 3 /nobreak >nul

start "MTS AI Chatbot" cmd /k "call ""%CHATBOT_SCRIPT%"""

echo Services IA lances:
echo   - Sentiment : http://127.0.0.1:8000/health
echo   - Doublons  : http://127.0.0.1:8001/health
echo   - Chatbot   : http://127.0.0.1:8002/health
