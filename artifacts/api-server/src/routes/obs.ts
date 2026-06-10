import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  streamersTable,
  usersTable,
  viewerXpEventsTable,
  bossBattlesTable,
} from "@workspace/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "./users";

const router = Router();

function newObsToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getBaseUrl(req: any): string {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) return `https://${replitDomain}`;
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:8080";
  return `${proto}://${host}`;
}

const OBS_OVERLAYS = [
  {
    key: "alerts",
    name: "Alerts",
    path: "/obs/alerts",
    description: "Follows, gifts, and milestone alerts",
    width: 1280,
    height: 200,
  },
  {
    key: "goals",
    name: "Goals",
    path: "/obs/goals",
    description: "Gift and follower goal progress bars",
    width: 800,
    height: 120,
  },
  {
    key: "boss-battle",
    name: "Boss Battle",
    path: "/obs/boss-battle",
    description: "Live boss HP bar and attack animations",
    width: 800,
    height: 200,
  },
  {
    key: "leaderboard",
    name: "Leaderboard",
    path: "/obs/leaderboard",
    description: "Top gift senders and XP earners",
    width: 400,
    height: 600,
  },
  {
    key: "activity-feed",
    name: "Activity Feed",
    path: "/obs/activity-feed",
    description: "Scrolling stream of viewer events",
    width: 400,
    height: 600,
  },
];

async function resolveStreamer(clerkUserId: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkUserId),
  });
  if (!user) return null;
  const streamer = await db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, user.id),
  });
  return streamer ?? null;
}

router.get("/obs/token", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await resolveStreamer(req.clerkUserId);
    if (!streamer) {
      return res.status(404).json({ error: "No streamer profile found. Connect TikTok first." });
    }

    let token = streamer.obsToken;
    if (!token) {
      token = newObsToken();
      await db
        .update(streamersTable)
        .set({ obsToken: token })
        .where(eq(streamersTable.id, streamer.id));
    }

    res.json({ token, streamerId: streamer.id });
  } catch (err: any) {
    console.error("[OBS] Token fetch error:", err?.message);
    res.status(500).json({ error: "Failed to fetch overlay token" });
  }
});

router.post("/obs/token", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await resolveStreamer(req.clerkUserId);
    if (!streamer) {
      return res.status(404).json({ error: "No streamer profile found. Connect TikTok first." });
    }

    const token = newObsToken();
    await db
      .update(streamersTable)
      .set({ obsToken: token })
      .where(eq(streamersTable.id, streamer.id));

    console.log(`[OBS] Token regenerated for streamerId=${streamer.id}`);
    res.json({ token, streamerId: streamer.id });
  } catch (err: any) {
    console.error("[OBS] Token regeneration error:", err?.message);
    res.status(500).json({ error: "Failed to regenerate overlay token" });
  }
});

router.get("/obs/urls", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await resolveStreamer(req.clerkUserId);
    if (!streamer) {
      return res.status(404).json({ error: "No streamer profile found. Connect TikTok first." });
    }

    let token = streamer.obsToken;
    if (!token) {
      token = newObsToken();
      await db
        .update(streamersTable)
        .set({ obsToken: token })
        .where(eq(streamersTable.id, streamer.id));
    }

    const base = getBaseUrl(req);
    const overlays = OBS_OVERLAYS.map((o) => ({
      key: o.key,
      name: o.name,
      description: o.description,
      width: o.width,
      height: o.height,
      url: `${base}${o.path}?streamerId=${streamer.id}&token=${token}`,
    }));

    res.json({ overlays, streamerId: streamer.id });
  } catch (err: any) {
    console.error("[OBS] URLs error:", err?.message);
    res.status(500).json({ error: "Failed to build overlay URLs" });
  }
});

router.get("/obs/state/:streamerId", async (req: any, res: any) => {
  try {
    const streamerId = Number(req.params.streamerId);
    if (!streamerId || Number.isNaN(streamerId)) {
      return res.status(400).json({ error: "Invalid streamerId" });
    }

    const token = req.query.token as string | undefined;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.id, streamerId),
    });
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });
    if (!streamer.obsToken || streamer.obsToken !== token) {
      return res.status(401).json({ error: "Invalid or expired overlay token" });
    }

    const activeSession = await db.query.sessionsTable.findFirst({
      where: and(
        eq(sessionsTable.streamerId, streamerId),
        isNull(sessionsTable.endedAt)
      ),
    });

    const activeBossBattle = await db.query.bossBattlesTable.findFirst({
      where: and(
        eq(bossBattlesTable.streamerId, streamerId),
        eq(bossBattlesTable.status, "active")
      ),
    });

    const leaderboardQuery = db
      .select({
        tiktokViewerId: viewerXpEventsTable.tiktokViewerId,
        viewerName: sql<string>`max(${viewerXpEventsTable.viewerName})`,
        totalXp: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)`,
        giftCount: sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`,
      })
      .from(viewerXpEventsTable)
      .where(
        activeSession
          ? eq(viewerXpEventsTable.sessionId, activeSession.id)
          : eq(viewerXpEventsTable.streamerId, streamerId)
      )
      .groupBy(viewerXpEventsTable.tiktokViewerId)
      .orderBy(
        desc(sql<number>`count(*) filter (where ${viewerXpEventsTable.eventType} = 'gift')`),
        desc(sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)`)
      )
      .limit(10);

    const leaderboard = await leaderboardQuery;

    res.json({
      streamerId,
      sessionId: activeSession?.id ?? null,
      session: activeSession
        ? {
            id: activeSession.id,
            totalGifts: activeSession.totalGifts,
            totalFollowers: activeSession.totalFollowers,
            totalLikes: activeSession.totalLikes,
            totalComments: activeSession.totalComments,
            totalShares: activeSession.totalShares,
            peakViewers: activeSession.peakViewers,
            startedAt: activeSession.startedAt,
          }
        : null,
      activeBossBattle: activeBossBattle
        ? {
            id: activeBossBattle.id,
            bossName: activeBossBattle.bossName,
            bossEmoji: activeBossBattle.bossEmoji,
            currentHp: activeBossBattle.currentHp,
            maxHp: activeBossBattle.maxHp,
          }
        : null,
      leaderboard: leaderboard.map((r, i) => ({
        rank: i + 1,
        tiktokViewerId: r.tiktokViewerId,
        viewerName: r.viewerName,
        totalXp: Number(r.totalXp),
        giftCount: Number(r.giftCount),
        level: Math.min(100, Math.floor(Math.sqrt(Number(r.totalXp) / 50)) + 1),
      })),
    });
  } catch (err: any) {
    console.error("[OBS] State fetch error:", err?.message);
    res.status(500).json({ error: "Failed to fetch overlay state" });
  }
});

export default router;
