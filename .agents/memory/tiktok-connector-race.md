---
name: TikTok connector race condition
description: Use a pendingConnectors Set alongside activeConnectors to prevent duplicate connectors spawned during async startup recovery.
---

## The Rule
`startTikTokConnection` is async (it awaits a live-status HTTP check). During server startup, `recoverActiveSessions` fires before the HTTP request completes, so `activeConnectors.has(sessionId)` returns false. A concurrent call (e.g. the frontend polling `POST /sessions/start`) also sees `getConnectionMode() === null` and starts a second connector.

**Why this matters:** Two parallel connectors double the eulerstream connection rate, triggering rate limits 2× faster, and would ingest duplicate events once connections become stable.

## Fix
```typescript
const pendingConnectors = new Set<number>(); // sessions in-flight, not yet in activeConnectors

export async function startTikTokConnection(...) {
  if (activeConnectors.has(sessionId) || pendingConnectors.has(sessionId)) {
    return activeConnectors.get(sessionId)?.type ?? "real"; // deduplicate
  }
  pendingConnectors.add(sessionId);
  try {
    // ... await startLiveConnector(...)
  } finally {
    pendingConnectors.delete(sessionId); // always clean up
  }
}

export function getConnectionMode(sessionId: number): ConnectionMode | null {
  if (activeConnectors.has(sessionId)) return activeConnectors.get(sessionId)!.type;
  if (pendingConnectors.has(sessionId)) return "real"; // in-flight = treat as real
  return null;
}
```

`stopTikTokConnection` also calls `pendingConnectors.delete(sessionId)` to handle edge cases where stop is called before the connector finishes initializing.
