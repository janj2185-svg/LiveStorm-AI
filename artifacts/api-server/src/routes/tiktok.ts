import { Router } from "express";
import { requireAuth } from "./users";
import { testTikTokConnection, isRealModeEnabled } from "../lib/tiktokConnector";
import { getRawEventBuffer } from "../lib/tikToolsClient";
import { getRecentEvents, getSocketDiagnostics } from "../lib/socketServer";

const router = Router();

/**
 * POST /api/tiktok/test-connection
 * Tests a real TikTok LIVE connection without starting a full session.
 * Requires TIKTOK_MODE=real and tiktok-live-connector installed.
 */
router.post("/tiktok/test-connection", requireAuth, async (req: any, res: any) => {
  const { username } = req.body ?? {};
  if (!username || typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ ok: false, error: "username is required" });
  }

  try {
    const result = await testTikTokConnection(username.trim());
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "Unexpected error during connection test" });
  }
});

/**
 * GET /api/tiktok/mode
 * Returns the current TIKTOK_MODE setting so the frontend can display it.
 */
router.get("/tiktok/mode", async (_req: any, res: any) => {
  res.json({
    mode: isRealModeEnabled ? "real" : "demo",
    note: isRealModeEnabled
      ? "Server is configured for real TikTok LIVE connections."
      : "Server is in DEMO mode. Set TIKTOK_MODE=real on your VPS/Docker server to enable real TikTok.",
  });
});

/**
 * GET /api/tiktok/raw-events
 * Returns the last 50 raw WebSocket messages received from tik.tools.
 * Used for diagnosing event mapping / propagation issues.
 * Requires auth to prevent public exposure.
 */
router.get("/tiktok/raw-events", requireAuth, (_req: any, res: any) => {
  const buffer = getRawEventBuffer();
  res.json({
    count: buffer.length,
    note: "Last 50 raw WS messages from tik.tools. 'mapped:false' means the event name has no handler.",
    events: buffer,
  });
});

/**
 * GET /api/tiktok/recent-events?sessionId=N
 * Returns the last 100 processed events for a session, stored in-memory.
 * This is independent of Socket.IO — use it to verify events arrive even
 * when no browser tab is connected.
 */
router.get("/tiktok/recent-events", requireAuth, (req: any, res: any) => {
  const sessionId = Number(req.query.sessionId);
  if (!sessionId || Number.isNaN(sessionId)) {
    return res.status(400).json({ error: "sessionId query param required" });
  }
  const events = getRecentEvents(sessionId);
  res.json({ sessionId, count: events.length, events });
});

/**
 * GET /api/tiktok/socket-diagnostics
 * Returns current Socket.IO connection state — how many sockets are in each
 * session room and when the last event was emitted.
 */
router.get("/tiktok/socket-diagnostics", requireAuth, async (_req: any, res: any) => {
  const diag = await getSocketDiagnostics();
  res.json(diag);
});

export default router;
