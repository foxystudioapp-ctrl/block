# ====================================================================
# Bloxy / Antigravity - Hizli Kaynak Kopyalama (Robocopy)
# ====================================================================
#
# Mevcut yaklasima gore 10-20x daha hizli:
#   - node_modules, .git, build vb. dizinleri HIC okumaz (Robocopy /XD)
#   - 16 thread paralel kopya (Robocopy /MT:16)
#
# KULLANIM:
#   .\copy-bloxy.ps1                                  -> Masaustune kopyalar
#   .\copy-bloxy.ps1 -Destination "D:\Yedek\bloxy"  -> Belirtilen yere
#   .\copy-bloxy.ps1 -Source "C:\eski" -Destination "C:\yeni"
#
# Script projenin ICINDE veya BASKA bir yerden calistirilabilir.
# ====================================================================

param(
    [string]$Source = $null,
    [string]$Destination = $null,
    [switch]$IncludeBuild,
    [switch]$IncludeLockfile,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# --- Kaynak: parametre yoksa scriptin bulundugu dizini kullan ----
if (-not $Source) {
    $Source = $PSScriptRoot
    if (-not $Source) { $Source = (Get-Location).Path }
}
$Source = (Resolve-Path $Source).Path

# --- Hedef: parametre yoksa masaustune timestamp'li klasor --------
if (-not $Destination) {
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $projectName = Split-Path $Source -Leaf
    $Destination = Join-Path $env:USERPROFILE "Desktop\$projectName-$ts"
}

# --- Haric tutulacak dizinler ------------------------------------
$ExcludeDirs = @(
    "node_modules",
    ".git",
    ".agents",
    ".vite",
    ".cache",
    ".idea",
    ".vscode",
    ".gradle",
    ".kotlin",
    ".dart_tool",
    "Pods",
    "DerivedData",
    "temp_aab",
    "apk_extract",
    "raw_screenshots",
    "__pycache__"
)

if (-not $IncludeBuild) {
    $ExcludeDirs += @("dist", "build")
}

# --- Haric tutulacak dosyalar ------------------------------------
$ExcludeFiles = @(
    "*.log",
    "*.tmp",
    "*.temp",
    ".DS_Store",
    "Thumbs.db",
    "*.apk",
    "*.aab",
    "*.keystore.backup",
    ".env.local"
)

if (-not $IncludeLockfile) {
    $ExcludeFiles += "package-lock.json"
}

# ====================================================================
# Baslik
# ====================================================================
Write-Host ""
Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|  Bloxy / Antigravity - Hizli Kaynak Kopyala            |" -ForegroundColor Cyan
Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Kaynak  : " -NoNewline; Write-Host $Source       -ForegroundColor Yellow
Write-Host "  Hedef   : " -NoNewline; Write-Host $Destination  -ForegroundColor Green
Write-Host ""
Write-Host "  Haric dizinler  : $($ExcludeDirs.Count) adet"  -ForegroundColor Gray
Write-Host "  Haric dosyalar  : $($ExcludeFiles.Count) adet" -ForegroundColor Gray
if ($IncludeBuild)    { Write-Host "  [+] Build dizinleri dahil"   -ForegroundColor Magenta }
if ($IncludeLockfile) { Write-Host "  [+] package-lock.json dahil" -ForegroundColor Magenta }
if ($DryRun)          { Write-Host "  [!] DRY-RUN modu (kopya yok)" -ForegroundColor Yellow }
Write-Host ""

# ====================================================================
# Hedef klasoru olustur
# ====================================================================
if (-not (Test-Path $Destination)) {
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
}

# ====================================================================
# Robocopy
# ====================================================================
# /E    : Alt dizinleri de kopyala
# /MT:16: 16 thread paralel kopya
# /XD   : Haric tutulacak dizinler
# /XF   : Haric tutulacak dosyalar
# /NFL  : Dosya listesini gosterme
# /NDL  : Dizin listesini gosterme
# /NJH  : Is basligini gosterme
# /R:1  : Hata olursa 1 kez yeniden dene
# /W:1  : Yeniden denemeler arasi 1sn bekle
# /L    : (DryRun) Sadece listele
# ====================================================================

$robocopyArgs = @($Source, $Destination, "/E", "/MT:16", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH")
$robocopyArgs += "/XD"
$robocopyArgs += $ExcludeDirs
$robocopyArgs += "/XF"
$robocopyArgs += $ExcludeFiles
if ($DryRun) { $robocopyArgs += "/L" }

$startTime = Get-Date
Write-Host "  Kopyalama basladi..." -ForegroundColor Cyan
Write-Host ""

& robocopy @robocopyArgs

$exitCode = $LASTEXITCODE
$elapsed = (Get-Date) - $startTime

# Robocopy exit kodlari: 0-7 basarili, 8+ hata
$success = $exitCode -lt 8

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Gray

if ($success) {
    Write-Host ""
    Write-Host "  [OK] Basarili!" -ForegroundColor Green
    Write-Host ""

    if (-not $DryRun -and (Test-Path $Destination)) {
        $sizeBytes = (Get-ChildItem -Path $Destination -Recurse -File -ErrorAction SilentlyContinue |
                      Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($sizeBytes / 1MB, 1)
        $fileCount = (Get-ChildItem -Path $Destination -Recurse -File -ErrorAction SilentlyContinue).Count

        Write-Host "  Sure        : $($elapsed.TotalSeconds.ToString('0.0')) saniye"  -ForegroundColor White
        Write-Host "  Boyut       : $sizeMB MB"                                       -ForegroundColor White
        Write-Host "  Dosya sayisi: $fileCount"                                       -ForegroundColor White
        Write-Host "  Konum       : $Destination"                                     -ForegroundColor Green

        if ($Host.Name -eq 'ConsoleHost') {
            Write-Host ""
            $openExplorer = Read-Host "  Hedef klasoru Explorer'da acayim mi? (E/h)"
            if ($openExplorer -ne 'h' -and $openExplorer -ne 'H' -and $openExplorer -ne 'n' -and $openExplorer -ne 'N') {
                explorer.exe $Destination
            }
        }
    }
} else {
    Write-Host ""
    Write-Host "  [X] Hata! Robocopy exit kodu: $exitCode" -ForegroundColor Red
    Write-Host "      0-7 arasi kodlar basari, 8+ hata anlamina gelir." -ForegroundColor Gray
}

Write-Host ""
