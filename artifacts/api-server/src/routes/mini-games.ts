import { Router } from "express";
import { requireAuth } from "./users";
import { db } from "@workspace/db";
import {
  viewerXpEventsTable,
  streamersTable,
  usersTable,
  sessionsTable,
  viewerAchievementsTable,
  achievementsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getIO } from "../lib/socketServer";
import {
  startQuizGame,
  startTreasureHuntGame,
  ACHIEVEMENT_SEEDS,
} from "../lib/gamificationEngine";

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

/**
 * Verify that a session belongs to the authenticated streamer.
 * Returns true if sessionId is undefined (no session restriction needed).
 */
async function verifySessionOwnership(
  sessionId: number | undefined,
  streamerId: number
): Promise<boolean> {
  if (sessionId === undefined) return true;
  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.id, sessionId),
  });
  if (!session) return false;
  return session.streamerId === streamerId;
}

// ---------------------------------------------------------------------------
// POST /mini-games/spin
// Streamer spins the wheel on behalf of their own stream; sessionId must
// belong to their streamer profile.
// ---------------------------------------------------------------------------
router.post("/mini-games/spin", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const streamer = await getStreamerForUser(clerkId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const { sessionId } = req.body as { sessionId?: number };

    if (!(await verifySessionOwnership(sessionId, streamer.id))) {
      return res.status(403).json({ error: "Session does not belong to your account" });
    }

    const prize = spinWheel();

    if (prize.xp > 0 || prize.coins > 0) {
      await db.insert(viewerXpEventsTable).values({
        tiktokViewerId: `streamer:${streamer.id}`,
        viewerName: "Spin Winner",
        streamerId: streamer.id,
        sessionId: sessionId ?? null,
        eventType: "spin_win",
        xpAwarded: prize.xp,
        coinsAwarded: prize.coins,
      });
    }

    const io = getIO();
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

// ---------------------------------------------------------------------------
// POST /mini-games/lucky-draw
// Picks a random winner from viewers who engaged in the session.
// streamerId is always derived from auth — never from client input.
// ---------------------------------------------------------------------------
router.post("/mini-games/lucky-draw", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const streamer = await getStreamerForUser(clerkId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const { sessionId } = req.body as { sessionId?: number };

    if (!(await verifySessionOwnership(sessionId, streamer.id))) {
      return res.status(403).json({ error: "Session does not belong to your account" });
    }

    const recentViewers = await db
      .select({
        tiktokViewerId: viewerXpEventsTable.tiktokViewerId,
        viewerName: sql<string>`max(${viewerXpEventsTable.viewerName})`,
      })
      .from(viewerXpEventsTable)
      .where(
        and(
          eq(viewerXpEventsTable.streamerId, streamer.id),
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

// ---------------------------------------------------------------------------
// POST /mini-games/pvp
// Pits two named viewers against each other using their accumulated XP as
// the base stat. streamerId is derived from auth.
// ---------------------------------------------------------------------------
router.post("/mini-games/pvp", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const streamer = await getStreamerForUser(clerkId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const { player1, player2, sessionId } = req.body as {
      player1: string;
      player2: string;
      sessionId?: number;
    };
    if (!player1 || !player2) return res.status(400).json({ error: "Both player names required" });

    if (!(await verifySessionOwnership(sessionId, streamer.id))) {
      return res.status(403).json({ error: "Session does not belong to your account" });
    }

    const p1Row = await db
      .select({ total: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)` })
      .from(viewerXpEventsTable)
      .where(
        and(
          eq(viewerXpEventsTable.streamerId, streamer.id),
          eq(viewerXpEventsTable.viewerName, player1)
        )
      );
    const p2Row = await db
      .select({ total: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)` })
      .from(viewerXpEventsTable)
      .where(
        and(
          eq(viewerXpEventsTable.streamerId, streamer.id),
          eq(viewerXpEventsTable.viewerName, player2)
        )
      );

    const p1Xp = Number(p1Row[0]?.total ?? 0);
    const p2Xp = Number(p2Row[0]?.total ?? 0);

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

// ---------------------------------------------------------------------------
// POST /mini-games/quiz/start
// Starts a quiz; the answer is stored server-side only — never echoed back.
// Incoming comments during the session are matched against it in the
// gamificationEngine (resolveMinigameComment). sessionId must belong to auth.
// ---------------------------------------------------------------------------
router.post("/mini-games/quiz/start", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const streamer = await getStreamerForUser(clerkId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const { question, answer, sessionId, xpReward, coinReward } = req.body as {
      question: string;
      answer: string;
      sessionId: number;
      xpReward?: number;
      coinReward?: number;
    };

    if (!question || !answer) return res.status(400).json({ error: "question and answer required" });
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    if (!(await verifySessionOwnership(sessionId, streamer.id))) {
      return res.status(403).json({ error: "Session does not belong to your account" });
    }

    startQuizGame(
      sessionId,
      streamer.id,
      question,
      answer,
      xpReward ?? 300,
      coinReward ?? 50
    );

    const io = getIO();
    if (io) {
      io.to(`session:${sessionId}`).emit("minigame:quiz_started", {
        question,
        sessionId,
        timestamp: Date.now(),
      });
    }

    // Return without echoing the answer back to the client
    res.json({ ok: true, question });
  } catch {
    res.status(500).json({ error: "Quiz start failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /mini-games/treasure-hunt/start
// Starts a treasure hunt with a secret keyword. Only the hint is broadcast;
// the keyword is stored server-side. Comments are matched in the engine.
// ---------------------------------------------------------------------------
router.post("/mini-games/treasure-hunt/start", requireAuth, async (req: any, res: any) => {
  try {
    const clerkId = req.clerkUserId;
    const streamer = await getStreamerForUser(clerkId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const { keyword, prize, sessionId, xpReward, coinReward } = req.body as {
      keyword: string;
      prize: string;
      sessionId: number;
      xpReward?: number;
      coinReward?: number;
    };

    if (!keyword) return res.status(400).json({ error: "keyword required" });
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    if (!(await verifySessionOwnership(sessionId, streamer.id))) {
      return res.status(403).json({ error: "Session does not belong to your account" });
    }

    startTreasureHuntGame(
      sessionId,
      streamer.id,
      keyword,
      prize ?? "a mystery prize",
      xpReward ?? 200,
      coinReward ?? 40
    );

    const io = getIO();
    if (io) {
      io.to(`session:${sessionId}`).emit("minigame:treasure_hunt_started", {
        hint: `🗺️ A treasure is hidden! Find the magic word to win: ${prize ?? "a mystery prize"}`,
        sessionId,
        timestamp: Date.now(),
      });
    }

    // Keyword is never sent back to the client
    res.json({ ok: true, prize: prize ?? "a mystery prize" });
  } catch {
    res.status(500).json({ error: "Treasure hunt start failed" });
  }
});

export default router;
