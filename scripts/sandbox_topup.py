#!/usr/bin/env python3
"""Sandbox top-up for local owner testing (NOT real payments).

Uses admin ledger issuance. Real POST /v1/wallet/topups stays fail-closed
until a payment provider is configured.
"""

from __future__ import annotations

import argparse
import sys

import httpx

BASE = "http://127.0.0.1:8000/v1"
OWNER = ("owner@sylora.dev", "OwnerTest!2026Local")


def main() -> int:
    parser = argparse.ArgumentParser(description="Local sandbox credit top-up via admin issuance")
    parser.add_argument("--email", required=True, help="Target account email")
    parser.add_argument("--amount", type=int, default=10_000, help="Amount in minor units (credits)")
    parser.add_argument("--api", default="http://127.0.0.1:8000", help="API origin")
    args = parser.parse_args()
    if args.amount <= 0:
        print("amount must be > 0")
        return 2

    base = args.api.rstrip("/") + "/v1"
    with httpx.Client(timeout=20.0) as client:
        live = client.get(f"{args.api.rstrip('/')}/health/live")
        if live.status_code != 200:
            print("API not live — ./start-local.sh --host")
            return 1

        login = client.post(f"{base}/auth/login", json={"email": OWNER[0], "password": OWNER[1]})
        login.raise_for_status()
        owner_headers = {
            "Authorization": f"Bearer {login.json()['tokens']['access_token']}",
        }

        # Resolve target user_id via owner login as target if possible, else admin path
        target_login = client.post(
            f"{base}/auth/login",
            json={"email": args.email, "password": _guess_password(args.email)},
        )
        if target_login.status_code != 200:
            print(
                f"Cannot login as {args.email}. Use seeded passwords from OWNER_TESTING_GUIDE.md "
                "or pass an account that already exists."
            )
            print(f"HTTP {target_login.status_code}: {target_login.text[:200]}")
            return 1
        user_id = target_login.json().get("user", {}).get("id")
        if not user_id:
            me = client.get(
                f"{base}/auth/me",
                headers={"Authorization": f"Bearer {target_login.json()['tokens']['access_token']}"},
            )
            me.raise_for_status()
            user_id = me.json()["id"]

        key = f"sandbox-topup-{args.email.replace('@', '-').replace('.', '-')}-{args.amount}"
        r = client.post(
            f"{base}/admin/ledger/issuance",
            headers={**owner_headers, "Idempotency-Key": key},
            json={
                "user_id": user_id,
                "amount_minor": args.amount,
                "reason": f"Sandbox top-up for {args.email} (local only)",
            },
        )
        print(f"issuance HTTP {r.status_code}")
        if r.status_code not in (200, 201):
            print(r.text[:400])
            return 1

        bal = client.get(
            f"{base}/wallet/balance",
            headers={"Authorization": f"Bearer {target_login.json()['tokens']['access_token']}"},
        )
        bal.raise_for_status()
        print(f"OK — spendable_minor={bal.json().get('spendable_minor')}")
        print("Note: real payment top-up remains Provider not configured.")
        return 0


def _guess_password(email: str) -> str:
    known = {
        "owner@sylora.dev": "OwnerTest!2026Local",
        "creator@sylora.dev": "CreatorTest!2026Local",
        "streamer@sylora.dev": "StreamerTest!2026Local",
        "user@sylora.dev": "UserTest!2026Local",
        "viewer@sylora.dev": "ViewerTest!2026Local",
    }
    return known.get(email, "")


if __name__ == "__main__":
    raise SystemExit(main())
