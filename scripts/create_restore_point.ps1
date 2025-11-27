# ==============================================================================
# SCRIPT DE PUNTO DE RESTAURACION (SNAPSHOT v3.2)
# Autor: Sistema de Respaldo Automatizado
# Descripcion: Crea un Tag de Git y un archivo ZIP de respaldo fisico.
# ==============================================================================

# 1. Configuracion
$Version = "v3.2"
$Date = Get-Date -Format "yyyyMMdd-HHmm"
$RestorePointName = "restore-point-$Version-$Date"
$BackupDir = "backups"

# Crear directorio de backups si no existe
if (!(Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Iniciando Punto de Restauracion: $RestorePointName" -ForegroundColor Cyan

# 2. Asegurar estado de Git
Write-Host "[1/4] Asegurando cambios en Git..." -ForegroundColor Yellow
git add .
# Intentar commit solo si hay cambios
try {
    git commit -m "backup: Punto de restauracion automatico $RestorePointName"
} catch {
    Write-Host "   -> No habia cambios pendientes para commit." -ForegroundColor Gray
}

# 3. Crear Etiqueta (Tag) Inmutable
Write-Host "[2/4] Creando etiqueta de seguridad (Git Tag)..." -ForegroundColor Yellow
git tag -a "$RestorePointName" -m "Snapshot completo del proyecto version $Version"
git push origin "$RestorePointName"

# 4. Generar Archivo ZIP Fisico (Excluyendo node_modules para velocidad)
Write-Host "[3/4] Generando archivo ZIP de respaldo fisico..." -ForegroundColor Yellow
$ZipPath = "$BackupDir\$RestorePointName.zip"

# Lista de exclusiones (node_modules, .git, dist, backups)
$ExcludeList = @("node_modules", ".git", "dist", "backups")

# Comprimir
Get-ChildItem -Path . -Exclude $ExcludeList | Compress-Archive -DestinationPath $ZipPath -Update

Write-Host "[4/4] Proceso finalizado." -ForegroundColor Green
# USO DE COMILLAS SIMPLES PARA EVITAR ERRORES DE PARSEO
Write-Host '--------------------------------------------------------'
Write-Host "PUNTO DE RESTAURACION CREADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "ID de Restauracion (Git): $RestorePointName"
Write-Host "Archivo Fisico: $ZipPath"
Write-Host '--------------------------------------------------------'