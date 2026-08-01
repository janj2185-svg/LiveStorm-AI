#!/usr/bin/env python3
"""Verify Flutter mobile integration readiness against local SYLORA API.

Does not require Flutter SDK. Checks API paths the mobile client uses,
ALLOWED_HOSTS for emulator, and repo wiring (scripts/manifests/config).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8000/v1"
FAIL = 0
OWNER = ("owner@sylora.dev", "OwnerTest!2026Local")


def check(name: str, ok: bool, detail: str = "") -> None:
    global FAIL
    mark = "✔" if ok else "✖"
    print(f"{mark} {name}" + (f" — {detail}" if detail else ""))
    if not ok:
        FAIL = 1


def main() -> int:
    print("=== SYLORA verify_flutter_integration ===")

    # Repo wiring
    check(
        "Flutter app tree",
        (ROOT / "apps" / "sylora" / "lib" / "main.dart").is_file(),
    )
    run_sh = (ROOT / "scripts" / "run-flutter-local.sh").read_text(encoding="utf-8")
    check("Android emulator URL mapping", "10.0.2.2" in run_sh)
    check("Physical device LAN mapping", "SYLORA_LAN_IP" in run_sh or "device" in run_sh)
    config = (ROOT / "apps" / "sylora" / "lib" / "core" / "config.dart").read_text(
        encoding="utf-8"
    )
    check(
        "AppConfig local origin helpers",
        "localAndroidEmulatorOrigin" in config and "localDesktopOrigin" in config,
    )
    android_debug = (
        ROOT
        / "apps"
        / "sylora"
        / "android"
        / "app"
        / "src"
        / "debug"
        / "AndroidManifest.xml"
    ).read_text(encoding="utf-8")
    check("Android debug cleartext", "usesCleartextTraffic" in android_debug)
    ios_plist = (
        ROOT / "apps" / "sylora" / "ios" / "Runner" / "Info.plist"
    ).read_text(encoding="utf-8")
    check("iOS local networking ATS", "NSAllowsLocalNetworking" in ios_plist)
    check(
        "Flutter mobile integration doc",
        (ROOT / "docs" / "implementation" / "FLUTTER_MOBILE_INTEGRATION.md").is_file(),
    )

    # ALLOWED_HOSTS must include emulator host
    env_text = (ROOT / "services" / "api" / ".env").read_text(encoding="utf-8")
    hosts_line = next(
        (line for line in env_text.splitlines() if line.startswith("ALLOWED_HOSTS=")),
        "",
    )
    check(
        "ALLOWED_HOSTS includes 10.0.2.2",
        "10.0.2.2" in hosts_line,
        hosts_line or "missing",
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            live = client.get("http://127.0.0.1:8000/health/live")
            check("API live", live.status_code == 200)
            if live.status_code != 200:
                return 1

            # Host header as Android emulator would send
            emu = client.get(
                "http://127.0.0.1:8000/health/live",
                headers={"Host": "10.0.2.2:8000"},
            )
            check(
                "TrustedHost allows 10.0.2.2",
                emu.status_code == 200,
                f"HTTP {emu.status_code}",
            )

            login = client.post(
                f"{BASE}/auth/login",
                json={
                    "email": OWNER[0],
                    "password": OWNER[1],
                    "device_label": "flutter-integration-verify",
                },
            )
            check("Flutter-style login", login.status_code == 200, f"HTTP {login.status_code}")
            if login.status_code != 200:
                return 1
            headers = {
                "Authorization": f"Bearer {login.json()['tokens']['access_token']}"
            }

            for name, method, path, body in [
                ("auth/me", "GET", "/auth/me", None),
                ("profile", "GET", "/profile", None),
                ("social/feed", "GET", "/social/feed", None),
                ("wallet/balance", "GET", "/wallet/balance", None),
                ("messages/conversations", "GET", "/messages/conversations", None),
            ]:
                if method == "GET":
                    r = client.get(f"{BASE}{path}", headers=headers)
                else:
                    r = client.post(f"{BASE}{path}", headers=headers, json=body)
                check(f"Client path {name}", r.status_code == 200, f"HTTP {r.status_code}")

            created = client.post(
                f"{BASE}/live/sessions",
                headers=headers,
                json={"title": "Flutter integration live", "ai_mode": "off"},
            )
            check(
                "live/sessions create",
                created.status_code in (200, 201),
                f"HTTP {created.status_code}",
            )

            # Payment fail-closed (Stripe skipped)
            topup = client.post(
                f"{BASE}/wallet/topups",
                headers={**headers, "Idempotency-Key": "flutter-verify-skip-stripe"},
                json={
                    "amount_minor": 1000,
                    "settlement_currency": "USD",
                    "return_url": "https://app.example.test/wallet",
                },
            )
            code = None
            try:
                code = topup.json().get("code")
            except Exception:
                code = None
            check(
                "Top-up fail-closed (no Stripe)",
                topup.status_code == 503
                and code
                in {"payment_provider_unavailable", "provider_not_configured"},
                f"HTTP {topup.status_code} code={code}",
            )

            diag = client.get(f"{BASE}/diagnostics")
            if diag.status_code == 200:
                print(
                    "diagnostics providers:",
                    json.dumps(
                        {
                            "configured": diag.json().get("configured_providers"),
                            "payment": diag.json().get("payment_provider"),
                        }
                    ),
                )

    except Exception as exc:
        check("Exception-free run", False, str(exc))

    print("")
    if FAIL:
        print("FLUTTER INTEGRATION VERIFY FAILED")
        print("Hint: ./start-local.sh --host && python3 scripts/seed_product_demo.py")
        return 1
    print("FLUTTER INTEGRATION VERIFY OK")
    print("On a machine with Flutter SDK: ./scripts/run-flutter-local.sh android|ios|chrome")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
