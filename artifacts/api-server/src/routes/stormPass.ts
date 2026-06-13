import { Router } from "express";
import {
  db,
  agentViewerProfilesTable,
  aiMemoriesTable,
  viewerXpEventsTable,
  viewerAchievementsTable,
  achievementsTable,
} from "@workspace/db";
import { eq, and, or, sum, count, desc, sql } from "drizzle-orm";

const router = Router();

// ── XP / level helpers (mirrors frontend gamification.tsx) ────────────────────
function xpToLevel(xp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(xp / 50)) + 1);
}
function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Recruit", 2: "Scout", 3: "Apprentice", 5: "Warrior", 8: "Knight",
  10: "Cyber Knight", 15: "Champion", 20: "Hero", 25: "Elite Warrior",
  30: "Legend", 50: "Master", 75: "Grandmaster", 100: "Immortal",
};
function getLevelTitle(level: number): string {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const k of keys) if (level >= k) return LEVEL_TITLES[k];
  return "Recruit";
}

// ── Title engine ──────────────────────────────────────────────────────────────
function computeTitle(profile: {
  personalityTags: string;
  streakDays: number;
  totalGifts: number;
  firstSeen: Date;
}, level: number): { title: string; emoji: string } {
  const tags = (profile.personalityTags ?? "").split(",").map(t => t.trim()).filter(Boolean);
  const streak = profile.streakDays ?? 0;
  const gifts  = profile.totalGifts  ?? 0;
  const daysSinceFirst = Math.floor((Date.now() - new Date(profile.firstSeen).getTime()) / 86_400_000);

  if (streak >= 30)                    return { title: "Eternal Flame",      emoji: "🔥" };
  if (gifts  >= 50)                    return { title: "Storm Patron",        emoji: "⚡" };
  if (gifts  >= 20)                    return { title: "Diamond Backer",      emoji: "💎" };
  if (gifts  >= 10)                    return { title: "Gold Supporter",      emoji: "🥇" };
  if (tags.includes("boss_slayer"))    return { title: "Boss Slayer",         emoji: "🐉" };
  if (tags.includes("helpful"))        return { title: "Voice of the Chat",   emoji: "🎙️" };
  if (tags.includes("gifter"))         return { title: "Gift Master",         emoji: "🎁" };
  if (tags.includes("questioner"))     return { title: "The Curious One",     emoji: "🔍" };
  if (streak >= 7)                     return { title: "The Devoted",         emoji: "🌟" };
  if (level  >= 20)                    return { title: "Storm Veteran",       emoji: "🛡️" };
  if (level  >= 10)                    return { title: "Storm Warrior",       emoji: "⚔️" };
  if (daysSinceFirst >= 90)            return { title: "OG Viewer",           emoji: "👑" };
  return                                      { title: "Storm Newcomer",      emoji: "🌱" };
}

// ── Loyalty tier ──────────────────────────────────────────────────────────────
function computeLoyaltyTier(vipLevel: string, totalGifts: number, totalComments: number): "bronze" | "silver" | "gold" | "legend" {
  if (vipLevel === "vip"    || totalGifts    >= 10) return "legend";
  if (vipLevel === "gifter" || totalGifts    >=  3) return "gold";
  if (vipLevel === "regular"|| totalComments >= 20) return "silver";
  return "bronze";
}

// ── Fact icon from memory key ─────────────────────────────────────────────────
function factIcon(key: string): string {
  if (key.includes("location"))       return "📍";
  if (key.includes("age"))            return "🎂";
  if (key.includes("occupation"))     return "💼";
  if (key.includes("interest"))       return "🎯";
  if (key.includes("birthday"))       return "🎂";
  if (key.includes("schedule"))       return "🕐";
  if (key.includes("vip"))            return "⭐";
  return "💡";
}

