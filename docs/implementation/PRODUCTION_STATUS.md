# SYLORA production status (2026-08-01)

## Verdict

**Friend-demo READY (local)** · **Public production NO-GO** until owner
credentials, platform approvals, AAA assets, and ops sign-offs land.

## Fully working (verified)

- Identity: register/verify/login/JWT/refresh/RBAC/MFA plumbing  
- Local demo bootstrap + demo accounts  
- Immutable credit ledger, wallet balance, admin issuance  
- Gift catalog, purchase, send, delivery events, refunds (admin)  
- Demo gift `demo-heart` assets in MinIO  
- Gift Studio / gift-runtime contracts (unit tested)  
- Social, messaging (native realtime), creator, marketplace, learning, business, admin modules (API + Flutter screens)  
- AI Brain provider boundary (fails closed without provider)  
- AI Live Hub adapters for YouTube/Twitch/Discord/OBS/MediaMTX capability surfaces  
- Backend tests: 67 passed (1 env-gated skip)  
- Security baseline: Argon2id, encrypted secrets, CORS/hosts, rate limits, security headers  

## Partially working

- AI assistant multilingual prompts (locale tags accepted; provider-dependent; not fully locale-contract-tested for UA/PL/DE/FR/IT/PT)  
- AI reactions to gifts/follows (synthesized prompts added; needs live provider + session rules)  
- Flutter Web gift realtime (ticket sockets enabled); messaging/live sockets still native-only  
- Flutter gift UI shows commerce/history, not in-app VFX rendering  
- Compose/K8s configs present; full Compose not live-verified in this nested VM  
- YouTube/Twitch/Discord adapters coded but not sandbox-verified with real apps  

## Requires owner approval / paid services

- AAA CGI gift library production (see `AAA_GIFT_PIPELINE.md`)  
- Payment processor (Stripe/Adyen) and store billing  
- Production SMTP, object storage beyond local MinIO, managed DB  
- AI provider spend  
- Apple/Google developer accounts and signing  

## Requires official platform approval

- TikTok LIVE, Kick, Facebook Live, Instagram Live (no unofficial scraping)  
- Any expanded Discord/YouTube/Twitch scopes beyond baseline docs  
- App Store / Play policy review for virtual gifts  

## Explicitly not implemented

- Microphone capture / speech-to-text “hear the streamer”  
- Telegram adapter  
- Semantic vector memory (encrypted recency memory only)  
- Client render acknowledgement for gift VFX (ledger “delivered” ≠ pixels drawn)  

## Demo accounts

See `LOCAL_LAUNCH.md`. Password: `SyloraDemo2026!`  
Emails: `admin@example.com`, `creator@example.com`, `sender@example.com`, `viewer@example.com`
