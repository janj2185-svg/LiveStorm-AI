---
name: Electron Desktop App Phase 1
description: Architecture, blockers, and build facts for the LiveStorm AI Electron desktop app.
---

## Pattern
SaaS shell — BrowserWindow loads hosted URL (`LIVESTORM_APP_URL` env, default `https://livestorm-ai.replit.app`).
No backend bundled; all API/WS/TikTok/Clerk goes through the hosted service. Identical to how Notion/Linear desktop apps work.

## Key files
- `artifacts/desktop/` — the workspace package (`@workspace/desktop`)
- `electron/main.js` — window, permissions, deep-link handler
- `electron/preload.js` — contextBridge only; `window.electronAPI.isElectron = true`
- `scripts/dev.js` — waits for dev server, then spawns electron binary
- `electron-builder.yml` — win(nsis+zip) / mac(dmg+zip) / linux(AppImage+deb+rpm)

## pnpm-workspace.yaml requirements
`electron` MUST be in `onlyBuiltDependencies` — without it, pnpm blocks electron's postInstall binary download.

## Replit build results (Linux host)
- `electron-builder --linux dir` → `dist-desktop/linux-unpacked/` + `LiveStorm AI-1.0.0.AppImage` ✅
- `electron-builder --win` → `dist-desktop/win-unpacked/LiveStorm AI.exe` ✅ (cross-compiled)
- `electron-builder --win nsis` → BLOCKED (needs wine, not in Replit)
- `electron-builder --mac` → BLOCKED (needs macOS SDK)

## Running in Replit
Electron binary installed at `/home/runner/workspace/node_modules/.pnpm/electron@32.3.3/node_modules/electron/dist/electron` but cannot execute: missing `libglib-2.0.so.0`, `libgobject-2.0.so.0`, `libnss3.so`, `libdbus-1.so.3`, and many other GTK/glib shared libs. No display server (xvfb not in Replit Nix env as of June 2026).

**Why:** Replit's cloud Linux is headless NixOS; GTK GUI apps need extra Nix packages not in the default module set.

**How to apply:** Never try to visually run Electron in Replit CI. Build only. Test visual UI on a local dev machine with `pnpm desktop:dev`.

## Clerk auth
Uses `partition: "persist:livestorm"` to persist session cookies across Electron launches. OAuth popups (Google, etc.) opened as child BrowserWindow; all other external links → `shell.openExternal`. Custom protocol `livestorm://` registered for OAuth deep-link callbacks.

## Security config
`nodeIntegration: false`, `contextIsolation: true`, `sandbox: false` (needed for preload Node access), `webSecurity: true`. Permissions whitelist: media, notifications, microphone, camera, audioCapture, videoCapture, geolocation.

## Root scripts
`pnpm desktop:dev | desktop:build | desktop:build:win | desktop:build:mac | desktop:build:linux`
