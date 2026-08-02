$zip = "HY-Freedom-OS.zip"

if(Test-Path $zip){
    Remove-Item $zip -Force
}

git archive --format=zip HEAD -o $zip

$size = (Get-Item $zip).Length / 1MB

Write-Host ""
Write-Host "================================="
Write-Host "HY Freedom OS ZIP Created"
Write-Host "File : $zip"
Write-Host ("Size : {0:N2} MB" -f $size)
Write-Host "================================="