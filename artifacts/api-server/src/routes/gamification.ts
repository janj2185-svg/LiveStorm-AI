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
  luckyDropsTable,
} from "@workspace/db";
import { eq, sql, and, desc, count, gte } from "drizzle-orm";
import { getIO } from "../lib/socketServer";
import { triggerManualLuckyDrop } from "../lib/gamificationEngine";

const router = Router();

async function getStreamerForUser(clerkId: string) {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return null;
  return db.query.streamersTable.findFirst({ where: eq(streamersTable.userId, user.id) });
}

function periodToDate(period: string | undefined): Date | null {
  if (period === "daily") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "weekly") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }
  return null; // all-time
}

// ---------------------------------------------------------------------------
// GET /gamification/leaderboard — viewer leaderboard ranked by XP
// Supports ?streamerId=N&period=daily|weekly|all-time
// ---------------------------------------------------------------------------
router.get("/gamification/leaderboard", requireAuth, async (req: any, res: any) => {
  try {
    const streamerId = req.query.streamerId ? Number(req.query.streamerId) : null;
    const period = req.query.period as string | undefined;
    const since = periodToDate(period);

    const base = db
      .select({
        tiktokViewerId: viewerXpEventsTable.tiktokViewerId,
        viewerName: sql<string>`max(${viewerXpEventsTable.viewerName})`,
        totalXp: sql<number>`sum(${viewerXpEventsTable.xpAwarded})`,
        totalCoins: sql<number>`sum(${viewerXpEventsTable.coinsAwarded})`,
        totalGifts: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`,
        totalComments: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'comment')`,
        totalFollows: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'follow')`,
      })
      .from(viewerXpEventsTable)
      .$dynamic();

    const conditions: any[] = [];
    if (streamerId) conditions.push(eq(viewerXpEventsTable.streamerId, streamerId));
    if (since) conditions.push(gte(viewerXpEventsTable.createdAt, since));

    const query = conditions.length > 0
      ? base.where(conditions.length === 1 ? conditions[0] : and(...conditions))
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
      totalComments: Number(r.totalComments),
      totalFollows: Number(r.totalFollows),
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
// GET /gamification/viewer/:tiktokViewerId — fan profile
// Optional query: ?streamerId=N
// ---------------------------------------------------------------------------
router.get("/gamification/viewer/:tiktokViewerId", requireAuth, async (req: any, res: any) => {
  try {
    const { tiktokViewerId } = req.params;
    const streamerId = req.query.streamerId ? Number(req.query.streamerId) : null;

    const conditions: any[] = [eq(viewerXpEventsTable.tiktokViewerId, tiktokViewerId)];
    if (streamerId) conditions.push(eq(viewerXpEventsTable.streamerId, streamerId));

    const [statsRow] = await db
      .select({
        viewerName: sql<string>`max(${viewerXpEventsTable.viewerName})`,
        totalXp: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)`,
        totalCoins: sql<number>`coalesce(sum(${viewerXpEventsTable.coinsAwarded}), 0)`,
        giftCount: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`,
        commentCount: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'comment')`,
        followCount: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'follow')`,
        likeCount: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'like')`,
        firstSeenAt: sql<string>`min(${viewerXpEventsTable.createdAt})`,
        lastSeenAt: sql<string>`max(${viewerXpEventsTable.createdAt})`,
      })
      .from(viewerXpEventsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    if (!statsRow || !statsRow.viewerName) {
      return res.status(404).json({ error: "Viewer not found" });
    }

    const totalXp = Number(statsRow.totalXp ?? 0);
    const level = Math.min(100, Math.floor(Math.sqrt(totalXp / 50)) + 1);

    // Get unlocked achievements
    const achConditions: any[] = [eq(viewerAchievementsTable.tiktokViewerId, tiktokViewerId)];
    if (streamerId) achConditions.push(eq(viewerAchievementsTable.streamerId, streamerId));

    const unlockedAchs = await db
      .select()
      .from(viewerAchievementsTable)
      .where(achConditions.length === 1 ? achConditions[0] : and(...achConditions))
      .orderBy(desc(viewerAchievementsTable.unlockedAt))
      .limit(20);

    const achDetails = await Promise.all(
      unlockedAchs.map(async (ua) => {
        const ach = await db.query.achievementsTable.findFirst({
          where: eq(achievementsTable.key, ua.achievementKey),
        });
        return {
          key: ua.achievementKey,
          name: ach?.name ?? ua.achievementKey,
          description: ach?.description ?? "",
          iconType: ach?.iconType ?? "trophy",
          unlockedAt: ua.unlockedAt.toISOString(),
        };
      })
    );

    res.json({
      tiktokViewerId,
      viewerName: statsRow.viewerName,
      totalXp,
      level,
      totalCoins: Number(statsRow.totalCoins ?? 0),
      giftCount: Number(statsRow.giftCount ?? 0),
      commentCount: Number(statsRow.commentCount ?? 0),
      followCount: Number(statsRow.followCount ?? 0),
      likeCount: Number(statsRow.likeCount ?? 0),
      firstSeenAt: statsRow.firstSeenAt ?? null,
      lastSeenAt: statsRow.lastSeenAt ?? null,
      achievements: achDetails,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch viewer profile" });
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

// ---------------------------------------------------------------------------
// GET /gamification/lucky-drops — history of lucky drops for current streamer
// ---------------------------------------------------------------------------
router.get("/gamification/lucky-drops", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const drops = await db
      .select()
      .from(luckyDropsTable)
      .where(eq(luckyDropsTable.streamerId, streamer.id))
      .orderBy(desc(luckyDropsTable.droppedAt))
      .limit(limit);

    res.json(drops.map((d) => ({
      id: d.id,
      dropName: d.dropName,
      prizeDescription: d.prizeDescription,
      xpReward: d.xpReward,
      coinReward: d.coinReward,
      triggerType: d.triggerType,
      winnerName: d.winnerName,
      droppedAt: d.droppedAt.toISOString(),
    })));
  } catch {
    res.status(500).json({ error: "Failed to fetch lucky drop history" });
  }
});

// ---------------------------------------------------------------------------
// POST /gamification/lucky-drops/trigger — manually fire a lucky drop
// ---------------------------------------------------------------------------
router.post("/gamification/lucky-drops/trigger", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const io = getIO();
    if (!io) return res.status(503).json({ error: "Socket server not ready" });

    const sessionId = req.body.sessionId ? Number(req.body.sessionId) : null;
    const result = await triggerManualLuckyDrop(io, streamer.id, sessionId);

    if (!result.ok) {
      return res.status(400).json({
        error: "No active viewers to pick from. Viewers need to comment or interact first.",
      });
    }

    res.json({ ok: true, winnerName: result.winnerName, dropName: result.dropName });
  } catch {
    res.status(500).json({ error: "Failed to trigger lucky drop" });
  }
});

export default router;
