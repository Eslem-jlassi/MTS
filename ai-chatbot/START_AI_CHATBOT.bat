@echo off
setlocal

set "CHATBOT_DIR=%~dp0"
set "ROOT_DIR=%CHATBOT_DIR%.."
set "ROOT_PYTHON=%ROOT_DIR%\.venv\Scripts\python.exe"
set "LOCAL_VENV_PYTHON=%CHATBOT_DIR%venv\Scripts\python.exe"

echo ========================================
echo  MTS TELECOM - MICROSERVICE IA
echo  Chatbot RAG
echo ========================================
echo.

cd /d "%CHATBOT_DIR%"

if exist "%ROOT_PYTHON%" (
    set "PYTHON_EXE=%ROOT_PYTHON%"
    echo [ETAPE 1/4] Python partage detecte dans .venv
) else if exist "%LOCAL_VENV_PYTHON%" (
    set "PYTHON_EXE=%LOCAL_VENV_PYTHON%"
    echo [ETAPE 1/4] Environnement local detecte
) else (
    echo [ETAPE 1/4] Creation environnement virtuel local...
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
echo [ETAPE 2/4] Verification des dependances...
"%PYTHON_EXE%" -c "import fastapi, uvicorn, faiss, sentence_transformers" >nul 2>&1
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
echo [ETAPE 3/4] Verification des index RAG...
if not exist "%CHATBOT_DIR%index\rag_faiss.index" (
    echo ERREUR: Index FAISS introuvable.
    pause
    exit /b 1
)

if not exist "%CHATBOT_DIR%index\rag_metadata.pkl" (
    echo ERREUR: Metadonnees RAG introuvables.
    pause
    exit /b 1
)

echo Index RAG detectes.

echo.
echo [ETAPE 4/4] Demarrage du chatbot IA...
echo ====================================================
echo   URL:        http://127.0.0.1:8002
echo   Health:     http://127.0.0.1:8002/health
echo ====================================================
echo Appuyez sur Ctrl+C pour arreter
echo.

"%PYTHON_EXE%" -m uvicorn app:app --host 127.0.0.1 --port 8002
