@echo off
setlocal

REM ============================================================================
REM MTS TELECOM - DEMARRAGE MICROSERVICE DUPLICATE DETECTION
REM ============================================================================

set "SERVICE_DIR=%~dp0"
set "ROOT_DIR=%SERVICE_DIR%.."
set "ROOT_PYTHON=%ROOT_DIR%\.venv\Scripts\python.exe"
set "LOCAL_VENV_PYTHON=%SERVICE_DIR%venv\Scripts\python.exe"

echo.
echo ========================================
echo  MTS TELECOM - MICROSERVICE IA
echo  Detection de doublons
echo ========================================
echo.

cd /d "%SERVICE_DIR%"

if exist "%ROOT_PYTHON%" (
    set "PYTHON_EXE=%ROOT_PYTHON%"
    echo [ETAPE 1/3] Python partage detecte dans .venv
) else if exist "%LOCAL_VENV_PYTHON%" (
    set "PYTHON_EXE=%LOCAL_VENV_PYTHON%"
    echo [ETAPE 1/3] Environnement local detecte
) else (
    echo [ETAPE 1/3] Creation environnement virtuel local...
    python -m venv venv
    if errorlevel 1 (
        echo ERREUR: Impossible de creer l'environnement virtuel local.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=%LOCAL_VENV_PYTHON%"
    echo Environnement local cree.
)

echo.
echo [ETAPE 2/3] Verification des dependances...
"%PYTHON_EXE%" -c "import fastapi, uvicorn, sentence_transformers, sklearn, numpy" >nul 2>&1
if errorlevel 1 (
    echo Installation des dependances...
    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo ERREUR: Installation des dependances echouee.
        pause
        exit /b 1
    )
    echo Dependances installees.
) else (
    echo Dependances deja disponibles.
)

echo.
echo [ETAPE 3/3] Demarrage du microservice FastAPI...
echo.
echo ====================================================
echo   URL:        http://127.0.0.1:8001
echo   Swagger:    http://127.0.0.1:8001/docs
echo   Health:     http://127.0.0.1:8001/health
echo ====================================================
echo.
echo Appuyez sur Ctrl+C pour arreter
echo.

"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8001
