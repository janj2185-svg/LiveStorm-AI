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

const _rawSecret = process.env.CLERK_SECRET_KEY;
if (!_rawSecret) {
  throw new Error("CLERK_SECRET_KEY environment variable is required for OBS overlay token signing");
}
const OBS_TOKEN_SECRET: string = _rawSecret;

export function generateObsToken(streamerId: number): { token: string; expiresAt: number } {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ streamerId, exp })).toString("base64url");
  const sig = crypto
    .createHmac("sha256", OBS_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
  return { token: `${payload}.${sig}`, expiresAt: exp };
}

export function verifyObsToken(token: string): { streamerId: number } | null {
  try {
    if (!token || typeof token !== "string") return null;
    const lastDot = token.lastIndexOf(".");
    if (lastDot < 0) return null;
    const payload = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expectedSig = crypto
      .createHmac("sha256", OBS_TOKEN_SECRET)
      .update(payload)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const { streamerId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > exp) return null;
    return { streamerId: Number(streamerId) };
  } catch {
    return null;
  }
}

router.post("/obs/token", requireAuth, async (req: any, res: any) => {
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, req.clerkUserId),
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.status(404).json({ error: "No streamer profile found" });

    const { token, expiresAt } = generateObsToken(streamer.id);
    res.json({ token, expiresAt, streamerId: streamer.id });
  } catch {
    res.status(500).json({ error: "Failed to generate overlay token" });
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

    const verified = verifyObsToken(token);
    if (!verified || verified.streamerId !== streamerId) {
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
  } catch {
    res.status(500).json({ error: "Failed to fetch overlay state" });
  }
});

export default router;
