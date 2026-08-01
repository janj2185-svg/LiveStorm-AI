# Flutter mobile integration (local SYLORA API)

**Goal:** run `apps/sylora` against the local FastAPI stack on emulator/simulator/device.  
**Skipped:** Stripe / real payment top-up (fail-closed; use `scripts/sandbox_topup.py`).

Flutter SDK is required on the **owner machine** (not available in the cloud agent).

---

## Prerequisites

```bash
./start-local.sh --host
./verify-product-loop.sh
./verify-flutter-integration.sh
```

Seeded login:

| Email | Password |
|---|---|
| `owner@sylora.dev` | `OwnerTest!2026Local` |
| `user@sylora.dev` | `UserTest!2026Local` |

---

## API base URL matrix

| Target | `SYLORA_API_BASE_URL` | Script |
|---|---|---|
| Chrome / desktop | `http://127.0.0.1:8000` | `./scripts/run-flutter-local.sh chrome` |
| iOS Simulator | `http://127.0.0.1:8000` | `./scripts/run-flutter-local.sh ios` |
| Android Emulator | `http://10.0.2.2:8000` | `./scripts/run-flutter-local.sh android` |
| Physical phone | `http://<PC-LAN-IP>:8000` | `SYLORA_LAN_IP=192.168.x.x ./scripts/run-flutter-local.sh device` |

`ALLOWED_HOSTS` in gitignored `services/api/.env` must include `10.0.2.2` (and your LAN hostname/IP for physical devices). Restart the API after changing hosts.

---

## What already talks to the live API

The Flutter client has **no demo fixtures**. These repositories hit FastAPI:

- Auth — login / register / me / MFA
- Social feed — `GET /v1/social/feed`
- Wallet balance — `GET /v1/wallet/balance` (top-up stays Provider not configured)
- Messaging — conversations + native WebSocket
- Live — `POST /v1/live/sessions` (+ MediaMTX when configured)

Gallery design screens remain fixture UI but expose **Live probes** on Auth / Feed / Wallet / Messages / Live Studio, plus a Flutter block on `#/diagnostics`.

---

## Platform notes

- **Android debug/profile:** `usesCleartextTraffic=true` (HTTP to local API). Do not enable on release.
- **iOS:** `NSAllowsLocalNetworking` allows local HTTP.
- **CORS:** irrelevant for native Dio; only matters for Flutter web.
- **OAuth / deep links:** native OAuth buttons stay disabled until Runner URL schemes exist — email/password is the mobile prep path.

---

## Owner checklist

1. [ ] `./verify-flutter-integration.sh` PASS  
2. [ ] Flutter 3.44+ installed  
3. [ ] `./scripts/run-flutter-local.sh android` (or `ios` / `chrome`)  
4. [ ] Login with seeded owner/user  
5. [ ] Feed loads posts from seed  
6. [ ] Wallet shows funded balance  
7. [ ] Messages list opens  
8. [ ] Live session create works (MediaMTX optional but preferred)  
9. [ ] Top-up shows payment unavailable (expected)

---

## Related

- `OWNER_TESTING_GUIDE.md` § F2 / Flutter  
- `apps/sylora/README.md`  
- `./verify-ai.sh` · `./verify-live.sh`
