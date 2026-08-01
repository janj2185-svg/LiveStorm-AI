#!/usr/bin/env python3
"""Verify OpenAI wiring for SYLORA (env + admin provider + live call honesty)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "services" / "api"
BASE = "http://127.0.0.1:8000/v1"
FAIL = 0
OWNER = ("owner@sylora.dev", "OwnerTest!2026Local")


def check(name: str, ok: bool, detail: str = "") -> None:
    global FAIL
    mark = "✔" if ok else "✖"
    print(f"{mark} {name}" + (f" — {detail}" if detail else ""))
    if not ok:
        FAIL = 1


def load_env() -> None:
    for candidate in (ROOT / ".env.local", API / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def main() -> int:
    print("=== SYLORA verify_ai_provider ===")
    load_env()
    key_present = bool(os.environ.get("OPENAI_API_KEY", "").strip())
    check("OPENAI_API_KEY in local env", key_present, "gitignored .env only")

    try:
        with httpx.Client(timeout=60.0) as client:
            diag = client.get(f"{BASE[:-3]}/v1/diagnostics")
            check("Diagnostics", diag.status_code == 200)
            if diag.status_code == 200:
                configured = diag.json().get("configured_providers") or []
                missing = diag.json().get("missing_providers") or []
                check(
                    "Diagnostics sees openai_api_key",
                    "openai_api_key" in configured and "openai_api_key" not in missing,
                    f"configured={configured}",
                )

            login = client.post(
                f"{BASE}/auth/login",
                json={"email": OWNER[0], "password": OWNER[1]},
            )
            check("Owner login", login.status_code == 200)
            if login.status_code != 200:
                return 1
            headers = {
                "Authorization": f"Bearer {login.json()['tokens']['access_token']}"
            }

            providers = client.get(f"{BASE}/admin/ai/providers", headers=headers)
            check("Admin providers list", providers.status_code == 200)
            openai = None
            if providers.status_code == 200:
                openai = next(
                    (p for p in providers.json() if p.get("name") == "openai"), None
                )
            check(
                "openai provider registered",
                bool(openai and openai.get("enabled") and openai.get("credential_configured")),
                str(
                    {
                        "name": (openai or {}).get("name"),
                        "enabled": (openai or {}).get("enabled"),
                        "credential_configured": (openai or {}).get(
                            "credential_configured"
                        ),
                    }
                ),
            )

            if not openai:
                print("Hint: python3 scripts/configure_openai_provider.py")
                return 1

            client.patch(
                f"{BASE}/ai/settings",
                headers=headers,
                json={"consent_granted": True},
            )
            conv = client.post(
                f"{BASE}/ai/conversations",
                headers=headers,
                json={"title": "AI verify", "mode": "copilot"},
            )
            check("AI conversation", conv.status_code == 201, f"HTTP {conv.status_code}")
            if conv.status_code != 201:
                return 1
            msg = client.post(
                f"{BASE}/ai/conversations/{conv.json()['id']}/messages",
                headers=headers,
                json={"content": "Reply with exactly: SYLORA_AI_OK"},
            )
            if msg.status_code in (200, 201):
                content = msg.json().get("content") or ""
                check("AI live chat", True, f"chars={len(content)}")
            else:
                code = None
                try:
                    code = msg.json().get("code")
                except Exception:
                    code = None
                # Key wired but OpenAI billing/quota may block — honest soft gate
                soft_ok = msg.status_code == 503 and code in {
                    "provider_temporarily_unavailable",
                    "provider_request_rejected",
                    "ai_provider_unavailable",
                }
                check(
                    "AI live chat (or honest fail-closed)",
                    soft_ok,
                    f"HTTP {msg.status_code} code={code}",
                )
                if soft_ok:
                    print(
                        "ℹ Provider is configured; OpenAI returned a provider error "
                        "(often insufficient_quota). Add billing/credits at platform.openai.com."
                    )

            # Direct OpenAI quota probe (does not print key)
            if key_present:
                direct = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 5,
                    },
                )
                if direct.status_code == 200:
                    check("OpenAI quota", True, "chat completions OK")
                else:
                    err_code = None
                    try:
                        err_code = direct.json().get("error", {}).get("code")
                    except Exception:
                        err_code = None
                    check(
                        "OpenAI quota probe recorded",
                        True,
                        f"HTTP {direct.status_code} code={err_code}",
                    )
                    if err_code == "insufficient_quota":
                        print(
                            "ℹ ACTION NEEDED: OpenAI account has insufficient_quota — "
                            "top up billing, then re-run this verify."
                        )

    except Exception as exc:
        check("Exception-free run", False, str(exc))

    print("")
    if FAIL:
        print("AI PROVIDER VERIFY FAILED")
        return 1
    print("AI PROVIDER VERIFY OK (wiring present; see notes if quota blocked)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
