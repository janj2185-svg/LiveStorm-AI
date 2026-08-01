#!/usr/bin/env python3
"""Seed product demo data via the live SYLORA API (development only).

Prereq: API running + seed_owner_accounts.py already applied.
"""

from __future__ import annotations

import json
import sys
import uuid
from typing import Any

import httpx

BASE = "http://127.0.0.1:8000/v1"

ACCOUNTS = [
    ("owner@sylora.dev", "OwnerTest!2026Local", "sylora.owner"),
    ("creator@sylora.dev", "CreatorTest!2026Local", "sylora.creator"),
    ("streamer@sylora.dev", "StreamerTest!2026Local", "sylora.streamer"),
    ("user@sylora.dev", "UserTest!2026Local", "sylora.user"),
    ("viewer@sylora.dev", "ViewerTest!2026Local", "sylora.viewer"),
]

TOPUPS = {
    "owner@sylora.dev": 5_000_000,
    "creator@sylora.dev": 250_000,
    "streamer@sylora.dev": 100_000,
    "user@sylora.dev": 50_000,
    "viewer@sylora.dev": 10_000,
}


def login(client: httpx.Client, email: str, password: str) -> dict[str, Any]:
    r = client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    data = r.json()
    tokens = data.get("tokens") or {}
    if not tokens.get("access_token"):
        raise RuntimeError(f"login failed for {email}: {data}")
    return tokens


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    try:
        with httpx.Client(timeout=30.0) as client:
            live = client.get("http://127.0.0.1:8000/health/live")
            live.raise_for_status()
    except Exception as exc:
        print(f"API not reachable: {exc}")
        print("Start with: ./start-local.sh --host")
        return 1

    sessions: dict[str, dict[str, Any]] = {}
    with httpx.Client(timeout=30.0) as client:
        for email, password, handle in ACCOUNTS:
            tokens = login(client, email, password)
            headers = auth_headers(tokens["access_token"])
            me = client.get(f"{BASE}/auth/me", headers=headers)
            me.raise_for_status()
            user = me.json()
            # set handle
            patch = client.patch(
                f"{BASE}/profile",
                headers=headers,
                json={"handle": handle, "display_name": handle.replace(".", " ").title()},
            )
            if patch.status_code not in (200, 204):
                # some deployments return 200 with body
                print(f"profile {email}: HTTP {patch.status_code} {patch.text[:200]}")
            else:
                print(f"handle {email} -> @{handle}")
            sessions[email] = {
                "token": tokens["access_token"],
                "headers": headers,
                "user_id": user.get("id") or user.get("user", {}).get("id"),
                "handle": handle,
            }
            # refresh me for id if nested
            if not sessions[email]["user_id"]:
                me2 = client.get(f"{BASE}/auth/me", headers=headers).json()
                sessions[email]["user_id"] = me2.get("id") or me2.get("user", {}).get("id")

        owner = sessions["owner@sylora.dev"]
        # wallet top-ups
        for email, amount in TOPUPS.items():
            target = sessions[email]
            key = f"demo-seed-{email.replace('@', '-').replace('.', '-')}-{amount}"
            r = client.post(
                f"{BASE}/admin/ledger/issuance",
                headers={**owner["headers"], "Idempotency-Key": key},
                json={
                    "user_id": target["user_id"],
                    "amount_minor": amount,
                    "reason": f"Owner demo seed top-up for {email}",
                },
            )
            print(f"issuance {email}: HTTP {r.status_code}")
            if r.status_code not in (200, 201):
                print(r.text[:300])

        # follows
        follow_pairs = [
            ("user@sylora.dev", "sylora.creator"),
            ("user@sylora.dev", "sylora.streamer"),
            ("viewer@sylora.dev", "sylora.streamer"),
            ("creator@sylora.dev", "sylora.owner"),
            ("streamer@sylora.dev", "sylora.creator"),
        ]
        for src_email, handle in follow_pairs:
            src = sessions[src_email]
            r = client.post(f"{BASE}/social/follows/{handle}", headers=src["headers"])
            print(f"follow {src_email} -> @{handle}: HTTP {r.status_code}")

        # posts
        post_ids: list[str] = []
        for email, body in [
            ("creator@sylora.dev", "Welcome to SYLORA creator studio — demo post for owner testing."),
            ("streamer@sylora.dev", "Going live soon. Send gifts when the catalog is READY."),
            ("owner@sylora.dev", "Platform note: gift READY count is still 0 — PARTIAL only."),
        ]:
            s = sessions[email]
            r = client.post(
                f"{BASE}/social/posts",
                headers=s["headers"],
                json={
                    "kind": "text",
                    "body": body,
                    "lifecycle": "published",
                    "visibility": "public",
                },
            )
            print(f"post {email}: HTTP {r.status_code}")
            if r.status_code in (200, 201):
                post_ids.append(str(r.json().get("id")))

        # likes
        for post_id in post_ids:
            for email in ("user@sylora.dev", "viewer@sylora.dev"):
                s = sessions[email]
                r = client.put(
                    f"{BASE}/social/reactions/post/{post_id}",
                    headers=s["headers"],
                    json={"value": "like"},
                )
                print(f"like {email} -> {post_id[:8]}: HTTP {r.status_code}")

        # DM conversation user -> creator
        user = sessions["user@sylora.dev"]
        r = client.post(
            f"{BASE}/messages/conversations",
            headers=user["headers"],
            json={"recipient_handle": "sylora.creator"},
        )
        print(f"dm open: HTTP {r.status_code}")
        if r.status_code in (200, 201):
            conv_id = r.json().get("id")
            msg = client.post(
                f"{BASE}/messages/conversations/{conv_id}/messages",
                headers=user["headers"],
                json={"body": "Hey! Testing SYLORA messaging for owner QA."},
            )
            print(f"dm message: HTTP {msg.status_code}")

    print("Product demo seed finished.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
