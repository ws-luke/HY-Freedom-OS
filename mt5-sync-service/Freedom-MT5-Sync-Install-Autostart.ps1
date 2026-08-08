param(
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$serviceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $serviceDir 'Freedom-MT5-Sync-Background.vbs'
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir 'Freedom-MT5-Sync.lnk'
$wscriptPath = Join-Path $env:WINDIR 'System32\wscript.exe'

if (-not (Test-Path $launcher)) {
  throw 'Freedom MT5 background launcher was not found.'
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $wscriptPath
$shortcut.Arguments = '"' + $launcher + '"'
$shortcut.WorkingDirectory = $serviceDir
$shortcut.Description = 'Freedom OS MT5 Sync Reliability v2'
$shortcut.Save()

if (-not $Quiet) {
  Write-Host ''
  Write-Host 'Freedom MT5 background autostart is ENABLED.' -ForegroundColor Green
  Write-Host 'It will start automatically after your next Windows sign-in.'
  Write-Host 'The current foreground Agent can stay open until then.'
}

