# SYLORA owner local setup (Windows PowerShell)
param(
  [switch]$HostMode
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "=== SYLORA setup-local.ps1 ==="
Write-Host "Repository: $Root"
Write-Host "Branch:     $(git branch --show-current)"
Write-Host "Commit:     $(git rev-parse --short HEAD)"

function New-SecretHex([int]$Bytes = 32) {
  $bytes = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

if (-not $HostMode -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  if (-not (Test-Path "infrastructure\.env")) {
    Copy-Item ".env.example" "infrastructure\.env"
  }
  Write-Host "Docker mode: ensure REPLACE_* values in infrastructure\.env are filled (or re-run from WSL ./setup-local.sh)."
  Write-Host "Next: .\start-local.ps1"
} else {
  if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.local.example" ".env.local"
  }
  Copy-Item ".env.local" "services\api\.env" -Force
  if (-not (Test-Path "services\api\.venv")) {
    python -m venv "services\api\.venv"
    & "services\api\.venv\Scripts\pip.exe" install -U pip
    & "services\api\.venv\Scripts\pip.exe" install -e "services\api\[test]"
  }
  if (-not (Test-Path "node_modules")) { pnpm install }
  Write-Host "Host mode ready. Next: .\start-local.ps1 -HostMode"
}
