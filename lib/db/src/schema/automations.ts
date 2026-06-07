import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const automationsTable = pgTable("automations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  conditionOperator: text("condition_operator").notNull().default("gte"),
  conditionValue: text("condition_value").notNull().default("1"),
  actionType: text("action_type").notNull(),
  actionPayload: text("action_payload").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(true),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAutomationSchema = createInsertSchema(automationsTable).omit({
  id: true,
  triggerCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automationsTable.$inferSelect;
