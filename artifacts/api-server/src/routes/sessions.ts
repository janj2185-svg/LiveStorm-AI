import { Router } from "express";
import { db, sessionsTable, streamersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";
import { getIO } from "../lib/socketServer";
import { startSimulator, stopSimulator } from "../lib/tiktokSimulator";

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

    const existingLive = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.id, streamer.id),
    });
    if (existingLive?.isLive) {
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

    const io = getIO();
    if (io) {
      const roomId = `session:${session.id}`;
      startSimulator(io, session.id, roomId);
    }

    res.json({
      sessionId: session.id,
      streamerId: streamer.id,
      startedAt: session.startedAt,
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

    stopSimulator(activeSession.id);

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
      sessionId: ended.id,
      streamerId: streamer.id,
      startedAt: ended.startedAt,
      endedAt: ended.endedAt,
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

    res.json({
      active: true,
      session: {
        id: activeSession.id,
        streamerId: activeSession.streamerId,
        startedAt: activeSession.startedAt,
        peakViewers: activeSession.peakViewers,
        totalGifts: activeSession.totalGifts,
        totalLikes: activeSession.totalLikes,
        totalFollowers: activeSession.totalFollowers,
        totalComments: activeSession.totalComments,
      },
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
        endedAt: s.endedAt,
        peakViewers: s.peakViewers,
        totalGifts: s.totalGifts,
        totalLikes: s.totalLikes,
        totalFollowers: s.totalFollowers,
        totalComments: s.totalComments,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
