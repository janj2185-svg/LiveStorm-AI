import { db, aiMemoriesTable, agentViewerProfilesTable as viewerProfilesTable } from "@workspace/db";
import { eq, and, desc, sql, lt, lte } from "drizzle-orm";
import {
  detectTextTags,
  detectStatsTags,
  mergeTagsString,
  isToxicComment,
  tagsToMood,
  parseTags,
} from "./viewerPersonalityTagger";
import { hasPersonalFactSignal, extractViewerFacts } from "./viewerFactExtractor";

// ── Caches ────────────────────────────────────────────────────────────────────
// Only generic (global/stream/joke/preference) memories are cached per streamerId.
// Viewer-specific cards are always fetched fresh (fast indexed queries).
const genericMemoryCache = new Map<number, { memories: string[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// In-memory: track which viewers have been seen in each session (for return-visitor detection)
const sessionViewersSeen = new Map<number, Set<string>>();

export function trackViewerInSession(sessionId: number, viewerName: string): "first_time" | "returning" {
  if (!sessionViewersSeen.has(sessionId)) sessionViewersSeen.set(sessionId, new Set());
  const seen = sessionViewersSeen.get(sessionId)!;
  if (seen.has(viewerName)) return "returning";
  seen.add(viewerName);
  return "first_time";
}

export function clearSessionViewers(sessionId: number): void {
  sessionViewersSeen.delete(sessionId);
}

// ── Viewer Card builder ───────────────────────────────────────────────────────

function formatTimeAgo(ms: number): string {
  const h = ms / (1000 * 60 * 60);
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

type ViewerCardProfile = {
  firstSeen: Date;
  lastSeen: Date;
  totalGifts: number;
  totalComments: number;
  personalityTags: string;
  mood: string;
  typicalHour: number | null;
  totalCoinsSpent: number;
  preferredName?: string | null;
  customNickname?: string | null;
  nicknameSource?: string | null;
};

function buildViewerCard(
  viewerName: string,
  profile: ViewerCardProfile,
  viewerMemories: Array<{ key: string; value: string }>,
): string {
  const now = Date.now();
  const daysSinceFirst = Math.max(0, Math.floor((now - profile.firstSeen.getTime()) / (1000 * 60 * 60 * 24)));
  const lastSeenText = formatTimeAgo(now - profile.lastSeen.getTime());

  const isLegend = profile.totalGifts >= 10 || profile.totalComments >= 50;
  const isLoyal =
    !isLegend &&
    (profile.totalComments >= 30 || (profile.totalGifts >= 2 && profile.totalComments >= 10));
  const isRegular =
    !isLoyal && !isLegend && (profile.totalComments >= 15 || profile.totalGifts >= 2);
  const relationshipLabel = isLegend ? "legend" : isLoyal ? "loyal" : isRegular ? "regular" : "returning";

  const tags = parseTags(profile.personalityTags);
  const tagStr = tags.length > 0 ? " · " + tags.join(" · ") : "";
  const headerLine = `${daysSinceFirst}d · ${profile.totalGifts} gifts · ${profile.totalComments} comments · ${relationshipLabel}${tagStr}`;

  const moodParts: string[] = [];
  if (profile.mood && profile.mood !== "neutral") moodParts.push(`Mood: ${profile.mood}`);
  if (profile.typicalHour != null) moodParts.push(`Visits: ~${profile.typicalHour}:00`);
  const moodLine = moodParts.join(" · ");

  const PRIVATE_KEYS_VC = ["phone","email","address","age","salary","income","private","contact","password","home_address","location_home"];
  const factLines = viewerMemories
    .filter((m) => !PRIVATE_KEYS_VC.some((k) => m.key.toLowerCase().includes(k)))
    .slice(0, 4)
    .map((m) => m.value);
  const knownLine = factLines.length > 0 ? `Known: ${factLines.join("; ")}` : null;

  // ── Personal addressing ────────────────────────────────────────────────────
  // preferredName = viewer said "call me X" — use this ALWAYS instead of username
  // customNickname = AI/streamer assigned a friendly nickname (e.g. "зайчик Іван")
  const addressName = profile.preferredName || profile.customNickname;
  const addressLine = addressName
    ? `ADDRESS AS: "${addressName}" — always use this name/nickname instead of "${viewerName}" when speaking to them`
    : null;

  // Only inject RECALL when there is actually something meaningful to reference
  const hasMeaningfulHistory =
    profile.totalGifts >= 1 || profile.totalComments >= 5 || viewerMemories.length > 0 || !!addressName;
  const recallLine = hasMeaningfulHistory
    ? `RECALL: ${viewerName} is someone you know — weave ONE relevant detail naturally into your reply.`
    : null;

  return [
    `=== VIEWER: ${viewerName} ===`,
    headerLine,
    moodLine || null,
    addressLine,
    knownLine,
    `Last seen: ${lastSeenText}`,
    recallLine,
    `===`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildViewerCardForContext(
  streamerId: number,
  viewerName: string,
): Promise<string | null> {
  try {
    const profile = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, streamerId),
        eq(viewerProfilesTable.viewerName, viewerName),
      ),
    });
    if (!profile) {
      console.log(`[ViewerCard] 🚫 no profile for viewer=${viewerName}`);
      return null;
    }

    const viewerMems = await db.query.aiMemoriesTable.findMany({
      where: and(
        eq(aiMemoriesTable.streamerId, streamerId),
        eq(aiMemoriesTable.viewerName, viewerName),
        eq(aiMemoriesTable.memoryType, "viewer"),
      ),
      orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
      limit: 4,
    });

    const card = buildViewerCard(
      viewerName,
      profile,
      viewerMems.map((m) => ({ key: m.key, value: m.value })),
    );
    const tags = parseTags(profile.personalityTags ?? "");
    console.log(
      `[ViewerCard] ✅ built | viewer=${viewerName} | tags=[${tags.join(",")}] | facts=${viewerMems.length} | mood=${profile.mood} | chars=${card.length}`,
    );
    console.log(`[ViewerCard:content]\n${card}`);
    return card;
  } catch {
    return null;
  }
}

// ── Derive a recognition tag (legacy — kept for backward compat) ─────────────
export function getViewerRecognitionTag(profile: {
  firstSeen: Date;
  lastSeen: Date;
  totalComments: number;
  totalGifts: number;
  vipLevel: string;
}): string | null {
  const now = Date.now();
  const daysSinceFirst = (now - profile.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
  const hoursSinceLast = (now - profile.lastSeen.getTime()) / (1000 * 60 * 60);
  const isReturning = hoursSinceLast < 24 && daysSinceFirst > 0.01;
  const isRegular = profile.totalComments >= 15 || profile.totalGifts >= 2;
  const isLegend = profile.totalGifts >= 10 || profile.totalComments >= 50;
  if (isLegend)
    return `legendary_regular: ${Math.round(daysSinceFirst)}d member, ${profile.totalGifts} gifts, ${profile.totalComments} comments`;
  if (isRegular && isReturning)
    return `loyal_viewer: back after ${Math.round(hoursSinceLast)}h, ${profile.totalComments} total comments`;
  if (isRegular) return `regular_viewer: ${profile.totalComments} comments over ${Math.round(daysSinceFirst)}d`;
  if (isReturning) return `returning_viewer: was here ${Math.round(hoursSinceLast)}h ago`;
  return null;
}

// ── Memory pruning ───────────────────────────────────────────────────────────
export async function pruneOldMemories(streamerId: number): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
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
      console.log(`[MemoryAgent] 🧹 pruned ${count} stale memories | streamer=${streamerId}`);
      genericMemoryCache.delete(streamerId);
    }
  } catch (err) {
    console.error("[MemoryAgent] prune error:", (err as Error)?.message);
  }
}

