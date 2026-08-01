#!/usr/bin/env pwsh
# SYLORA — run Flutter client against local API (owner machine needs Flutter SDK)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ApiBase = if ($env:SYLORA_API_BASE_URL) { $env:SYLORA_API_BASE_URL } else { "http://127.0.0.1:8000" }
$Device = if ($args.Count -ge 1) { $args[0] } else { "chrome" }

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Write-Host "Flutter SDK not found on PATH."
  Write-Host "Install Flutter 3.44+ then re-run: .\scripts\run-flutter-local.ps1 [chrome|windows|android]"
  Write-Host "API expected at: $ApiBase"
  exit 1
}

try {
  Invoke-WebRequest -Uri "$ApiBase/health/live" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  Write-Host "API not reachable at $ApiBase — start with: .\start-local.ps1 -HostMode"
  exit 1
}

Set-Location "$Root\apps\sylora"
Write-Host "Running SYLORA Flutter → $ApiBase (device=$Device)"
flutter run -d $Device --dart-define="SYLORA_API_BASE_URL=$ApiBase"
