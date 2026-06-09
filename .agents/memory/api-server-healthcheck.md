---
name: API server healthcheck fix
description: Deployment healthcheck was returning 500 because server.listen() was called only after await initStripe() completed (3-8s DB migration delay).
---

## The rule
In `artifacts/api-server/src/index.ts`: call `httpServer.listen()` FIRST, then run all async initialisation (Stripe, TikTok recovery) as fire-and-forget inside the listen callback.

## Why
The deployment healthcheck fires within 1ms of the artifact process starting. With the old code, `await initStripe()` ran DB migrations (3-8s) before `httpServer.listen()` — so port 8080 was never open during that window. Every probe got "connection refused" → 500 → deployment loop.

**How to apply:** Any new async initialisation added to index.ts must go INSIDE the `httpServer.listen(port, callback)` callback, never before it. Pattern:
```typescript
httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");  // port open immediately
  someAsyncInit().catch(...);                 // fire and forget
});
```

## Diagnostic signature
```
healthcheck failed error=healthcheck /api returned status 500
```
Fired repeatedly from process start until SIGTERM, with `[Env:startup]` log appearing mid-sequence but no `Server listening` log before the kills.
