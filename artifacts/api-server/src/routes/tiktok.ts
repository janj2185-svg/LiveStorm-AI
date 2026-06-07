import { Router } from "express";
import { requireAuth } from "./users";
import { testTikTokConnection, isRealModeEnabled } from "../lib/tiktokConnector";

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

export default router;
