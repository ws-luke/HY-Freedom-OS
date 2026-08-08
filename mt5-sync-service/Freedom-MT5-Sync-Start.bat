@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Run Freedom-MT5-Sync-Setup.bat first.
  pause
  exit /b 1
)
title Freedom MT5 Sync Service
echo Freedom MT5 Sync Service running on this PC...
echo Multi-Account Agent + Broker Event Ledger v1 + Reliability v2 enabled.
echo This foreground window is for diagnostics and manual fallback.
echo Windows background autostart is available from the included installer.
echo Saved Read-only credentials are protected by your Windows account (DPAPI).
echo Freedom Cloud session is also protected by Windows DPAPI.
echo.
call ".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8765
pause
