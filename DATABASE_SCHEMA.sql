--
-- PostgreSQL database dump
--

\restrict hMRKAu0OcephGVGvSggZnf1FLavd23VaA64rwzkJqvacs7wf5Q8U2kpbA5mSacs

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: stripe; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA stripe;


ALTER SCHEMA stripe OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon_type text DEFAULT 'trophy'::text NOT NULL,
    xp_reward integer DEFAULT 0 NOT NULL,
    coin_reward integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.achievements_id_seq OWNER TO postgres;

--
-- Name: achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.achievements_id_seq OWNED BY public.achievements.id;


--
-- Name: agent_viewer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_viewer_profiles (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    tiktok_viewer_id text NOT NULL,
    viewer_name text NOT NULL,
    total_gifts integer DEFAULT 0 NOT NULL,
    total_comments integer DEFAULT 0 NOT NULL,
    total_follows integer DEFAULT 0 NOT NULL,
    total_likes integer DEFAULT 0 NOT NULL,
    vip_level text DEFAULT 'none'::text NOT NULL,
    last_seen timestamp without time zone DEFAULT now() NOT NULL,
    first_seen timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    mood text DEFAULT 'neutral'::text NOT NULL,
    personality_tags text DEFAULT ''::text NOT NULL,
    typical_hour integer,
    streak_days integer DEFAULT 0 NOT NULL,
    total_coins_spent integer DEFAULT 0 NOT NULL,
    last_gift_name text,
    preferred_name text,
    custom_nickname text,
    nickname_source text,
    nickname_asked_at timestamp with time zone
);


ALTER TABLE public.agent_viewer_profiles OWNER TO postgres;

--
-- Name: agent_viewer_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_viewer_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_viewer_profiles_id_seq OWNER TO postgres;

--
-- Name: agent_viewer_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_viewer_profiles_id_seq OWNED BY public.agent_viewer_profiles.id;


--
-- Name: ai_agent_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_agent_tasks (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    agent_type text NOT NULL,
    event_type text NOT NULL,
    priority integer DEFAULT 6 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    input jsonb DEFAULT '{}'::jsonb,
    output jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    processed_at timestamp without time zone
);


ALTER TABLE public.ai_agent_tasks OWNER TO postgres;

--
-- Name: ai_agent_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_agent_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_agent_tasks_id_seq OWNER TO postgres;

--
-- Name: ai_agent_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_agent_tasks_id_seq OWNED BY public.ai_agent_tasks.id;


