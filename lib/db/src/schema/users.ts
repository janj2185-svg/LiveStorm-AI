import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  tiktokUsername: text("tiktok_username"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  uiLanguage: text("ui_language").notNull().default("en"),
  youtubeAccessToken: text("youtube_access_token"),
  youtubeRefreshToken: text("youtube_refresh_token"),
  youtubeChannelId: text("youtube_channel_id"),
  youtubeChannelName: text("youtube_channel_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
