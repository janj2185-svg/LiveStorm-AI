import type { Server as SocketServer } from "socket.io";
import type { TikTokEvent } from "./tiktokSimulator";
import { db } from "@workspace/db";
import {
  viewerXpEventsTable,
  viewerAchievementsTable,
  achievementsTable,
  bossBattlesTable,
  bossAttacksTable,
  kingdomBuildingsTable,
  kingdomsTable,
  streamersTable,
} from "@workspace/db";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { emitAiLevelUpAnnouncement, emitAiBossDefeatedAnnouncement } from "./aiAnnouncer";

const XP_TABLE: Record<string, number> = {
  gift: 10,
  like: 1,
  comment: 2,
  follow: 5,
  share: 3,
};

const BOSS_DAMAGE_TABLE: Record<string, number> = {
  gift: 0, // coins-based, calculated below
  like: 1,
  comment: 1,
  follow: 5,
  share: 2,
};

const BUILDING_UNLOCK_THRESHOLDS: Array<{ type: string; gold: number; emoji: string }> = [
  { type: "Tavern", gold: 100, emoji: "🍺" },
  { type: "Farm", gold: 300, emoji: "🌾" },
  { type: "Barracks", gold: 600, emoji: "⚔️" },
  { type: "Market", gold: 1000, emoji: "🏪" },
  { type: "Castle", gold: 2000, emoji: "🏰" },
  { type: "Cathedral", gold: 5000, emoji: "⛪" },
];

export const ACHIEVEMENT_SEEDS = [
  { key: "first_gift", name: "First Blood", description: "Receive your first gift from a viewer", iconType: "zap", xpReward: 50, coinReward: 10 },
  { key: "first_comment", name: "Chatterbox", description: "Receive your first comment", iconType: "message", xpReward: 20, coinReward: 5 },
  { key: "first_follow", name: "First Follower", description: "Gain your first follower", iconType: "heart", xpReward: 30, coinReward: 5 },
  { key: "gift_giver_5", name: "Gift Giver", description: "Send 5 gifts to a streamer", iconType: "gift", xpReward: 100, coinReward: 20 },
  { key: "gift_giver_50", name: "Super Fan", description: "Send 50 gifts to a streamer", iconType: "star", xpReward: 500, coinReward: 100 },
  { key: "boss_slayer", name: "Boss Slayer", description: "Deal the killing blow on a boss", iconType: "sword", xpReward: 200, coinReward: 50 },
  { key: "level_5", name: "Rising Star", description: "Reach viewer level 5", iconType: "trending", xpReward: 100, coinReward: 25 },
  { key: "level_10", name: "Cyber Knight", description: "Reach viewer level 10", iconType: "trophy", xpReward: 300, coinReward: 75 },
  { key: "level_25", name: "Elite Warrior", description: "Reach viewer level 25", iconType: "shield", xpReward: 1000, coinReward: 200 },
  { key: "kingdom_tavern", name: "First Building", description: "Unlock the Tavern in your kingdom", iconType: "home", xpReward: 50, coinReward: 10 },
  { key: "kingdom_castle", name: "Castle Owner", description: "Unlock the Castle in your kingdom", iconType: "castle", xpReward: 500, coinReward: 100 },
  { key: "streak_3", name: "On Fire", description: "Stream 3 days in a row", iconType: "flame", xpReward: 150, coinReward: 30 },
  { key: "viewer_100", name: "Crowd Puller", description: "Reach 100 concurrent viewers", iconType: "users", xpReward: 200, coinReward: 50 },
  { key: "comments_100", name: "Chatter Master", description: "Receive 100 comments in a session", iconType: "chat", xpReward: 100, coinReward: 20 },
  { key: "likes_1000", name: "Like Magnet", description: "Receive 1,000 likes in a session", iconType: "heart", xpReward: 150, coinReward: 30 },
  { key: "boss_fighter", name: "Monster Hunter", description: "Participate in 5 boss battles", iconType: "axe", xpReward: 250, coinReward: 60 },
  { key: "spin_winner", name: "Lucky Spin", description: "Win a prize on the Spin Wheel", iconType: "circle", xpReward: 50, coinReward: 0 },
  { key: "quiz_winner", name: "Quiz Champion", description: "Win a Quiz Mode game", iconType: "brain", xpReward: 75, coinReward: 15 },
  { key: "treasure_finder", name: "Treasure Hunter", description: "Win a Treasure Hunt", iconType: "map", xpReward: 75, coinReward: 15 },
  { key: "pvp_champion", name: "PvP Champion", description: "Win a PvP Battle", iconType: "swords", xpReward: 100, coinReward: 20 },
];

