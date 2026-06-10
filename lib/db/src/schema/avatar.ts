import { pgTable, serial, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { streamersTable } from "./streamers";

export const avatarConfigsTable = pgTable("avatar_configs", {
  id: serial("id").primaryKey(),
  streamerId: integer("streamer_id")
    .notNull()
    .unique()
    .references(() => streamersTable.id, { onDelete: "cascade" }),

  avatarEnabled: boolean("avatar_enabled").notNull().default(false),

  avatarKey: text("avatar_key").notNull().default("storm-default"),
  avatarUrl: text("avatar_url"),
  avatarThumbnailUrl: text("avatar_thumbnail_url"),

  renderer: text("renderer").notNull().default("vrm"),

  positionX: real("position_x").notNull().default(0.0),
  positionY: real("position_y").notNull().default(-0.8),
  positionZ: real("position_z").notNull().default(0.0),
  rotationY: real("rotation_y").notNull().default(0.0),
  scale: real("scale").notNull().default(1.0),

  backgroundType: text("background_type").notNull().default("transparent"),
  backgroundValue: text("background_value"),
  accentColor: text("accent_color").default("#3b82f6"),
  lightingPreset: text("lighting_preset").notNull().default("studio"),
  shadowEnabled: boolean("shadow_enabled").notNull().default(true),

  lipSyncEnabled: boolean("lip_sync_enabled").notNull().default(true),
  lipSyncSensitivity: real("lip_sync_sensitivity").notNull().default(1.0),
  expressionIntensity: real("expression_intensity").notNull().default(1.0),
  blinkEnabled: boolean("blink_enabled").notNull().default(true),
  blinkIntervalMs: integer("blink_interval_ms").notNull().default(3500),

  obsWidth: integer("obs_width").notNull().default(400),
  obsHeight: integer("obs_height").notNull().default(600),
  obsShowSpeechBubble: boolean("obs_show_speech_bubble").notNull().default(true),
  obsShowNameTag: boolean("obs_show_name_tag").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const avatarAnimationPresetsTable = pgTable("avatar_animation_presets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  glbUrl: text("glb_url").notNull(),
  previewGifUrl: text("preview_gif_url"),
  durationMs: integer("duration_ms").notNull(),
  isLoop: boolean("is_loop").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AvatarConfig = typeof avatarConfigsTable.$inferSelect;
export type AvatarAnimationPreset = typeof avatarAnimationPresetsTable.$inferSelect;
