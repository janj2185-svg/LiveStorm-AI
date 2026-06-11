import { db, aiMemoriesTable, agentViewerProfilesTable as viewerProfilesTable } from "@workspace/db";
import { eq, and, desc, sql, lt, lte } from "drizzle-orm";

const memoryCache = new Map<number, { memories: string[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function pruneOldMemories(streamerId: number): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days
    const result = await db
      .delete(aiMemoriesTable)
      .where(
        and(
          eq(aiMemoriesTable.streamerId, streamerId),
          lte(aiMemoriesTable.importance, 2),
          lt(aiMemoriesTable.lastAccessed, cutoff),
        ),
      );
    const count = (result as unknown as { rowCount?: number })?.rowCount ?? 0;
    if (count > 0) {
      console.log(`[MemoryAgent] 🧹 pruned ${count} stale low-importance memories for streamer=${streamerId}`);
      memoryCache.delete(streamerId);
    }
  } catch (err) {
    console.error("[MemoryAgent] prune error:", (err as Error)?.message);
  }
}

export async function storeMemory(opts: {
  streamerId: number;
  memoryType: "viewer" | "stream" | "global" | "joke" | "preference";
  key: string;
  value: string;
  viewerName?: string;
  tiktokViewerId?: string;
  importance?: number;
}): Promise<void> {
  try {
    const existing = await db.query.aiMemoriesTable.findFirst({
      where: and(
        eq(aiMemoriesTable.streamerId, opts.streamerId),
        eq(aiMemoriesTable.key, opts.key),
        ...(opts.viewerName ? [eq(aiMemoriesTable.viewerName, opts.viewerName)] : []),
      ),
    });

    if (existing) {
      await db
        .update(aiMemoriesTable)
        .set({ value: opts.value, lastAccessed: new Date(), updatedAt: new Date() })
        .where(eq(aiMemoriesTable.id, existing.id));
    } else {
      await db.insert(aiMemoriesTable).values({
        streamerId: opts.streamerId,
        memoryType: opts.memoryType,
        key: opts.key,
        value: opts.value,
        viewerName: opts.viewerName,
        tiktokViewerId: opts.tiktokViewerId,
        importance: opts.importance ?? 3,
      });
    }
    memoryCache.delete(opts.streamerId);
  } catch (err: unknown) {
    console.error("[MemoryAgent] storeMemory error:", (err as Error)?.message);
  }
}

export async function getMemoryContext(streamerId: number, viewerName?: string): Promise<string> {
  try {
    const cached = memoryCache.get(streamerId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.memories.slice(0, 8).join("\n");
    }

    const global = await db.query.aiMemoriesTable.findMany({
      where: and(
        eq(aiMemoriesTable.streamerId, streamerId),
        eq(aiMemoriesTable.memoryType, "global"),
      ),
      orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
      limit: 5,
    });

    const streamMem = await db.query.aiMemoriesTable.findMany({
      where: and(
        eq(aiMemoriesTable.streamerId, streamerId),
        eq(aiMemoriesTable.memoryType, "stream"),
      ),
      orderBy: [desc(aiMemoriesTable.lastAccessed)],
      limit: 3,
    });

    const lines: string[] = [];
    for (const m of global) lines.push(`[Global] ${m.key}: ${m.value}`);
    for (const m of streamMem) lines.push(`[Stream] ${m.key}: ${m.value}`);

    if (viewerName) {
      // VIP status from viewer profile
      try {
        const profile = await db.query.agentViewerProfilesTable.findFirst({
          where: and(
            eq(viewerProfilesTable.streamerId, streamerId),
            eq(viewerProfilesTable.viewerName, viewerName),
          ),
        });
        if (profile && profile.vipLevel !== "none") {
          lines.push(`[Viewer:${viewerName}] vip_status: ${viewerName} is a ${profile.vipLevel} viewer (${profile.totalGifts} gifts, ${profile.totalComments} comments). Treat them with extra respect.`);
        }
      } catch {}

      const viewerMem = await db.query.aiMemoriesTable.findMany({
        where: and(
          eq(aiMemoriesTable.streamerId, streamerId),
          eq(aiMemoriesTable.viewerName, viewerName),
        ),
        orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
        limit: 3,
      });
      for (const m of viewerMem) lines.push(`[Viewer:${viewerName}] ${m.key}: ${m.value}`);
    }

    memoryCache.set(streamerId, { memories: lines, ts: Date.now() });
    return lines.join("\n");
  } catch {
    return "";
  }
}