// ---------------------------------------------------------------------------
// In-memory active mini-game state (per sessionId)
// ---------------------------------------------------------------------------

interface ActiveQuiz {
  question: string;
  normalizedAnswer: string;
  xpReward: number;
  coinReward: number;
  streamerId: number;
  resolvedAt: number | null;
}

interface ActiveTreasureHunt {
  keyword: string;
  prize: string;
  xpReward: number;
  coinReward: number;
  streamerId: number;
  resolvedAt: number | null;
}

const activeQuizzes = new Map<number, ActiveQuiz>();
const activeTreasureHunts = new Map<number, ActiveTreasureHunt>();

export function startQuizGame(
  sessionId: number,
  streamerId: number,
  question: string,
  answer: string,
  xpReward = 300,
  coinReward = 50
) {
  activeQuizzes.set(sessionId, {
    question,
    normalizedAnswer: answer.toLowerCase().trim(),
    xpReward,
    coinReward,
    streamerId,
    resolvedAt: null,
  });
}

export function startTreasureHuntGame(
  sessionId: number,
  streamerId: number,
  keyword: string,
  prize: string,
  xpReward = 200,
  coinReward = 40
) {
  activeTreasureHunts.set(sessionId, {
    keyword: keyword.toLowerCase().trim(),
    prize,
    xpReward,
    coinReward,
    streamerId,
    resolvedAt: null,
  });
}

// ---------------------------------------------------------------------------

export async function seedAchievements() {
  try {
    const existing = await db.select().from(achievementsTable);
    if (existing.length > 0) return;
    await db.insert(achievementsTable).values(ACHIEVEMENT_SEEDS);
  } catch (_err) {}
}

function xpToLevel(totalXp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(totalXp / 50)) + 1);
}

async function getViewerTotalXp(tiktokViewerId: string, streamerId: number): Promise<number> {
  const result = await db
    .select({ total: sql<number>`coalesce(sum(${viewerXpEventsTable.xpAwarded}), 0)` })
    .from(viewerXpEventsTable)
    .where(
      and(
        eq(viewerXpEventsTable.tiktokViewerId, tiktokViewerId),
        eq(viewerXpEventsTable.streamerId, streamerId)
      )
    );
  return Number(result[0]?.total ?? 0);
}

async function checkAndUnlockAchievement(
  io: SocketServer,
  roomId: string,
  tiktokViewerId: string,
  viewerName: string,
  streamerId: number,
  achievementKey: string
) {
  try {
    const existing = await db
      .select()
      .from(viewerAchievementsTable)
      .where(
        and(
          eq(viewerAchievementsTable.tiktokViewerId, tiktokViewerId),
          eq(viewerAchievementsTable.streamerId, streamerId),
          eq(viewerAchievementsTable.achievementKey, achievementKey)
        )
      );
    if (existing.length > 0) return;

    await db.insert(viewerAchievementsTable).values({
      tiktokViewerId,
      viewerName,
      streamerId,
      achievementKey,
    });

    const achievement = await db.query.achievementsTable.findFirst({
      where: eq(achievementsTable.key, achievementKey),
    });

    if (achievement) {
      io.to(roomId).emit("achievement:unlocked", {
        viewerName,
        achievement: { key: achievement.key, name: achievement.name, description: achievement.description },
        timestamp: Date.now(),
      });
    }
  } catch (_err) {}
}

