param(
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir 'Freedom-MT5-Sync.lnk'

if (Test-Path $shortcutPath) {
  Remove-Item -LiteralPath $shortcutPath -Force
}

if (-not $Quiet) {
  Write-Host ''
  Write-Host 'Freedom MT5 background autostart is DISABLED.' -ForegroundColor Yellow
  Write-Host 'A background Agent already running will end when you sign out or restart Windows.'
}