export async function upsertViewerProfile(opts: {
  streamerId: number;
  tiktokViewerId: string;
  viewerName: string;
  eventType: "comment" | "gift" | "follow" | "like";
  coins?: number;
}): Promise<void> {
  try {
    const existing = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, opts.streamerId),
        eq(viewerProfilesTable.tiktokViewerId, opts.tiktokViewerId),
      ),
    });

    const now = new Date();

    if (existing) {
      const updates: Record<string, unknown> = { lastSeen: now, viewerName: opts.viewerName };
      if (opts.eventType === "comment") updates.totalComments = sql`${viewerProfilesTable.totalComments} + 1`;
      if (opts.eventType === "gift") updates.totalGifts = sql`${viewerProfilesTable.totalGifts} + 1`;
      if (opts.eventType === "follow") updates.totalFollows = sql`${viewerProfilesTable.totalFollows} + 1`;
      if (opts.eventType === "like") updates.totalLikes = sql`${viewerProfilesTable.totalLikes} + 1`;

      const totalGifts = opts.eventType === "gift" ? (existing.totalGifts + 1) : existing.totalGifts;
      const totalComments = opts.eventType === "comment" ? (existing.totalComments + 1) : existing.totalComments;
      let vipLevel = existing.vipLevel;
      if (totalGifts >= 10) vipLevel = "vip";
      else if (totalGifts >= 3) vipLevel = "gifter";
      else if (totalComments >= 20) vipLevel = "regular";
      updates.vipLevel = vipLevel;

      await db.update(viewerProfilesTable).set(updates as any).where(eq(viewerProfilesTable.id, existing.id));

      if (totalGifts >= 3 && existing.vipLevel === "none") {
        await storeMemory({
          streamerId: opts.streamerId,
          memoryType: "viewer",
          key: `${opts.viewerName}_vip`,
          value: `${opts.viewerName} is a gifter with ${totalGifts} gifts. Treat them as VIP.`,
          viewerName: opts.viewerName,
          tiktokViewerId: opts.tiktokViewerId,
          importance: 4,
        });
      }

      // Occasionally prune stale low-importance memories (1% chance per update)
      if (Math.random() < 0.01) {
        void pruneOldMemories(opts.streamerId);
      }
    } else {
      await db.insert(viewerProfilesTable).values({
        streamerId: opts.streamerId,
        tiktokViewerId: opts.tiktokViewerId,
        viewerName: opts.viewerName,
        totalGifts: opts.eventType === "gift" ? 1 : 0,
        totalComments: opts.eventType === "comment" ? 1 : 0,
        totalFollows: opts.eventType === "follow" ? 1 : 0,
        totalLikes: opts.eventType === "like" ? 1 : 0,
        vipLevel: "none",
        firstSeen: now,
        lastSeen: now,
      });
    }
  } catch (err: unknown) {
    console.error("[MemoryAgent] upsertViewerProfile error:", (err as Error)?.message);
  }
}

export async function getViewerProfile(streamerId: number, tiktokViewerId: string) {
  return db.query.viewerProfilesTable.findFirst({
    where: and(
      eq(viewerProfilesTable.streamerId, streamerId),
      eq(viewerProfilesTable.tiktokViewerId, tiktokViewerId),
    ),
  });
}

export async function listMemories(streamerId: number, memoryType?: string, limit = 50) {
  const where = memoryType
    ? and(eq(aiMemoriesTable.streamerId, streamerId), eq(aiMemoriesTable.memoryType, memoryType))
    : eq(aiMemoriesTable.streamerId, streamerId);
  return db.query.aiMemoriesTable.findMany({
    where,
    orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
    limit,
  });
}
