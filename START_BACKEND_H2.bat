@echo off
echo ====================================================
echo   MTS TELECOM - Backend Server (H2 In-Memory DB)
echo ====================================================
echo.

REM Kill any existing Java processes first
echo [1/3] Stopping any running backend servers...
taskkill /F /IM java.exe >nul 2>&1
if %errorlevel%==0 (
    echo       ^> Stopped existing server
    timeout /t 3 /nobreak >nul
) else (
    echo       ^> No running server found
)

REM Navigate to server directory
echo [2/3] Navigating to server directory...
cd /d "%~dp0server"
if %errorlevel% neq 0 (
    echo       ERROR: server folder not found!
    pause
    exit /b 1
)

REM Start the backend with H2 in-memory database
echo [3/3] Starting backend server with H2 database...
echo.
echo ====================================================
echo   Server will start on http://localhost:8080
echo   Database: H2 In-Memory (no Docker required)
echo   Press Ctrl+C to stop the server
echo ====================================================
echo.

mvn spring-boot:run -Dspring-boot.run.profiles=h2

pause
