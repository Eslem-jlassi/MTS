@echo off
echo ====================================================
echo   FIX DEFINITIF - Lombok + Spring Tools Suite
echo ====================================================
echo.
echo FERMEZ SPRING TOOLS SUITE MAINTENANT!
echo.
pause

echo.
echo [1/4] Nettoyage du workspace Eclipse...

:: Trouver et nettoyer le workspace STS
for /d %%D in ("%USERPROFILE%\eclipse-workspace" "%USERPROFILE%\.metadata" "C:\Users\Chak-Tec\Desktop\backend\.metadata") do (
    if exist "%%D\.metadata\.plugins\org.eclipse.jdt.core" (
        echo Nettoyage JDT cache: %%D
        rmdir /s /q "%%D\.metadata\.plugins\org.eclipse.jdt.core" 2>nul
    )
)

:: Nettoyer les caches du projet
echo [2/4] Nettoyage du projet...
cd /d "C:\Users\Chak-Tec\Desktop\mts - Copie\server"
if exist target rmdir /s /q target

:: Recompiler via Maven
echo [3/4] Compilation Maven...
call mvn clean compile -DskipTests -q

echo.
echo [4/4] Lancement de STS avec -clean...
start "" "C:\SpringTools\sts-5.0.1.RELEASE\SpringToolsForEclipse.exe" -clean

echo.
echo ====================================================
echo   APRES QUE STS S'OUVRE:
echo.
echo   1. Clic droit sur "backend-pfe"
echo   2. Maven ^> Update Project
echo   3. Cochez "Force Update of Snapshots/Releases"
echo   4. OK
echo   5. Attendez que le build finisse
echo   6. FAITES "Project ^> Clean" pour verifier
echo.
echo   Les erreurs NE devraient PLUS revenir!
echo ====================================================
pause
