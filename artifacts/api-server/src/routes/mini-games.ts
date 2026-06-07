import { Router } from "express";
import { requireAuth } from "./users";
import { db } from "@workspace/db";
import {
  viewerXpEventsTable,
  streamersTable,
  usersTable,
  viewerAchievementsTable,
  achievementsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { getIO } from "../lib/socketServer";

const router = Router();

const SPIN_WHEEL_PRIZES = [
  { label: "50 XP", xp: 50, coins: 0, probability: 0.25 },
  { label: "100 XP", xp: 100, coins: 0, probability: 0.15 },
  { label: "200 XP", xp: 200, coins: 0, probability: 0.10 },
  { label: "10 Coins", xp: 0, coins: 10, probability: 0.20 },
  { label: "50 Coins", xp: 0, coins: 50, probability: 0.12 },
  { label: "100 Coins", xp: 0, coins: 100, probability: 0.08 },
  { label: "500 XP + 50 Coins", xp: 500, coins: 50, probability: 0.05 },
  { label: "Try Again", xp: 0, coins: 0, probability: 0.05 },
];

function spinWheel() {
  const rand = Math.random();
  let cumulative = 0;
  for (const prize of SPIN_WHEEL_PRIZES) {
    cumulative += prize.probability;
    if (rand <= cumulative) return prize;
  }
  return SPIN_WHEEL_PRIZES[0];
}

async function getStreamerForUser(clerkId: string) {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return null;
  return db.query.streamersTable.findFirst({ where: eq(streamersTable.userId, user.id) });
}

router.post("/mini-games/spin", requireAuth, async (req: any, res: any) => {
  try {
    const prize = spinWheel();
    const clerkId = req.clerkUserId;
    const streamer = await getStreamerForUser(clerkId);

    if (streamer && prize.xp > 0) {
      await db.insert(viewerXpEventsTable).values({
        tiktokViewerId: `user:${clerkId}`,
        viewerName: "Streamer",
        streamerId: streamer.id,
        eventType: "spin_win",
        xpAwarded: prize.xp,
        coinsAwarded: prize.coins,
      });
    }

    const io = getIO();
    const { sessionId } = req.body as { sessionId?: number };
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit("minigame:spin", {
        prize: prize.label,
        xp: prize.xp,
        coins: prize.coins,
        timestamp: Date.now(),
      });
    }

    res.json({ prize: prize.label, xp: prize.xp, coins: prize.coins });
  } catch {
    res.status(500).json({ error: "Spin failed" });
  }
});

router.post("/mini-games/lucky-draw", requireAuth, async (req: any, res: any) => {
  try {
    const { streamerId, sessionId } = req.body as { streamerId?: number; sessionId?: number };

    if (!streamerId) return res.status(400).json({ error: "streamerId required" });

    const recentViewers = await db
      .select({
        tiktokViewerId: viewerXpEventsTable.tiktokViewerId,
        viewerName: sql<string>`max(${viewerXpEventsTable.viewerName})`,
      })
      .from(viewerXpEventsTable)
      .where(
        and(
          eq(viewerXpEventsTable.streamerId, streamerId),
          ...(sessionId ? [eq(viewerXpEventsTable.sessionId, sessionId)] : [])
        )
      )
      .groupBy(viewerXpEventsTable.tiktokViewerId)
      .limit(100);

    if (recentViewers.length === 0) {
      return res.json({ winner: null, message: "No eligible viewers" });
    }

    const winner = recentViewers[Math.floor(Math.random() * recentViewers.length)];

    const io = getIO();
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit("minigame:lucky_draw", {
        winner: winner.viewerName,
        timestamp: Date.now(),
      });
    }

    res.json({ winner: winner.viewerName, tiktokViewerId: winner.tiktokViewerId });
  } catch {
    res.status(500).json({ error: "Lucky draw failed" });
  }
});

router.post("/mini-games/pvp", requireAuth, async (req: any, res: any) => {
  try {
    const { player1, player2, streamerId, sessionId } = req.body as {
      player1: string;
      player2: string;
      streamerId?: number;
      sessionId?: number;
    };
    if (!player1 || !player2) return res.status(400).json({ error: "Both player names required" });

    let p1Xp = 0;
    let p2Xp = 0;

    if (streamerId) {
      const p1Row = await db
        .select({ total: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)` })
        .from(viewerXpEventsTable)
        .where(
          and(
            eq(viewerXpEventsTable.streamerId, streamerId),
            eq(viewerXpEventsTable.viewerName, player1)
          )
        );
      const p2Row = await db
        .select({ total: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)` })
        .from(viewerXpEventsTable)
        .where(
          and(
            eq(viewerXpEventsTable.streamerId, streamerId),
            eq(viewerXpEventsTable.viewerName, player2)
          )
        );
      p1Xp = Number(p1Row[0]?.total ?? 0);
      p2Xp = Number(p2Row[0]?.total ?? 0);
    }

    const p1Score = p1Xp + Math.floor(Math.random() * 200);
    const p2Score = p2Xp + Math.floor(Math.random() * 200);
    const winner = p1Score >= p2Score ? player1 : player2;
    const loser = p1Score >= p2Score ? player2 : player1;

    const io = getIO();
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit("minigame:pvp", {
        player1, player2, winner, loser,
        p1Score, p2Score,
        timestamp: Date.now(),
      });
    }

    res.json({ winner, loser, player1Score: p1Score, player2Score: p2Score });
  } catch {
    res.status(500).json({ error: "PvP failed" });
  }
});

router.post("/mini-games/quiz/start", requireAuth, async (req: any, res: any) => {
  try {
    const { question, answer, sessionId } = req.body as {
      question: string;
      answer: string;
      sessionId?: number;
    };
    if (!question || !answer) return res.status(400).json({ error: "question and answer required" });

    const io = getIO();
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit("minigame:quiz_started", {
        question,
        sessionId,
        timestamp: Date.now(),
      });
    }

    res.json({ ok: true, question });
  } catch {
    res.status(500).json({ error: "Quiz start failed" });
  }
});

router.post("/mini-games/treasure-hunt/start", requireAuth, async (req: any, res: any) => {
  try {
    const { keyword, prize, sessionId } = req.body as {
      keyword: string;
      prize: string;
      sessionId?: number;
    };
    if (!keyword) return res.status(400).json({ error: "keyword required" });

    const io = getIO();
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit("minigame:treasure_hunt_started", {
        hint: `A treasure is hidden! Type the magic word to win: ${prize || "a prize"}`,
        sessionId,
        timestamp: Date.now(),
      });
    }

    res.json({ ok: true, keyword });
  } catch {
    res.status(500).json({ error: "Treasure hunt start failed" });
  }
});

export default router;
