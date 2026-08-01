# Demo Evidence — Local Verification (2026-08-01)

## Automated / API evidence (executed in this environment)

```text
GET  /api/health                         → {"status":"ok"}
GET  /api/dev/login?clerkId=demo_streamer_clerk → ok streamerId=2
GET  /api/users/me                       → Demo Streamer
GET  /api/tiktok/mode                    → {"mode":"demo"}
POST /api/sessions/start                 → sessionId=1 mode=demo
POST /api/dev/inject-event (comment/gift/follow) → ok
GET  /api/sessions/active                → active=true totalGifts=209 totalFollowers=2 totalComments=3
pnpm --filter @workspace/api-server test → 13/13 passed
```

## UI screenshots (existing product captures in repo)

Copied to `/opt/cursor/artifacts/screenshots/`:

- dashboard.png
- ai-storm.png (AI Co-Host)
- live-studio.png
- gifts.png
- boss-battle.png
- analytics.png
- community.png
- settings.png
- scenes.png
- storm-pass.png

## Friend-test UI path tomorrow

1. Put real `CLERK_*` + `OPENAI_*` into `.env`
2. `./scripts/start-local.sh`
3. Open `http://localhost:5173` and sign in
4. Optional API-cookie bypass for local only: `http://localhost:5173/dashboard?_devMode=1`
5. Go Live (demo mode) → watch gifts/comments → AI replies (needs OpenAI key)

## Not demonstrated live here

- Real TikTok LIVE (needs provider key + LIVE account)
- OpenAI TTS audio (placeholder key only in this cloud VM)
- Clerk Sign-In UI (placeholder publishable key)
- Flutter / Electron GUI / AAA gift store (not in repo)

## Browser UI verification (this environment)

Loaded with `?_devMode=1` (Clerk keys are placeholders → Clerk overlay error after ~2s, as expected):

| URL | Result | Screenshot |
|---|---|---|
| `/dashboard?_devMode=1` | Loads | `screenshots/demo-dashboard-devmode.png` |
| `/gifts?_devMode=1` | Gift Reactions catalog loads | `screenshots/demo-gifts.png` |
| `/ai-assistant?_devMode=1` | AI Co-Host UI loads | `screenshots/demo-ai-assistant.png` |

**Friend testing tomorrow requires real Clerk + OpenAI keys** — placeholder keys only prove the shell boots.
