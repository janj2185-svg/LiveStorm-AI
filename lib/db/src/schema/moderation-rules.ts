import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { streamersTable } from "./streamers";

export const moderationRulesTable = pgTable("moderation_rules", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .references(() => streamersTable.id, { onDelete: "cascade" }),
  ruleKey: text("rule_key").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ModerationRule = typeof moderationRulesTable.$inferSelect;
