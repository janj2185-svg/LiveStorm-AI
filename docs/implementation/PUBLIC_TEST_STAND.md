# SYLORA — Public multi-tester stand

Date: 2026-08-01  
Branch: `cursor/sylora-public-test-stand-5b96`

## Verdict

**Public HTTPS URL: BLOCKED (missing stable hosting credentials)**

This Cursor agent environment:

- has a public IP but **inbound ports are firewalled** (`public_inbound_fail`);
- is **ephemeral** (forbidden as the tester URL);
- has **no** Render / Fly / Railway / AWS / K8s deploy credentials;
- GitHub Environments for the Deploy workflow are **empty**.

Therefore there is **no public HTTPS address** to give testers yet. Claiming one would violate the requirement “не називай стенд готовим, якщо URL недоступна зовні”.

What **is** ready in this PR:

- staging / test-stand API mode (auto-verify email, sandbox wallet, role assume);
- honest `GET /v1/public/stand-status` matrix (TikTok stays `BLOCKED_BY_PROVIDER_ACCESS` without blocking SYLORA);
- roles `owner` / `admin` / `creator` / `streamer` / `viewer`;
- account self-delete (`DELETE /v1/users/me`);
- health / ready / diagnostics (non-production);
- VPS deploy package under `infrastructure/public-stand/` + external verify script.

## What the owner must provide (to unblock URL)

Pick **one**:

1. **VPS + domain** (recommended): Ubuntu 22.04+, Docker, DNS `A` record for e.g. `stand.sylora.dev` → VPS.
2. **PaaS account** with API token (Render / Fly / Railway) + custom domain or platform HTTPS hostname.

Then:

```bash
cp infrastructure/public-stand/.env.example infrastructure/public-stand/.env
# fill STAND_DOMAIN, passwords, JWT_SECRET, DATA_ENCRYPTION_KEY, IP_HASH_KEY
chmod +x infrastructure/public-stand/*.sh
./infrastructure/public-stand/deploy.sh
./infrastructure/public-stand/verify-external.sh https://YOUR_DOMAIN
```

After verify passes, paste the HTTPS URL into this doc and share with testers.

## Public address

| Field | Value |
|---|---|
| HTTPS URL | **BLOCKED — not deployed** |
| Ends at | set `TEST_STAND_ENDS_AT` (suggested `2026-08-15`) |
| Bug reports | GitHub Issues on this repo (or `TEST_STAND_BUG_REPORT_URL`) |

## Tester instructions (once URL exists)

1. Open `https://YOUR_DOMAIN` on phone or laptop (not localhost).
2. Create **your own** account (email + password). Shared seed logins are not the primary path.
3. With auto-verify stand mode you can log in immediately (`registered_verified`).
4. Set a public handle in profile.
5. Try: feed, messages, wallet sandbox credit (`POST /v1/test-stand/sandbox-credit`), gifts, AI, Live Studio.
6. Open Live Studio → TikTok panel: expect **BLOCKED_BY_PROVIDER_ACCESS** (honest). Other platforms show separate statuses via `/v1/public/stand-status`.
7. Optional role: `POST /v1/test-stand/assume-role/streamer` (or `viewer` / `creator`).
8. Delete account when done: Settings → delete, or `DELETE /v1/users/me` with password.
9. Report bugs via the stand’s `bug_report_url` (GitHub Issues). Include OS, browser/app, request id from response headers if present.

## Feature matrix (code-level honesty)

| Feature | Status | Notes |
|---|---|---|
| Registration / login / logout | READY (stand) | Auto-verify when SMTP absent on stand |
| Password reset | PARTIAL | Needs SMTP |
| Profile | READY | |
| Feed | READY | |
| Messages | READY | |
| Wallet | PARTIAL | Sandbox only — **no real payments** |
| Gift library | PARTIAL | Catalog-honest READY counts |
| AI assistant | PARTIAL | Needs `OPENAI_API_KEY` for READY |
| Live Studio | PARTIAL | UI + adapters |
| TTS / Avatar | PARTIAL | Hooks present; providers may be unset |
| OBS / MediaMTX | BLOCKED/PARTIAL | Needs MediaMTX on the host |
| TikTok LIVE | BLOCKED | `BLOCKED_BY_PROVIDER_ACCESS` |
| YouTube / Twitch / … | BLOCKED/PARTIAL | Per-adapter honest status |
| Account delete | READY | |
| Diagnostics | READY | `/v1/diagnostics` (non-production) |
| Rate limiting | READY | Redis sliding window |
| Audit log | READY | `SecurityAuditEvent` |

## Security notes

- Do not commit `.env` or publish JWT / DB / Redis secrets.
- Real Stripe/payments stay off unless separately approved.
- Fake TikTok events are **tests only**, never proof of LIVE.
- TikTok blocked must not stop the rest of the stand.

## Teardown / wipe tester data

```bash
./infrastructure/public-stand/teardown.sh
```

This stops containers and deletes Postgres/Redis/Caddy volumes for the stand.

## Known defects / gaps

1. **No public URL yet** — blocked on owner hosting credentials.
2. Password reset without SMTP cannot deliver tokens to phones.
3. Flutter web build in compose is heavy on first deploy (needs Flutter image).
4. Full MediaMTX/TURN public plane is not in the lean stand compose (add separately if needed).
5. Agent VM cannot be used as the stand (inbound blocked + ephemeral).

## Verification performed in this agent

| Check | Result |
|---|---|
| Unit/contract tests for stand status + auto-verify | run on PR |
| External HTTPS from phone | **NOT possible** — no public stand |
| 3 real accounts on public URL | **NOT possible** until deploy |
| Inbound probe to agent IP | **FAIL** (firewalled) |
