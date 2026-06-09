import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { streamersTable } from "./streamers";

export const viewerXpEventsTable = pgTable("viewer_xp_events", {
  id: serial("id").primaryKey(),
  tiktokViewerId: text("tiktok_viewer_id").notNull(),
  viewerName: text("viewer_name").notNull().default("Viewer"),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  sessionId: integer("session_id"),
  eventType: text("event_type").notNull(),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  coinsAwarded: integer("coins_awarded").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconType: text("icon_type").notNull().default("trophy"),
  xpReward: integer("xp_reward").notNull().default(0),
  coinReward: integer("coin_reward").notNull().default(0),
});

export const viewerAchievementsTable = pgTable("viewer_achievements", {
  id: serial("id").primaryKey(),
  tiktokViewerId: text("tiktok_viewer_id").notNull(),
  viewerName: text("viewer_name").notNull().default("Viewer"),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  achievementKey: text("achievement_key").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const dailyClaimsTable = pgTable("daily_claims", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  claimedDate: text("claimed_date").notNull(),
  coinsAwarded: integer("coins_awarded").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bossBattlesTable = pgTable("boss_battles", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  sessionId: integer("session_id"),
  bossName: text("boss_name").notNull().default("Shadow Dragon"),
  bossEmoji: text("boss_emoji").notNull().default("🐉"),
  maxHp: integer("max_hp").notNull().default(1000),
  currentHp: integer("current_hp").notNull().default(1000),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const bossAttacksTable = pgTable("boss_attacks", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id")
    .notNull()
    .references(() => bossBattlesTable.id, { onDelete: "cascade" }),
  tiktokViewerId: text("tiktok_viewer_id").notNull(),
  viewerName: text("viewer_name").notNull().default("Viewer"),
  attackType: text("attack_type").notNull(),
  damage: integer("damage").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kingdomBuildingsTable = pgTable("kingdom_buildings", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  buildingType: text("building_type").notNull(),
  level: integer("level").notNull().default(1),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const luckyDropsTable = pgTable("lucky_drops", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  sessionId: integer("session_id"),
  dropName: text("drop_name").notNull().default("Lucky Drop"),
  prizeDescription: text("prize_description").notNull().default("XP Bonus"),
  xpReward: integer("xp_reward").notNull().default(0),
  coinReward: integer("coin_reward").notNull().default(0),
  triggerType: text("trigger_type").notNull().default("auto"),
  winnerTiktokViewerId: text("winner_tiktok_viewer_id"),
  winnerName: text("winner_name"),
  droppedAt: timestamp("dropped_at").notNull().defaultNow(),
});

export const streamerAlliancesTable = pgTable("streamer_alliances", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  targetId: integer("target_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LuckyDrop = typeof luckyDropsTable.$inferSelect;

export const insertBossBattleSchema = createInsertSchema(bossBattlesTable).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});
export type InsertBossBattle = z.infer<typeof insertBossBattleSchema>;
export type BossBattle = typeof bossBattlesTable.$inferSelect;
export type BossAttack = typeof bossAttacksTable.$inferSelect;
export type Achievement = typeof achievementsTable.$inferSelect;
export type ViewerAchievement = typeof viewerAchievementsTable.$inferSelect;
export type KingdomBuilding = typeof kingdomBuildingsTable.$inferSelect;
export type StreamerAlliance = typeof streamerAlliancesTable.$inferSelect;
