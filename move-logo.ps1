# Script para mover el logo a la carpeta public
if (Test-Path "logo.png") {
    if (-not (Test-Path "public")) {
        New-Item -ItemType Directory -Path "public" | Out-Null
        Write-Host "Carpeta public creada"
    }
    Copy-Item "logo.png" -Destination "public/logo.png" -Force
    Write-Host "Logo copiado a public/logo.png"
} else {
    Write-Host "ERROR: logo.png no encontrado en la raiz"
}

