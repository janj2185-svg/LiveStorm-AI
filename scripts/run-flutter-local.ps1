#!/usr/bin/env pwsh
# SYLORA — run Flutter client against local API (owner machine needs Flutter SDK)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Device = if ($args.Count -ge 1) { $args[0] } else { "chrome" }

function Get-LanIp {
  if ($env:SYLORA_LAN_IP) { return $env:SYLORA_LAN_IP }
  $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Select-Object -ExpandProperty IPAddress
  if ($addrs) { return $addrs[0] }
  return $null
}

if ($env:SYLORA_API_BASE_URL) {
  $ApiBase = $env:SYLORA_API_BASE_URL
} else {
  switch -Regex ($Device) {
    '^(android|emulator)$' { $ApiBase = 'http://10.0.2.2:8000'; break }
    '^(ios|iphone|ipad)$' { $ApiBase = 'http://127.0.0.1:8000'; break }
    '^(device|lan|physical)$' {
      $lan = Get-LanIp
      if (-not $lan) {
        Write-Host "Could not detect LAN IP. Set SYLORA_LAN_IP or SYLORA_API_BASE_URL."
        exit 1
      }
      $ApiBase = "http://${lan}:8000"
      break
    }
    default { $ApiBase = 'http://127.0.0.1:8000' }
  }
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Write-Host "Flutter SDK not found on PATH."
  Write-Host "Install Flutter 3.44+ then re-run: .\scripts\run-flutter-local.ps1 [chrome|windows|android|ios|device]"
  Write-Host "API mapping for this target would be: $ApiBase"
  exit 1
}

$probe = if ($ApiBase -eq 'http://10.0.2.2:8000') { 'http://127.0.0.1:8000' } else { $ApiBase }
try {
  Invoke-WebRequest -Uri "$probe/health/live" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  Write-Host "API not reachable at $probe — start with: .\start-local.ps1 -HostMode"
  exit 1
}

Set-Location "$Root\apps\sylora"
Write-Host "Running SYLORA Flutter → $ApiBase (device=$Device)"
Write-Host "Seeded login: owner@sylora.dev / OwnerTest!2026Local"
flutter run -d $Device --dart-define="SYLORA_API_BASE_URL=$ApiBase"