async function checkViewerAchievements(
  io: SocketServer,
  roomId: string,
  tiktokViewerId: string,
  viewerName: string,
  streamerId: number,
  event: TikTokEvent
) {
  try {
    const totalXp = await getViewerTotalXp(tiktokViewerId, streamerId);
    const level = xpToLevel(totalXp);

    if (level >= 5) await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "level_5");
    if (level >= 10) await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "level_10");
    if (level >= 25) await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "level_25");

    if (event.type === "gift") {
      await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "first_gift");
      const giftCount = await db
        .select({ c: count() })
        .from(viewerXpEventsTable)
        .where(
          and(
            eq(viewerXpEventsTable.tiktokViewerId, tiktokViewerId),
            eq(viewerXpEventsTable.streamerId, streamerId),
            eq(viewerXpEventsTable.eventType, "gift")
          )
        );
      const gifts = Number(giftCount[0]?.c ?? 0);
      if (gifts >= 5) await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "gift_giver_5");
      if (gifts >= 50) await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "gift_giver_50");
    }
    if (event.type === "comment") await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "first_comment");
    if (event.type === "follow") await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "first_follow");
  } catch (_err) {}
}

// ---------------------------------------------------------------------------
// Boss battle reward distribution on defeat — exported so /end route can call it
// ---------------------------------------------------------------------------

export async function distributeBossDefeatRewards(
  io: SocketServer,
  roomId: string,
  battleId: number,
  streamerId: number
) {
  try {
    const participants = await db
      .select({
        tiktokViewerId: bossAttacksTable.tiktokViewerId,
        viewerName: sql<string>`max(${bossAttacksTable.viewerName})`,
        totalDamage: sql<number>`sum(${bossAttacksTable.damage})`,
      })
      .from(bossAttacksTable)
      .where(eq(bossAttacksTable.battleId, battleId))
      .groupBy(bossAttacksTable.tiktokViewerId)
      .orderBy(desc(sql`sum(${bossAttacksTable.damage})`))
      .limit(50);

    if (participants.length === 0) return;

    const totalDamageDealt = participants.reduce((s, p) => s + Number(p.totalDamage), 0);

    const rewards: Array<{ viewerName: string; xp: number; coins: number; rank: number }> = [];

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const damageShare = Number(p.totalDamage) / Math.max(1, totalDamageDealt);

      let xp = 50;
      let coins = 10;

      if (i === 0) { xp += 300; coins += 100; }
      else if (i === 1) { xp += 150; coins += 50; }
      else if (i === 2) { xp += 75; coins += 25; }

      xp += Math.floor(damageShare * 200);
      coins += Math.floor(damageShare * 50);

      await db.insert(viewerXpEventsTable).values({
        tiktokViewerId: p.tiktokViewerId,
        viewerName: p.viewerName,
        streamerId,
        eventType: "boss_reward",
        xpAwarded: xp,
        coinsAwarded: coins,
      });

      rewards.push({ viewerName: p.viewerName, xp, coins, rank: i + 1 });
    }

    io.to(roomId).emit("boss:rewards_distributed", {
      battleId,
      rewards: rewards.slice(0, 10),
      totalParticipants: participants.length,
      timestamp: Date.now(),
    });
  } catch (_err) {}
}

