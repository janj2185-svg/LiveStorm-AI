-- SYLORA / LiveStorm local schema sync
-- Apply after empty DATABASE_SCHEMA.sql or on older DBs:
--   psql "$DATABASE_URL" -f scripts/sync-schema.sql

ALTER TABLE streamers ADD COLUMN IF NOT EXISTS obs_token TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode text DEFAULT 'demo';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tiktok_username text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_language text DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_access_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_refresh_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_channel_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_channel_name text;

ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'uk';
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS personality_type text DEFAULT 'friendly';
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS custom_personality text;
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS operating_mode text DEFAULT 'assistant';
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS intensity_mode text DEFAULT 'streamer';
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS persona_gender text DEFAULT 'neutral';
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS voice_speed real DEFAULT 1.0;
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS voice_volume real DEFAULT 1.0;
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS voice_emotion text DEFAULT 'neutral';
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS translate_chat boolean DEFAULT false;
ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS translate_target_lang text DEFAULT 'uk';

CREATE TABLE IF NOT EXISTS battle_sessions (
  id serial PRIMARY KEY,
  session_id integer NOT NULL UNIQUE,
  streamer_id integer NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  score_us integer NOT NULL DEFAULT 0,
  score_opponent integer NOT NULL DEFAULT 0,
  coin_us integer NOT NULL DEFAULT 0,
  coin_opponent integer NOT NULL DEFAULT 0,
  exchanges integer NOT NULL DEFAULT 0,
  last_lead_change timestamp,
  started_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