// ── Store a single memory ─────────────────────────────────────────────────────
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
    genericMemoryCache.delete(opts.streamerId);
  } catch (err: unknown) {
    console.error("[MemoryAgent] storeMemory error:", (err as Error)?.message);
  }
}

// ── Get memory context (Viewer Card + generic memories) ──────────────────────
export async function getMemoryContext(streamerId: number, viewerName?: string): Promise<string> {
  const sections: string[] = [];

  // 1. Viewer Card — always fresh (per-viewer, no cache)
  if (viewerName) {
    const card = await buildViewerCardForContext(streamerId, viewerName);
    if (card) sections.push(card);
  }

  // 2. Generic memories — cached per streamerId
  try {
    const cached = genericMemoryCache.get(streamerId);
    let genericLines: string[];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      genericLines = cached.memories;
    } else {
      const [global, streamMem, jokeMem, prefMem] = await Promise.all([
        db.query.aiMemoriesTable.findMany({
          where: and(eq(aiMemoriesTable.streamerId, streamerId), eq(aiMemoriesTable.memoryType, "global")),
          orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
          limit: 5,
        }),
        db.query.aiMemoriesTable.findMany({
          where: and(eq(aiMemoriesTable.streamerId, streamerId), eq(aiMemoriesTable.memoryType, "stream")),
          orderBy: [desc(aiMemoriesTable.lastAccessed)],
          limit: 3,
        }),
        db.query.aiMemoriesTable.findMany({
          where: and(eq(aiMemoriesTable.streamerId, streamerId), eq(aiMemoriesTable.memoryType, "joke")),
          orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
          limit: 3,
        }),
        db.query.aiMemoriesTable.findMany({
          where: and(eq(aiMemoriesTable.streamerId, streamerId), eq(aiMemoriesTable.memoryType, "preference")),
          orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
          limit: 3,
        }),
      ]);
      genericLines = [
        ...global.map((m) => `[Global] ${m.key}: ${m.value}`),
        ...streamMem.map((m) => `[Stream] ${m.key}: ${m.value}`),
        ...jokeMem.map((m) => `[Joke] ${m.key}: ${m.value}`),
        ...prefMem.map((m) => `[Preference] ${m.key}: ${m.value}`),
      ];
      genericMemoryCache.set(streamerId, { memories: genericLines, ts: Date.now() });
    }
    if (genericLines.length > 0) sections.push(genericLines.join("\n"));
  } catch {
    // Non-fatal
  }

  return sections.join("\n");
}