async function processBossBattle(
  io: SocketServer,
  roomId: string,
  tiktokViewerId: string,
  viewerName: string,
  streamerId: number,
  event: TikTokEvent
) {
  try {
    const battle = await db.query.bossBattlesTable.findFirst({
      where: and(
        eq(bossBattlesTable.streamerId, streamerId),
        eq(bossBattlesTable.status, "active")
      ),
    });
    if (!battle) return;

    let damage = BOSS_DAMAGE_TABLE[event.type] ?? 0;
    if (event.type === "gift") {
      const coins = (event.data.coins as number) ?? 1;
      damage = Math.max(1, Math.floor(coins * 2));
    }
    if (damage === 0) return;

    // Atomic HP update — prevents race condition with concurrent attacks.
    // GREATEST(0, currentHp - damage) prevents going below 0.
    // Status and endedAt are set in the same statement to avoid a second round-trip.
    const [updated] = await db
      .update(bossBattlesTable)
      .set({
        currentHp: sql`GREATEST(0, ${bossBattlesTable.currentHp} - ${damage})`,
        status: sql`CASE WHEN GREATEST(0, ${bossBattlesTable.currentHp} - ${damage}) = 0 THEN 'defeated' ELSE ${bossBattlesTable.status} END`,
        endedAt: sql`CASE WHEN GREATEST(0, ${bossBattlesTable.currentHp} - ${damage}) = 0 THEN NOW() ELSE ${bossBattlesTable.endedAt} END`,
      })
      .where(
        and(
          eq(bossBattlesTable.id, battle.id),
          eq(bossBattlesTable.status, "active")
        )
      )
      .returning();

    if (!updated) return; // Battle was already ended by a concurrent update

    // Record the attack after the HP update so we see the actual game state
    await db.insert(bossAttacksTable).values({
      battleId: battle.id,
      tiktokViewerId,
      viewerName,
      attackType: event.type,
      damage,
    });

    const newHp = updated.currentHp;
    const isDefeated = updated.status === "defeated";

    console.log(`[Boss] ${viewerName} dealt ${damage} dmg to "${battle.bossName}" | HP: ${battle.currentHp} → ${newHp}${isDefeated ? " DEFEATED!" : ""}`);

    io.to(roomId).emit("boss:attacked", {
      battleId: battle.id,
      viewerName,
      attackType: event.type,
      damage,
      currentHp: newHp,
      maxHp: battle.maxHp,
      defeated: isDefeated,
      timestamp: Date.now(),
    });

    if (isDefeated) {
      io.to(roomId).emit("boss:defeated", {
        battleId: battle.id,
        bossName: battle.bossName,
        killingBlowBy: viewerName,
        timestamp: Date.now(),
      });
      void emitAiBossDefeatedAnnouncement(io, roomId, streamerId, battle.bossName, viewerName);
      await checkAndUnlockAchievement(io, roomId, tiktokViewerId, viewerName, streamerId, "boss_slayer");
      await distributeBossDefeatRewards(io, roomId, battle.id, streamerId);
    }
  } catch (_err) {}
}

