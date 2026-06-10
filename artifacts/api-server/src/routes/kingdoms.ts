import { Router } from "express";
import { db, usersTable, streamersTable, kingdomsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";

const router = Router();

router.get("/kingdoms/me", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.status(404).json({ error: "No streamer profile" });

    const kingdom = await db.query.kingdomsTable.findFirst({
      where: eq(kingdomsTable.streamerId, streamer.id),
    });
    if (!kingdom) return res.status(404).json({ error: "Kingdom not found" });

    const buildings = Array.isArray(kingdom.buildings) ? kingdom.buildings : [];

    res.json({
      id: kingdom.id,
      streamerId: kingdom.streamerId,
      streamerName: user.displayName ?? user.tiktokUsername ?? null,
      name: kingdom.name,
      level: kingdom.level,
      gold: kingdom.gold,
      wood: kingdom.wood,
      stone: kingdom.stone,
      totalBuildings: buildings.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/kingdoms", requireAuth, async (_req: any, res: any) => {
  try {
    const kingdoms = await db
      .select({
        id: kingdomsTable.id,
        streamerId: kingdomsTable.streamerId,
        displayName: usersTable.displayName,
        tiktokUsername: usersTable.tiktokUsername,
        name: kingdomsTable.name,
        level: kingdomsTable.level,
        gold: kingdomsTable.gold,
        wood: kingdomsTable.wood,
        stone: kingdomsTable.stone,
        buildings: kingdomsTable.buildings,
      })
      .from(kingdomsTable)
      .innerJoin(streamersTable, eq(kingdomsTable.streamerId, streamersTable.id))
      .innerJoin(usersTable, eq(streamersTable.userId, usersTable.id))
      .orderBy(desc(kingdomsTable.level));

    res.json(
      kingdoms.map((k) => ({
        id: k.id,
        streamerId: k.streamerId,
        streamerName: k.displayName ?? k.tiktokUsername ?? null,
        name: k.name,
        level: k.level,
        gold: k.gold,
        wood: k.wood,
        stone: k.stone,
        totalBuildings: Array.isArray(k.buildings) ? k.buildings.length : 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
