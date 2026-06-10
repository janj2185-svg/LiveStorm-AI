CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"tiktok_username" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"ui_language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"peak_viewers" integer DEFAULT 0 NOT NULL,
	"total_gifts" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"total_followers" integer DEFAULT 0 NOT NULL,
	"total_comments" integer DEFAULT 0 NOT NULL,
	"total_shares" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streamers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tiktok_live_id" text,
	"is_live" boolean DEFAULT false NOT NULL,
	"viewer_count" integer DEFAULT 0 NOT NULL,
	"total_gifts_received" integer DEFAULT 0 NOT NULL,
	"total_likes_received" integer DEFAULT 0 NOT NULL,
	"total_followers_gained" integer DEFAULT 0 NOT NULL,
	"total_comments" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kingdoms" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"name" text DEFAULT 'New Kingdom' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"gold" integer DEFAULT 0 NOT NULL,
	"wood" integer DEFAULT 0 NOT NULL,
	"stone" integer DEFAULT 0 NOT NULL,
	"buildings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"streamer_id" integer NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"coins" integer DEFAULT 0 NOT NULL,
	"total_gifts" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"event_type" text NOT NULL,
	"condition_operator" text DEFAULT 'gte' NOT NULL,
	"condition_value" text DEFAULT '1' NOT NULL,
	"action_type" text NOT NULL,
	"action_payload" text DEFAULT '' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_type" text DEFAULT 'trophy' NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"coin_reward" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "achievements_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "boss_attacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"battle_id" integer NOT NULL,
	"tiktok_viewer_id" text NOT NULL,
	"viewer_name" text DEFAULT 'Viewer' NOT NULL,
	"attack_type" text NOT NULL,
	"damage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boss_battles" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"session_id" integer,
	"boss_name" text DEFAULT 'Shadow Dragon' NOT NULL,
	"boss_emoji" text DEFAULT '🐉' NOT NULL,
	"max_hp" integer DEFAULT 1000 NOT NULL,
	"current_hp" integer DEFAULT 1000 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "daily_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"claimed_date" text NOT NULL,
	"coins_awarded" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kingdom_buildings" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"building_type" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lucky_drops" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"session_id" integer,
	"drop_name" text DEFAULT 'Lucky Drop' NOT NULL,
	"prize_description" text DEFAULT 'XP Bonus' NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"coin_reward" integer DEFAULT 0 NOT NULL,
	"trigger_type" text DEFAULT 'auto' NOT NULL,
	"winner_tiktok_viewer_id" text,
	"winner_name" text,
	"dropped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streamer_alliances" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tiktok_viewer_id" text NOT NULL,
	"viewer_name" text DEFAULT 'Viewer' NOT NULL,
	"streamer_id" integer NOT NULL,
	"achievement_key" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_xp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tiktok_viewer_id" text NOT NULL,
	"viewer_name" text DEFAULT 'Viewer' NOT NULL,
	"streamer_id" integer NOT NULL,
	"session_id" integer,
	"event_type" text NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"coins_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generated_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"prompt" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_moderation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"streamer_id" integer NOT NULL,
	"viewer_name" text NOT NULL,
	"comment" text NOT NULL,
	"reason" text NOT NULL,
	"flagged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_persona_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"persona_name" text DEFAULT 'Storm' NOT NULL,
	"tone" text DEFAULT 'hype' NOT NULL,
	"personality_type" text DEFAULT 'friendly' NOT NULL,
	"custom_personality" text,
	"operating_mode" text DEFAULT 'assistant' NOT NULL,
	"announce_gifts" boolean DEFAULT true NOT NULL,
	"announce_gift_threshold" integer DEFAULT 100 NOT NULL,
	"announce_level_up" boolean DEFAULT true NOT NULL,
	"announce_boss_kill" boolean DEFAULT true NOT NULL,
	"moderation_enabled" boolean DEFAULT false NOT NULL,
	"auto_reply_enabled" boolean DEFAULT false NOT NULL,
	"reply_language" text DEFAULT 'auto' NOT NULL,
	"spam_protection_enabled" boolean DEFAULT true NOT NULL,
	"spam_cooldown_seconds" integer DEFAULT 30 NOT NULL,
	"voice_enabled" boolean DEFAULT false NOT NULL,
	"voice_name" text DEFAULT 'nova' NOT NULL,
	"voice_speed" real DEFAULT 1 NOT NULL,
	"voice_volume" real DEFAULT 1 NOT NULL,
	"voice_emotion" text DEFAULT 'neutral' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_persona_configs_streamer_id_unique" UNIQUE("streamer_id")
);
--> statement-breakpoint
CREATE TABLE "ai_quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"streamer_id" integer NOT NULL,
	"quest_text" text NOT NULL,
	"metric" text NOT NULL,
	"target" integer NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"rule_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatar_animation_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"glb_url" text NOT NULL,
	"preview_gif_url" text,
	"duration_ms" integer NOT NULL,
	"is_loop" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatar_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"streamer_id" integer NOT NULL,
	"avatar_enabled" boolean DEFAULT false NOT NULL,
	"avatar_key" text DEFAULT 'storm-default' NOT NULL,
	"avatar_url" text,
	"avatar_thumbnail_url" text,
	"renderer" text DEFAULT 'vrm' NOT NULL,
	"position_x" real DEFAULT 0 NOT NULL,
	"position_y" real DEFAULT -0.8 NOT NULL,
	"position_z" real DEFAULT 0 NOT NULL,
	"rotation_y" real DEFAULT 0 NOT NULL,
	"scale" real DEFAULT 1 NOT NULL,
	"background_type" text DEFAULT 'transparent' NOT NULL,
	"background_value" text,
	"accent_color" text DEFAULT '#3b82f6',
	"lighting_preset" text DEFAULT 'studio' NOT NULL,
	"shadow_enabled" boolean DEFAULT true NOT NULL,
	"lip_sync_enabled" boolean DEFAULT true NOT NULL,
	"lip_sync_sensitivity" real DEFAULT 1 NOT NULL,
	"expression_intensity" real DEFAULT 1 NOT NULL,
	"blink_enabled" boolean DEFAULT true NOT NULL,
	"blink_interval_ms" integer DEFAULT 3500 NOT NULL,
	"obs_width" integer DEFAULT 400 NOT NULL,
	"obs_height" integer DEFAULT 600 NOT NULL,
	"obs_show_speech_bubble" boolean DEFAULT true NOT NULL,
	"obs_show_name_tag" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "avatar_configs_streamer_id_unique" UNIQUE("streamer_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streamers" ADD CONSTRAINT "streamers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kingdoms" ADD CONSTRAINT "kingdoms_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_profiles" ADD CONSTRAINT "viewer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boss_attacks" ADD CONSTRAINT "boss_attacks_battle_id_boss_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."boss_battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boss_battles" ADD CONSTRAINT "boss_battles_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kingdom_buildings" ADD CONSTRAINT "kingdom_buildings_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lucky_drops" ADD CONSTRAINT "lucky_drops_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streamer_alliances" ADD CONSTRAINT "streamer_alliances_requester_id_streamers_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streamer_alliances" ADD CONSTRAINT "streamer_alliances_target_id_streamers_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_achievements" ADD CONSTRAINT "viewer_achievements_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_xp_events" ADD CONSTRAINT "viewer_xp_events_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_moderation_logs" ADD CONSTRAINT "ai_moderation_logs_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_persona_configs" ADD CONSTRAINT "ai_persona_configs_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_quests" ADD CONSTRAINT "ai_quests_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_rules" ADD CONSTRAINT "moderation_rules_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_configs" ADD CONSTRAINT "avatar_configs_streamer_id_streamers_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."streamers"("id") ON DELETE cascade ON UPDATE no action;