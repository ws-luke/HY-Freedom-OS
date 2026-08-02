$zip = "HY-Freedom-OS.zip"
$temp = "__zip_temp__"

# 刪除舊檔
if (Test-Path $zip) {
    Remove-Item $zip -Force
}

# 刪除舊暫存
if (Test-Path $temp) {
    Remove-Item $temp -Recurse -Force
}

# 建立暫存資料夾
New-Item -ItemType Directory -Path $temp | Out-Null

Write-Host ""
Write-Host "Copying project..."

# 複製整個專案
Copy-Item * $temp -Recurse -Force

# 排除不需要的資料夾
$exclude = @(
    ".git",
    "node_modules",
    "dist",
    ".vite",
    ".idea"
)

foreach ($folder in $exclude) {
    $path = Join-Path $temp $folder
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
    }
}

Write-Host "Creating zip..."

Compress-Archive `
    -Path "$temp\*" `
    -DestinationPath $zip `
    -Force

Remove-Item $temp -Recurse -Force

$size = (Get-Item $zip).Length / 1MB

Write-Host ""
Write-Host "====================================="
Write-Host " HY Freedom OS ZIP Created"
Write-Host " File : $zip"
Write-Host (" Size : {0:N2} MB" -f $size)
Write-Host "====================================="