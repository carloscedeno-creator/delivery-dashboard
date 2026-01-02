# Script para hacer push del workflow corregido
Write-Host "🚀 Preparando deploy del workflow..." -ForegroundColor Cyan

# Verificar que estamos en la rama correcta
$branch = git branch --show-current
Write-Host "📍 Rama actual: $branch" -ForegroundColor Yellow

if ($branch -ne "V1.06") {
    Write-Host "⚠️  No estás en la rama V1.06. Cambiando..." -ForegroundColor Yellow
    git checkout V1.06
}

# Agregar archivos
Write-Host "`n📦 Agregando archivos..." -ForegroundColor Cyan
git add .github/workflows/deploy.yml
git add docs/AGREGAR_SECRETS_GITHUB.md
git add docs/CONFIGURAR_WORKFLOW_GITHUB_PAGES.md
git add docs/TROUBLESHOOTING_WORKFLOW.md
git add docs/GITHUB_PAGES_DEPLOYMENT.md
git add scripts/check-env.js
git add package.json
git add src/utils/supabaseApi.js
git add RESUMEN_DEPLOY.md

# Verificar cambios
$status = git status --short
if ($status) {
    Write-Host "`n✅ Archivos listos para commit:" -ForegroundColor Green
    Write-Host $status
    
    # Hacer commit
    Write-Host "`n💾 Haciendo commit..." -ForegroundColor Cyan
    git commit -m "Fix GitHub Pages deployment workflow - remove invalid page_build event and add environment variable support"
    
    # Hacer push
    Write-Host "`n🚀 Haciendo push a V1.06..." -ForegroundColor Cyan
    git push origin V1.06
    
    Write-Host "`n✅ ¡Listo! El workflow se ejecutará automáticamente." -ForegroundColor Green
    Write-Host "`n📋 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Ve a: https://github.com/carloscedeno-creator/delivery-dashboard/actions"
    Write-Host "2. Busca 'Deploy to GitHub Pages' en el menú lateral"
    Write-Host "3. Click en 'Run workflow' (botón verde)"
    Write-Host "4. Selecciona rama V1.06 y ejecuta"
} else {
    Write-Host "`n⚠️  No hay cambios para hacer commit" -ForegroundColor Yellow
    Write-Host "El workflow ya está actualizado en el repositorio." -ForegroundColor Green
}

Write-Host "`n✨ Proceso completado!" -ForegroundColor Green

