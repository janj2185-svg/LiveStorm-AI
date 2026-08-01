#!/usr/bin/env python3
"""Verify core SYLORA product loops for owner testing (not gift AAA quality)."""

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
    print("=== SYLORA verify_product_loop ===")
    try:
        with httpx.Client(timeout=20.0) as client:
            live = client.get("http://127.0.0.1:8000/health/live")
            ready = client.get("http://127.0.0.1:8000/health/ready")
            check("API live", live.status_code == 200)
            check("API ready", ready.status_code == 200)

            login = client.post(
                f"{BASE}/auth/login",
                json={"email": "owner@sylora.dev", "password": "OwnerTest!2026Local"},
            )
            check("Owner login", login.status_code == 200, f"HTTP {login.status_code}")
            if login.status_code != 200:
                return 1
            token = login.json()["tokens"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            me = client.get(f"{BASE}/auth/me", headers=headers)
            check("Owner /auth/me", me.status_code == 200)
            # /auth/me returns UserResponse (no handle); handle lives on /profile
            profile = client.get(f"{BASE}/profile", headers=headers)
            check("Owner /profile", profile.status_code == 200)
            handle = profile.json().get("handle") if profile.status_code == 200 else None
            check("Owner has handle", bool(handle), str(handle))

            bal = client.get(f"{BASE}/wallet/balance", headers=headers)
            check("Wallet balance", bal.status_code == 200, f"HTTP {bal.status_code}")
            spendable = 0
            if bal.status_code == 200:
                spendable = int(bal.json().get("spendable_minor") or 0)
            check("Wallet funded (>0)", spendable > 0, f"spendable_minor={spendable}")

            # Feed / posts — try common list endpoints
            feed_ok = False
            feed_detail = ""
            for path in (
                "/social/feed",
                "/social/posts",
                "/social/timeline",
            ):
                r = client.get(f"{BASE}{path}", headers=headers)
                if r.status_code == 200:
                    feed_ok = True
                    data = r.json()
                    count = len(data) if isinstance(data, list) else len(data.get("items") or data.get("posts") or [])
                    feed_detail = f"{path} count≈{count}"
                    break
                feed_detail = f"last {path} HTTP {r.status_code}"
            check("Social feed/posts readable", feed_ok, feed_detail)

            # User login + balance
            user_login = client.post(
                f"{BASE}/auth/login",
                json={"email": "user@sylora.dev", "password": "UserTest!2026Local"},
            )
            check("User login", user_login.status_code == 200)
            if user_login.status_code == 200:
                uh = {"Authorization": f"Bearer {user_login.json()['tokens']['access_token']}"}
                ub = client.get(f"{BASE}/wallet/balance", headers=uh)
                check("User wallet", ub.status_code == 200 and int(ub.json().get("spendable_minor") or 0) > 0)

            # Conversations list
            if user_login.status_code == 200:
                uh = {"Authorization": f"Bearer {user_login.json()['tokens']['access_token']}"}
                conv = client.get(f"{BASE}/messages/conversations", headers=uh)
                check(
                    "Messaging conversations list",
                    conv.status_code == 200,
                    f"HTTP {conv.status_code}",
                )

            diag = client.get(f"{BASE}/diagnostics")
            check("Diagnostics", diag.status_code == 200)
            if diag.status_code == 200:
                gifts = diag.json().get("gift_library") or {}
                check("Honest gifts READY=0", int(gifts.get("ready") or 0) == 0, str(gifts))

            # Payment still fail-closed
            pay = diag.json().get("payment_provider") if diag.status_code == 200 else None
            if pay:
                check(
                    "Payment not faking success",
                    pay.get("ok") is False or "not configured" in str(pay.get("detail", "")).lower(),
                    str(pay),
                )

    except Exception as exc:
        check("Exception-free run", False, str(exc))

    print("")
    if FAIL:
        print("PRODUCT LOOP VERIFY FAILED")
        print("Hint: python3 scripts/seed_owner_accounts.py && python3 scripts/seed_product_demo.py")
        return 1
    print("PRODUCT LOOP VERIFY OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
