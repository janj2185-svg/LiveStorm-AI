import { Router } from "express";
import { db, usersTable, streamersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";

const router = Router();

router.get("/streamers/me", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    const streamerUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, streamer.userId),
    });

    res.json({
      id: streamer.id,
      userId: streamer.userId,
      displayName: streamerUser?.displayName ?? null,
      tiktokUsername: streamerUser?.tiktokUsername ?? null,
      avatarUrl: streamerUser?.avatarUrl ?? null,
      isLive: streamer.isLive,
      viewerCount: streamer.viewerCount,
      totalGiftsReceived: streamer.totalGiftsReceived,
      plan: streamerUser?.plan ?? "free",
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/streamers", async (_req: any, res: any) => {
  try {
    const streamers = await db
      .select({
        id: streamersTable.id,
        userId: streamersTable.userId,
        displayName: usersTable.displayName,
        tiktokUsername: usersTable.tiktokUsername,
        avatarUrl: usersTable.avatarUrl,
        isLive: streamersTable.isLive,
        viewerCount: streamersTable.viewerCount,
        totalGiftsReceived: streamersTable.totalGiftsReceived,
        plan: usersTable.plan,
      })
      .from(streamersTable)
      .innerJoin(usersTable, eq(streamersTable.userId, usersTable.id))
      .orderBy(desc(streamersTable.viewerCount));

    res.json(streamers);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/streamers/top", async (_req: any, res: any) => {
  try {
    const streamers = await db
      .select({
        id: streamersTable.id,
        userId: streamersTable.userId,
        displayName: usersTable.displayName,
        tiktokUsername: usersTable.tiktokUsername,
        avatarUrl: usersTable.avatarUrl,
        isLive: streamersTable.isLive,
        viewerCount: streamersTable.viewerCount,
        totalGiftsReceived: streamersTable.totalGiftsReceived,
        plan: usersTable.plan,
      })
      .from(streamersTable)
      .innerJoin(usersTable, eq(streamersTable.userId, usersTable.id))
      .orderBy(desc(streamersTable.totalGiftsReceived))
      .limit(10);

    res.json(streamers);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
