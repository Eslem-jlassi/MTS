@echo off
echo ====================================================
echo   RELANCEMENT DE STS AVEC NETTOYAGE DU CACHE
echo ====================================================
echo.
echo Cela va relancer Spring Tools Suite avec -clean
echo pour forcer le rechargement de Lombok.
echo.

start "" "C:\SpringTools\sts-5.0.1.RELEASE\SpringToolsForEclipse.exe" -clean

echo.
echo STS demarre avec cache nettoye!
echo.
echo APRES LE DEMARRAGE:
echo 1. Clic droit sur le projet "server" (ou backend-pfe)
echo 2. Maven ^> Update Project (cochez Force Update)
echo 3. Project ^> Clean
echo.
echo Les erreurs Lombok devraient avoir disparu!
echo ====================================================
pause
