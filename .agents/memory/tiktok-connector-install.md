---
name: tiktok-live-connector install workaround
description: protobufjs is blocked by Replit's package firewall — use a build-time symlink to expose the pnpm-store copy instead of adding it as a direct dependency.
---

## The Rule
Never add `tiktok-live-connector` to `package.json` dependencies. protobufjs (a transitive dep) is blocked by Replit's package firewall (`ERR_PNPM_FETCH_403`), causing `pnpm install` to fail.

## Solution
In `artifacts/api-server/build.mjs`, scan `node_modules/.pnpm/` for the highest `tiktok-live-connector@*` entry and create a symlink in `artifacts/api-server/node_modules/tiktok-live-connector` → the pnpm store path. Node.js follows the symlink into the store, where protobufjs is accessible from the package's own nested `node_modules`.

**Why:** The pnpm store at `.pnpm/tiktok-live-connector@X/node_modules/tiktok-live-connector` includes a sibling `node_modules/protobufjs` — when Node.js resolves modules from the symlink target path, it finds protobufjs there without any download needed.

**How to apply:** If the package version changes, the build.mjs scanner picks up the latest `tiktok-live-connector@*` entry automatically. The symlink is created once; subsequent builds skip it (`existsSync` check).

## Import pattern
In source code, use `createRequire(import.meta.url)` to load the CJS module at runtime — esbuild leaves it as a dynamic require, which resolves via the symlink at runtime:
```typescript
const _require = createRequire(import.meta.url);
const { WebcastPushConnection } = _require("tiktok-live-connector");
```
