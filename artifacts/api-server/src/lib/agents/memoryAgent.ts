import { db, agentViewerProfilesTable as viewerProfilesTable, aiMemoriesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { TikTokEvent } from "../tiktokSimulator";

export interface ViewerContext {
  profile: {
    viewerName: string;
    totalGifts: number;
    totalComments: number;
    totalFollows: number;
    vipLevel: string;
    isFirstSeen: boolean;
    notes: string | null;
  } | null;
  memories: string[];
  contextSummary: string;
}

export async function upsertViewerProfile(
  streamerId: number,
  event: TikTokEvent,
): Promise<void> {
  const viewerId = (event.data?.userId as string) ?? event.username;
  const viewerName = event.username ?? "unknown";
  if (!viewerId || !viewerName) return;

  try {
    const existing = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, streamerId),
        eq(viewerProfilesTable.tiktokViewerId, viewerId),
      ),
    });

    if (!existing) {
      await db.insert(viewerProfilesTable).values({
        streamerId,
        tiktokViewerId: viewerId,
        viewerName,
        totalGifts: event.type === "gift" ? ((event.data?.coins as number) ?? 0) : 0,
        totalComments: event.type === "comment" ? 1 : 0,
        totalFollows: event.type === "follow" ? 1 : 0,
        totalLikes: event.type === "like" ? 1 : 0,
        vipLevel: "none",
        lastSeen: new Date(),
        firstSeen: new Date(),
      }).onConflictDoNothing();
      return;
    }

    const updates: Partial<typeof viewerProfilesTable.$inferInsert> = {
      viewerName,
      lastSeen: new Date(),
    };
    if (event.type === "gift") {
      const coins = (event.data?.coins as number) ?? 0;
      const newTotal = (existing.totalGifts ?? 0) + coins;
      updates.totalGifts = newTotal;
      updates.vipLevel = newTotal >= 10000 ? "diamond" : newTotal >= 3000 ? "gold" : newTotal >= 500 ? "silver" : "bronze";
    }
    if (event.type === "comment") updates.totalComments = (existing.totalComments ?? 0) + 1;
    if (event.type === "follow") updates.totalFollows = (existing.totalFollows ?? 0) + 1;
    if (event.type === "like") updates.totalLikes = (existing.totalLikes ?? 0) + 1;

    await db
      .update(viewerProfilesTable)
      .set(updates)
      .where(and(
        eq(viewerProfilesTable.streamerId, streamerId),
        eq(viewerProfilesTable.tiktokViewerId, viewerId),
      ));
  } catch (err: any) {
    console.warn("[MemoryAgent] upsertViewerProfile error:", err?.message);
  }
}

export async function getViewerContext(
  streamerId: number,
  viewerName: string,
  tiktokViewerId?: string,
): Promise<ViewerContext> {
  try {
    const viewerId = tiktokViewerId ?? viewerName;
    const profile = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, streamerId),
        eq(viewerProfilesTable.tiktokViewerId, viewerId),
      ),
    });

    const memories = await db.query.aiMemoriesTable.findMany({
      where: and(
        eq(aiMemoriesTable.streamerId, streamerId),
        eq(aiMemoriesTable.tiktokViewerId, viewerId),
      ),
      orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
      limit: 5,
    });

    const memoryStrings = memories.map(m => m.value);

    let contextSummary = "";
    if (profile) {
      const parts: string[] = [];
      if (profile.totalGifts > 0) parts.push(`sent ${profile.totalGifts} coins total`);
      if (profile.totalComments > 5) parts.push(`regular commenter (${profile.totalComments} comments)`);
      if (profile.vipLevel !== "none") parts.push(`${profile.vipLevel} VIP`);
      if (profile.totalFollows > 0) parts.push("has followed");
      if (profile.notes) parts.push(`note: ${profile.notes}`);
      const timeSinceFirst = Date.now() - new Date(profile.firstSeen).getTime();
      const isNew = timeSinceFirst < 5 * 60 * 1000;
      if (isNew) parts.push("new to the stream today");
      if (parts.length > 0) {
        contextSummary = `@${viewerName}: ${parts.join(", ")}.`;
      }
    }

    if (memoryStrings.length > 0) {
      contextSummary += ` Known facts: ${memoryStrings.join("; ")}.`;
    }

    return {
      profile: profile
        ? {
            viewerName: profile.viewerName,
            totalGifts: profile.totalGifts,
            totalComments: profile.totalComments,
            totalFollows: profile.totalFollows,
            vipLevel: profile.vipLevel,
            isFirstSeen: Date.now() - new Date(profile.firstSeen).getTime() < 5 * 60 * 1000,
            notes: profile.notes,
          }
        : null,
      memories: memoryStrings,
      contextSummary,
    };
  } catch (err: any) {
    console.warn("[MemoryAgent] getViewerContext error:", err?.message);
    return { profile: null, memories: [], contextSummary: "" };
  }
}

export async function storeMemory(
  streamerId: number,
  key: string,
  value: string,
  memoryType: string,
  viewerName?: string,
  tiktokViewerId?: string,
  importance = 3,
): Promise<void> {
  try {
    const existing = await db.query.aiMemoriesTable.findFirst({
      where: and(
        eq(aiMemoriesTable.streamerId, streamerId),
        eq(aiMemoriesTable.key, key),
        tiktokViewerId ? eq(aiMemoriesTable.tiktokViewerId, tiktokViewerId) : eq(aiMemoriesTable.memoryType, memoryType),
      ),
    });

    if (existing) {
      await db
        .update(aiMemoriesTable)
        .set({ value, lastAccessed: new Date(), updatedAt: new Date(), importance })
        .where(eq(aiMemoriesTable.id, existing.id));
    } else {
      await db.insert(aiMemoriesTable).values({
        streamerId,
        memoryType,
        key,
        value,
        viewerName: viewerName ?? null,
        tiktokViewerId: tiktokViewerId ?? null,
        importance,
        lastAccessed: new Date(),
      });
    }
  } catch (err: any) {
    console.warn("[MemoryAgent] storeMemory error:", err?.message);
  }
}

export async function getStreamerMemories(streamerId: number) {
  try {
    return await db.query.aiMemoriesTable.findMany({
      where: eq(aiMemoriesTable.streamerId, streamerId),
      orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
      limit: 50,
    });
  } catch {
    return [];
  }
}

export async function getViewerProfiles(streamerId: number) {
  try {
    return await db.query.agentViewerProfilesTable.findMany({
      where: eq(viewerProfilesTable.streamerId, streamerId),
      orderBy: [desc(viewerProfilesTable.totalGifts), desc(viewerProfilesTable.totalComments)],
      limit: 100,
    });
  } catch {
    return [];
  }
}
