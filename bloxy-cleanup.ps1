# Bloxy Smart Cleanup Script
# Tüm klasörleri tarar, gereksizleri siler

Write-Host "=== Bloxy Smart Cleanup Başlıyor ===" -ForegroundColor Green

# Silinecek klasör isimleri (nerede olursa olsun)
$foldersToDelete = @(
    "build",
    ".gradle",
    ".idea",
    ".kotlin",
    "node_modules",
    "dist",
    ".vite",
    ".cache",
    "__pycache__",
    ".dart_tool",
    "temp_aab",
    "apk_extract",
    ".git"
)

# Silinecek dosya uzantıları
$filesToDelete = @(
    "*.log",
    "*.tmp",
    "*.temp",
    ".DS_Store",
    "Thumbs.db",
    "*.apk",
    "*.aab",
    "*.class"
)

# Önce boyutu göster
$before = (Get-ChildItem -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Temizlik öncesi: $([math]::Round($before / 1MB, 2)) MB" -ForegroundColor Yellow

# Klasörleri sil
foreach ($folder in $foldersToDelete) {
    $found = Get-ChildItem -Path "." -Filter $folder -Recurse -Directory -ErrorAction SilentlyContinue
    foreach ($item in $found) {
        Write-Host "Siliniyor: $($item.FullName)" -ForegroundColor Red
        Remove-Item -Recurse -Force $item.FullName -ErrorAction SilentlyContinue
    }
}

# Dosyaları sil
foreach ($pattern in $filesToDelete) {
    $found = Get-ChildItem -Path "." -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    foreach ($item in $found) {
        Write-Host "Siliniyor: $($item.FullName)" -ForegroundColor Red
        Remove-Item -Force $item.FullName -ErrorAction SilentlyContinue
    }
}

# Sonra boyutu göster
$after = (Get-ChildItem -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$saved = $before - $after

Write-Host ""
Write-Host "=== Temizlik Tamamlandı ===" -ForegroundColor Green
Write-Host "Önce  : $([math]::Round($before / 1MB, 2)) MB" -ForegroundColor Yellow
Write-Host "Sonra : $([math]::Round($after / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "Kazanç: $([math]::Round($saved / 1MB, 2)) MB silindi!" -ForegroundColor Magenta