# SYLORA stop local (Windows PowerShell)
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if ((Get-Command docker -ErrorAction SilentlyContinue) -and (Test-Path "infrastructure\.env")) {
  docker compose --env-file infrastructure/.env -f docker-compose.yml down 2>$null
}

foreach ($name in @("api","vite","celery")) {
  $pf = ".sylora-local\$name.pid"
  if (Test-Path $pf) {
    $pid = Get-Content $pf
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Remove-Item $pf -Force
    Write-Host "Stopped $name ($pid)"
  }
}
Get-Process -Name "uvicorn","node" -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -like "*sylora*" -or $_.CommandLine -like "*vite*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Stopped."
