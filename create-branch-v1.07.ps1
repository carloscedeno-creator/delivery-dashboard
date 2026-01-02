# Script para crear y cambiar a la rama V1.07
Write-Host "========================================"
Write-Host "Creando rama V1.07"
Write-Host "========================================"
Write-Host ""

# Verificar rama actual
$currentBranch = git branch --show-current
Write-Host "Rama actual: $currentBranch"
Write-Host ""

# Verificar cambios sin commitear
Write-Host "Verificando cambios sin commitear..."
$status = git status --short
if ($status) {
    Write-Host "Hay cambios sin commitear:"
    Write-Host $status
    Write-Host ""
    Write-Host "Agregando cambios..."
    git add -A
    Write-Host ""
    Write-Host "Haciendo commit..."
    git commit -m "Fix logo paths using BASE_URL and update tests"
    Write-Host ""
} else {
    Write-Host "No hay cambios sin commitear"
    Write-Host ""
}

# Crear y cambiar a V1.07
Write-Host "Creando rama V1.07..."
git checkout -b V1.07

Write-Host ""
Write-Host "Verificando rama actual..."
$newBranch = git branch --show-current
Write-Host "Rama actual: $newBranch"
Write-Host ""

Write-Host "========================================"
Write-Host "¡Rama V1.07 creada y activada!"
Write-Host "========================================"
Write-Host ""
Write-Host "Para hacer push de la nueva rama:"
Write-Host "  git push -u origin V1.07"
Write-Host ""

