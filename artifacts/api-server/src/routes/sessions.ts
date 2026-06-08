import { Router } from "express";
import { db, sessionsTable, streamersTable, usersTable } from "@workspace/db";
import { eq, desc, isNull, and } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";
import { getIO } from "../lib/socketServer";
import {
  startTikTokConnection,
  stopTikTokConnection,
  getConnectionMode,
  getConnectionError,
  isRealModeEnabled,
  type ConnectionMode,
} from "../lib/tiktokConnector";

const router = Router();

router.post("/sessions/start", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) {
      return res.status(404).json({ error: "No streamer profile. Connect TikTok first." });
    }

    // Helper: resolve the TikTok username for this user
    const resolveUsername = async (): Promise<string | null> => {
      const fromBody = typeof req.body?.tiktokUsername === "string" ? req.body.tiktokUsername.trim() : null;
      if (fromBody) return fromBody;
      const ur = await db.query.usersTable.findFirst({ where: eq(usersTable.id, user.id) });
      return ur?.tiktokUsername || streamer.tiktokLiveId || null;
    };

    if (streamer.isLive) {
      // The DB says this streamer is live. Check if the connector is actually running.
      // It won't be after a server restart — the in-memory map is cleared on boot.
      const existingSession = await db.query.sessionsTable.findFirst({
        where: and(eq(sessionsTable.streamerId, streamer.id), isNull(sessionsTable.endedAt)),
        orderBy: [desc(sessionsTable.startedAt)],
      });

      if (existingSession && !getConnectionMode(existingSession.id)) {
        // Connector died (server restart) — reconnect without creating a new session
        const tiktokUsername = await resolveUsername();
        const forceDemoMode = req.body?.demoMode === true || !tiktokUsername;
        const io = getIO();
        let actualMode: ConnectionMode = forceDemoMode ? "demo" : "real";
        if (io) {
          actualMode = await startTikTokConnection(io, tiktokUsername, existingSession.id, user.id, forceDemoMode);
        }
        return res.json({
          sessionId: existingSession.id,
          streamerId: existingSession.streamerId,
          startedAt: existingSession.startedAt,
          mode: actualMode,
        });
      }

      // Connector IS running (or no session found) — truly already live
      return res.status(400).json({ error: "Already live" });
    }

    const [session] = await db
      .insert(sessionsTable)
      .values({ streamerId: streamer.id })
      .returning();

    await db
      .update(streamersTable)
      .set({ isLive: true, updatedAt: new Date() })
      .where(eq(streamersTable.id, streamer.id));

    const tiktokUsername = await resolveUsername();
    const demoMode = req.body?.demoMode === true || !tiktokUsername;

    const io = getIO();
    let actualMode: ConnectionMode = demoMode ? "demo" : "real";
    if (io) {
      actualMode = await startTikTokConnection(io, tiktokUsername, session.id, user.id, demoMode);
    }

    res.json({
      sessionId: session.id,
      streamerId: streamer.id,
      startedAt: session.startedAt,
      mode: actualMode,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sessions/end", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const activeSession = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.streamerId, streamer.id),
      orderBy: [desc(sessionsTable.startedAt)],
    });

    if (!activeSession || activeSession.endedAt) {
      return res.status(400).json({ error: "No active session" });
    }

    stopTikTokConnection(activeSession.id);

    const [ended] = await db
      .update(sessionsTable)
      .set({ endedAt: new Date() })
      .where(eq(sessionsTable.id, activeSession.id))
      .returning();

    await db
      .update(streamersTable)
      .set({ isLive: false, viewerCount: 0, updatedAt: new Date() })
      .where(eq(streamersTable.id, streamer.id));

    const io = getIO();
    if (io) {
      io.to(`session:${activeSession.id}`).emit("session:ended", { sessionId: activeSession.id });
    }

    res.json({
      id: ended.id,
      streamerId: streamer.id,
      startedAt: ended.startedAt,
      endedAt: ended.endedAt,
      peakViewers: ended.peakViewers,
      totalGifts: ended.totalGifts,
      totalLikes: ended.totalLikes,
      totalFollowers: ended.totalFollowers,
      totalComments: ended.totalComments,
      totalShares: ended.totalShares,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sessions/active", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.json({ active: false, session: null });

    const activeSession = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.streamerId, streamer.id),
      orderBy: [desc(sessionsTable.startedAt)],
    });

    if (!activeSession || activeSession.endedAt) {
      return res.json({ active: false, session: null });
    }

    // Determine connection mode. After a server restart the in-memory connector map
    // is cleared, so getConnectionMode() returns null even though the session is live.
    // In that case, kick off a background reconnect and tell the client to wait.
    let connMode: ConnectionMode | null = getConnectionMode(activeSession.id);
    if (connMode === null && isRealModeEnabled) {
      // Connector died — trigger recovery in background (socket will emit tiktok:status when ready)
      const io = getIO();
      if (io) {
        const userRecord = await db.query.usersTable.findFirst({ where: eq(usersTable.id, user.id) });
        const tiktokUsername = userRecord?.tiktokUsername || streamer.tiktokLiveId || null;
        if (tiktokUsername) {
          startTikTokConnection(io, tiktokUsername, activeSession.id, user.id, false).catch(() => {});
        }
      }
      connMode = null; // frontend will show "Establishing connection..." until socket fires
    } else if (connMode === null) {
      connMode = "demo"; // demo mode: null → demo is fine
    }

    res.json({
      active: true,
      session: {
        id: activeSession.id,
        streamerId: activeSession.streamerId,
        startedAt: activeSession.startedAt,
        endedAt: null,
        peakViewers: activeSession.peakViewers,
        totalGifts: activeSession.totalGifts,
        totalLikes: activeSession.totalLikes,
        totalFollowers: activeSession.totalFollowers,
        totalComments: activeSession.totalComments,
        totalShares: activeSession.totalShares,
        mode: connMode,
        connectionError: getConnectionError(activeSession.id) ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sessions/:id/stats", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const session = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.id, sessionId),
    });

    if (!session || session.streamerId !== streamer.id) {
      return res.status(404).json({ error: "Session not found" });
    }

    const durationSeconds = session.endedAt
      ? Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      : Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

    res.json({
      id: session.id,
      streamerId: session.streamerId,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? null,
      durationSeconds,
      peakViewers: session.peakViewers,
      totalGifts: session.totalGifts,
      totalLikes: session.totalLikes,
      totalFollowers: session.totalFollowers,
      totalComments: session.totalComments,
      totalShares: session.totalShares,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sessions", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.json([]);

    const sessions = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.streamerId, streamer.id))
      .orderBy(desc(sessionsTable.startedAt))
      .limit(20);

    res.json(
      sessions.map((s) => ({
        id: s.id,
        streamerId: s.streamerId,
        startedAt: s.startedAt,
        endedAt: s.endedAt ?? null,
        peakViewers: s.peakViewers,
        totalGifts: s.totalGifts,
        totalLikes: s.totalLikes,
        totalFollowers: s.totalFollowers,
        totalComments: s.totalComments,
        totalShares: s.totalShares,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
