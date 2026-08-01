#!/usr/bin/env python3
"""Verify MediaMTX + live ingest for SYLORA host mode."""

from __future__ import annotations

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
    print("=== SYLORA verify_live_mediamtx ===")
    mtx_env = ROOT / ".sylora-local" / "mediamtx.env"
    check("mediamtx.env present", mtx_env.is_file(), str(mtx_env))
    creds: dict[str, str] = {}
    if mtx_env.is_file():
        for line in mtx_env.read_text(encoding="utf-8").splitlines():
            if "=" in line:
                k, _, v = line.partition("=")
                creds[k] = v

    try:
        with httpx.Client(timeout=30.0) as client:
            if creds.get("MTX_AUTHINTERNALUSERS_2_USER"):
                r = client.get(
                    "http://127.0.0.1:9997/v3/config/global/get",
                    auth=(
                        creds["MTX_AUTHINTERNALUSERS_2_USER"],
                        creds["MTX_AUTHINTERNALUSERS_2_PASS"],
                    ),
                )
                check("MediaMTX control API", r.status_code == 200, f"HTTP {r.status_code}")
            else:
                check("MediaMTX control API", False, "missing API user in mediamtx.env")

            diag = client.get(f"{BASE}/diagnostics")
            check("Diagnostics", diag.status_code == 200)
            if diag.status_code == 200:
                configured = diag.json().get("configured_providers") or []
                check(
                    "Diagnostics mediamtx_control",
                    "mediamtx_control" in configured,
                    str(configured),
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
            created = client.post(
                f"{BASE}/live/sessions",
                headers=headers,
                json={"title": "verify_live_mediamtx", "ai_mode": "off"},
            )
            check(
                "Live session create",
                created.status_code in (200, 201),
                f"HTTP {created.status_code}",
            )
            if created.status_code not in (200, 201):
                print(created.text[:300])
                return 1
            body = created.json()
            check(
                "ingest_provisioned",
                body.get("ingest_provisioned") is True,
                f"path={body.get('ingest_path')}",
            )
            pre = client.post(
                f"{BASE}/live/sessions/{body['id']}/preflight",
                headers=headers,
            )
            check("preflight HTTP", pre.status_code == 200)
            if pre.status_code == 200:
                check("preflight ready", pre.json().get("ready") is True, str(pre.json())[:220])

            if body.get("ingest_path") and creds.get("MTX_AUTHINTERNALUSERS_0_USER"):
                print(
                    "OBS/ffmpeg hint: rtmp://127.0.0.1:1935/"
                    f"{body['ingest_path']}?user=<publish_user>&pass=<publish_pass>"
                )
                print("Publish credentials: .sylora-local/mediamtx.env (MTX_AUTHINTERNALUSERS_0_*)")

    except Exception as exc:
        check("Exception-free run", False, str(exc))

    print("")
    if FAIL:
        print("LIVE MEDIAMTX VERIFY FAILED")
        print("Hint: ./scripts/start-mediamtx-local.sh && restart API")
        return 1
    print("LIVE MEDIAMTX VERIFY OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