// ── GET /api/storm-pass/:streamerId/:viewerId ─────────────────────────────────
// Public endpoint — safe viewer data only. No auth required.
router.get("/storm-pass/:streamerId/:viewerId", async (req, res) => {
  try {
    const streamerId = parseInt(req.params.streamerId, 10);
    const viewerId   = decodeURIComponent(req.params.viewerId);

    if (isNaN(streamerId) || !viewerId) {
      return res.status(400).json({ error: "Invalid streamerId or viewerId" });
    }

    // ── 1. Viewer profile (look up by tiktokViewerId OR viewerName) ──────────
    const profile = await db
      .select()
      .from(agentViewerProfilesTable)
      .where(
        and(
          eq(agentViewerProfilesTable.streamerId, streamerId),
          or(
            eq(agentViewerProfilesTable.tiktokViewerId, viewerId),
            eq(agentViewerProfilesTable.viewerName, viewerId),
          ),
        ),
      )
      .orderBy(desc(agentViewerProfilesTable.totalComments))
      .limit(1)
      .then(rows => rows[0] ?? null);

    if (!profile) {
      return res.status(404).json({ error: "Viewer not found", viewerId, streamerId });
    }

    const tiktokViewerId = profile.tiktokViewerId;

    // ── 2. XP events — total XP, coins, distinct sessions ───────────────────
    const xpRow = await db
      .select({
        totalXp:          sql<number>`COALESCE(SUM(${viewerXpEventsTable.xpAwarded}), 0)`,
        totalCoinsEarned: sql<number>`COALESCE(SUM(${viewerXpEventsTable.coinsAwarded}), 0)`,
        sessionsAttended: sql<number>`COUNT(DISTINCT ${viewerXpEventsTable.sessionId})`,
      })
      .from(viewerXpEventsTable)
      .where(
        and(
          eq(viewerXpEventsTable.streamerId, streamerId),
          eq(viewerXpEventsTable.tiktokViewerId, tiktokViewerId),
        ),
      )
      .then(rows => rows[0] ?? { totalXp: 0, totalCoinsEarned: 0, sessionsAttended: 0 });

    // ── 3. Achievements ──────────────────────────────────────────────────────
    const achievements = await db
      .select({
        key:         viewerAchievementsTable.achievementKey,
        unlockedAt:  viewerAchievementsTable.unlockedAt,
        name:        achievementsTable.name,
        description: achievementsTable.description,
        iconType:    achievementsTable.iconType,
        xpReward:    achievementsTable.xpReward,
      })
      .from(viewerAchievementsTable)
      .innerJoin(achievementsTable, eq(achievementsTable.key, viewerAchievementsTable.achievementKey))
      .where(
        and(
          eq(viewerAchievementsTable.streamerId, streamerId),
          eq(viewerAchievementsTable.tiktokViewerId, tiktokViewerId),
        ),
      )
      .orderBy(desc(viewerAchievementsTable.unlockedAt));

    // ── 4. Storm memories about this viewer ──────────────────────────────────
    const memories = await db
      .select({
        key:       aiMemoriesTable.key,
        value:     aiMemoriesTable.value,
        createdAt: aiMemoriesTable.createdAt,
      })
      .from(aiMemoriesTable)
      .where(
        and(
          eq(aiMemoriesTable.streamerId, streamerId),
          eq(aiMemoriesTable.tiktokViewerId, tiktokViewerId),
          eq(aiMemoriesTable.memoryType, "viewer"),
        ),
      )
      .orderBy(desc(aiMemoriesTable.importance), desc(aiMemoriesTable.lastAccessed))
      .limit(6);

    // ── 5. Derive calculated fields ──────────────────────────────────────────
    const totalXp  = Number(xpRow.totalXp) || 0;
    const level    = xpToLevel(totalXp);
    const thisLevelXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const xpProgress  = nextLevelXp > thisLevelXp
      ? Math.round(((totalXp - thisLevelXp) / (nextLevelXp - thisLevelXp)) * 100)
      : 100;
    const levelTitle   = getLevelTitle(level);
    const loyaltyTier  = computeLoyaltyTier(profile.vipLevel, profile.totalGifts, profile.totalComments);
    const titleResult  = computeTitle(profile, level);

    // ── 6. Build safe public response ────────────────────────────────────────
    const personalityTags = (profile.personalityTags ?? "")
      .split(",").map(t => t.trim()).filter(Boolean);

    return res.json({
      viewerName:       profile.viewerName,
      tiktokViewerId,
      streamerId,
      preferredName:    (profile as any).preferredName ?? null,
      customNickname:   (profile as any).customNickname ?? null,
      displayName:      (profile as any).preferredName ?? profile.viewerName,

      xp:               totalXp,
      xpToNextLevel:    nextLevelXp - totalXp,
      xpProgress,
      level,
      levelTitle,
      loyaltyTier,
      title:            titleResult.title,
      titleEmoji:       titleResult.emoji,

      stats: {
        totalGifts:      profile.totalGifts,
        totalComments:   profile.totalComments,
        totalLikes:      profile.totalLikes,
        totalCoinsSpent: profile.totalCoinsSpent,
      },

      sessionsAttended: Number(xpRow.sessionsAttended) || 0,
      streakDays:       profile.streakDays ?? 0,
      firstSeen:        profile.firstSeen.toISOString(),
      lastSeen:         profile.lastSeen.toISOString(),

      personalityTags,

      achievements: achievements.map(a => ({
        key:         a.key,
        name:        a.name,
        description: a.description,
        iconType:    a.iconType,
        xpReward:    a.xpReward,
        unlockedAt:  a.unlockedAt?.toISOString() ?? null,
      })),

      memories: memories.map(m => ({
        icon:      factIcon(m.key),
        value:     m.value,
        learnedAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("[StormPass] error:", (err as Error)?.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
