# Amp Simple Development Loop
# Versión minimalista y funcional

param([int]$MaxIterations = 3)

Write-Host "🚀 Amp Development Loop" -ForegroundColor Green
Write-Host "Iteraciones: $MaxIterations" -ForegroundColor Yellow
Write-Host ""

# Verificar herramientas
Write-Host "🛠️ Verificando herramientas..." -ForegroundColor Blue
try {
    $openSpecVer = & openspec --version 2>$null
    Write-Host "✅ OpenSpec OK" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenSpec no disponible" -ForegroundColor Red
    exit 1
}

# Loop principal
for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host "═══ Iteración $i ═══" -ForegroundColor Cyan

    # Verificar PRD
    if (!(Test-Path "scripts/ralph/prd.json")) {
        Write-Host "❌ PRD no encontrado" -ForegroundColor Red
        break
    }

    try {
        $prd = Get-Content "scripts/ralph/prd.json" -Raw | ConvertFrom-Json
        $pending = $prd.userStories | Where-Object { !$_.passes }

        if ($pending.Count -eq 0) {
            Write-Host "🎉 Todas las stories completadas!" -ForegroundColor Green
            break
        }

        $story = $pending[0]
        Write-Host "📋 Procesando: $($story.id)" -ForegroundColor Yellow

        # Simular desarrollo
        Write-Host "⚡ Desarrollando..." -ForegroundColor Blue
        Start-Sleep -Seconds 1

        # Ejecutar tests
        Write-Host "🧪 Testing..." -ForegroundColor Blue
        & npm test 2>$null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Tests OK - Marcando completada" -ForegroundColor Green

            # Actualizar PRD
            $story.passes = $true
            $prd | ConvertTo-Json -Depth 10 | Out-File "scripts/ralph/prd.json" -Encoding UTF8

            # Commit
            & git add . 2>$null
            & git commit -m "feat: $($story.id) - $($story.title)" 2>$null

            Write-Host "💾 Committed" -ForegroundColor Green
        } else {
            Write-Host "❌ Tests fallaron" -ForegroundColor Red
        }

    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        break
    }

    Write-Host "✅ Iteración $i completada" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Amp Loop terminado!" -ForegroundColor Green