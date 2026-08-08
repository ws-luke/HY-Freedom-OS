@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3 for Windows first.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  if errorlevel 1 goto :failed
)
call ".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :failed
call ".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :failed
echo.
echo Enabling Freedom MT5 background autostart for this Windows account...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Freedom-MT5-Sync-Install-Autostart.ps1" -Quiet
if errorlevel 1 (
  echo Autostart could not be enabled automatically. You can still use Freedom-MT5-Sync-Start.bat.
)
echo.
echo Freedom MT5 Sync Service is ready.
echo Background autostart will run after your next Windows sign-in.
pause
exit /b 0

:failed
echo.
echo Setup failed. Check the messages above.
pause
exit /b 1
