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
import { eq, sql, and, desc, count } from "drizzle-orm";

const router = Router();

async function getStreamerForUser(clerkId: string) {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return null;
  return db.query.streamersTable.findFirst({ where: eq(streamersTable.userId, user.id) });
}

// ---------------------------------------------------------------------------
// GET /gamification/leaderboard — viewer leaderboard ranked by XP
// ---------------------------------------------------------------------------
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
  } catch {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ---------------------------------------------------------------------------
// GET /gamification/me — current user's own XP / level / rank
// ---------------------------------------------------------------------------
router.get("/gamification/me", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    // The current user's viewer identity for self-earned XP (spin wins, boss rewards, etc.)
    const selfViewerId = `streamer:${streamer.id}`;

    const [row] = await db
      .select({
        totalXp: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)`,
        totalCoins: sql<number>`coalesce(sum(${viewerXpEventsTable.coinsAwarded}), 0)`,
        totalGifts: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`,
      })
      .from(viewerXpEventsTable)
      .where(eq(viewerXpEventsTable.tiktokViewerId, selfViewerId));

    const totalXp = Number(row?.totalXp ?? 0);
    const totalCoins = Number(row?.totalCoins ?? 0);
    const totalGifts = Number(row?.totalGifts ?? 0);
    const level = Math.min(100, Math.floor(Math.sqrt(totalXp / 50)) + 1);

    // Compute rank: count how many distinct viewerIds have higher total XP
    const [rankRow] = await db
      .select({ higherCount: count() })
      .from(
        db
          .select({
            xpSum: sql<number>`sum(${viewerXpEventsTable.xpAwarded})`.as("xp_sum"),
          })
          .from(viewerXpEventsTable)
          .groupBy(viewerXpEventsTable.tiktokViewerId)
          .having(sql`sum(${viewerXpEventsTable.xpAwarded}) > ${totalXp}`)
          .as("higher")
      );
    const rank = Number(rankRow?.higherCount ?? 0) + 1;

    res.json({ tiktokViewerId: selfViewerId, totalXp, totalCoins, totalGifts, level, rank });
  } catch {
    res.status(500).json({ error: "Failed to fetch your progression" });
  }
});

// ---------------------------------------------------------------------------
// GET /gamification/streamer-leaderboard — streamers ranked by engagement
// ---------------------------------------------------------------------------
router.get("/gamification/streamer-leaderboard", requireAuth, async (req: any, res: any) => {
  try {
    const rows = await db
      .select({
        streamerId: viewerXpEventsTable.streamerId,
        totalXpAwarded: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)`,
        totalGiftsReceived: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`,
        uniqueViewers: sql<number>`count(distinct ${viewerXpEventsTable.tiktokViewerId})`,
      })
      .from(viewerXpEventsTable)
      .groupBy(viewerXpEventsTable.streamerId)
      .orderBy(desc(sql`sum(${viewerXpEventsTable.xpAwarded})`))
      .limit(20);

    const enriched = await Promise.all(
      rows.map(async (r, i) => {
        const streamer = await db.query.streamersTable.findFirst({
          where: eq(streamersTable.id, r.streamerId),
        });
        const user = streamer
          ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, streamer.userId) })
          : null;
        return {
          rank: i + 1,
          streamerId: r.streamerId,
          streamerName: user?.displayName ?? user?.email ?? `Streamer #${r.streamerId}`,
          totalXpAwarded: Number(r.totalXpAwarded),
          totalGiftsReceived: Number(r.totalGiftsReceived),
          uniqueViewers: Number(r.uniqueViewers),
        };
      })
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch streamer leaderboard" });
  }
});

// ---------------------------------------------------------------------------
// GET /gamification/achievements — all achievements with personal unlock status
// ---------------------------------------------------------------------------
router.get("/gamification/achievements", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    const allAchievements = await db.select().from(achievementsTable);

    let unlockedKeys: string[] = [];
    if (streamer) {
      // Check achievements specifically earned by this user's viewer identity
      const selfViewerId = `streamer:${streamer.id}`;
      const unlocked = await db
        .select({ key: viewerAchievementsTable.achievementKey })
        .from(viewerAchievementsTable)
        .where(
          and(
            eq(viewerAchievementsTable.streamerId, streamer.id),
            eq(viewerAchievementsTable.tiktokViewerId, selfViewerId)
          )
        );
      unlockedKeys = unlocked.map((u) => u.key);
    }

    const result = allAchievements.map((a) => ({
      ...a,
      unlocked: unlockedKeys.includes(a.key),
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// ---------------------------------------------------------------------------
// POST /gamification/daily-claim
// ---------------------------------------------------------------------------
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
  } catch {
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

// ---------------------------------------------------------------------------
// GET /gamification/daily-claim/status
// ---------------------------------------------------------------------------
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
  } catch {
    res.status(500).json({ error: "Failed to get claim status" });
  }
});

export default router;
