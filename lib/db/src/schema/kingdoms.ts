import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { streamersTable } from "./streamers";

export const kingdomsTable = pgTable("kingdoms", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id").notNull().references(() => streamersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("New Kingdom"),
  level: integer("level").notNull().default(1),
  gold: integer("gold").notNull().default(0),
  wood: integer("wood").notNull().default(0),
  stone: integer("stone").notNull().default(0),
  buildings: jsonb("buildings").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKingdomSchema = createInsertSchema(kingdomsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKingdom = z.infer<typeof insertKingdomSchema>;
export type Kingdom = typeof kingdomsTable.$inferSelect;
