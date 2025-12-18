# Script para desplegar la función Edge execute-sync-sql
# Ejecuta este script después de hacer login en Supabase

Write-Host "🚀 Desplegando función Edge execute-sync-sql..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Supabase CLI está instalado
$supabaseVersion = supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI no está instalado." -ForegroundColor Red
    Write-Host "   Instala con: scoop install supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI instalado: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Cambiar al directorio del proyecto
$projectDir = "d:\Agile Dream Team\Antigravity\delivery-dashboard"
Set-Location $projectDir

Write-Host "📁 Directorio: $projectDir" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos logueados
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Cyan
$whoami = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás logueado en Supabase." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ejecuta primero:" -ForegroundColor Yellow
    Write-Host "  supabase login" -ForegroundColor White
    Write-Host ""
    Write-Host "O configura el token:" -ForegroundColor Yellow
    Write-Host "  $env:SUPABASE_ACCESS_TOKEN = 'tu-token'" -ForegroundColor White
    exit 1
}

Write-Host "✅ Autenticado correctamente" -ForegroundColor Green
Write-Host ""

# Vincular proyecto (si no está vinculado)
Write-Host "🔗 Vinculando proyecto..." -ForegroundColor Cyan
supabase link --project-ref sywkskwkexwwdzrbwinp
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Error vinculando proyecto. Continuando..." -ForegroundColor Yellow
}
Write-Host ""

# Desplegar función
Write-Host "📦 Desplegando función execute-sync-sql..." -ForegroundColor Cyan
supabase functions deploy execute-sync-sql
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Función desplegada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Ejecuta CREATE_EXEC_SQL_FUNCTION.sql en Supabase SQL Editor" -ForegroundColor White
    Write-Host "   2. Configura SUPABASE_SERVICE_ROLE_KEY en el script de sincronización" -ForegroundColor White
    Write-Host "   3. Ejecuta el script de sincronización" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Error desplegando función" -ForegroundColor Red
    exit 1
}




