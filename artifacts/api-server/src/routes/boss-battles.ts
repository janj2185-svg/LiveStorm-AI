import { Router } from "express";
import { requireAuth } from "./users";
import { db } from "@workspace/db";
import {
  bossBattlesTable,
  bossAttacksTable,
  streamersTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getIO } from "../lib/socketServer";

const router = Router();

async function getStreamerForUser(clerkId: string) {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return null;
  return db.query.streamersTable.findFirst({ where: eq(streamersTable.userId, user.id) });
}

router.get("/boss-battles/active", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const battle = await db.query.bossBattlesTable.findFirst({
      where: and(
        eq(bossBattlesTable.streamerId, streamer.id),
        eq(bossBattlesTable.status, "active")
      ),
    });

    res.json({ battle: battle ?? null });
  } catch {
    res.status(500).json({ error: "Failed to fetch active battle" });
  }
});

router.get("/boss-battles", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const battles = await db
      .select()
      .from(bossBattlesTable)
      .where(eq(bossBattlesTable.streamerId, streamer.id))
      .orderBy(desc(bossBattlesTable.startedAt))
      .limit(20);

    res.json(battles);
  } catch {
    res.status(500).json({ error: "Failed to fetch battles" });
  }
});

router.post("/boss-battles", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const existing = await db.query.bossBattlesTable.findFirst({
      where: and(
        eq(bossBattlesTable.streamerId, streamer.id),
        eq(bossBattlesTable.status, "active")
      ),
    });
    if (existing) return res.status(400).json({ error: "A battle is already active" });

    const { bossName = "Shadow Dragon", bossEmoji = "🐉", maxHp = 1000, sessionId } = req.body as {
      bossName?: string;
      bossEmoji?: string;
      maxHp?: number;
      sessionId?: number;
    };

    const hp = Math.max(100, Math.min(10000, Number(maxHp)));

    const [battle] = await db
      .insert(bossBattlesTable)
      .values({
        streamerId: streamer.id,
        sessionId: sessionId ?? null,
        bossName,
        bossEmoji,
        maxHp: hp,
        currentHp: hp,
        status: "active",
      })
      .returning();

    const io = getIO();
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit("boss:spawned", {
        battleId: battle.id,
        bossName: battle.bossName,
        bossEmoji: battle.bossEmoji,
        maxHp: battle.maxHp,
        currentHp: battle.currentHp,
        timestamp: Date.now(),
      });
    }

    res.json(battle);
  } catch {
    res.status(500).json({ error: "Failed to spawn boss" });
  }
});

router.post("/boss-battles/:id/end", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const battleId = Number(req.params.id);
    const battle = await db.query.bossBattlesTable.findFirst({
      where: eq(bossBattlesTable.id, battleId),
    });

    if (!battle) return res.status(404).json({ error: "Battle not found" });
    if (battle.streamerId !== streamer.id) return res.status(403).json({ error: "Forbidden" });

    const [updated] = await db
      .update(bossBattlesTable)
      .set({ status: "expired", endedAt: new Date() })
      .where(eq(bossBattlesTable.id, battleId))
      .returning();

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to end battle" });
  }
});

router.get("/boss-battles/:id/attacks", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const battleId = Number(req.params.id);
    const battle = await db.query.bossBattlesTable.findFirst({
      where: eq(bossBattlesTable.id, battleId),
    });

    if (!battle) return res.status(404).json({ error: "Battle not found" });
    if (battle.streamerId !== streamer.id) return res.status(403).json({ error: "Forbidden" });

    const attacks = await db
      .select()
      .from(bossAttacksTable)
      .where(eq(bossAttacksTable.battleId, battleId))
      .orderBy(desc(bossAttacksTable.createdAt))
      .limit(50);

    res.json(attacks);
  } catch {
    res.status(500).json({ error: "Failed to fetch attacks" });
  }
});

export default router;