// ── Upsert viewer profile with personality tagging + fact extraction ──────────
export async function upsertViewerProfile(opts: {
  streamerId: number;
  tiktokViewerId: string;
  viewerName: string;
  eventType: "comment" | "gift" | "follow" | "like";
  coins?: number;
  commentText?: string;
  giftName?: string;
  sessionId?: number;
}): Promise<void> {
  try {
    const existing = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, opts.streamerId),
        eq(viewerProfilesTable.tiktokViewerId, opts.tiktokViewerId),
      ),
    });

    const now = new Date();
    const currentHour = now.getHours();

    if (!existing) {
      // New viewer
      const textTags = opts.commentText ? detectTextTags(opts.commentText) : [];
      const initialMood = opts.commentText
        ? (tagsToMood(textTags, isToxicComment(opts.commentText)) ?? "neutral")
        : "neutral";

      await db.insert(viewerProfilesTable).values({
        streamerId: opts.streamerId,
        tiktokViewerId: opts.tiktokViewerId,
        viewerName: opts.viewerName,
        totalGifts: opts.eventType === "gift" ? 1 : 0,
        totalComments: opts.eventType === "comment" ? 1 : 0,
        totalFollows: opts.eventType === "follow" ? 1 : 0,
        totalLikes: opts.eventType === "like" ? 1 : 0,
        totalCoinsSpent: opts.eventType === "gift" ? (opts.coins ?? 0) : 0,
        vipLevel: "none",
        personalityTags: textTags.join(","),
        mood: initialMood,
        typicalHour: currentHour,
        streakDays: 1,
        lastGiftName: opts.giftName ?? null,
        firstSeen: now,
        lastSeen: now,
      });
      return;
    }

    // ── Build updates ─────────────────────────────────────────────────────────
    const updates: Record<string, unknown> = { lastSeen: now, viewerName: opts.viewerName };

    // Event counters
    if (opts.eventType === "comment") updates.totalComments = sql`${viewerProfilesTable.totalComments} + 1`;
    if (opts.eventType === "gift")   updates.totalGifts   = sql`${viewerProfilesTable.totalGifts} + 1`;
    if (opts.eventType === "follow") updates.totalFollows = sql`${viewerProfilesTable.totalFollows} + 1`;
    if (opts.eventType === "like")   updates.totalLikes   = sql`${viewerProfilesTable.totalLikes} + 1`;

    // Coins spent
    if (opts.eventType === "gift" && opts.coins) {
      updates.totalCoinsSpent = sql`${viewerProfilesTable.totalCoinsSpent} + ${opts.coins}`;
    }

    // Last gift name
    if (opts.eventType === "gift" && opts.giftName) {
      updates.lastGiftName = opts.giftName;
    }

    // VIP level
    const totalGifts = opts.eventType === "gift" ? existing.totalGifts + 1 : existing.totalGifts;
    const totalComments = opts.eventType === "comment" ? existing.totalComments + 1 : existing.totalComments;
    const totalCoinsSpent = existing.totalCoinsSpent + (opts.eventType === "gift" ? (opts.coins ?? 0) : 0);
    let vipLevel = existing.vipLevel;
    if (totalGifts >= 10) vipLevel = "vip";
    else if (totalGifts >= 3) vipLevel = "gifter";
    else if (totalComments >= 20) vipLevel = "regular";
    updates.vipLevel = vipLevel;

    // ── Personality tagging ───────────────────────────────────────────────────
    let newTagsStr = existing.personalityTags ?? "";
    if (opts.commentText) {
      const textTags = detectTextTags(opts.commentText);
      console.log(`[PersonalityTagger] viewer=${opts.viewerName} | textTags=[${textTags.join(",")}] | existing=[${newTagsStr}]`);
      if (textTags.length > 0) {
        newTagsStr = mergeTagsString(newTagsStr, textTags);
      }
      // Mood (ephemeral, updated each comment — does NOT persist negative long-term)
      const toxic = isToxicComment(opts.commentText);
      const moodUpdate = tagsToMood(textTags, toxic);
      if (moodUpdate) updates.mood = moodUpdate;
    }
    // Stats-based tags
    const statsTags = detectStatsTags({ totalComments, totalGifts, totalCoinsSpent });
    if (statsTags.length > 0) {
      newTagsStr = mergeTagsString(newTagsStr, statsTags);
    }
    updates.personalityTags = newTagsStr;

    // ── Typical hour (rolling weighted average) ───────────────────────────────
    const existingHour = existing.typicalHour;
    updates.typicalHour =
      existingHour != null
        ? Math.round(existingHour * 0.7 + currentHour * 0.3)
        : currentHour;

    // ── Streak days ───────────────────────────────────────────────────────────
    const hoursSinceLast = (now.getTime() - existing.lastSeen.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast >= 20 && hoursSinceLast <= 48) {
      updates.streakDays = (existing.streakDays ?? 0) + 1;
    } else if (hoursSinceLast > 48) {
      updates.streakDays = 1;
    }

    await db.update(viewerProfilesTable).set(updates as any).where(eq(viewerProfilesTable.id, existing.id));

    // ── VIP promotion memory (first time hitting gifter threshold) ────────────
    if (totalGifts >= 3 && existing.vipLevel === "none") {
      void storeMemory({
        streamerId: opts.streamerId,
        memoryType: "viewer",
        key: `${opts.viewerName}_vip`,
        value: `${opts.viewerName} is a gifter with ${totalGifts} gifts. Treat them as VIP.`,
        viewerName: opts.viewerName,
        tiktokViewerId: opts.tiktokViewerId,
        importance: 4,
      });
    }

    // ── GPT fact extraction (fire-and-forget, only on comments with signal) ───
    const signalDetected = opts.commentText && opts.eventType === "comment" && hasPersonalFactSignal(opts.commentText);
    console.log(`[ViewerFacts:signal] viewer=${opts.viewerName} | text="${(opts.commentText ?? "").slice(0, 40)}" | signal=${!!signalDetected}`);
    if (signalDetected) {
      const existingViewerMems = await db.query.aiMemoriesTable.findMany({
        where: and(
          eq(aiMemoriesTable.streamerId, opts.streamerId),
          eq(aiMemoriesTable.viewerName, opts.viewerName),
          eq(aiMemoriesTable.memoryType, "viewer"),
        ),
        orderBy: [desc(aiMemoriesTable.lastAccessed)],
        limit: 10,
      });
      const existingKeys = existingViewerMems.map((m) => m.key);

      void (async () => {
        const facts = await extractViewerFacts({
          text: opts.commentText!,
          viewerName: opts.viewerName,
          streamerId: opts.streamerId,
          existingFactKeys: existingKeys,
        });
        if (facts && facts.length > 0) {
          for (const fact of facts) {
            await storeMemory({
              streamerId: opts.streamerId,
              memoryType: "viewer",
              key: `${opts.viewerName}_${fact.key}`,
              value: fact.value,
              viewerName: opts.viewerName,
              tiktokViewerId: opts.tiktokViewerId,
              importance: 3,
            });
          }
        }
      })();
    }

    // Occasional prune
    if (Math.random() < 0.01) void pruneOldMemories(opts.streamerId);
  } catch (err: unknown) {
    console.error("[MemoryAgent] upsertViewerProfile error:", (err as Error)?.message);
  }
}

