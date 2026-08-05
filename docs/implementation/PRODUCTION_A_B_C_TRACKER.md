# SYLORA Production Tracker — A → B → C

Approved by owner: 2026-08-03  
Target: **Global Platform (C)** via staged delivery **A → B → C**  
Branch: `cursor/sylora-production-platform-fc9f`

## Non-negotiables

- Home / Aether landing: **match approved FINAL champagne-glass boards** (owner override 2026-08-05 — previous “do not redesign” lock lifted)
- TikTok / Kick / Facebook Live: **never fake** — real integration or honest blocked
- Payments: real Stripe path; sandbox only for CI / non-production
- Light champagne-glass Lumen DS across product modules (FINAL-01)
- Manual audit before claiming launch-ready

## Wave A (Controlled Production) — largely landed

| Workstream | Status | Notes |
|---|---|---|
| Design System shell across Feed/Profile/Settings/AI/More | **Landed** | `SyloraModuleScaffold` + living canvas + Aura presence |
| i18n architecture (11 locales) + UK/EN seed | **Landed** | ARB + LocaleController |
| Hybrid AI memory (embed + postgres vector store) | **Landed** | Milvus adapter later; fail-closed without provider |
| Stripe PSP + webhook verify + CI sandbox | **Landed** | Production fail-closed without secrets |
| Trust & Safety MVP | **Landed** | Reports queue / resolve / escalate / AI moderate |
| Live OBS-first + MediaMTX WHIP credentials | **Landed** | Creator Studio web WHIP publisher |
| Native WebRTC publisher (browser) | **Partial** | WHIP SDP publish on web; mobile native next |
| Gift READY catalog (20–30) | **Partial** | 10 sandbox/staging READY starter gifts seeded |
| Push notifications FCM/APNs | **Partial** | FCM HTTP v1 + device register; native token plug-in pending |
| Security hardening + observability | **Partial** | Headers, request logs, SLO counters/dependency snapshot |
| Auth/social/messaging polish + manual QA | **In progress** | |

## Wave B (Creator Production) — in progress

| Workstream | Status | Notes |
|---|---|---|
| Creator Studio scenes / overlays / meters / recording | **Partial** | Local + OBS sync; MediaRecorder fallback |
| AI Host cohost scheduler wire | **Partial** | Per-session DialogueScheduler gating |
| Aura Presence Fabric | **Partial** | Module presets + reactive emotions |
| Replay / VOD foundation | **Partial** | LiveReplay + S3 presign fail-closed |
| European locale packs (pl/de/es/fr) | **Landed** | ja/ko/zh interim EN |
| 30+ READY gifts + rankings/combos | **Next** | |
| Group/guest streams | **Next** | |
| Complete remaining language packs | **Next** | it/pt/ja/ko/zh |
| Push + email digests live | **Next** | |

## Wave C (Global Platform) — queued

- Lip-sync / expressive avatar
- Multi-host conferences / SFU scale
- Unlock TikTok/Kick/FB only with real provider access
- Full payouts/KYC, multi-region, DR
- Proactive Aura Presence Fabric everywhere

## Enablement keys (high level)

```
AI_VECTOR_BACKEND=postgres
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_SANDBOX_MODE=true   # non-production CI only
MEDIAMTX_CONTROL_URL=...
MEDIAMTX_WHIP_BASE_URL=...
TURN_URLS=["turns:..."]
PUSH_ENABLED=true
FCM_PROJECT_ID=...
FCM_SERVICE_ACCOUNT_JSON=...
BOOTSTRAP_READY_GIFTS=true
```

## Verification log

- API focused suites (vector/payments/trust/live/gifts/push/obs/replay): green in agent runs
- Flutter analyze: green after i18n + creator studio
- Full API suite: 150 passed, 1 skipped
- Staging cutover: API migrated to 0013, 10 READY gifts seeded, web `production-wave-ab` / `408543f`
- Full manual product audit: in progress
