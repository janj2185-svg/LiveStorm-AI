import { pgTable, serial, text, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { streamersTable } from "./streamers";

export const aiAgentsTable = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  priority: integer("priority").notNull().default(5),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiAgentTasksTable = pgTable("ai_agent_tasks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(),
  eventType: text("event_type").notNull(),
  priority: integer("priority").notNull().default(6),
  status: text("status").notNull().default("pending"),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const aiMemoriesTable = pgTable("ai_memories", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  memoryType: text("memory_type").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  viewerName: text("viewer_name"),
  tiktokViewerId: text("tiktok_viewer_id"),
  importance: integer("importance").notNull().default(3),
  lastAccessed: timestamp("last_accessed").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const agentViewerProfilesTable = pgTable("agent_viewer_profiles", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  tiktokViewerId: text("tiktok_viewer_id").notNull(),
  viewerName: text("viewer_name").notNull(),
  totalGifts: integer("total_gifts").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  totalFollows: integer("total_follows").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  vipLevel: text("vip_level").notNull().default("none"),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiResponseScoresTable = pgTable("ai_response_scores", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  aiResponse: text("ai_response").notNull(),
  score: real("score").default(5.0),
  engagementDelta: integer("engagement_delta").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiLearningReportsTable = pgTable("ai_learning_reports", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  totalResponses: integer("total_responses").notNull().default(0),
  avgScore: real("avg_score").default(5.0),
  bestResponse: text("best_response"),
  worstResponse: text("worst_response"),
  recommendations: text("recommendations"),
  personalityAdjustments: text("personality_adjustments"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const aiVoiceProfilesTable = pgTable("ai_voice_profiles", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  profileName: text("profile_name").notNull(),
  voiceKey: text("voice_key").notNull().default("nova"),
  description: text("description"),
  speed: real("speed").notNull().default(1.0),
  personalityTag: text("personality_tag"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiPersonalityModesTable = pgTable("ai_personality_modes", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  modeName: text("mode_name").notNull(),
  modeKey: text("mode_key").notNull(),
  systemPromptAddon: text("system_prompt_addon"),
  toneOverride: text("tone_override"),
  exampleReplies: text("example_replies"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const battleTranscriptsTable = pgTable("battle_transcripts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  speaker: text("speaker").notNull(),
  text: text("text").notNull(),
  language: text("language").default("auto"),
  translatedText: text("translated_text"),
  suggestedReply: text("suggested_reply"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const battleSessionsTable = pgTable("battle_sessions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().unique(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  scoreUs: integer("score_us").notNull().default(0),
  scoreOpponent: integer("score_opponent").notNull().default(0),
  coinUs: integer("coin_us").notNull().default(0),
  coinOpponent: integer("coin_opponent").notNull().default(0),
  exchanges: integer("exchanges").notNull().default(0),
  lastLeadChange: timestamp("last_lead_change"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatPriorityQueueTable = pgTable("chat_priority_queue", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  viewerName: text("viewer_name").notNull(),
  message: text("message").notNull(),
  priorityLevel: integer("priority_level").notNull().default(6),
  priorityReason: text("priority_reason"),
  wasResponded: boolean("was_responded").notNull().default(false),
  agentType: text("agent_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AiAgent = typeof aiAgentsTable.$inferSelect;
export type AiAgentTask = typeof aiAgentTasksTable.$inferSelect;
export type AiMemory = typeof aiMemoriesTable.$inferSelect;
export type AgentViewerProfile = typeof agentViewerProfilesTable.$inferSelect;
export type AiResponseScore = typeof aiResponseScoresTable.$inferSelect;
export type AiLearningReport = typeof aiLearningReportsTable.$inferSelect;
export type AiVoiceProfile = typeof aiVoiceProfilesTable.$inferSelect;
export type AiPersonalityMode = typeof aiPersonalityModesTable.$inferSelect;
export type BattleTranscript = typeof battleTranscriptsTable.$inferSelect;
export type BattleSession = typeof battleSessionsTable.$inferSelect;
export type ChatPriorityQueueEntry = typeof chatPriorityQueueTable.$inferSelect;
