@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\pythonw.exe" (
  echo Freedom MT5 Sync Service is not installed yet.
  echo Run Freedom-MT5-Sync-Setup.bat first.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Freedom-MT5-Sync-Install-Autostart.ps1"
if errorlevel 1 (
  echo.
  echo Autostart setup failed. The normal Start.bat still works.
  pause
  exit /b 1
)

pause

