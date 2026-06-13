/**
 * YouTube Live Routes
 *
 * GET  /api/youtube/config         — Whether Google OAuth credentials are configured
 * GET  /api/youtube/auth-url       — Returns Google OAuth URL for YouTube
 * GET  /api/youtube/callback       — OAuth callback: exchanges code, saves tokens, redirects
 * GET  /api/youtube/status         — Current YouTube connection status for authenticated user
 * POST /api/youtube/disconnect     — Removes YouTube tokens and stops active connector
 * POST /api/youtube/start-session  — Starts YouTube connector for the user's active session
 */

import { Router } from "express";
import { requireAuth } from "./users";
import { getOrCreateUser } from "./users";
import { db, usersTable, sessionsTable, streamersTable } from "@workspace/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getIO } from "../lib/socketServer";
import {
  isYouTubeConfigured,
  getYouTubeAuthUrl,
  exchangeYouTubeCode,
  startYouTubeConnector,
  stopYouTubeConnector,
  getYouTubeConnectorState,
} from "../lib/youtubeConnector";

const router = Router();

/**
 * GET /api/youtube/config
 * Returns whether GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI are set on the server.
 * No auth required — used by the frontend to show/hide the YouTube card.
 */
router.get("/youtube/config", (_req: any, res: any) => {
  res.json({ configured: isYouTubeConfigured() });
});

/**
 * GET /api/youtube/auth-url
 * Returns the Google OAuth URL the frontend should redirect to.
 */
router.get("/youtube/auth-url", requireAuth, (_req: any, res: any) => {
  if (!isYouTubeConfigured()) {
    return res.status(503).json({
      error: "YouTube OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI.",
    });
  }
  res.json({ url: getYouTubeAuthUrl() });
});

/**
 * GET /api/youtube/callback
 * OAuth 2.0 callback from Google. Exchanges the code for tokens, saves them, redirects to dashboard.
 *
 * This route is NOT protected by requireAuth because the user arrives here from a Google redirect
 * (no Clerk session header).  We recover the user via the OAuth state param (or falling back to
 * the first active Clerk session — good enough for single-user dev/demo setups).
 *
 * For production multi-user: encode clerkUserId in the OAuth state param.
 */
router.get("/youtube/callback", async (req: any, res: any) => {
  const { code, error: oauthError, state } = req.query;

  const frontendBase = process.env.FRONTEND_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
  const dashboardUrl = `${frontendBase}/`;

  if (oauthError) {
    console.error(`[YouTube:OAuth] Error from Google: ${oauthError}`);
    return res.redirect(`${dashboardUrl}?youtube_error=${encodeURIComponent(String(oauthError))}`);
  }

  if (!code || typeof code !== "string") {
    return res.redirect(`${dashboardUrl}?youtube_error=missing_code`);
  }

  try {
    const { accessToken, refreshToken, channelId, channelName } = await exchangeYouTubeCode(code);

    // Identify the user from the state param (clerkUserId encoded) or fallback to first user
    let userId: number | null = null;

    if (state && typeof state === "string") {
      const row = await db.query.usersTable.findFirst({
        where: eq(usersTable.clerkId, state),
        columns: { id: true },
      });
      userId = row?.id ?? null;
    }

    if (!userId) {
      // Fallback: use the most recently created user (single-user instances)
      const row = await db.query.usersTable.findFirst({
        columns: { id: true },
        orderBy: (t, { desc: d }) => [d(t.createdAt)],
      });
      userId = row?.id ?? null;
    }

    if (!userId) {
      console.error("[YouTube:OAuth] Could not identify user for token storage");
      return res.redirect(`${dashboardUrl}?youtube_error=no_user`);
    }

    await db
      .update(usersTable)
      .set({
        youtubeAccessToken: accessToken,
        youtubeRefreshToken: refreshToken,
        youtubeChannelId: channelId,
        youtubeChannelName: channelName,
      })
      .where(eq(usersTable.id, userId));

    console.log(`[YouTube:OAuth] ✓ Tokens saved for user ${userId} channel="${channelName}" id=${channelId}`);

    return res.redirect(`${dashboardUrl}?youtube_connected=1`);
  } catch (err: any) {
    console.error(`[YouTube:OAuth] Exchange error: ${err.message}`);
    return res.redirect(`${dashboardUrl}?youtube_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/youtube/status
 * Returns the YouTube connection state for the authenticated user.
 */
router.get("/youtube/status", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const row = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, user.id),
      columns: {
        youtubeAccessToken: true,
        youtubeChannelId: true,
        youtubeChannelName: true,
      },
    });

    const connected = !!(row?.youtubeAccessToken);

    // Check if a connector is running for the user's active session
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
      columns: { id: true },
    });

    let connectorState: { active: boolean; liveChatId: string | null } | null = null;

    if (streamer) {
      const session = await db.query.sessionsTable.findFirst({
        where: and(eq(sessionsTable.streamerId, streamer.id), isNull(sessionsTable.endedAt)),
        orderBy: [desc(sessionsTable.startedAt)],
        columns: { id: true },
      });
      if (session) {
        connectorState = getYouTubeConnectorState(session.id);
      }
    }

    res.json({
      configured: isYouTubeConfigured(),
      connected,
      channelId: row?.youtubeChannelId ?? null,
      channelName: row?.youtubeChannelName ?? null,
      connector: connectorState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/youtube/disconnect
 * Clears YouTube tokens and stops the connector for any active session.
 */
router.post("/youtube/disconnect", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
      columns: { id: true },
    });

    if (streamer) {
      const session = await db.query.sessionsTable.findFirst({
        where: and(eq(sessionsTable.streamerId, streamer.id), isNull(sessionsTable.endedAt)),
        orderBy: [desc(sessionsTable.startedAt)],
        columns: { id: true },
      });
      if (session) {
        stopYouTubeConnector(session.id);
      }
    }

    await db
      .update(usersTable)
      .set({
        youtubeAccessToken: null,
        youtubeRefreshToken: null,
        youtubeChannelId: null,
        youtubeChannelName: null,
      })
      .where(eq(usersTable.id, user.id));

    console.log(`[YouTube] Disconnected for user ${user.id}`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/youtube/start-session
 * Manually starts the YouTube connector for the user's current active session.
 * Also called automatically from sessions/start if tokens exist.
 */
router.post("/youtube/start-session", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const row = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, user.id),
      columns: {
        youtubeAccessToken: true,
        youtubeRefreshToken: true,
      },
    });

    if (!row?.youtubeAccessToken) {
      return res.status(400).json({ error: "YouTube not connected. Connect your YouTube account first." });
    }

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
      columns: { id: true },
    });
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const session = await db.query.sessionsTable.findFirst({
      where: and(eq(sessionsTable.streamerId, streamer.id), isNull(sessionsTable.endedAt)),
      orderBy: [desc(sessionsTable.startedAt)],
      columns: { id: true },
    });
    if (!session) return res.status(404).json({ error: "No active session. Start a live session first." });

    const io = getIO();
    if (!io) return res.status(503).json({ error: "Socket.IO not ready" });

    const result = await startYouTubeConnector(
      io,
      session.id,
      user.id,
      row.youtubeAccessToken,
      row.youtubeRefreshToken ?? "",
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