--
-- Name: ai_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_agents (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    agent_type text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_agents OWNER TO postgres;

--
-- Name: ai_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_agents_id_seq OWNER TO postgres;

--
-- Name: ai_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_agents_id_seq OWNED BY public.ai_agents.id;


--
-- Name: ai_generated_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_generated_content (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    content_type text NOT NULL,
    prompt text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_generated_content OWNER TO postgres;

--
-- Name: ai_generated_content_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_generated_content_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_generated_content_id_seq OWNER TO postgres;

--
-- Name: ai_generated_content_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_generated_content_id_seq OWNED BY public.ai_generated_content.id;


--
-- Name: ai_learning_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_learning_reports (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    total_responses integer DEFAULT 0 NOT NULL,
    avg_score real DEFAULT 5,
    best_response text,
    worst_response text,
    recommendations text,
    personality_adjustments text,
    generated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_learning_reports OWNER TO postgres;

--
-- Name: ai_learning_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_learning_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_learning_reports_id_seq OWNER TO postgres;

--
-- Name: ai_learning_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_learning_reports_id_seq OWNED BY public.ai_learning_reports.id;


--
-- Name: ai_memories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_memories (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    memory_type text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    viewer_name text,
    tiktok_viewer_id text,
    importance integer DEFAULT 3 NOT NULL,
    last_accessed timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_memories OWNER TO postgres;

--
-- Name: ai_memories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_memories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_memories_id_seq OWNER TO postgres;

--
-- Name: ai_memories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_memories_id_seq OWNED BY public.ai_memories.id;


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_messages (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_messages OWNER TO postgres;

--
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_messages_id_seq OWNER TO postgres;

--
-- Name: ai_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_messages_id_seq OWNED BY public.ai_messages.id;


--
-- Name: ai_moderation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_moderation_logs (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    viewer_name text NOT NULL,
    comment text NOT NULL,
    reason text NOT NULL,
    flagged_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_moderation_logs OWNER TO postgres;

--
-- Name: ai_moderation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_moderation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_moderation_logs_id_seq OWNER TO postgres;

--
-- Name: ai_moderation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_moderation_logs_id_seq OWNED BY public.ai_moderation_logs.id;


--
-- Name: ai_persona_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_persona_configs (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    persona_name text DEFAULT 'Storm'::text NOT NULL,
    tone text DEFAULT 'hype'::text NOT NULL,
    announce_gifts boolean DEFAULT true NOT NULL,
    announce_gift_threshold integer DEFAULT 100 NOT NULL,
    announce_level_up boolean DEFAULT true NOT NULL,
    announce_boss_kill boolean DEFAULT true NOT NULL,
    moderation_enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    auto_reply_enabled boolean DEFAULT false NOT NULL,
    reply_language text DEFAULT 'auto'::text NOT NULL,
    spam_protection_enabled boolean DEFAULT true NOT NULL,
    spam_cooldown_seconds integer DEFAULT 30 NOT NULL,
    voice_enabled boolean DEFAULT false NOT NULL,
    voice_name text DEFAULT 'nova'::text NOT NULL,
    personality_type text DEFAULT 'friendly'::text NOT NULL,
    custom_personality text,
    operating_mode text DEFAULT 'assistant'::text NOT NULL,
    voice_speed real DEFAULT 1 NOT NULL,
    voice_volume real DEFAULT 1 NOT NULL,
    voice_emotion text DEFAULT 'neutral'::text NOT NULL,
    default_language text DEFAULT 'uk'::text NOT NULL,
    translate_chat boolean DEFAULT false NOT NULL,
    translate_target_lang text DEFAULT 'uk'::text NOT NULL,
    persona_gender text DEFAULT 'neutral'::text NOT NULL,
    intensity_mode text DEFAULT 'streamer'::text NOT NULL
);


ALTER TABLE public.ai_persona_configs OWNER TO postgres;

--
-- Name: ai_persona_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_persona_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_persona_configs_id_seq OWNER TO postgres;

--
-- Name: ai_persona_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_persona_configs_id_seq OWNED BY public.ai_persona_configs.id;


--
-- Name: ai_personality_modes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_personality_modes (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    mode_name text NOT NULL,
    mode_key text NOT NULL,
    system_prompt_addon text,
    tone_override text,
    example_replies text,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_personality_modes OWNER TO postgres;

--
-- Name: ai_personality_modes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_personality_modes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_personality_modes_id_seq OWNER TO postgres;

--
-- Name: ai_personality_modes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_personality_modes_id_seq OWNED BY public.ai_personality_modes.id;


--
-- Name: ai_quests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_quests (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    quest_text text NOT NULL,
    metric text NOT NULL,
    target integer NOT NULL,
    current integer DEFAULT 0 NOT NULL,
    xp_reward integer DEFAULT 100 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_quests OWNER TO postgres;

--
-- Name: ai_quests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_quests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_quests_id_seq OWNER TO postgres;

--
-- Name: ai_quests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_quests_id_seq OWNED BY public.ai_quests.id;


--
-- Name: ai_response_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_response_scores (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    agent_type text NOT NULL,
    trigger_event text NOT NULL,
    ai_response text NOT NULL,
    score real DEFAULT 5,
    engagement_delta integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_response_scores OWNER TO postgres;

--
-- Name: ai_response_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_response_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_response_scores_id_seq OWNER TO postgres;

--
-- Name: ai_response_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_response_scores_id_seq OWNED BY public.ai_response_scores.id;


--
-- Name: ai_voice_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_voice_profiles (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    profile_name text NOT NULL,
    voice_key text DEFAULT 'nova'::text NOT NULL,
    description text,
    speed real DEFAULT 1 NOT NULL,
    personality_tag text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_voice_profiles OWNER TO postgres;

--
-- Name: ai_voice_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_voice_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_voice_profiles_id_seq OWNER TO postgres;

--
-- Name: ai_voice_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_voice_profiles_id_seq OWNED BY public.ai_voice_profiles.id;


--
-- Name: automation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_logs (
    id integer NOT NULL,
    automation_id integer NOT NULL,
    streamer_id integer NOT NULL,
    session_id integer,
    triggered_at timestamp without time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    action_type text NOT NULL,
    result text DEFAULT 'success'::text NOT NULL
);


ALTER TABLE public.automation_logs OWNER TO postgres;

--
-- Name: automation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automation_logs_id_seq OWNER TO postgres;

--
-- Name: automation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automation_logs_id_seq OWNED BY public.automation_logs.id;


--
-- Name: automations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    event_type text NOT NULL,
    condition_operator text DEFAULT 'gte'::text NOT NULL,
    condition_value text DEFAULT '1'::text NOT NULL,
    action_type text NOT NULL,
    action_payload text DEFAULT ''::text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    trigger_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.automations OWNER TO postgres;

--
-- Name: automations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automations_id_seq OWNER TO postgres;

--
-- Name: automations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automations_id_seq OWNED BY public.automations.id;


--
-- Name: avatar_animation_presets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avatar_animation_presets (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    glb_url text NOT NULL,
    preview_gif_url text,
    duration_ms integer NOT NULL,
    is_loop boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.avatar_animation_presets OWNER TO postgres;

--
-- Name: avatar_animation_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.avatar_animation_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.avatar_animation_presets_id_seq OWNER TO postgres;

--
-- Name: avatar_animation_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.avatar_animation_presets_id_seq OWNED BY public.avatar_animation_presets.id;


--
-- Name: avatar_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avatar_configs (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    avatar_enabled boolean DEFAULT false NOT NULL,
    avatar_key text DEFAULT 'storm-default'::text NOT NULL,
    avatar_url text,
    avatar_thumbnail_url text,
    renderer text DEFAULT 'vrm'::text NOT NULL,
    position_x real DEFAULT 0 NOT NULL,
    position_y real DEFAULT '-0.8'::numeric NOT NULL,
    position_z real DEFAULT 0 NOT NULL,
    rotation_y real DEFAULT 0 NOT NULL,
    scale real DEFAULT 1 NOT NULL,
    background_type text DEFAULT 'transparent'::text NOT NULL,
    background_value text,
    lighting_preset text DEFAULT 'studio'::text NOT NULL,
    shadow_enabled boolean DEFAULT true NOT NULL,
    lip_sync_enabled boolean DEFAULT true NOT NULL,
    lip_sync_sensitivity real DEFAULT 1 NOT NULL,
    expression_intensity real DEFAULT 1 NOT NULL,
    blink_enabled boolean DEFAULT true NOT NULL,
    blink_interval_ms integer DEFAULT 3500 NOT NULL,
    obs_width integer DEFAULT 400 NOT NULL,
    obs_height integer DEFAULT 600 NOT NULL,
    obs_show_speech_bubble boolean DEFAULT true NOT NULL,
    obs_show_name_tag boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    accent_color text DEFAULT '#3b82f6'::text
);


ALTER TABLE public.avatar_configs OWNER TO postgres;

--
-- Name: avatar_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.avatar_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.avatar_configs_id_seq OWNER TO postgres;

--
-- Name: avatar_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.avatar_configs_id_seq OWNED BY public.avatar_configs.id;


--
-- Name: battle_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.battle_sessions (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    score_us integer DEFAULT 0 NOT NULL,
    score_opponent integer DEFAULT 0 NOT NULL,
    coin_us integer DEFAULT 0 NOT NULL,
    coin_opponent integer DEFAULT 0 NOT NULL,
    exchanges integer DEFAULT 0 NOT NULL,
    last_lead_change timestamp without time zone,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.battle_sessions OWNER TO postgres;

--
-- Name: battle_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.battle_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battle_sessions_id_seq OWNER TO postgres;

--
-- Name: battle_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.battle_sessions_id_seq OWNED BY public.battle_sessions.id;


--
-- Name: battle_transcripts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.battle_transcripts (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    speaker text NOT NULL,
    text text NOT NULL,
    language text DEFAULT 'auto'::text,
    translated_text text,
    suggested_reply text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.battle_transcripts OWNER TO postgres;

--
-- Name: battle_transcripts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.battle_transcripts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battle_transcripts_id_seq OWNER TO postgres;

--
-- Name: battle_transcripts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.battle_transcripts_id_seq OWNED BY public.battle_transcripts.id;


--
-- Name: boss_attacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boss_attacks (
    id integer NOT NULL,
    battle_id integer NOT NULL,
    tiktok_viewer_id text NOT NULL,
    viewer_name text DEFAULT 'Viewer'::text NOT NULL,
    attack_type text NOT NULL,
    damage integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.boss_attacks OWNER TO postgres;

--
-- Name: boss_attacks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.boss_attacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.boss_attacks_id_seq OWNER TO postgres;

--
-- Name: boss_attacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.boss_attacks_id_seq OWNED BY public.boss_attacks.id;


--
-- Name: boss_battles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boss_battles (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    session_id integer,
    boss_name text DEFAULT 'Shadow Dragon'::text NOT NULL,
    boss_emoji text DEFAULT '🐉'::text NOT NULL,
    max_hp integer DEFAULT 1000 NOT NULL,
    current_hp integer DEFAULT 1000 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone
);


ALTER TABLE public.boss_battles OWNER TO postgres;

--
-- Name: boss_battles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.boss_battles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.boss_battles_id_seq OWNER TO postgres;

--
-- Name: boss_battles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.boss_battles_id_seq OWNED BY public.boss_battles.id;


--
-- Name: chat_priority_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_priority_queue (
    id integer NOT NULL,
    session_id integer NOT NULL,
    streamer_id integer NOT NULL,
    viewer_name text NOT NULL,
    message text NOT NULL,
    priority_level integer DEFAULT 6 NOT NULL,
    priority_reason text,
    was_responded boolean DEFAULT false NOT NULL,
    agent_type text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_priority_queue OWNER TO postgres;

--
-- Name: chat_priority_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_priority_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_priority_queue_id_seq OWNER TO postgres;

--
-- Name: chat_priority_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_priority_queue_id_seq OWNED BY public.chat_priority_queue.id;


--
-- Name: daily_claims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_claims (
    id integer NOT NULL,
    user_id integer NOT NULL,
    claimed_date text NOT NULL,
    coins_awarded integer DEFAULT 100 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.daily_claims OWNER TO postgres;

--
-- Name: daily_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_claims_id_seq OWNER TO postgres;

--
-- Name: daily_claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_claims_id_seq OWNED BY public.daily_claims.id;


--
-- Name: kingdom_buildings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kingdom_buildings (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    building_type text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kingdom_buildings OWNER TO postgres;

--
-- Name: kingdom_buildings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kingdom_buildings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kingdom_buildings_id_seq OWNER TO postgres;

--
-- Name: kingdom_buildings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kingdom_buildings_id_seq OWNED BY public.kingdom_buildings.id;


--
-- Name: kingdoms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kingdoms (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    name text DEFAULT 'New Kingdom'::text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    gold integer DEFAULT 0 NOT NULL,
    wood integer DEFAULT 0 NOT NULL,
    stone integer DEFAULT 0 NOT NULL,
    buildings jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kingdoms OWNER TO postgres;

--
-- Name: kingdoms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kingdoms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kingdoms_id_seq OWNER TO postgres;

--
-- Name: kingdoms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kingdoms_id_seq OWNED BY public.kingdoms.id;


--
-- Name: lucky_drops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lucky_drops (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    session_id integer,
    drop_name text DEFAULT 'Lucky Drop'::text NOT NULL,
    prize_description text DEFAULT 'XP Bonus'::text NOT NULL,
    xp_reward integer DEFAULT 0 NOT NULL,
    coin_reward integer DEFAULT 0 NOT NULL,
    trigger_type text DEFAULT 'auto'::text NOT NULL,
    winner_tiktok_viewer_id text,
    winner_name text,
    dropped_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lucky_drops OWNER TO postgres;

--
-- Name: lucky_drops_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lucky_drops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lucky_drops_id_seq OWNER TO postgres;

--
-- Name: lucky_drops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lucky_drops_id_seq OWNED BY public.lucky_drops.id;


--
-- Name: moderation_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.moderation_rules (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    rule_key text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.moderation_rules OWNER TO postgres;

--
-- Name: moderation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.moderation_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.moderation_rules_id_seq OWNER TO postgres;

--
-- Name: moderation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.moderation_rules_id_seq OWNED BY public.moderation_rules.id;


--
-- Name: platform_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_events (
    id integer NOT NULL,
    user_id integer,
    event_type text NOT NULL,
    description text NOT NULL,
    metadata text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.platform_events OWNER TO postgres;

--
-- Name: platform_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.platform_events_id_seq OWNER TO postgres;

--
-- Name: platform_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_events_id_seq OWNED BY public.platform_events.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    streamer_id integer NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    peak_viewers integer DEFAULT 0 NOT NULL,
    total_gifts integer DEFAULT 0 NOT NULL,
    total_likes integer DEFAULT 0 NOT NULL,
    total_followers integer DEFAULT 0 NOT NULL,
    total_comments integer DEFAULT 0 NOT NULL,
    total_shares integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: storm_pass_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storm_pass_events (
    id integer NOT NULL,
    event_type text NOT NULL,
    streamer_id integer,
    viewer_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storm_pass_events OWNER TO postgres;

--
-- Name: storm_pass_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storm_pass_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storm_pass_events_id_seq OWNER TO postgres;

--
-- Name: storm_pass_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storm_pass_events_id_seq OWNED BY public.storm_pass_events.id;


--
-- Name: streamer_alliances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.streamer_alliances (
    id integer NOT NULL,
    requester_id integer NOT NULL,
    target_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.streamer_alliances OWNER TO postgres;

--
-- Name: streamer_alliances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.streamer_alliances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.streamer_alliances_id_seq OWNER TO postgres;

--
-- Name: streamer_alliances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.streamer_alliances_id_seq OWNED BY public.streamer_alliances.id;


--
-- Name: streamers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.streamers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tiktok_live_id text,
    is_live boolean DEFAULT false NOT NULL,
    viewer_count integer DEFAULT 0 NOT NULL,
    total_gifts_received integer DEFAULT 0 NOT NULL,
    total_likes_received integer DEFAULT 0 NOT NULL,
    total_followers_gained integer DEFAULT 0 NOT NULL,
    total_comments integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    obs_token text
);


ALTER TABLE public.streamers OWNER TO postgres;

--
-- Name: streamers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.streamers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.streamers_id_seq OWNER TO postgres;

--
-- Name: streamers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.streamers_id_seq OWNED BY public.streamers.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stripe_subscription_id text,
    plan text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_end timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    clerk_id text NOT NULL,
    email text NOT NULL,
    display_name text,
    tiktok_username text,
    avatar_url text,
    role text DEFAULT 'user'::text NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    stripe_customer_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    ui_language text DEFAULT 'en'::text NOT NULL,
    youtube_access_token text,
    youtube_refresh_token text,
    youtube_channel_id text,
    youtube_channel_name text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: viewer_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.viewer_achievements (
    id integer NOT NULL,
    tiktok_viewer_id text NOT NULL,
    viewer_name text DEFAULT 'Viewer'::text NOT NULL,
    streamer_id integer NOT NULL,
    achievement_key text NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.viewer_achievements OWNER TO postgres;

--
-- Name: viewer_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.viewer_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.viewer_achievements_id_seq OWNER TO postgres;

--
-- Name: viewer_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.viewer_achievements_id_seq OWNED BY public.viewer_achievements.id;


--
-- Name: viewer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.viewer_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    streamer_id integer NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    coins integer DEFAULT 0 NOT NULL,
    total_gifts integer DEFAULT 0 NOT NULL,
    total_likes integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.viewer_profiles OWNER TO postgres;

--
-- Name: viewer_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.viewer_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.viewer_profiles_id_seq OWNER TO postgres;

--
-- Name: viewer_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.viewer_profiles_id_seq OWNED BY public.viewer_profiles.id;


--
-- Name: viewer_xp_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.viewer_xp_events (
    id integer NOT NULL,
    tiktok_viewer_id text NOT NULL,
    viewer_name text DEFAULT 'Viewer'::text NOT NULL,
    streamer_id integer NOT NULL,
    session_id integer,
    event_type text NOT NULL,
    xp_awarded integer DEFAULT 0 NOT NULL,
    coins_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.viewer_xp_events OWNER TO postgres;

--
-- Name: viewer_xp_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.viewer_xp_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.viewer_xp_events_id_seq OWNER TO postgres;

--
-- Name: viewer_xp_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.viewer_xp_events_id_seq OWNED BY public.viewer_xp_events.id;


--
-- Name: achievements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements ALTER COLUMN id SET DEFAULT nextval('public.achievements_id_seq'::regclass);


--
-- Name: agent_viewer_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_viewer_profiles ALTER COLUMN id SET DEFAULT nextval('public.agent_viewer_profiles_id_seq'::regclass);


--
-- Name: ai_agent_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agent_tasks ALTER COLUMN id SET DEFAULT nextval('public.ai_agent_tasks_id_seq'::regclass);


--
-- Name: ai_agents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agents ALTER COLUMN id SET DEFAULT nextval('public.ai_agents_id_seq'::regclass);


--
-- Name: ai_generated_content id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generated_content ALTER COLUMN id SET DEFAULT nextval('public.ai_generated_content_id_seq'::regclass);


--
-- Name: ai_learning_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_learning_reports ALTER COLUMN id SET DEFAULT nextval('public.ai_learning_reports_id_seq'::regclass);


--
-- Name: ai_memories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_memories ALTER COLUMN id SET DEFAULT nextval('public.ai_memories_id_seq'::regclass);


--
-- Name: ai_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages ALTER COLUMN id SET DEFAULT nextval('public.ai_messages_id_seq'::regclass);


--
-- Name: ai_moderation_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_moderation_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_moderation_logs_id_seq'::regclass);


--
-- Name: ai_persona_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_persona_configs ALTER COLUMN id SET DEFAULT nextval('public.ai_persona_configs_id_seq'::regclass);


--
-- Name: ai_personality_modes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_personality_modes ALTER COLUMN id SET DEFAULT nextval('public.ai_personality_modes_id_seq'::regclass);


--
-- Name: ai_quests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_quests ALTER COLUMN id SET DEFAULT nextval('public.ai_quests_id_seq'::regclass);


--
-- Name: ai_response_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_response_scores ALTER COLUMN id SET DEFAULT nextval('public.ai_response_scores_id_seq'::regclass);


--
-- Name: ai_voice_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_voice_profiles ALTER COLUMN id SET DEFAULT nextval('public.ai_voice_profiles_id_seq'::regclass);


--
-- Name: automation_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs ALTER COLUMN id SET DEFAULT nextval('public.automation_logs_id_seq'::regclass);


--
-- Name: automations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automations ALTER COLUMN id SET DEFAULT nextval('public.automations_id_seq'::regclass);


--
-- Name: avatar_animation_presets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar_animation_presets ALTER COLUMN id SET DEFAULT nextval('public.avatar_animation_presets_id_seq'::regclass);


--
-- Name: avatar_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar_configs ALTER COLUMN id SET DEFAULT nextval('public.avatar_configs_id_seq'::regclass);


--
-- Name: battle_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_sessions ALTER COLUMN id SET DEFAULT nextval('public.battle_sessions_id_seq'::regclass);


--
-- Name: battle_transcripts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_transcripts ALTER COLUMN id SET DEFAULT nextval('public.battle_transcripts_id_seq'::regclass);


--
-- Name: boss_attacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boss_attacks ALTER COLUMN id SET DEFAULT nextval('public.boss_attacks_id_seq'::regclass);


--
-- Name: boss_battles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boss_battles ALTER COLUMN id SET DEFAULT nextval('public.boss_battles_id_seq'::regclass);


--
-- Name: chat_priority_queue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_priority_queue ALTER COLUMN id SET DEFAULT nextval('public.chat_priority_queue_id_seq'::regclass);


--
-- Name: daily_claims id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_claims ALTER COLUMN id SET DEFAULT nextval('public.daily_claims_id_seq'::regclass);


--
-- Name: kingdom_buildings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kingdom_buildings ALTER COLUMN id SET DEFAULT nextval('public.kingdom_buildings_id_seq'::regclass);


--
-- Name: kingdoms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kingdoms ALTER COLUMN id SET DEFAULT nextval('public.kingdoms_id_seq'::regclass);


--
-- Name: lucky_drops id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lucky_drops ALTER COLUMN id SET DEFAULT nextval('public.lucky_drops_id_seq'::regclass);


--
-- Name: moderation_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_rules ALTER COLUMN id SET DEFAULT nextval('public.moderation_rules_id_seq'::regclass);


--
-- Name: platform_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_events ALTER COLUMN id SET DEFAULT nextval('public.platform_events_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: storm_pass_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storm_pass_events ALTER COLUMN id SET DEFAULT nextval('public.storm_pass_events_id_seq'::regclass);


--
-- Name: streamer_alliances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamer_alliances ALTER COLUMN id SET DEFAULT nextval('public.streamer_alliances_id_seq'::regclass);


--
-- Name: streamers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamers ALTER COLUMN id SET DEFAULT nextval('public.streamers_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: viewer_achievements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_achievements ALTER COLUMN id SET DEFAULT nextval('public.viewer_achievements_id_seq'::regclass);


--
-- Name: viewer_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_profiles ALTER COLUMN id SET DEFAULT nextval('public.viewer_profiles_id_seq'::regclass);


--
-- Name: viewer_xp_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_xp_events ALTER COLUMN id SET DEFAULT nextval('public.viewer_xp_events_id_seq'::regclass);


--
-- Name: achievements achievements_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_key_unique UNIQUE (key);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: agent_viewer_profiles agent_viewer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_viewer_profiles
    ADD CONSTRAINT agent_viewer_profiles_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_tasks ai_agent_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agent_tasks
    ADD CONSTRAINT ai_agent_tasks_pkey PRIMARY KEY (id);


--
-- Name: ai_agents ai_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agents
    ADD CONSTRAINT ai_agents_pkey PRIMARY KEY (id);


--
-- Name: ai_generated_content ai_generated_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generated_content
    ADD CONSTRAINT ai_generated_content_pkey PRIMARY KEY (id);


--
-- Name: ai_learning_reports ai_learning_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_learning_reports
    ADD CONSTRAINT ai_learning_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_memories ai_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_memories
    ADD CONSTRAINT ai_memories_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_moderation_logs ai_moderation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_moderation_logs
    ADD CONSTRAINT ai_moderation_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_persona_configs ai_persona_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_persona_configs
    ADD CONSTRAINT ai_persona_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_persona_configs ai_persona_configs_streamer_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_persona_configs
    ADD CONSTRAINT ai_persona_configs_streamer_id_unique UNIQUE (streamer_id);


--
-- Name: ai_personality_modes ai_personality_modes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_personality_modes
    ADD CONSTRAINT ai_personality_modes_pkey PRIMARY KEY (id);


--
-- Name: ai_quests ai_quests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_quests
    ADD CONSTRAINT ai_quests_pkey PRIMARY KEY (id);


--
-- Name: ai_response_scores ai_response_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_response_scores
    ADD CONSTRAINT ai_response_scores_pkey PRIMARY KEY (id);


--
-- Name: ai_voice_profiles ai_voice_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_voice_profiles
    ADD CONSTRAINT ai_voice_profiles_pkey PRIMARY KEY (id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (id);


--
-- Name: automations automations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_pkey PRIMARY KEY (id);


--
-- Name: avatar_animation_presets avatar_animation_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar_animation_presets
    ADD CONSTRAINT avatar_animation_presets_pkey PRIMARY KEY (id);


--
-- Name: avatar_configs avatar_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar_configs
    ADD CONSTRAINT avatar_configs_pkey PRIMARY KEY (id);


--
-- Name: avatar_configs avatar_configs_streamer_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar_configs
    ADD CONSTRAINT avatar_configs_streamer_id_unique UNIQUE (streamer_id);


--
-- Name: battle_sessions battle_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_sessions
    ADD CONSTRAINT battle_sessions_pkey PRIMARY KEY (id);


--
-- Name: battle_sessions battle_sessions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_sessions
    ADD CONSTRAINT battle_sessions_session_id_unique UNIQUE (session_id);


--
-- Name: battle_transcripts battle_transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_transcripts
    ADD CONSTRAINT battle_transcripts_pkey PRIMARY KEY (id);


--
-- Name: boss_attacks boss_attacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boss_attacks
    ADD CONSTRAINT boss_attacks_pkey PRIMARY KEY (id);


--
-- Name: boss_battles boss_battles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boss_battles
    ADD CONSTRAINT boss_battles_pkey PRIMARY KEY (id);


--
-- Name: chat_priority_queue chat_priority_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_priority_queue
    ADD CONSTRAINT chat_priority_queue_pkey PRIMARY KEY (id);


--
-- Name: daily_claims daily_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_claims
    ADD CONSTRAINT daily_claims_pkey PRIMARY KEY (id);


--
-- Name: kingdom_buildings kingdom_buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kingdom_buildings
    ADD CONSTRAINT kingdom_buildings_pkey PRIMARY KEY (id);


--
-- Name: kingdoms kingdoms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kingdoms
    ADD CONSTRAINT kingdoms_pkey PRIMARY KEY (id);


--
-- Name: lucky_drops lucky_drops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lucky_drops
    ADD CONSTRAINT lucky_drops_pkey PRIMARY KEY (id);


--
-- Name: moderation_rules moderation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_rules
    ADD CONSTRAINT moderation_rules_pkey PRIMARY KEY (id);


--
-- Name: platform_events platform_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: storm_pass_events storm_pass_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storm_pass_events
    ADD CONSTRAINT storm_pass_events_pkey PRIMARY KEY (id);


--
-- Name: streamer_alliances streamer_alliances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamer_alliances
    ADD CONSTRAINT streamer_alliances_pkey PRIMARY KEY (id);


--
-- Name: streamers streamers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamers
    ADD CONSTRAINT streamers_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_clerk_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: viewer_achievements viewer_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_achievements
    ADD CONSTRAINT viewer_achievements_pkey PRIMARY KEY (id);


--
-- Name: viewer_profiles viewer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_profiles
    ADD CONSTRAINT viewer_profiles_pkey PRIMARY KEY (id);


--
-- Name: viewer_xp_events viewer_xp_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_xp_events
    ADD CONSTRAINT viewer_xp_events_pkey PRIMARY KEY (id);


--
-- Name: storm_pass_events_streamer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX storm_pass_events_streamer_idx ON public.storm_pass_events USING btree (streamer_id);


--
-- Name: storm_pass_events_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX storm_pass_events_type_idx ON public.storm_pass_events USING btree (event_type, created_at DESC);


--
-- Name: agent_viewer_profiles agent_viewer_profiles_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_viewer_profiles
    ADD CONSTRAINT agent_viewer_profiles_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_agent_tasks ai_agent_tasks_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agent_tasks
    ADD CONSTRAINT ai_agent_tasks_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_agents ai_agents_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agents
    ADD CONSTRAINT ai_agents_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_generated_content ai_generated_content_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generated_content
    ADD CONSTRAINT ai_generated_content_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_learning_reports ai_learning_reports_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_learning_reports
    ADD CONSTRAINT ai_learning_reports_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_memories ai_memories_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_memories
    ADD CONSTRAINT ai_memories_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_moderation_logs ai_moderation_logs_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_moderation_logs
    ADD CONSTRAINT ai_moderation_logs_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_persona_configs ai_persona_configs_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_persona_configs
    ADD CONSTRAINT ai_persona_configs_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_personality_modes ai_personality_modes_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_personality_modes
    ADD CONSTRAINT ai_personality_modes_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_quests ai_quests_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_quests
    ADD CONSTRAINT ai_quests_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_response_scores ai_response_scores_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_response_scores
    ADD CONSTRAINT ai_response_scores_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: ai_voice_profiles ai_voice_profiles_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_voice_profiles
    ADD CONSTRAINT ai_voice_profiles_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: automation_logs automation_logs_automation_id_automations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_automation_id_automations_id_fk FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE CASCADE;


--
-- Name: automation_logs automation_logs_session_id_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_session_id_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: automation_logs automation_logs_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: automations automations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: avatar_configs avatar_configs_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar_configs
    ADD CONSTRAINT avatar_configs_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: battle_sessions battle_sessions_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_sessions
    ADD CONSTRAINT battle_sessions_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: battle_transcripts battle_transcripts_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_transcripts
    ADD CONSTRAINT battle_transcripts_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: boss_attacks boss_attacks_battle_id_boss_battles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boss_attacks
    ADD CONSTRAINT boss_attacks_battle_id_boss_battles_id_fk FOREIGN KEY (battle_id) REFERENCES public.boss_battles(id) ON DELETE CASCADE;


--
-- Name: boss_battles boss_battles_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boss_battles
    ADD CONSTRAINT boss_battles_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: chat_priority_queue chat_priority_queue_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_priority_queue
    ADD CONSTRAINT chat_priority_queue_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: kingdom_buildings kingdom_buildings_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kingdom_buildings
    ADD CONSTRAINT kingdom_buildings_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: kingdoms kingdoms_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kingdoms
    ADD CONSTRAINT kingdoms_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: lucky_drops lucky_drops_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lucky_drops
    ADD CONSTRAINT lucky_drops_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: moderation_rules moderation_rules_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_rules
    ADD CONSTRAINT moderation_rules_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: platform_events platform_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: streamer_alliances streamer_alliances_requester_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamer_alliances
    ADD CONSTRAINT streamer_alliances_requester_id_streamers_id_fk FOREIGN KEY (requester_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: streamer_alliances streamer_alliances_target_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamer_alliances
    ADD CONSTRAINT streamer_alliances_target_id_streamers_id_fk FOREIGN KEY (target_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: streamers streamers_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streamers
    ADD CONSTRAINT streamers_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: viewer_achievements viewer_achievements_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_achievements
    ADD CONSTRAINT viewer_achievements_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- Name: viewer_profiles viewer_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_profiles
    ADD CONSTRAINT viewer_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: viewer_xp_events viewer_xp_events_streamer_id_streamers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viewer_xp_events
    ADD CONSTRAINT viewer_xp_events_streamer_id_streamers_id_fk FOREIGN KEY (streamer_id) REFERENCES public.streamers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hMRKAu0OcephGVGvSggZnf1FLavd23VaA64rwzkJqvacs7wf5Q8U2kpbA5mSacs

