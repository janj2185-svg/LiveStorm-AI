import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const platformEventsTable = pgTable("platform_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PlatformEvent = typeof platformEventsTable.$inferSelect;
