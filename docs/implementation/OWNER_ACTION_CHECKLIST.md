# Owner action checklist

Items that require **your** credentials, payments, approvals, or creative
production. The codebase is prepared up to these gates and fails closed instead
of simulating success.

## Immediate (needed for friend demo with AI / live platforms)

| # | Item | Exact action | Where it plugs in |
|---|---|---|---|
| 1 | OpenAI-compatible API key | Create project key; keep server-side only | Admin `POST /v1/admin/ai/providers` (encrypted at rest) |
| 2 | Confirm demo on your LAN | Bind API beyond loopback or reverse-proxy; add LAN origin to `CORS_ORIGINS` / `ALLOWED_HOSTS`; Flutter `--dart-define=SYLORA_API_BASE_URL=http://<host>:8000` | `services/api/.env`, Flutter run |
| 3 | Optional SMTP for real signup | Replace Mailpit with SES/Postmark/etc. | `SMTP_*` in API env |

## Payments & credits

| # | Item | Exact action |
|---|---|---|
| 4 | Choose PSP (Stripe Connect or Adyen) | Create test + live accounts, webhook secrets, KYC/KYB |
| 5 | Implement/inject `PaymentProvider` | Platform currently fails closed without a real provider |
| 6 | App Store / Play Billing | Required for iOS/Android virtual currency compliance reviews |

## Live platform integrations

| Platform | Status | What you must supply |
|---|---|---|
| YouTube Live | Adapter present | Google Cloud OAuth client, live-enabled channel, scopes, quota |
| Twitch | Adapter present | Twitch app client ID/secret, EventSub secret, broadcaster scopes |
| Discord | Adapter present (chat/moderation, not video restream) | Application ID, bot token, intents |
| OBS WebSocket 5.x | Companion present | Local OBS password; loopback-only by design |
| MediaMTX RTMP/WebRTC | Infra present | Publish/read credentials already in Compose env |
| TikTok LIVE | Unavailable | Official LIVE partner product confirmation — **no scraping** |
| Kick | Unavailable | Official scopes + approval for intended use |
| Facebook Live | Unavailable | Meta app review + Live Video permissions |
| Instagram Live | Unavailable | Official docs do not confirm third-party live initiation |
| Telegram | Missing | Product decision + Bot API design if wanted |

See `EXTERNAL_CAPABILITIES.md` for official doc links and verification gates.

## Identity providers (optional OAuth)

| Provider | Credentials needed |
|---|---|
| Google | OAuth client ID/secret, exact redirects |
| Apple | Services ID, Key ID, `.p8`, Team ID |
| Microsoft Entra | Tenant app registration + secret/cert |

Set via `OAUTH_<NAME>_*` environment variables documented in
`services/api/.env.example`.

## AAA animated gifts (requires your approval)

Code alone cannot invent a licensed AAA CGI library. Approve one of:

1. Internal Blender → glTF/Lottie pipeline with staff artists  
2. Unreal/Unity export packaging into SYLORA manifests  
3. External studio delivery with rights/provenance manifests  

Full plan: `AAA_GIFT_PIPELINE.md`. Until then, use Gift Studio + `demo-heart`.

## Mobile / desktop release signing

| Target | Needed from you |
|---|---|
| Android release | Organization keystore + Play Console |
| iOS / macOS | Apple Developer team, certificates, provisioning |
| Windows | Code signing certificate |
| Push | APNs `.p8` and/or FCM service account |

## Production infrastructure

| Item | Needed |
|---|---|
| Managed PostgreSQL / Redis / Kafka / object storage | Cloud accounts + secrets |
| Kubernetes cluster | kubeconfig + External Secrets Operator |
| TLS certificates | DNS + ACME or uploaded certs |
| Observability | Keep Prometheus/Grafana or plug into existing stack |
| Backup restore drill | Owner-signed successful restore evidence |

## Legal / compliance (owner sign-off)

- Privacy policy + DPA with real subprocessors  
- Age/minor policy for gifts and live  
- Content rights / DMCA process  
- Incident response contacts  
- Do **not** leave gallery UI claims about EU residency/uptime as product truth unless backed by config + contracts  

## Credentials never commit

Keep all secrets in `infrastructure/.env` / `services/api/.env` / secret manager.
Examples use `REPLACE_WITH_GENERATED` / `CHANGE_ME` placeholders only.
