@echo off
REM ════════════════════════════════════════════════════════════════════
REM   Bloxy / Antigravity — copy-bloxy.ps1 için çift-tıkla wrapper
REM ════════════════════════════════════════════════════════════════════
REM   Bu dosyayı copy-bloxy.ps1 ile AYNI klasöre koy.
REM   Çift tıkla → PowerShell scripti otomatik çalışır.
REM   Execution policy veya OneDrive blok sorunu OLMAZ (Bypass mode).
REM ════════════════════════════════════════════════════════════════════

PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0copy-bloxy.ps1" %*

REM Pencere kapanmasın diye bekle
echo.
pause
