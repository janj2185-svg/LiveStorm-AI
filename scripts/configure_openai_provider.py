#!/usr/bin/env python3
"""Register OpenAI-compatible provider from OPENAI_API_KEY (local/dev only).

Does not print the key. Idempotent: updates existing `openai` provider if present.
Requires API running + owner admin account.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "services" / "api"
BASE = os.environ.get("SYLORA_API_BASE", "http://127.0.0.1:8000").rstrip("/") + "/v1"
OWNER = ("owner@sylora.dev", "OwnerTest!2026Local")


def _load_env() -> None:
    for candidate in (ROOT / ".env.local", API / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            # Prefer file values for secrets / JSON lists over mangled shell env
            os.environ[key] = value


def main() -> int:
    _load_env()
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        print("OPENAI_API_KEY missing in services/api/.env or .env.local")
        return 1
    if key.startswith("sk-") is False:
        print("OPENAI_API_KEY does not look like an OpenAI secret key")
        return 1

    payload = {
        "name": "openai",
        "base_url": "https://api.openai.com/v1",
        "api_credential": key,
        "enabled": True,
        "capabilities": ["chat", "embeddings", "moderation"],
        "model_mapping": {
            "chat": "gpt-4o-mini",
            "embeddings": "text-embedding-3-small",
            "moderation": "omni-moderation-latest",
        },
        "pricing_config": {},
    }

    with httpx.Client(timeout=60.0) as client:
        live = client.get(f"{BASE[:-3]}/health/live")
        if live.status_code != 200:
            print("API not live — start with ./start-local.sh --host")
            return 1

        login = client.post(
            f"{BASE}/auth/login",
            json={"email": OWNER[0], "password": OWNER[1]},
        )
        if login.status_code != 200:
            print(f"owner login failed HTTP {login.status_code}")
            return 1
        headers = {"Authorization": f"Bearer {login.json()['tokens']['access_token']}"}

        listed = client.get(f"{BASE}/admin/ai/providers", headers=headers)
        if listed.status_code != 200:
            print(f"list providers HTTP {listed.status_code}: {listed.text[:200]}")
            return 1
        existing = next((p for p in listed.json() if p.get("name") == "openai"), None)

        if existing is None:
            created = client.post(
                f"{BASE}/admin/ai/providers",
                headers=headers,
                json=payload,
            )
            print(f"create provider HTTP {created.status_code}")
            if created.status_code not in (200, 201):
                print(created.text[:400])
                return 1
            provider_id = created.json()["id"]
        else:
            provider_id = existing["id"]
            patched = client.patch(
                f"{BASE}/admin/ai/providers/{provider_id}",
                headers=headers,
                json={
                    "base_url": payload["base_url"],
                    "api_credential": key,
                    "enabled": True,
                    "capabilities": payload["capabilities"],
                    "model_mapping": payload["model_mapping"],
                },
            )
            print(f"update provider HTTP {patched.status_code}")
            if patched.status_code not in (200, 201):
                print(patched.text[:400])
                return 1

        # Smoke: consent + conversation + message (real provider)
        settings = client.patch(
            f"{BASE}/ai/settings",
            headers=headers,
            json={"consent_granted": True},
        )
        if settings.status_code != 200:
            print(f"AI consent HTTP {settings.status_code}")
            return 1
        conv = client.post(
            f"{BASE}/ai/conversations",
            headers=headers,
            json={"title": "OpenAI smoke", "mode": "copilot"},
        )
        if conv.status_code != 201:
            print(f"conversation HTTP {conv.status_code}: {conv.text[:300]}")
            return 1
        cid = conv.json()["id"]
        msg = client.post(
            f"{BASE}/ai/conversations/{cid}/messages",
            headers=headers,
            json={"content": "Reply with exactly: SYLORA_AI_OK"},
        )
        print(f"AI message HTTP {msg.status_code}")
        if msg.status_code in (200, 201):
            body = msg.json()
            content = str(body.get("content") or "")
            print(f"AI reply chars={len(content)} preview={content[:120]!r}")
            print("OpenAI provider configured and chat smoke passed.")
            print(f"provider_id={provider_id} (credential not printed)")
            return 0

        code = None
        try:
            code = msg.json().get("code")
        except Exception:
            code = None
        print(msg.text[:500])
        # Provider registered; OpenAI may still reject for quota/billing.
        if msg.status_code == 503:
            print(
                "Provider saved, but live chat failed (often OpenAI insufficient_quota). "
                "Add billing/credits, then re-run this script / ./verify-ai.sh"
            )
            print(f"provider_id={provider_id} code={code} (credential not printed)")
            return 0
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
