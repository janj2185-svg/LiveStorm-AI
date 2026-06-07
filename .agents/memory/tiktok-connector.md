---
name: TikTok connector architecture
description: How TIKTOK_MODE, tiktok-live-connector install, esbuild externals, and error surfacing all fit together.
---

## Rule
`TIKTOK_MODE=demo` (default) → simulator always runs, no real TikTok.  
`TIKTOK_MODE=real` → real connector attempted; if it fails, exact error emitted via `tiktok:status` socket event and surfaced in UI — **no silent fallback**.

## Why
Silent fallback to demo when in real mode masked connectivity failures. Users had no way to know the real connection failed.

## How to apply
- `tiktok-live-connector` must NOT be in pnpm workspace lockfile — `es5-ext` postinstall 403s in Replit's restricted network.
- It IS added to esbuild `external[]` in `build.mjs` so the dynamic `import("tiktok-live-connector")` resolves from `node_modules` at runtime, not bundled.
- In Docker: install after pnpm install via `cd artifacts/api-server && npm install tiktok-live-connector --ignore-scripts`.
- In Replit (dev): package absent → dynamic import throws → caught → demo mode (expected behaviour).
- Socket event schema: `tiktok:status { mode: "real" | "demo" | "error", error?: string, username?: string }`.
- `GET /api/sessions/active` returns `mode` and `connectionError` for page-refresh persistence (before socket reconnects).
- `POST /api/tiktok/test-connection` lets the dashboard test a username without starting a session.
- Frontend badge in ai-assistant.tsx header: 🟡 DEMO / 🟢 REAL TIKTOK / 🔴 CONNECTION FAILED.