// ── Save preferred name / nickname to viewer profile ─────────────────────────
export async function saveViewerNickname(opts: {
  streamerId: number;
  tiktokViewerId: string;
  viewerName: string;
  preferredName?: string;
  customNickname?: string;
  source: "viewer" | "ai" | "streamer";
}): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      nicknameSource: opts.source,
      nicknameAskedAt: new Date(),
    };
    if (opts.preferredName) updates.preferredName = opts.preferredName;
    if (opts.customNickname) updates.customNickname = opts.customNickname;

    const existing = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, opts.streamerId),
        eq(viewerProfilesTable.tiktokViewerId, opts.tiktokViewerId),
      ),
    });

    if (existing) {
      await db
        .update(viewerProfilesTable)
        .set(updates as any)
        .where(eq(viewerProfilesTable.id, existing.id));
      console.log(
        `[Nickname] 💾 saved | viewer=${opts.viewerName} | preferredName="${opts.preferredName ?? ""}" | source=${opts.source}`,
      );
    }
  } catch (err: unknown) {
    console.error("[Nickname] saveViewerNickname error:", (err as Error)?.message);
  }
}

// ── Check if we should ask this viewer for their preferred name ───────────────
export async function shouldAskForNickname(opts: {
  streamerId: number;
  tiktokViewerId: string;
  totalComments: number;
}): Promise<boolean> {
  if (opts.totalComments < 3) return false;
  try {
    const prof = await db.query.agentViewerProfilesTable.findFirst({
      where: and(
        eq(viewerProfilesTable.streamerId, opts.streamerId),
        eq(viewerProfilesTable.tiktokViewerId, opts.tiktokViewerId),
      ),
    });
    if (!prof) return false;
    const p = prof as any;
    return !p.preferredName && !p.customNickname;
  } catch {
    return false;
  }
}

