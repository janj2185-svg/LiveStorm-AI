import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const streamersTable = pgTable("streamers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tiktokLiveId: text("tiktok_live_id"),
  isLive: boolean("is_live").notNull().default(false),
  viewerCount: integer("viewer_count").notNull().default(0),
  totalGiftsReceived: integer("total_gifts_received").notNull().default(0),
  totalLikesReceived: integer("total_likes_received").notNull().default(0),
  totalFollowersGained: integer("total_followers_gained").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  obsToken: text("obs_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id").notNull().references(() => streamersTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  peakViewers: integer("peak_viewers").notNull().default(0),
  totalGifts: integer("total_gifts").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  totalFollowers: integer("total_followers").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  totalShares: integer("total_shares").notNull().default(0),
});

export const insertStreamerSchema = createInsertSchema(streamersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStreamer = z.infer<typeof insertStreamerSchema>;
export type Streamer = typeof streamersTable.$inferSelect;
