# Bloxy Cleanup Script - Windows PowerShell
# Gereksiz dosyaları siler, projeyi hafifletir

Write-Host "=== Bloxy Cleanup Başlıyor ===" -ForegroundColor Green

$folders = @(
    "node_modules",
    "dist",
    ".vite",
    "android\build",
    "ios\build",
    ".gradle",
    ".idea",
    ".git"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "Siliniyor: $folder" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $folder
    }
}

# .DS_Store ve diğer dosyaları sil
$files = @(".DS_Store", "*.log", ".env.local")

foreach ($file in $files) {
    Get-ChildItem -Filter $file -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
}

Write-Host "=== Cleanup Tamamlandı ===" -ForegroundColor Green
Write-Host "Şimdi 'bloxy-clean.zip' adıyla ZIP'le ve yükle!" -ForegroundColor Cyan