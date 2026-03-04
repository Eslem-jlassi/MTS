@echo off
echo ====================================================
echo   MTS TELECOM - Lancement du Projet Complet
echo ====================================================
echo.
echo Ce script lance le Backend ET le Frontend
echo.

:: =====================================================
:: ETAPE 1: Lancer le Backend Spring Boot (avec H2)
:: =====================================================
echo [1/2] Demarrage du Backend Spring Boot (port 8080)...
echo       Base de donnees: H2 en memoire (pas besoin de MySQL)
echo.

start "MTS Backend" cmd /k "cd /d C:\Users\Chak-Tec\Desktop\mts - Copie\server && mvn spring-boot:run -Dspring-boot.run.profiles=h2"

echo Backend en cours de demarrage...
echo Attendez 15 secondes que le backend demarre...
timeout /t 15 /nobreak

:: =====================================================
:: ETAPE 2: Lancer le Frontend React (port 3000)
:: =====================================================
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
echo   H2 DB:    http://localhost:8080/h2-console
echo   Frontend: http://localhost:3000
echo.
echo   Le navigateur s'ouvrira automatiquement sur le frontend
echo.
echo   Pour arreter: fermez les 2 fenetres de terminal
echo ====================================================
pause
