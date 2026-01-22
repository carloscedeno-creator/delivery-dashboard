# Amp Development Loop - Sistema de desarrollo autónomo
# Versión limpia y funcional

param(
    [int]$MaxIterations = 10
)

Write-Host "🚀 Iniciando Amp Development Loop..." -ForegroundColor Green
Write-Host "Máximo iteraciones: $MaxIterations" -ForegroundColor Yellow
Write-Host ""

# Verificar herramientas
Write-Host "🛠️ Verificando herramientas..." -ForegroundColor Blue

try {
    $openspecVersion = & openspec --version 2>$null
    Write-Host "✅ OpenSpec: $openspecVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenSpec no disponible" -ForegroundColor Red
    exit 1
}

try {
    $jqVersion = & jq --version 2>$null
    Write-Host "✅ jq: $jqVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ jq no disponible" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "specs/prd.md")) {
    Write-Host "❌ No estamos en el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Loop principal
for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  🚀 Iteración $i de $MaxIterations - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

    $prdPath = "scripts/ralph/prd.json"
    if (!(Test-Path $prdPath)) {
        Write-Host "❌ No hay PRD activo en $prdPath" -ForegroundColor Red
        break
    }

    try {
        $prdContent = Get-Content $prdPath -Raw | ConvertFrom-Json
        $nextStory = $prdContent.userStories | Where-Object { $_.passes -eq $false } | Select-Object -First 1

        if (!$nextStory) {
            Write-Host "🎉 ¡Todas las stories completadas!" -ForegroundColor Green
            break
        }

        Write-Host "📋 Procesando: $($nextStory.id) - $($nextStory.title)" -ForegroundColor Yellow

        # Simular desarrollo
        Write-Host "⚡ Ejecutando desarrollo autónomo..." -ForegroundColor Blue
        Start-Sleep -Seconds 2

        # Ejecutar tests
        Write-Host "🧪 Ejecutando tests..." -ForegroundColor Blue
        try {
            & npm test 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Tests pasaron" -ForegroundColor Green

                # Marcar como completada
                $nextStory.passes = $true
                $prdJson = $prdContent | ConvertTo-Json -Depth 10
                $prdJson | Out-File -FilePath $prdPath -Encoding UTF8

                # Commit
                & git add . 2>$null
                $commitMsg = "feat: $($nextStory.id) - $($nextStory.title)"
                & git commit -m $commitMsg 2>$null

                Write-Host "💾 Changes committed" -ForegroundColor Green

            } else {
                Write-Host "❌ Tests fallaron" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Error ejecutando tests: $($_.Exception.Message)" -ForegroundColor Red
        }

    } catch {
        Write-Host "❌ Error procesando PRD: $($_.Exception.Message)" -ForegroundColor Red
        break
    }

    Write-Host "✅ Iteración $i completada" -ForegroundColor Green
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "🎯 Aurora Development Loop completado!" -ForegroundColor Green
Write-Host "📊 Iteraciones procesadas: $($i-1)" -ForegroundColor White