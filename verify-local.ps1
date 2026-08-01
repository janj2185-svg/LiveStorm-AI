# SYLORA verify local (Windows PowerShell)
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
$Fail = 0
function Check($Name, $Script) {
  try {
    & $Script | Out-Null
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "fail" }
    Write-Host "✔ $Name"
  } catch {
    Write-Host "✖ $Name"
    $script:Fail = 1
  }
}
Write-Host "=== SYLORA verify-local ==="
Write-Host "Branch $(git branch --show-current)  Commit $(git rev-parse HEAD)"
Check "API live" { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health/live }
Check "API ready" { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health/ready }
Check "Diagnostics" { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/v1/diagnostics }
Check "Gallery" { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/ }
if ($Fail -eq 0) { Write-Host "VERIFY OK"; exit 0 } else { Write-Host "VERIFY FAILED"; exit 1 }
