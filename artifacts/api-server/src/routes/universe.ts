import { Router } from "express";
import { requireAuth } from "./users";
import { db } from "@workspace/db";
import {
  streamerAlliancesTable,
  streamersTable,
  usersTable,
  kingdomsTable,
} from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";

const router = Router();

async function getStreamerForUser(clerkId: string) {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return null;
  return db.query.streamersTable.findFirst({ where: eq(streamersTable.userId, user.id) });
}

router.get("/universe/alliances", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const alliances = await db
      .select()
      .from(streamerAlliancesTable)
      .where(
        or(
          eq(streamerAlliancesTable.requesterId, streamer.id),
          eq(streamerAlliancesTable.targetId, streamer.id)
        )
      )
      .orderBy(desc(streamerAlliancesTable.createdAt));

    const enriched = await Promise.all(
      alliances.map(async (a) => {
        const partnerId = a.requesterId === streamer.id ? a.targetId : a.requesterId;
        const partner = await db.query.streamersTable.findFirst({
          where: eq(streamersTable.id, partnerId),
        });
        const partnerUser = partner
          ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, partner.userId) })
          : null;
        return {
          ...a,
          partnerName: partnerUser?.displayName ?? partnerUser?.email ?? `Streamer #${partnerId}`,
          isRequester: a.requesterId === streamer.id,
        };
      })
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch alliances" });
  }
});

router.post("/universe/alliances", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const { targetStreamerId } = req.body as { targetStreamerId: number };
    if (!targetStreamerId) return res.status(400).json({ error: "targetStreamerId required" });

    const target = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.id, targetStreamerId),
    });
    if (!target) return res.status(404).json({ error: "Target streamer not found" });
    if (target.id === streamer.id) return res.status(400).json({ error: "Cannot ally with yourself" });

    const existing = await db
      .select()
      .from(streamerAlliancesTable)
      .where(
        or(
          and(
            eq(streamerAlliancesTable.requesterId, streamer.id),
            eq(streamerAlliancesTable.targetId, targetStreamerId)
          ),
          and(
            eq(streamerAlliancesTable.requesterId, targetStreamerId),
            eq(streamerAlliancesTable.targetId, streamer.id)
          )
        )
      );

    if (existing.length > 0) return res.status(400).json({ error: "Alliance already exists" });

    const [alliance] = await db
      .insert(streamerAlliancesTable)
      .values({ requesterId: streamer.id, targetId: targetStreamerId, status: "pending" })
      .returning();

    res.json(alliance);
  } catch {
    res.status(500).json({ error: "Failed to create alliance" });
  }
});

router.patch("/universe/alliances/:id", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamerForUser(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const allianceId = Number(req.params.id);
    const { status } = req.body as { status: string };
    if (!["accepted", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });

    const alliance = await db.query.streamerAlliancesTable.findFirst({
      where: eq(streamerAlliancesTable.id, allianceId),
    });
    if (!alliance) return res.status(404).json({ error: "Alliance not found" });
    if (alliance.targetId !== streamer.id) return res.status(403).json({ error: "Only target can respond" });

    const [updated] = await db
      .update(streamerAlliancesTable)
      .set({ status })
      .where(eq(streamerAlliancesTable.id, allianceId))
      .returning();

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update alliance" });
  }
});

router.get("/universe/rankings", async (req: any, res: any) => {
  try {
    const kingdoms = await db
      .select()
      .from(kingdomsTable)
      .orderBy(desc(kingdomsTable.gold))
      .limit(20);

    const enriched = await Promise.all(
      kingdoms.map(async (k) => {
        const streamer = await db.query.streamersTable.findFirst({
          where: eq(streamersTable.id, k.streamerId),
        });
        const user = streamer
          ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, streamer.userId) })
          : null;
        return {
          kingdomId: k.id,
          kingdomName: k.name,
          streamerId: k.streamerId,
          streamerName: user?.displayName ?? user?.email ?? `Streamer #${k.streamerId}`,
          level: k.level,
          gold: k.gold,
          totalResources: k.gold + k.wood + k.stone,
        };
      })
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch rankings" });
  }
});

export default router;
