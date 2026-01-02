@echo off
echo ========================================
echo Ejecutando push del workflow y tests
echo ========================================
echo.

cd /d "d:\Agile Dream Team\Antigravity\delivery-dashboard"

echo Agregando archivos...
git add .github/workflows/deploy.yml
git add tests/unit/UserAdministration.test.jsx
git add docs/
git add scripts/check-env.js
git add package.json
git add src/utils/supabaseApi.js
git add RESUMEN_DEPLOY.md
git add INSTRUCCIONES_PUSH.md

echo.
echo Estado de git:
git status --short

echo.
echo Haciendo commit...
git commit -m "Fix UserAdministration tests - wrap async updates in act() and add GitHub Pages deployment workflow"

echo.
echo Haciendo push a V1.06...
git push origin V1.06

echo.
echo ========================================
echo ¡Listo! El workflow debería aparecer en GitHub Actions
echo ========================================
pause