async function processKingdomResources(streamerId: number, event: TikTokEvent) {
  try {
    const kingdom = await db.query.kingdomsTable.findFirst({
      where: eq(kingdomsTable.streamerId, streamerId),
    });
    if (!kingdom) return;

    let goldDelta = 0;
    let woodDelta = 0;
    let stoneDelta = 0;

    if (event.type === "gift") {
      const coins = (event.data.coins as number) ?? 0;
      goldDelta = coins;
    } else if (event.type === "like") {
      woodDelta = 1;
    } else if (event.type === "follow") {
      stoneDelta = 2;
    } else if (event.type === "share") {
      goldDelta = 2;
      woodDelta = 1;
    }

    if (goldDelta === 0 && woodDelta === 0 && stoneDelta === 0) return;

    await db
      .update(kingdomsTable)
      .set({
        gold: sql`${kingdomsTable.gold} + ${goldDelta}`,
        wood: sql`${kingdomsTable.wood} + ${woodDelta}`,
        stone: sql`${kingdomsTable.stone} + ${stoneDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(kingdomsTable.id, kingdom.id));

    const updated = await db.query.kingdomsTable.findFirst({
      where: eq(kingdomsTable.id, kingdom.id),
    });
    if (!updated) return;

    for (const threshold of BUILDING_UNLOCK_THRESHOLDS) {
      if (updated.gold >= threshold.gold) {
        const existing = await db
          .select()
          .from(kingdomBuildingsTable)
          .where(
            and(
              eq(kingdomBuildingsTable.streamerId, streamerId),
              eq(kingdomBuildingsTable.buildingType, threshold.type)
            )
          );
        if (existing.length === 0) {
          await db.insert(kingdomBuildingsTable).values({
            streamerId,
            buildingType: threshold.type,
            level: 1,
          });
        }
      }
    }
  } catch (_err) {}
}

// ---------------------------------------------------------------------------
// Resolve mini-game comment matches (quiz / treasure hunt)
// ---------------------------------------------------------------------------

async function resolveMinigameComment(
  io: SocketServer,
  roomId: string,
  sessionId: number,
  tiktokViewerId: string,
  viewerName: string,
  commentText: string
) {
  const normalized = commentText.toLowerCase().trim();

  const quiz = activeQuizzes.get(sessionId);
  if (quiz && quiz.resolvedAt === null) {
    if (normalized === quiz.normalizedAnswer) {
      quiz.resolvedAt = Date.now();
      activeQuizzes.set(sessionId, quiz);

      await db.insert(viewerXpEventsTable).values({
        tiktokViewerId,
        viewerName,
        streamerId: quiz.streamerId,
        sessionId,
        eventType: "quiz_win",
        xpAwarded: quiz.xpReward,
        coinsAwarded: quiz.coinReward,
      });

      await checkAndUnlockAchievement(
        io, roomId, tiktokViewerId, viewerName, quiz.streamerId, "quiz_winner"
      );

      io.to(roomId).emit("minigame:quiz_won", {
        winner: viewerName,
        question: quiz.question,
        answer: quiz.normalizedAnswer,
        xpAwarded: quiz.xpReward,
        coinsAwarded: quiz.coinReward,
        timestamp: Date.now(),
      });

      activeQuizzes.delete(sessionId);
      return;
    }
  }

  const hunt = activeTreasureHunts.get(sessionId);
  if (hunt && hunt.resolvedAt === null) {
    if (normalized.includes(hunt.keyword)) {
      hunt.resolvedAt = Date.now();
      activeTreasureHunts.set(sessionId, hunt);

      await db.insert(viewerXpEventsTable).values({
        tiktokViewerId,
        viewerName,
        streamerId: hunt.streamerId,
        sessionId,
        eventType: "treasure_win",
        xpAwarded: hunt.xpReward,
        coinsAwarded: hunt.coinReward,
      });

      await checkAndUnlockAchievement(
        io, roomId, tiktokViewerId, viewerName, hunt.streamerId, "treasure_finder"
      );

      io.to(roomId).emit("minigame:treasure_found", {
        winner: viewerName,
        prize: hunt.prize,
        keyword: hunt.keyword,
        xpAwarded: hunt.xpReward,
        coinsAwarded: hunt.coinReward,
        timestamp: Date.now(),
      });

      activeTreasureHunts.delete(sessionId);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point called per live event
// ---------------------------------------------------------------------------

export async function processGamification(
  io: SocketServer,
  event: TikTokEvent,
  streamerId: number
) {
  try {
    const tiktokViewerId = String(event.data.userId ?? event.data.uniqueId ?? "anonymous");
    const viewerName = String(event.data.nickname ?? event.data.uniqueId ?? "Viewer");
    const roomId = `session:${event.sessionId}`;

    const xp = XP_TABLE[event.type] ?? 0;
    let coins = 0;
    if (event.type === "gift") {
      const giftCoins = (event.data.coins as number) ?? 0;
      coins = Math.min(giftCoins, 500);
    }

    if (xp > 0 || coins > 0) {
      await db.insert(viewerXpEventsTable).values({
        tiktokViewerId,
        viewerName,
        streamerId,
        sessionId: event.sessionId,
        eventType: event.type,
        xpAwarded: xp,
        coinsAwarded: coins,
      });

      const totalXp = await getViewerTotalXp(tiktokViewerId, streamerId);
      const newLevel = xpToLevel(totalXp);
      const prevLevel = xpToLevel(totalXp - xp);

      io.to(roomId).emit("xp:awarded", {
        viewerName,
        xp,
        coins,
        totalXp,
        level: newLevel,
        timestamp: Date.now(),
      });

      if (newLevel > prevLevel) {
        io.to(roomId).emit("level:up", {
          viewerName,
          newLevel,
          timestamp: Date.now(),
        });
        void emitAiLevelUpAnnouncement(io, roomId, streamerId, viewerName, newLevel);
      }
    }

    if (event.type === "comment" && event.sessionId) {
      const commentText = String(event.data.comment ?? event.data.text ?? "");
      if (commentText) {
        await resolveMinigameComment(
          io, roomId, event.sessionId, tiktokViewerId, viewerName, commentText
        );
      }
    }

    await processBossBattle(io, roomId, tiktokViewerId, viewerName, streamerId, event);
    await processKingdomResources(streamerId, event);
    await checkViewerAchievements(io, roomId, tiktokViewerId, viewerName, streamerId, event);
  } catch (_err) {}
}
