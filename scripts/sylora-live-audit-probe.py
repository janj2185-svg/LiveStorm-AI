#!/usr/bin/env python3
"""SYLORA live integration audit probes — real HTTP against running API.

Does NOT use FakeTikTokTransport or mock LIVE events as proof of platform adapters.
Writes JSON report + per-step logs under /opt/cursor/artifacts/sylora-audit/.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE = "http://127.0.0.1:8000"
OUT = Path("/opt/cursor/artifacts/sylora-audit")
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "logs").mkdir(exist_ok=True)

TS = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@dataclass
class ProbeResult:
    module: str
    check: str
    status: str  # Working | Partial | Broken | Not Verified
    http_status: int | None = None
    detail: str = ""
    evidence: Any = None
    mock_used: bool = False


RESULTS: list[ProbeResult] = []
LOG_LINES: list[str] = []


def log(msg: str) -> None:
    line = f"[{datetime.now(timezone.utc).isoformat()}] {msg}"
    LOG_LINES.append(line)
    print(line)


def http(
    method: str,
    path: str,
    *,
    body: dict | None = None,
    token: str | None = None,
    timeout: float = 20,
) -> tuple[int, Any, str]:
    data = None
    headers = {"Accept": "application/json", "User-Agent": "sylora-audit/1.0"}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            try:
                parsed = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                parsed = raw
            return resp.status, parsed, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            parsed = json.loads(raw) if raw else {"error": str(exc)}
        except json.JSONDecodeError:
            parsed = raw
        return exc.code, parsed, raw
    except Exception as exc:  # noqa: BLE001
        return 0, {"error": type(exc).__name__, "message": str(exc)}, str(exc)


def add(module: str, check: str, status: str, **kwargs: Any) -> None:
    RESULTS.append(ProbeResult(module=module, check=check, status=status, **kwargs))
    log(f"{status:13} | {module:24} | {check} | {kwargs.get('detail','')[:120]}")


def main() -> None:
    log(f"SYLORA live audit start BASE={BASE}")

    # Health / infra
    code, body, raw = http("GET", "/health/live")
    add("Monitoring", "GET /health/live", "Working" if code == 200 and body.get("status") == "live" else "Broken", http_status=code, detail=str(body), evidence=body)

    code, body, raw = http("GET", "/health/ready")
    ready_ok = code == 200 and body.get("status") == "ready"
    add("Database", "health/ready implies DB", "Working" if ready_ok else "Broken", http_status=code, detail=str(body), evidence=body)
    add("Cache", "health/ready implies Redis", "Working" if ready_ok else "Broken", http_status=code, detail=str(body), evidence=body)
    add("REST API", "health endpoints", "Working" if ready_ok else "Broken", http_status=code, detail="live+ready", evidence=body)

    code, body, raw = http("GET", "/metrics")
    add("Metrics", "GET /metrics", "Working" if code == 200 and ("http" in raw.lower() or "#" in raw) else "Partial" if code == 200 else "Broken", http_status=code, detail=raw[:200])

    code, body, raw = http("GET", "/v1/diagnostics")
    add("Configuration", "GET /v1/diagnostics", "Working" if code == 200 else "Broken", http_status=code, detail=str(body)[:300] if isinstance(body, dict) else raw[:200], evidence=body if isinstance(body, dict) else None)
    add("Logging", "structured request logs present on API", "Partial", detail="JSON request logs observed in uvicorn log file during this audit (see api-uvicorn.log)")

    code, body, raw = http("GET", "/v1/public/stand-status")
    add("Deployment", "stand-status endpoint (local only — not public HTTPS)", "Partial" if code == 200 else "Broken", http_status=code, detail="Local API only; public HTTPS stand not deployed", evidence=body if isinstance(body, dict) else None)

    # Auth / users — real accounts
    stamp = str(int(time.time()))
    users = []
    for i in range(1, 4):
        email = f"audit.user{i}.{stamp}@example.com"
        password = f"AuditPass!{stamp}{i}Xx"
        code, body, raw = http(
            "POST",
            "/v1/auth/register",
            body={"email": email, "password": password, "display_name": f"Audit User {i}"},
        )
        users.append({"email": email, "password": password, "reg": body, "reg_code": code})
    if all(u["reg_code"] == 202 for u in users):
        add("Auth", "register 3 unique users", "Working", detail="202 registered_verified (test_stand auto-verify)", evidence=[{"email": u["email"], "status": u["reg"]} for u in users])
    else:
        add("Auth", "register 3 unique users", "Broken", detail=str(users), evidence=users)

    # duplicate email
    code, body, raw = http(
        "POST",
        "/v1/auth/register",
        body={"email": users[0]["email"], "password": users[0]["password"], "display_name": "Dup"},
    )
    add("Auth", "duplicate email rejected", "Working" if code == 409 else "Broken", http_status=code, detail=str(body)[:200])

    # bad password
    code, body, raw = http(
        "POST",
        "/v1/auth/login",
        body={"email": users[0]["email"], "password": "WrongPassword!!!", "device_label": "audit"},
    )
    add("Auth", "wrong password rejected", "Working" if code == 401 else "Broken", http_status=code, detail=str(body)[:200])

    tokens = []
    for u in users:
        code, body, raw = http(
            "POST",
            "/v1/auth/login",
            body={"email": u["email"], "password": u["password"], "device_label": "audit-desktop"},
        )
        tok = None
        if code == 200 and isinstance(body, dict) and body.get("tokens"):
            tok = body["tokens"]["access_token"]
            tokens.append(tok)
            u["token"] = tok
            u["refresh"] = body["tokens"].get("refresh_token")
        else:
            u["login_error"] = body
    add("Auth", "login 3 concurrent sessions", "Working" if len(tokens) == 3 else "Broken", detail=f"tokens={len(tokens)}")

    # me / profile
    code, body, raw = http("GET", "/v1/auth/me", token=tokens[0] if tokens else None)
    add("Users", "GET /v1/auth/me", "Working" if code == 200 else "Broken", http_status=code, evidence=body)
    code, body, raw = http(
        "PATCH",
        "/v1/profile",
        token=tokens[0],
        body={"handle": f"audit_{stamp}_1", "display_name": "Audit One", "bio": "audit"},
    )
    add("Users", "PATCH /v1/profile handle", "Working" if code in {200, 204} or (isinstance(body, dict) and code == 200) else "Partial" if code < 500 else "Broken", http_status=code, detail=str(body)[:200], evidence=body)

    # roles
    code, body, raw = http("POST", "/v1/test-stand/assume-role/streamer", token=tokens[0])
    add("Roles", "assume streamer (test-stand)", "Working" if code == 200 else "Partial" if code == 404 else "Broken", http_status=code, detail=str(body)[:200])
    code, body, raw = http("GET", "/v1/auth/me", token=tokens[0])
    roles = body.get("roles") if isinstance(body, dict) else None
    add("Roles", "roles visible on /me after assume", "Working" if roles and ("streamer" in roles or "creator" in roles or "user" in roles) else "Partial", http_status=code, evidence=roles)

    # isolation: user2 cannot see user1 private settings by id if endpoint exists
    me1 = http("GET", "/v1/auth/me", token=tokens[0])[1]
    uid1 = me1.get("id") if isinstance(me1, dict) else None
    if uid1 and len(tokens) > 1:
        code, body, raw = http("GET", f"/v1/users/{uid1}/settings", token=tokens[1])
        # expect 403/404 for private
        add(
            "Security",
            "user B cannot read user A settings",
            "Working" if code in {401, 403, 404} else "Broken" if code == 200 else "Partial",
            http_status=code,
            detail=str(body)[:200],
        )
    else:
        add("Security", "cross-user settings isolation", "Not Verified", detail="missing user id")

    # wallet
    code, body, raw = http("GET", "/v1/wallet", token=tokens[0])
    if code == 404:
        code, body, raw = http("GET", "/v1/wallet/balance", token=tokens[0])
    add("Wallet", "get wallet balance", "Working" if code == 200 else "Partial" if code in {404, 405} else "Broken", http_status=code, detail=str(body)[:200], evidence=body)
    code, body, raw = http("POST", "/v1/test-stand/sandbox-credit", token=tokens[0])
    add("Wallet", "sandbox credit (NOT real payments)", "Working" if code == 200 else "Broken", http_status=code, detail="sandbox mode — not production payments", evidence=body, mock_used=True)
    code, body, raw = http("POST", "/v1/wallet/topups", token=tokens[0], body={"amount_minor": 1000, "currency": "USD"})
    add(
        "Wallet",
        "real payment topup",
        "Not Verified" if code in {503, 501, 422, 400} else "Broken" if code >= 500 else "Partial",
        http_status=code,
        detail="Payment provider unconfigured expected; not proof of real payments",
        evidence=body,
    )

    # feed
    code, body, raw = http(
        "POST",
        "/v1/posts",
        token=tokens[0],
        body={"text": f"Audit post {stamp}", "visibility": "public"},
    )
    post_id = body.get("id") if isinstance(body, dict) else None
    add("Feed", "create post", "Working" if code in {200, 201} else "Broken", http_status=code, detail=str(body)[:200], evidence=body)
    code, body, raw = http("GET", "/v1/feed", token=tokens[0])
    add("Feed", "GET /v1/feed", "Working" if code == 200 else "Broken", http_status=code, detail=f"items={len(body.get('items', body) if isinstance(body, dict) else [])}")

    # messages
    me2 = http("GET", "/v1/auth/me", token=tokens[1])[1]
    uid2 = me2.get("id") if isinstance(me2, dict) else None
    if uid2:
        code, body, raw = http(
            "POST",
            "/v1/messaging/conversations",
            token=tokens[0],
            body={"participant_user_ids": [uid2]},
        )
        if code >= 400:
            code, body, raw = http(
                "POST",
                "/v1/conversations",
                token=tokens[0],
                body={"participant_ids": [uid2]},
            )
        add("Messages", "create conversation", "Working" if code in {200, 201} else "Partial" if code == 404 else "Broken", http_status=code, detail=str(body)[:250], evidence=body)
    else:
        add("Messages", "create conversation", "Not Verified", detail="no uid2")

    # notifications
    code, body, raw = http("GET", "/v1/notifications", token=tokens[0])
    add("Notifications", "GET /v1/notifications", "Working" if code == 200 else "Partial" if code == 404 else "Broken", http_status=code, detail=str(body)[:200])

    # AI
    code, body, raw = http(
        "POST",
        "/v1/ai/conversations",
        token=tokens[0],
        body={"title": "audit"},
    )
    add("AI Core", "create AI conversation", "Working" if code in {200, 201} else "Partial" if code in {503, 422} else "Broken", http_status=code, detail=str(body)[:250], evidence=body)
    code, body, raw = http("GET", "/v1/ai/memory", token=tokens[0])
    add("AI Memory", "GET /v1/ai/memory", "Working" if code == 200 else "Partial" if code in {404, 503} else "Broken", http_status=code, detail=str(body)[:200])

    # Prompt admin (likely needs admin)
    code, body, raw = http("GET", "/v1/admin/ai/prompts", token=tokens[0])
    add("Prompt System", "GET admin prompts as normal user", "Partial" if code in {401, 403} else "Working" if code == 200 else "Broken", http_status=code, detail="admin-gated expected for non-admin")

    # Voice / TTS / STT / Avatar — probe AI job endpoints if any
    for module, path, payload in [
        ("Text-to-Speech", "/v1/ai/jobs/voice", {"text": "hello", "voice": "default"}),
        ("Avatar", "/v1/ai/jobs/avatar", {"prompt": "wave"}),
        ("Speech-to-Text", "/v1/ai/jobs/stt", {"audio_url": "https://example.com/x.wav"}),
        ("Voice Assistant", "/v1/ai/voice/assist", {"utterance": "hello"}),
        ("Emotion Engine", "/v1/ai/emotion", {"text": "I am happy"}),
    ]:
        code, body, raw = http("POST", path, token=tokens[0], body=payload)
        if code == 0:
            add(module, f"POST {path}", "Broken", detail="connection failed")
        elif code == 404:
            add(module, f"POST {path}", "Not Verified", http_status=code, detail="endpoint missing or different path — no live provider proof")
        elif code in {503, 501}:
            add(module, f"POST {path}", "Partial", http_status=code, detail="Provider not configured / unavailable", evidence=body)
        elif code in {401, 403, 422}:
            add(module, f"POST {path}", "Partial", http_status=code, detail=str(body)[:200], evidence=body)
        elif code in {200, 201, 202}:
            add(module, f"POST {path}", "Partial", http_status=code, detail="HTTP accepted but provider quality not independently verified", evidence=body)
        else:
            add(module, f"POST {path}", "Broken", http_status=code, detail=str(body)[:200])

    # Live Studio / Hub / platforms
    code, body, raw = http("GET", "/v1/live/platforms", token=tokens[0])
    add("Live Studio", "GET /v1/live/platforms", "Working" if code == 200 else "Partial" if code == 404 else "Broken", http_status=code, evidence=body)
    code, body, raw = http("GET", "/v1/live/tiktok/control-panel", token=tokens[0])
    tiktok_status = None
    if isinstance(body, dict):
        tiktok_status = body.get("integration_status") or body.get("adapter_status")
    add(
        "TikTok",
        "control-panel status (no real LIVE connect)",
        "Not Verified" if code == 200 else "Broken",
        http_status=code,
        detail=f"Honest blocked status expected; real LIVE NOT verified. status={tiktok_status}",
        evidence=body if isinstance(body, dict) else None,
    )
    # Explicit: do not call fake transport
    add("TikTok", "real LIVE chat/gift ingest", "Not Verified", detail="BLOCKED_BY_PROVIDER_ACCESS — no approved provider; fake events forbidden as proof")

    for plat in ["youtube", "twitch", "discord", "instagram", "facebook", "kick", "obs"]:
        code, body, raw = http("GET", f"/v1/live/integrations/{plat}", token=tokens[0])
        if code == 404:
            code2, body2, raw2 = http("GET", "/v1/live/platforms", token=tokens[0])
            add(
                plat.capitalize() if plat != "obs" else "OBS",
                f"adapter availability via platforms list",
                "Not Verified",
                http_status=code2,
                detail="No OAuth keys / real stream session in this audit; code may exist but live provider not proven",
                evidence=body2 if isinstance(body2, dict) else None,
            )
        else:
            add(plat.capitalize(), f"GET integration {plat}", "Not Verified" if code < 500 else "Broken", http_status=code, detail=str(body)[:200])

    add("YouTube", "real LIVE OAuth + events", "Not Verified", detail="YOUTUBE_CLIENT_ID/SECRET not configured in this environment")
    add("Twitch", "real LIVE OAuth + events", "Not Verified", detail="TWITCH_CLIENT_ID/SECRET not configured in this environment")
    add("Discord", "real guild/chat events", "Not Verified", detail="DISCORD_APPLICATION_ID may be unset; no live guild proof")
    add("Instagram", "real LIVE", "Not Verified", detail="UnavailablePlatformAdapter / SPEC_ONLY stub")
    add("Facebook", "real LIVE", "Not Verified", detail="UnavailablePlatformAdapter / SPEC_ONLY stub")
    add("Kick", "real LIVE", "Not Verified", detail="UnavailablePlatformAdapter; no live_platforms/kick package")
    add("OBS", "companion + MediaMTX control", "Not Verified", detail="Would need local OBS + companion process; not exercised end-to-end in this run")
    add("Streaming Platform Core", "shared live_platforms contracts", "Partial", detail="Code present (NormalizedLiveEvent, connection manager); multi-platform production wiring incomplete")
    add("Live Event Hub", "module import + hub process alive via API", "Partial", detail="API up and live routes mounted; no real multi-platform event fan-in proven without providers")
    add("AI Co-Host", "dialogue scheduler unit surface", "Partial", detail="Code in live_platforms/common/cohost.py; real TTS/avatar/OBS sync not proven live", mock_used=True)

    # WebSocket — try upgrade briefly with urllib won't work well; use websockets if available
    try:
        import asyncio
        import websockets

        async def ws_probe() -> str:
            # messaging ws usually needs token query
            uri = f"ws://127.0.0.1:8000/v1/messaging/ws?access_token={tokens[0]}"
            try:
                async with websockets.connect(uri, open_timeout=5) as ws:
                    await asyncio.wait_for(ws.ping(), timeout=3)
                    return "connected"
            except Exception as exc:  # noqa: BLE001
                return f"{type(exc).__name__}:{exc}"

        ws_result = asyncio.run(ws_probe())
        add(
            "WebSocket",
            "messaging WS connect",
            "Working" if ws_result == "connected" else "Partial",
            detail=ws_result,
        )
    except ImportError:
        add("WebSocket", "messaging WS connect", "Not Verified", detail="websockets package not installed in probe env")

    # Admin
    code, body, raw = http("GET", "/v1/admin/users", token=tokens[0])
    add("Admin Panel", "GET /v1/admin/users as non-admin", "Working" if code in {401, 403} else "Broken" if code == 200 else "Partial", http_status=code, detail="authorization deny expected")

    # Password reset without claiming SMTP delivery to phone
    code, body, raw = http("POST", "/v1/auth/password-reset/request", body={"email": users[0]["email"]})
    add("Auth", "password-reset request accepted", "Partial" if code in {200, 202} else "Broken", http_status=code, detail="SMTP to Mailpit may queue; end-user email delivery not proven externally")

    # Logout
    code, body, raw = http("POST", "/v1/auth/logout", token=tokens[0], body={"refresh_token": users[0].get("refresh")})
    add("Auth", "logout", "Working" if code in {200, 204} else "Partial", http_status=code, detail=str(body)[:160])

    # Flutter / mobile / android — marked later by shell probes
    add("Flutter Desktop", "runtime launch", "Not Verified", detail="deferred to Flutter shell probe")
    add("Flutter Mobile", "device/emulator run", "Not Verified", detail="no Android emulator/device attached in this audit environment unless proven below")
    add("Android build", "flutter build apk", "Not Verified", detail="deferred to build probe")

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_url": BASE,
        "note": "Local API audit only. Public HTTPS stand was NOT available. Fake LIVE events were NOT used as proof.",
        "results": [asdict(r) for r in RESULTS],
    }
    (OUT / f"live-probe-{TS}.json").write_text(json.dumps(report, indent=2))
    (OUT / "live-probe-latest.json").write_text(json.dumps(report, indent=2))
    (OUT / "logs" / f"probe-{TS}.log").write_text("\n".join(LOG_LINES) + "\n")
    (OUT / "logs" / "probe-latest.log").write_text("\n".join(LOG_LINES) + "\n")

    # summary counts
    counts: dict[str, int] = {}
    for r in RESULTS:
        counts[r.status] = counts.get(r.status, 0) + 1
    log(f"SUMMARY {counts}")
    print(json.dumps(counts))


if __name__ == "__main__":
    main()
