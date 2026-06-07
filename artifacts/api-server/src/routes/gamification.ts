import { Router } from "express";
import { requireAuth } from "./users";
import { db } from "@workspace/db";
import {
  viewerXpEventsTable,
  viewerAchievementsTable,
  achievementsTable,
  dailyClaimsTable,
  streamersTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";

const router = Router();

router.get("/gamification/leaderboard", requireAuth, async (req: any, res: any) => {
  try {
    const streamerId = req.query.streamerId ? Number(req.query.streamerId) : null;

    const base = db
      .select({
        tiktokViewerId: viewerXpEventsTable.tiktokViewerId,
        viewerName: sql<string>`max(${viewerXpEventsTable.viewerName})`,
        totalXp: sql<number>`sum(${viewerXpEventsTable.xpAwarded})`,
        totalCoins: sql<number>`sum(${viewerXpEventsTable.coinsAwarded})`,
        totalGifts: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`,
      })
      .from(viewerXpEventsTable)
      .$dynamic();

    const query = streamerId
      ? base.where(eq(viewerXpEventsTable.streamerId, streamerId))
      : base;

    const rows = await query
      .groupBy(viewerXpEventsTable.tiktokViewerId)
      .orderBy(desc(sql`sum(${viewerXpEventsTable.xpAwarded})`))
      .limit(50);

    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      tiktokViewerId: r.tiktokViewerId,
      viewerName: r.viewerName,
      totalXp: Number(r.totalXp),
      totalCoins: Number(r.totalCoins),
      totalGifts: Number(r.totalGifts),
      level: Math.min(100, Math.floor(Math.sqrt(Number(r.totalXp) / 50)) + 1),
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/gamification/achievements", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.clerkUserId;
    const streamerId = req.query.streamerId ? Number(req.query.streamerId) : null;

    const allAchievements = await db.select().from(achievementsTable);

    let unlockedKeys: string[] = [];
    if (streamerId) {
      const unlocked = await db
        .select({ key: viewerAchievementsTable.achievementKey })
        .from(viewerAchievementsTable)
        .where(eq(viewerAchievementsTable.streamerId, streamerId));
      unlockedKeys = unlocked.map((u) => u.key);
    }

    const result = allAchievements.map((a) => ({
      ...a,
      unlocked: unlockedKeys.includes(a.key),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

router.post("/gamification/daily-claim", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toISOString().slice(0, 10);
    const existing = await db
      .select()
      .from(dailyClaimsTable)
      .where(
        and(
          eq(dailyClaimsTable.userId, user.id),
          eq(dailyClaimsTable.claimedDate, today)
        )
      );

    if (existing.length > 0) {
      return res.json({ alreadyClaimed: true, coinsAwarded: 0 });
    }

    const coinsAwarded = 100;
    await db.insert(dailyClaimsTable).values({
      userId: user.id,
      claimedDate: today,
      coinsAwarded,
    });

    res.json({ alreadyClaimed: false, coinsAwarded });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

router.get("/gamification/daily-claim/status", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toISOString().slice(0, 10);
    const existing = await db
      .select()
      .from(dailyClaimsTable)
      .where(
        and(
          eq(dailyClaimsTable.userId, user.id),
          eq(dailyClaimsTable.claimedDate, today)
        )
      );

    res.json({ alreadyClaimed: existing.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to get claim status" });
  }
});

export default router;
