@echo off
setlocal EnableDelayedExpansion

if not defined SMOKE_FRONTEND_URL set "FRONTEND_URL=http://localhost:3000"
if defined SMOKE_FRONTEND_URL set "FRONTEND_URL=%SMOKE_FRONTEND_URL%"

if not defined SMOKE_BACKEND_HEALTH_URL set "BACKEND_HEALTH_URL=http://localhost:8080/actuator/health"
if defined SMOKE_BACKEND_HEALTH_URL set "BACKEND_HEALTH_URL=%SMOKE_BACKEND_HEALTH_URL%"

if not defined SMOKE_SYSTEM_HEALTH_URL set "SYSTEM_HEALTH_URL=http://localhost:8080/api/system/health"
if defined SMOKE_SYSTEM_HEALTH_URL set "SYSTEM_HEALTH_URL=%SMOKE_SYSTEM_HEALTH_URL%"

if not defined SMOKE_BACKEND_SWAGGER_URL set "BACKEND_SWAGGER_URL=http://localhost:8080/swagger-ui.html"
if defined SMOKE_BACKEND_SWAGGER_URL set "BACKEND_SWAGGER_URL=%SMOKE_BACKEND_SWAGGER_URL%"

if not defined SMOKE_SENTIMENT_URL set "SENTIMENT_URL=http://127.0.0.1:8000/health"
if defined SMOKE_SENTIMENT_URL set "SENTIMENT_URL=%SMOKE_SENTIMENT_URL%"

if not defined SMOKE_DUPLICATE_URL set "DUPLICATE_URL=http://127.0.0.1:8001/health"
if defined SMOKE_DUPLICATE_URL set "DUPLICATE_URL=%SMOKE_DUPLICATE_URL%"

if not defined SMOKE_CHATBOT_URL set "CHATBOT_URL=http://127.0.0.1:8002/health"
if defined SMOKE_CHATBOT_URL set "CHATBOT_URL=%SMOKE_CHATBOT_URL%"

set "FAILURES=0"

echo ====================================================
echo   MTS TELECOM - Smoke post-deploy
echo ====================================================

call :check "Frontend" "%FRONTEND_URL%"
call :check "Backend health" "%BACKEND_HEALTH_URL%"
call :check "Backend readable health" "%SYSTEM_HEALTH_URL%"
call :check "Swagger" "%BACKEND_SWAGGER_URL%"
call :check "Sentiment health" "%SENTIMENT_URL%"
call :check "Duplicate health" "%DUPLICATE_URL%"
call :check "Chatbot health" "%CHATBOT_URL%"

echo.
if "%FAILURES%"=="0" (
    echo [OK] Smoke post-deploy termine sans erreur.
    exit /b 0
)

echo [FAIL] Smoke post-deploy: %FAILURES% verification(s) en erreur.
exit /b 1

:check
set "NAME=%~1"
set "URL=%~2"
curl -fsS --max-time 12 "%URL%" >nul 2>&1
if errorlevel 1 (
    set /a FAILURES+=1
    echo [FAIL] %NAME% - %URL%
    goto :eof
)

echo [OK] %NAME% - %URL%
goto :eof
