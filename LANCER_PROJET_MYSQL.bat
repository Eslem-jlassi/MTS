@echo off
echo ====================================================
echo   MTS TELECOM - Lancement avec MySQL
echo ====================================================
echo.
echo PREREQUIS: MySQL doit etre installe et demarre
echo   - Host: localhost:3306
echo   - User: root
echo   - Password: Root123!
echo.

:: =====================================================
:: ETAPE 0: Creer la base de donnees si elle n'existe pas
:: =====================================================
echo [0/2] Creation de la base de donnees...
mysql -u root -pRoot123! -e "CREATE DATABASE IF NOT EXISTS mts_telecom_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %errorlevel% neq 0 (
    echo ATTENTION: Impossible de se connecter a MySQL!
    echo Verifiez que MySQL est demarre et que le mot de passe est correct.
    echo.
    echo Voulez-vous continuer avec H2 en memoire a la place? (O/N)
    choice /c ON
    if errorlevel 2 exit /b
    echo Passage en mode H2...
    start "MTS Backend" cmd /k "cd /d C:\Users\Chak-Tec\Desktop\mts - Copie\server && mvn spring-boot:run -Dspring-boot.run.profiles=h2"
    goto frontend
)
echo Base de donnees prete!

:: =====================================================
:: ETAPE 1: Lancer le Backend avec MySQL
:: =====================================================
echo.
echo [1/2] Demarrage du Backend Spring Boot (port 8080)...
echo       Base de donnees: MySQL (mts_telecom_db)
echo.

start "MTS Backend" cmd /k "cd /d C:\Users\Chak-Tec\Desktop\mts - Copie\server && mvn spring-boot:run"

echo Attendez 20 secondes que le backend demarre...
timeout /t 20 /nobreak

:: =====================================================
:: ETAPE 2: Lancer le Frontend
:: =====================================================
:frontend
echo.
echo [2/2] Demarrage du Frontend React (port 3000)...
echo.

start "MTS Frontend" cmd /k "cd /d C:\Users\Chak-Tec\Desktop\mts - Copie\client && npm start"

echo.
echo ====================================================
echo   PROJET LANCE!
echo ====================================================
echo.
echo   Backend:  http://localhost:8080
echo   Swagger:  http://localhost:8080/swagger-ui.html
echo   Frontend: http://localhost:3000
echo.
echo   Pour arreter: fermez les 2 fenetres de terminal
echo ====================================================
pause
