# SYLORA reset local (Windows PowerShell) — destructive
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
$confirm = Read-Host "Type RESET to destroy local Compose volumes / data"
if ($confirm -ne "RESET") { Write-Host "Aborted."; exit 1 }
& "$Root\stop-local.ps1"
if ((Get-Command docker -ErrorAction SilentlyContinue) -and (Test-Path "infrastructure\.env")) {
  docker compose --env-file infrastructure/.env -f docker-compose.yml down -v
}
Remove-Item -Recurse -Force ".sylora-local" -ErrorAction SilentlyContinue
Write-Host "Reset complete. Run .\setup-local.ps1 then .\start-local.ps1"
