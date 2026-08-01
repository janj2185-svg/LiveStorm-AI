#!/usr/bin/env python3
"""Phase 3 verify without API keys / MediaMTX — fail-closed honesty checks."""

from __future__ import annotations

import sys

import httpx

BASE = "http://127.0.0.1:8000/v1"
FAIL = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global FAIL
    mark = "✔" if ok else "✖"
    print(f"{mark} {name}" + (f" — {detail}" if detail else ""))
    if not ok:
        FAIL = 1


def main() -> int:
    print("=== SYLORA verify_phase3_nokeys ===")
    try:
        with httpx.Client(timeout=30.0) as client:
            live = client.get("http://127.0.0.1:8000/health/live")
            ready = client.get("http://127.0.0.1:8000/health/ready")
            check("API live", live.status_code == 200)
            check("API ready", ready.status_code == 200)
            if live.status_code != 200:
                return 1

            diag = client.get(f"{BASE}/diagnostics")
            check("Diagnostics", diag.status_code == 200)
            missing = (diag.json().get("missing_providers") or []) if diag.status_code == 200 else []
            configured = (
                (diag.json().get("configured_providers") or []) if diag.status_code == 200 else []
            )
            # openai_api_key may be present after owner wires a key — either state is honest
            openai_honest = ("openai_api_key" in missing) or ("openai_api_key" in configured)
            check(
                "openai_api_key listed in diagnostics",
                openai_honest,
                f"missing={missing} configured={configured}",
            )
            check(
                "mediamtx_control listed missing",
                "mediamtx_control" in missing,
                str(missing),
            )
            pay = (diag.json() or {}).get("payment_provider") if diag.status_code == 200 else None
            if pay:
                check(
                    "Payment still fail-closed",
                    pay.get("ok") is False,
                    str(pay),
                )

            login = client.post(
                f"{BASE}/auth/login",
                json={"email": "owner@sylora.dev", "password": "OwnerTest!2026Local"},
            )
            check("Owner login", login.status_code == 200, f"HTTP {login.status_code}")
            if login.status_code != 200:
                return 1
            headers = {
                "Authorization": f"Bearer {login.json()['tokens']['access_token']}"
            }

            # Live session may create without MediaMTX but must not claim ingest ready
            created = client.post(
                f"{BASE}/live/sessions",
                headers=headers,
                json={"title": "Owner Phase3 no-keys probe", "ai_mode": "off"},
            )
            check(
                "Live session create",
                created.status_code in (200, 201),
                f"HTTP {created.status_code} {created.text[:180]}",
            )
            if created.status_code in (200, 201):
                body = created.json()
                provisioned = body.get("ingest_provisioned")
                check(
                    "Ingest not provisioned without MediaMTX",
                    provisioned is False,
                    f"ingest_provisioned={provisioned}",
                )
                session_id = body.get("id")
                if session_id:
                    pre = client.post(
                        f"{BASE}/live/sessions/{session_id}/preflight",
                        headers=headers,
                    )
                    check(
                        "Live preflight reachable",
                        pre.status_code == 200,
                        f"HTTP {pre.status_code}",
                    )
                    if pre.status_code == 200:
                        ready_flag = pre.json().get("ready")
                        check(
                            "Live preflight not ready without MediaMTX",
                            ready_flag is False,
                            str(pre.json())[:240],
                        )

            # AI: grant consent then message — fail-closed if no provider, or live if configured
            settings = client.patch(
                f"{BASE}/ai/settings",
                headers=headers,
                json={"consent_granted": True},
            )
            check(
                "AI consent patch",
                settings.status_code == 200,
                f"HTTP {settings.status_code} {settings.text[:160]}",
            )
            if settings.status_code == 200:
                conv = client.post(
                    f"{BASE}/ai/conversations",
                    headers=headers,
                    json={"title": "Phase3 no-keys", "mode": "copilot"},
                )
                check(
                    "AI conversation create",
                    conv.status_code == 201,
                    f"HTTP {conv.status_code} {conv.text[:160]}",
                )
                if conv.status_code == 201:
                    cid = conv.json()["id"]
                    msg = client.post(
                        f"{BASE}/ai/conversations/{cid}/messages",
                        headers=headers,
                        json={"content": "Ping without provider."},
                    )
                    code = None
                    try:
                        code = msg.json().get("code")
                    except Exception:
                        code = None
                    ok = msg.status_code in (200, 201) or (
                        msg.status_code == 503
                        and code
                        in {
                            "ai_provider_unavailable",
                            "provider_temporarily_unavailable",
                            "provider_request_rejected",
                        }
                    )
                    check(
                        "AI message live or honest fail-closed",
                        ok,
                        f"HTTP {msg.status_code} code={code}",
                    )

    except Exception as exc:
        check("Exception-free run", False, str(exc))

    print("")
    if FAIL:
        print("PHASE3 NO-KEYS VERIFY FAILED")
        return 1
    print("PHASE3 NO-KEYS VERIFY OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
