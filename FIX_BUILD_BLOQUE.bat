@echo off
echo ====================================================
echo DEBLOCAGE DU BUILD SPRING TOOLS SUITE
echo ====================================================
echo.
echo ETAPE 1: Fermeture de Spring Tools Suite
echo IMPORTANT: Fermez completement Spring Tools Suite maintenant!
echo.
pause

echo.
echo ETAPE 2: Nettoyage des fichiers de build...
cd server

if exist target (
    echo Suppression du dossier target...
    rmdir /s /q target
)

if exist .settings\.org.eclipse.jdt.core.external.folders (
    echo Suppression du cache Eclipse...
    rmdir /s /q .settings\.org.eclipse.jdt.core.external.folders
)

echo.
echo ETAPE 3: Build Maven propre (sans IDE)...
call mvn clean compile -DskipTests -T 1C

echo.
echo ====================================================
echo Build termine!
echo.
echo MAINTENANT:
echo 1. Rouvrez Spring Tools Suite
echo 2. Clic droit sur le projet "server"
echo 3. Maven ^> Update Project (Force Update)
echo 4. NE PAS activer "Build Automatically" tout de suite
echo 5. Project ^> Clean
echo 6. Puis reactivez "Build Automatically"
echo ====================================================
pause
