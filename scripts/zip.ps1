Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseName = "HY-Freedom-OS-Release.zip"
$releasePath = Join-Path $projectRoot $releaseName
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("hy-freedom-release-" + [Guid]::NewGuid().ToString("N"))

$excludedDirectoryNames = @(
    ".git",
    ".idea",
    ".vite",
    ".venv",
    "__pycache__",
    "coverage",
    "dist",
    "node_modules"
)

$excludedRootNames = @(
    ".git",
    ".idea",
    ".vite",
    "coverage",
    "dist",
    "node_modules",
    $releaseName
)

function Write-Step([string]$message) {
    Write-Host ""
    Write-Host ("[Freedom Release] " + $message) -ForegroundColor Cyan
}

function Test-ExcludedPath([string]$fullName) {
    $relative = $fullName.Substring($projectRoot.Length).TrimStart("\", "/")
    $segments = $relative -split "[\\/]"
    return $segments | Where-Object { $excludedDirectoryNames -contains $_ }
}

Push-Location $projectRoot

try {
    Write-Step "Running production build and TypeScript validation..."
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "Production build failed. Release ZIP was not created."
    }

    Write-Step "Scanning source files for high-risk secrets..."
    $secretPatterns = @(
        "sb_secret_[A-Za-z0-9_-]+",
        "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "(?i)SUPABASE_(SERVICE_ROLE|SECRET)_KEY\s*=\s*\S+",
        "(?i)postgres(?:ql)?://[^:\s]+:[^@\s]+@"
    )

    $scanExtensions = @(
        ".bat", ".css", ".html", ".js", ".json", ".md", ".mjs",
        ".ps1", ".py", ".sql", ".ts", ".tsx", ".vue", ".yml", ".yaml"
    )

    $scanFiles = Get-ChildItem -Path $projectRoot -Recurse -Force -File | Where-Object {
        -not (Test-ExcludedPath $_.FullName) -and
        $scanExtensions -contains $_.Extension.ToLowerInvariant()
    }

    foreach ($pattern in $secretPatterns) {
        $match = $scanFiles | Select-String -Pattern $pattern -List | Select-Object -First 1
        if ($match) {
            $relativePath = $match.Path.Substring($projectRoot.Length).TrimStart("\", "/")
            throw "Potential secret detected in $relativePath. Release ZIP was not created."
        }
    }

    Write-Step "Creating isolated clean release workspace..."
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    Get-ChildItem -Path $projectRoot -Force | Where-Object {
        $excludedRootNames -notcontains $_.Name -and
        $_.Name -notlike "*.zip"
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $tempRoot -Recurse -Force
    }

    Get-ChildItem -Path $tempRoot -Recurse -Force -Directory | Where-Object {
        $excludedDirectoryNames -contains $_.Name
    } | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
        if (Test-Path $_.FullName) {
            Remove-Item $_.FullName -Recurse -Force
        }
    }

    Get-ChildItem -Path $tempRoot -Recurse -Force -File | Where-Object {
        $_.Name -like "*.pyc" -or
        $_.Name -like "*.tsbuildinfo" -or
        $_.Name -like "*.log" -or
        $_.Name -eq ".DS_Store" -or
        $_.Name -eq "Thumbs.db" -or
        ($_.Name -like ".env*" -and $_.Name -ne ".env.example")
    } | Remove-Item -Force

    Write-Step "Compressing verified release package..."
    if (Test-Path $releasePath) {
        Remove-Item $releasePath -Force
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $tempRoot,
        $releasePath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    Write-Step "Verifying release archive boundaries..."
    $archive = [System.IO.Compression.ZipFile]::OpenRead($releasePath)
    try {
        $forbiddenEntry = $archive.Entries | Where-Object {
            $name = $_.FullName.Replace("\", "/")
            $name -match "(^|/)(\.git|\.venv|__pycache__|node_modules|dist)(/|$)" -or
            $name -match "\.pyc$" -or
            $name -match "\.tsbuildinfo$" -or
            ($name -match "(^|/)\.env(?:\..+)?$" -and $name -notmatch "(^|/)\.env\.example$")
        } | Select-Object -First 1

        if ($forbiddenEntry) {
            throw "Forbidden release entry detected: $($forbiddenEntry.FullName)"
        }
    }
    finally {
        $archive.Dispose()
    }

    $sizeMb = (Get-Item $releasePath).Length / 1MB
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host " Freedom OS verified release package is ready" -ForegroundColor Green
    Write-Host (" File : " + $releasePath)
    Write-Host (" Size : {0:N2} MB" -f $sizeMb)
    Write-Host " Build + secret scan + archive check: PASSED" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host ("RELEASE BLOCKED: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
    if (Test-Path $tempRoot) {
        Remove-Item $tempRoot -Recurse -Force
    }
}
