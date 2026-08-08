@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Freedom-MT5-Sync-Uninstall-Autostart.ps1"
if errorlevel 1 (
  echo.
  echo Unable to remove Freedom MT5 autostart.
  pause
  exit /b 1
)
pause

