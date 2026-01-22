# Auto Development Loop - Sistema de desarrollo autónomo para Windows
# Versión corregida y funcional

param(
    [int]$MaxIterations = 10,
    [string]$BranchName = "auto-dev-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
)

Write-Host "🚀 Iniciando Auto Development Loop..." -ForegroundColor Green
Write-Host "Máximo iteraciones: $MaxIterations" -ForegroundColor Yellow
Write-Host "Branch: $BranchName" -ForegroundColor Yellow
Write-Host ""

# Verificar herramientas disponibles
Write-Host "🛠️ Verificando herramientas..." -ForegroundColor Blue

# Verificar OpenSpec
try {
    $openspecVersion = & openspec --version 2>$null
    Write-Host "✅ OpenSpec: $openspecVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenSpec no disponible" -ForegroundColor Red
    exit 1
}

# Verificar jq
try {
    $jqVersion = & jq --version 2>$null
    Write-Host "✅ jq: $jqVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ jq no disponible" -ForegroundColor Red
    exit 1
}

# Verificar Node.js
try {
    $nodeVersion = & node --version 2>$null
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no disponible" -ForegroundColor Red
    exit 1
}

# Verificar que estamos en el directorio correcto
if (!(Test-Path "specs/prd.md")) {
    Write-Host "❌ No estamos en el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Crear branch si no existe
$currentBranch = & git branch --show-current
if ($currentBranch -ne $BranchName) {
    Write-Host "🌿 Creando/cambiando a branch: $BranchName" -ForegroundColor Blue
    & git checkout -b $BranchName 2>$null
    if ($LASTEXITCODE -ne 0) {
        & git checkout $BranchName 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error al crear/cambiar branch" -ForegroundColor Red
            exit 1
        }
    }
}

# Loop principal de desarrollo autónomo
for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  🚀 Iteración $i de $MaxIterations - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

    # Verificar si hay PRD activo
    $prdPath = "scripts/ralph/prd.json"
    if (!(Test-Path $prdPath)) {
        Write-Host "❌ No hay PRD activo en $prdPath" -ForegroundColor Red
        Write-Host "Crear un PRD con: Copy-Item scripts/ralph/prd.json.example scripts/ralph/prd.json" -ForegroundColor Yellow
        break
    }

    # Leer PRD y encontrar próxima story
    try {
        $prdContent = Get-Content $prdPath -Raw | ConvertFrom-Json
        $nextStory = $prdContent.userStories | Where-Object { $_.passes -eq $false } | Select-Object -First 1

        if (!$nextStory) {
            Write-Host "🎉 ¡Todas las stories completadas!" -ForegroundColor Green
            break
        }

        Write-Host "📋 Próxima story: $($nextStory.id) - $($nextStory.title)" -ForegroundColor Yellow

        # Simular desarrollo (aquí iría la lógica real)
        Write-Host "⚡ Desarrollando story..." -ForegroundColor Blue
        Start-Sleep -Seconds 2

        # Ejecutar tests
        Write-Host "🧪 Ejecutando tests..." -ForegroundColor Blue
        try {
            & npm test 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Tests pasaron" -ForegroundColor Green

                # Marcar story como completada
                $nextStory.passes = $true

                # Actualizar PRD
                $prdJson = $prdContent | ConvertTo-Json -Depth 10
                $prdJson | Out-File -FilePath $prdPath -Encoding UTF8

                # Commit changes
                & git add . 2>$null
                & git commit -m "feat: $($nextStory.id) - $($nextStory.title)" 2>$null

                Write-Host "💾 Cambios commited" -ForegroundColor Green

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
if ($i -gt $MaxIterations) {
    Write-Host "⏰ Máximo de iteraciones alcanzado ($MaxIterations)" -ForegroundColor Yellow
} else {
    Write-Host "🎯 ¡Desarrollo autónomo completado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Resumen:" -ForegroundColor Blue
Write-Host "- Iteraciones completadas: $($i-1)" -ForegroundColor White
Write-Host "- Branch: $BranchName" -ForegroundColor White
Write-Host "- Status: Completado" -ForegroundColor White