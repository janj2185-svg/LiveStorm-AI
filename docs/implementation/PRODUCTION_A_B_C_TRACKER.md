# SYLORA Production Tracker — A → B → C

Approved by owner: 2026-08-03  
Target: **Global Platform (C)** via staged delivery **A → B → C**  
Branch: `cursor/sylora-production-platform-fc9f`

## Non-negotiables

- Home / Aether landing HTML: **do not redesign**
- TikTok / Kick / Facebook Live: **never fake** — real integration or honest blocked
- Payments: real Stripe path; sandbox only for CI / non-production
- Light futuristic Lumen DS across product modules
- Manual audit before claiming launch-ready

## Wave A (Controlled Production) — in progress

| Workstream | Status | Notes |
|---|---|---|
| Design System shell across Feed/Profile/Settings/AI/More | **Landed** | `SyloraModuleScaffold` + living canvas |
| i18n architecture (11 locales) + UK/EN seed | **Landed** | ARB + LocaleController; others EN fallback |
| Hybrid AI memory (embed + postgres vector store) | **Landed** | Milvus adapter later; fail-closed without provider |
| Stripe PSP + webhook verify + CI sandbox | **Landed** | Production fail-closed without secrets |
| Trust & Safety MVP | **Landed** | Reports queue / resolve / escalate / AI moderate |
| Live OBS-first + MediaMTX WHIP credentials | **Landed** | Creator Studio web WHIP publisher MVP |
| Native WebRTC publisher (browser) | **Partial** | WHIP SDP publish on web; mobile native next |
| Gift READY catalog (20–30) | **Next** | Runtime exists; READY=0 |
| Push notifications FCM/APNs | **Next** | |
| Security hardening + observability | **Partial** | Headers, request logs, SLO counters/dependency snapshot |
| Auth/social/messaging polish + manual QA | **Next** | |

## Wave B (Creator Production) — queued

- Creator Studio full: scenes, overlays, mixer, recording
- AI Host voice + moderation + cohost scheduler full wire
- Group/guest streams, replay/VOD
- 30+ READY gifts + rankings/combos polish
- Complete 11-language copy packs
- Push + email digests live

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
```

## Verification log

- API AI vector tests: passed (agent)
- API live hub publish-credentials: passed (agent)
- API payments + trust_safety: passed (agent)
- Flutter analyze (post-i18n): pending parent merge check