// ── Get raw viewer profile ────────────────────────────────────────────────────
export async function getViewerProfile(streamerId: number, tiktokViewerId: string) {
  return db.query.agentViewerProfilesTable.findFirst({
    where: and(
      eq(viewerProfilesTable.streamerId, streamerId),
      eq(viewerProfilesTable.tiktokViewerId, tiktokViewerId),
    ),
  });
}

// ── Full profile + keyed memories for the Recognition Engine ─────────────────
// getViewerContext (lib) returns a minimal profile without firstSeen/lastSeen,
// and memories as string[] without keys. Recognition Engine needs both.
export async function getViewerContextForRecognition(
  streamerId: number,
  viewerName: string,
): Promise<{
  profile: {
    firstSeen:       Date | string;
    lastSeen:        Date | string;
    totalGifts:      number;
    totalComments:   number;
    vipLevel:        string;
    streakDays:      number;
    totalCoinsSpent: number;
    personalityTags: string;
  } | null;
  memories: Array<{ key: string; value: string }>;
}> {
  try {
    const [profile, mems] = await Promise.all([
      db.query.agentViewerProfilesTable.findFirst({
        where: and(
          eq(viewerProfilesTable.streamerId, streamerId),
          eq(viewerProfilesTable.viewerName, viewerName),
        ),
      }),
      db.query.aiMemoriesTable.findMany({
        where: and(
          eq(aiMemoriesTable.streamerId, streamerId),
          eq(aiMemoriesTable.viewerName, viewerName),
          eq(aiMemoriesTable.memoryType, "viewer"),
        ),
        orderBy: [desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed)],
        limit: 8,
      }),
    ]);
    return {
      profile: profile
        ? {
            firstSeen:       profile.firstSeen,
            lastSeen:        profile.lastSeen,
            totalGifts:      profile.totalGifts,
            totalComments:   profile.totalComments,
            vipLevel:        profile.vipLevel,
            streakDays:      profile.streakDays,
            totalCoinsSpent: profile.totalCoinsSpent,
            personalityTags: profile.personalityTags ?? "",
          }
        : null,
      memories: mems.map((m) => ({ key: m.key, value: m.value })),
    };
  } catch {
    return { profile: null, memories: [] };
  }
}

// ── List memories for a streamer ──────────────────────────────────────────────
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

// ── Scheduled background pruning ─────────────────────────────────────────────
export async function schedulePruning(): Promise<void> {
  const startTs = Date.now();
  try {
    const rows = await db.selectDistinct({ id: aiMemoriesTable.streamerId }).from(aiMemoriesTable);
    let pruned = 0;
    for (const { id } of rows) {
      await pruneOldMemories(id);
      pruned++;
    }
    console.log(
      `[MemoryAgent] 🗓️ scheduled pruning | ${pruned} streamer(s) | ${Date.now() - startTs}ms`,
    );
  } catch (err) {
    console.error("[MemoryAgent] schedulePruning error:", (err as Error)?.message);
  }
}
