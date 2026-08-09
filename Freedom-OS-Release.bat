@echo off
setlocal
cd /d "%~dp0"

title Freedom OS Release Guard
echo.
echo Freedom OS Release Guard starting...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\zip.ps1"
set "release_exit=%ERRORLEVEL%"

echo.
if not "%release_exit%"=="0" (
  echo Freedom OS release was blocked. Review the error above.
) else (
  echo Freedom OS clean release completed successfully.
)

echo.
pause
exit /b %release_exit%
