import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { streamersTable } from "./streamers";

export const aiPersonaConfigsTable = pgTable("ai_persona_configs", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" })
    .unique(),
  personaName: text("persona_name").notNull().default("Storm"),
  tone: text("tone").notNull().default("hype"),
  announceGifts: boolean("announce_gifts").notNull().default(true),
  announceGiftThreshold: integer("announce_gift_threshold").notNull().default(100),
  announceLevelUp: boolean("announce_level_up").notNull().default(true),
  announceBossKill: boolean("announce_boss_kill").notNull().default(true),
  moderationEnabled: boolean("moderation_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiMessagesTable = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiQuestsTable = pgTable("ai_quests", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  questText: text("quest_text").notNull(),
  metric: text("metric").notNull(),
  target: integer("target").notNull(),
  current: integer("current").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(100),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiModerationLogsTable = pgTable("ai_moderation_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  viewerName: text("viewer_name").notNull(),
  comment: text("comment").notNull(),
  reason: text("reason").notNull(),
  flaggedAt: timestamp("flagged_at").notNull().defaultNow(),
});

export const insertAiPersonaConfigSchema = createInsertSchema(aiPersonaConfigsTable).omit({ id: true, updatedAt: true });
export const insertAiMessageSchema = createInsertSchema(aiMessagesTable).omit({ id: true, createdAt: true });
export const insertAiQuestSchema = createInsertSchema(aiQuestsTable).omit({ id: true, createdAt: true, completedAt: true });
export const insertAiModerationLogSchema = createInsertSchema(aiModerationLogsTable).omit({ id: true, flaggedAt: true });

export type AiPersonaConfig = typeof aiPersonaConfigsTable.$inferSelect;
export type AiMessage = typeof aiMessagesTable.$inferSelect;
export type AiQuest = typeof aiQuestsTable.$inferSelect;
export type AiModerationLog = typeof aiModerationLogsTable.$inferSelect;
