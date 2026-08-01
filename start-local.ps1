# SYLORA start local (Windows PowerShell)
param(
  [switch]$HostMode
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
New-Item -ItemType Directory -Force -Path ".sylora-local\logs" | Out-Null

if (-not $HostMode -and (Get-Command docker -ErrorAction SilentlyContinue) -and (Test-Path "infrastructure\.env")) {
  docker compose --env-file infrastructure/.env -f docker-compose.yml up --build -d
  Write-Host "Compose started. Gallery: start separately with pnpm dev if needed."
  Write-Host "API http://127.0.0.1:8000/docs"
  exit 0
}

if (-not (Test-Path "services\api\.env")) { & "$Root\setup-local.ps1" -HostMode }

Push-Location services\api
& .\.venv\Scripts\alembic.exe upgrade head
Pop-Location
& "services\api\.venv\Scripts\python.exe" scripts\seed_owner_accounts.py

$api = Start-Process -PassThru -WindowStyle Hidden -FilePath "services\api\.venv\Scripts\uvicorn.exe" `
  -ArgumentList "app.main:app","--host","0.0.0.0","--port","8000" `
  -RedirectStandardOutput ".sylora-local\logs\api.log" `
  -RedirectStandardError ".sylora-local\logs\api.err"
$api.Id | Out-File ".sylora-local\api.pid"

$vite = Start-Process -PassThru -WindowStyle Hidden -FilePath "pnpm" `
  -ArgumentList "dev" `
  -RedirectStandardOutput ".sylora-local\logs\vite.log" `
  -RedirectStandardError ".sylora-local\logs\vite.err"
$vite.Id | Out-File ".sylora-local\vite.pid"

Write-Host "API pid $($api.Id)  Vite pid $($vite.Id)"
Write-Host "Gallery http://127.0.0.1:5173"
Write-Host "Diagnostics http://127.0.0.1:5173/#/diagnostics"
Write-Host "API docs http://127.0.0.1:8000/docs"
