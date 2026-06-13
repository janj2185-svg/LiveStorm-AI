import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";

export type ConnectionMode = "real" | "demo" | "error";

// Mirrors useStreamerMic — true on iOS/Android/any mobile UA
const IS_MOBILE_DETECT = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export interface LiveEvent {
  type: "comment" | "gift" | "like" | "follow" | "share" | "viewerCount" | "ai_announcement"
      | "xp_awarded" | "achievement_unlocked" | "level_up"
      | "lucky_drop" | "boss_reward" | "quiz_win" | "treasure_hunt_win" | "kingdom_upgrade";
  sessionId: number;
  username?: string;
  avatarUrl?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AutomationFiredEvent {
  automationId: number;
  automationName: string;
  actionType: string;
  actionPayload: string;
  triggerEvent: LiveEvent;
  timestamp: number;
}

export interface AiAnnouncementEvent {
  text: string;
  type: "gift" | "level_up" | "boss_defeated" | string;
  viewerName?: string;
  bossName?: string;
  timestamp: number;
}

export interface ModerationFlaggedEvent {
  viewerName: string;
  comment: string;
  reason: string;
  timestamp: number;
}

export interface ViewerRecognitionEvent {
  viewerName:  string;
  tier:        string;
  loyaltyTier: string;
  title:       string;
  triggeredAt: number;
  reason:      string;
  aiLine?:     string;
}

export interface TikTokStatusEvent {
  mode: ConnectionMode;
  error?: string;
  username?: string;
}

export interface LiveStats {
  viewerCount: number;
  totalGifts: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalShares: number;
  topSupporters: Array<{ username: string; coins: number }>;
}

export interface XpAwardedEvent {
  viewerName: string;
  tiktokViewerId: string;
  xp: number;
  coins: number;
  totalXp: number;
  level: number;
  eventType: string;
  timestamp: number;
}

export interface LevelUpEvent {
  viewerName: string;
  newLevel: number;
  timestamp: number;
}

export interface AchievementUnlockEvent {
  viewerName: string;
  achievement: {
    key: string;
    name: string;
    description: string;
    iconType: string;
    xpReward: number;
    coinReward: number;
  };
  timestamp: number;
}

export interface LuckyDropEvent {
  id?: number;
  dropName: string;
  prizeDescription: string;
  xpReward: number;
  coinReward: number;
  winnerName: string;
  triggerType: string;
  timestamp: number;
}

export interface KingdomUpdateEvent {
  streamerId: number;
  gold: number;
  wood: number;
  stone: number;
  goldDelta: number;
  woodDelta: number;
  stoneDelta: number;
  timestamp: number;
}

export interface LeaderboardUpdateEvent {
  sessionId: number | null;
  streamerId: number;
  viewerName: string;
  tiktokViewerId: string;
  totalXp: number;
  level: number;
  timestamp: number;
}

export type TtsMode = "off" | "openai";

// ── Emotion Engine types (mirrored from backend emotionEngine.ts) ──────────────

export type EmotionType =
  | "happy" | "excited" | "confident" | "curious" | "playful"
  | "competitive" | "grateful" | "frustrated" | "surprised";

export interface EmotionalHistoryEntry {
  emotion: EmotionType;
  intensity: number;
  trigger: string;
  ts: number;
}

export interface EmotionalState {
  sessionId: number;
  primary: EmotionType;
  intensity: number;
  secondary: EmotionType | null;
  secondaryIntensity: number;
  lastUpdatedAt: number;
  lastTrigger: string;
  history: EmotionalHistoryEntry[];
  // UI enrichment from backend
  emoji?: string;
  label?: string;
  color?: string;
  bgClass?: string;
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE_URL}/api`;

// Queue to prevent overlapping TTS playback
let ttsQueue: Promise<void> = Promise.resolve();
let ttsQueueDepth = 0;

// Track the currently playing OpenAI Audio element so stopAllSpeech() can cancel it
let currentAudioElement: HTMLAudioElement | null = null;

// ── Autoplay unlock ────────────────────────────────────────────────────────────
// Browsers block audio.play() triggered by socket events (no user gesture).
// The user must click "Enable Voice" once. That click calls unlockAudio(), which
// plays a silent frame so Chrome marks the page as "activated". After that, all
// socket-triggered audio.play() calls succeed for the life of the page session.
let audioUnlocked = false;

function unlockAudio(): void {
  if (audioUnlocked) return;
  try {
    // AudioContext silent buffer — satisfies Chrome's activation requirement
    type AnyAudioContext = typeof AudioContext;
    const win = window as unknown as Record<string, unknown>;
    const Ctx: AnyAudioContext = (window.AudioContext ?? win["webkitAudioContext"]) as AnyAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      void ctx.close();
    }
  } catch { /* ignore */ }
  audioUnlocked = true;
  console.log("[TTS:OpenAI] 🔓 Audio unlocked — autoplay enabled for this session");
  window.dispatchEvent(new CustomEvent("tts:audio:unlocked"));
}

// ── OpenAI TTS — full pipeline with numbered step logging ────────────────────
async function playOpenAiTts(
  rawText: string,
  voice: string,
  volume: number,
  speed = 1.0,
  getToken?: () => Promise<string | null>,
): Promise<void> {
  // STEP 3 — generateVoice() entry point
  console.log(`[TTS:3] generateVoice called | voice=${voice} | speed=${speed} | audioUnlocked=${audioUnlocked} | text="${rawText.slice(0, 60)}"`);

  if (!audioUnlocked) {
    console.warn("[TTS:3] ⚠ Audio NOT unlocked — click '🔊 Enable Voice' on the Voice panel. Playback will be blocked.");
  }

  // Normalize: strip/replace emojis so OpenAI doesn't read them literally
  const { text, hasEmojis, emojiEmotion } = normalizeTtsText(rawText);
  if (!text.trim()) {
    console.log("[TTS:3] text empty after normalization — skip");
    return;
  }
  if (hasEmojis) {
    console.log(`[TTS:Normalize] raw="${rawText.slice(0,60)}" → "${text.slice(0,60)}" | emojiEmotion=${emojiEmotion}`);
  }

  try {
    // STEP 4 — HTTP request to /api/ai/voice with Bearer token auth
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(`[TTS:4] → POST ${API_BASE}/ai/voice [Bearer token attached]`);
    } else {
      console.warn(`[TTS:4] → POST ${API_BASE}/ai/voice [no token — may get 401]`);
    }
    const res = await fetch(`${API_BASE}/ai/voice`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ text, voice, speed }),
    });

    // STEP 5 — HTTP response status
    console.log(`[TTS:5] ← HTTP ${res.status} | ok=${res.ok} | content-type=${res.headers.get("content-type") ?? "?"}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? `HTTP ${res.status}`;
      console.warn(`[TTS:5] ✗ HTTP error: ${msg}`);
      window.dispatchEvent(new CustomEvent("tts:openai:err", { detail: { error: `HTTP ${res.status}: ${msg}` } }));
      return;
    }

    // STEP 6 — Audio buffer from response
    const blob = await res.blob();
    console.log(`[TTS:6] Audio buffer | size=${blob.size} bytes | type=${blob.type || "audio/mpeg"}`);

    if (blob.size === 0) {
      console.warn("[TTS:6] ✗ Empty audio blob — OpenAI returned no audio data");
      window.dispatchEvent(new CustomEvent("tts:openai:err", { detail: { error: "empty audio response" } }));
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioElement = audio;
    audio.volume = Math.max(0, Math.min(1, volume));

    // STEP 7 — tts:audio event (window, not socket — frontend-internal signal)
    console.log("[TTS:7] tts:audio window event dispatched");
    window.dispatchEvent(new CustomEvent("tts:audio", { detail: audio }));
    window.dispatchEvent(new CustomEvent("tts:start", { detail: { voice } }));

    // STEP 8 — frontend receives / STEP 9 — Audio element ready
    console.log(`[TTS:8+9] Audio element created | volume=${audio.volume}`);

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        currentAudioElement = null;
        URL.revokeObjectURL(url);
        console.log("[TTS:10] ✅ Playback finished");
        window.dispatchEvent(new CustomEvent("tts:end"));
        resolve();
      };
      audio.onerror = (e) => {
        currentAudioElement = null;
        URL.revokeObjectURL(url);
        console.warn("[TTS:10] ✗ audio.onerror — decode/format error:", e);
        window.dispatchEvent(new CustomEvent("tts:openai:err", { detail: { error: "audio playback error" } }));
        resolve();
      };

      // STEP 10 — audio.play()
      console.log("[PlaybackStarted][TTS:10] audio.play() → calling...");
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[TTS:10] ✅ play() resolved — audio started");
            window.dispatchEvent(new CustomEvent("tts:openai:ok", { detail: { voice } }));
          })
          .catch((err: Error) => {
            currentAudioElement = null;
            URL.revokeObjectURL(url);
            console.warn(`[TTS:10] ❌ play() REJECTED — ${err?.name}: ${err?.message}`);
            console.warn("[TTS:10] ⚠ AUTOPLAY BLOCKED — click '🔊 Enable Voice' on the Voice panel to unlock audio");
            window.dispatchEvent(new CustomEvent("tts:openai:err", { detail: { error: `autoplay blocked: click Enable Voice button` } }));
            window.dispatchEvent(new CustomEvent("tts:blocked", { detail: { text: rawText, voice } }));
            resolve();
          });
      }
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.warn("[TTS:4-5] ✗ network/fetch error:", msg);
    window.dispatchEvent(new CustomEvent("tts:openai:err", { detail: { error: msg } }));
  }
}

// detectTtsLang: detect the spoken language of AI output text.
// defaultLang = stream's primary language (e.g. "uk", "pl"). Used as a
// tiebreaker for generic Cyrillic that lacks Ukrainian-specific letters.
function detectTtsLang(text: string, defaultLang?: string): string {
  // Ukrainian-specific letters (not in Russian) — strongest signal
  if (/[іїєІЇЄґҐ]/.test(text)) return "uk-UA";
  // Ukrainian words/phrases without unique letters (common in announcements)
  if (/виграв|виграш|щасли|привіт|вітаємо|дякую|будь ласка|зараз|будемо|рівень|переможе|молодець|неймовірно|чудово|стрим|глядач|підписник|подарунок|лайк|перемог/i.test(text)) return "uk-UA";
  // Generic Cyrillic: fall back to the stream's primary language when known.
  // A Ukrainian stream replying in Cyrillic without unique letters is still Ukrainian.
  if (/[а-яА-Я]/.test(text)) {
    if (defaultLang === "uk") return "uk-UA";
    if (defaultLang === "ru") return "ru-RU";
    return "ru-RU"; // safe fallback when stream lang unknown
  }
  // Polish diacritics
  if (/[ąęóśźżćłńĄĘÓŚŹŻĆŁŃ]/.test(text)) return "pl-PL";
  // German diacritics / eszett
  if (/[äöüÄÖÜß]/.test(text)) return "de-DE";
  // French diacritics
  if (/[àâæçéèêëîïôœùûüÿÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ]/.test(text)) return "fr-FR";
  // Spanish diacritics
  if (/[áéíóúüñ¡¿ÁÉÍÓÚÜÑ]/.test(text)) return "es-ES";
  return "en-US";
}

// ── Text normalization: strip/convert emojis before TTS ──────────────────────
//
// OpenAI TTS reads emoji names literally ("smiling face", "fire emoji").
// This layer converts them to natural speech equivalents before OpenAI sees
// the text. Emoji emotion classification also drives rate/pitch adjustments.

type EmojiEmotion = "laugh" | "excited" | "sad" | "angry" | "warm" | "neutral";

interface NormalizeResult {
  text: string;
  emojiEmotion: EmojiEmotion;
  hasEmojis: boolean;
}

function normalizeTtsText(rawText: string, ttsLang?: string): NormalizeResult {
  const isUkRu = !ttsLang || ttsLang.startsWith("uk") || ttsLang.startsWith("ru");
  const isPl   = ttsLang?.startsWith("pl");

  // ── Detect dominant emoji emotion BEFORE stripping ───────────────────────
  const hasLaugh   = /[\u{1F602}\u{1F923}\u{1F639}\u{1F601}\u{1F603}\u{1F604}\u{1F600}]/u.test(rawText);
  const hasExcited = /[\u{1F525}\u{1F4A5}\u{26A1}\u{1F31F}\u{2728}\u{1F389}\u{1F38A}]/u.test(rawText);
  const hasSad     = /[\u{1F622}\u{1F62D}\u{1F97A}\u{1F614}\u{1F615}]/u.test(rawText);
  const hasAngry   = /[\u{1F621}\u{1F620}\u{1F92C}]/u.test(rawText);
  const hasWarm    = /[\u{2764}\u{1F495}\u{1F496}\u{1F970}\u{1F60D}]/u.test(rawText);

  let emojiEmotion: EmojiEmotion = "neutral";
  if (hasLaugh)        emojiEmotion = "laugh";
  else if (hasExcited) emojiEmotion = "excited";
  else if (hasSad)     emojiEmotion = "sad";
  else if (hasAngry)   emojiEmotion = "angry";
  else if (hasWarm)    emojiEmotion = "warm";

  const hasEmojis = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(rawText);

  let text = rawText;

  // ── Step 1: Laugh emojis → natural laugh sound ───────────────────────────
  // Ukrainian: "ха-ха-ха", Polish/English: "ha ha ha"
  const laughSound = isUkRu ? "ха-ха-ха!" : isPl ? "ha ha ha!" : "ha ha ha!";
  text = text.replace(/[\u{1F602}\u{1F923}\u{1F639}]+/gu, laughSound);

  // Happy-face emojis (non-laugh) → remove; warmth lives in voice pacing
  text = text.replace(/[\u{1F604}\u{1F603}\u{1F600}\u{1F601}\u{263A}]+/gu, "");

  // ── Step 2: Excited emojis → emphasis punctuation or remove ─────────────
  // Inline 🔥💥⚡ → "!" to keep the energy without naming them
  text = text.replace(/[\u{1F525}\u{1F4A5}\u{26A1}]+/gu, "!");
  // Party/celebration → remove (energy in voice)
  text = text.replace(/[\u{1F389}\u{1F38A}\u{1F381}\u{1F3C6}\u{1F451}\u{1F31F}\u{2728}\u{1F4AB}]+/gu, "");

  // ── Step 3: Sad emojis → pause marker ────────────────────────────────────
  text = text.replace(/[\u{1F622}\u{1F62D}\u{1F97A}]+/gu, "...");
  text = text.replace(/[\u{1F614}\u{1F615}\u{1F641}]+/gu, "");

  // ── Step 4: Angry emojis → remove (conveyed by voice energy) ────────────
  text = text.replace(/[\u{1F621}\u{1F620}\u{1F92C}]+/gu, "");

  // ── Step 5: Love/warm emojis → remove ───────────────────────────────────
  text = text.replace(/[\u{2764}\u{1F495}\u{1F496}\u{1F497}\u{1F498}\u{1F49E}\u{1F493}\u{1F970}\u{1F60D}]+/gu, "");
  text = text.replace(/\uFE0F/g, ""); // strip variation selector-16 (e.g. ❤️ → ❤)

  // ── Step 6: Catch-all — any remaining emoji in standard Unicode ranges ───
  text = text.replace(/[\u{1F000}-\u{1F9FF}]/gu, "");
  text = text.replace(/[\u{1FA00}-\u{1FAFF}]/gu, "");
  text = text.replace(/[\u{2600}-\u{26FF}]/gu,   "");
  text = text.replace(/[\u{2700}-\u{27BF}]/gu,   "");
  text = text.replace(/[\uFE00-\uFEFF]/g, ""); // variation selectors

  // ── Step 7: General text cleanup ─────────────────────────────────────────
  text = text.replace(/https?:\/\/\S+/g, "");             // URLs
  text = text.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1"); // markdown bold/italic
  text = text.replace(/_([^_\n]+)_/g, "$1");
  text = text.replace(/!{3,}/g,  "!");  // !!! → !
  text = text.replace(/\?{3,}/g, "??"); // ??? → ??
  text = text.replace(/\.{4,}/g, "..."); // .... → ...
  text = text.replace(/\s{2,}/g, " ").trim();

  // ── Step 8: Fallback for emoji-only input ────────────────────────────────
  if (!text.trim() && hasEmojis) {
    if      (emojiEmotion === "laugh")   text = isUkRu ? "ха-ха-ха" : "ha ha ha";
    else if (emojiEmotion === "excited") text = isUkRu ? "Ого!"     : "Wow!";
    else if (emojiEmotion === "sad")     text = "...";
    else if (emojiEmotion === "warm")    text = isUkRu ? "дякую"    : "thank you";
    else                                 text = "";
  }

  return { text, emojiEmotion, hasEmojis };
}

// ── BROWSER TTS HARD BLOCK ────────────────────────────────────────────────────
// speechSynthesis.speak() is NEVER called. Only OpenAI TTS is allowed.
// Any code path that reaches speechSynthesis logs [BROWSER_TTS_BLOCKED] and stops.
if (typeof window !== "undefined" && window.speechSynthesis) {
  console.warn("[BROWSER_TTS_BLOCKED] speechSynthesis.cancel() on module load — browser TTS permanently disabled");
  window.speechSynthesis.cancel();
}

// ── Stop all speech immediately and flush the queue ───────────────────────────
function stopAllSpeechNow(): void {
  // Hard block: cancel any browser speech that may have leaked in
  if (typeof window !== "undefined" && window.speechSynthesis) {
    console.warn("[BROWSER_TTS_BLOCKED] stopAllSpeechNow — cancelling any browser speech");
    window.speechSynthesis.cancel();
  }
  // 2. Stop any playing OpenAI audio element
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.src = "";
    currentAudioElement = null;
  }
  // 3. Flush the queue — replace with a resolved promise so the next item runs immediately
  ttsQueue = Promise.resolve();
  ttsQueueDepth = 0;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tts:queue", { detail: { depth: 0 } }));
    window.dispatchEvent(new CustomEvent("tts:end"));
  }
  console.log("[TTS] 🛑 stopAllSpeech — synthesis cancelled, audio stopped, queue flushed");
}

function enqueueTts(fn: () => Promise<void>, text?: string): void {
  ttsQueueDepth++;
  window.dispatchEvent(new CustomEvent("tts:queue", { detail: { depth: ttsQueueDepth } }));
  ttsQueue = ttsQueue.then(async () => {
    try {
      await fn();
      if (text) window.dispatchEvent(new CustomEvent("tts:spoken", { detail: { text } }));
    } finally {
      ttsQueueDepth = Math.max(0, ttsQueueDepth - 1);
      window.dispatchEvent(new CustomEvent("tts:queue", { detail: { depth: ttsQueueDepth } }));
    }
  }).catch(() => {
    ttsQueueDepth = Math.max(0, ttsQueueDepth - 1);
    window.dispatchEvent(new CustomEvent("tts:queue", { detail: { depth: ttsQueueDepth } }));
  });
}

export function useLiveSession(
  sessionId: number | null | undefined,
  initialMode?: ConnectionMode | null,
) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [automationsFired, setAutomationsFired] = useState<AutomationFiredEvent[]>([]);
  const [aiAnnouncements, setAiAnnouncements] = useState<AiAnnouncementEvent[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<ModerationFlaggedEvent[]>([]);
  const [viewerRecognitionEvents, setViewerRecognitionEvents] = useState<ViewerRecognitionEvent[]>([]);
  const [recentXpAwards, setRecentXpAwards] = useState<XpAwardedEvent[]>([]);
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlockEvent[]>([]);
  const [luckyDrops, setLuckyDrops] = useState<LuckyDropEvent[]>([]);
  const [levelUps, setLevelUps] = useState<LevelUpEvent[]>([]);
  const [kingdomUpdates, setKingdomUpdates] = useState<KingdomUpdateEvent[]>([]);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [emotionState, setEmotionState] = useState<EmotionalState | null>(null);
  const [activeVoiceName, setActiveVoiceName] = useState<string | null>(null);
  const [ttsQueueLen, setTtsQueueLen] = useState(0);

  const [tiktokMode, setTiktokMode] = useState<ConnectionMode | null>(initialMode ?? null);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [tiktokUsername, setTiktokUsername] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode != null) {
      setTiktokMode((prev) => prev ?? initialMode);
    }
  }, [initialMode]);

  const ttsModeRef = useRef<TtsMode>(
    (() => {
      try {
        const saved = localStorage.getItem("ttsMode");
        // Clamp any legacy "browser" value to "off" — browser TTS is permanently removed
        if (saved === "browser") {
          console.warn("[BROWSER_TTS_BLOCKED] localStorage had ttsMode=browser — clamping to off");
          try { localStorage.setItem("ttsMode", "off"); } catch {}
          return "off";
        }
        return (saved as TtsMode | null) ?? "off";
      }
      catch { return "off"; }
    })()
  );
  const ttsVoiceRef = useRef<string>(
    (() => { try { return localStorage.getItem("ttsVoice") ?? "nova"; } catch { return "nova"; } })()
  );
  const ttsVolumeRef = useRef<number>(
    (() => { try { return Number(localStorage.getItem("ttsVolume") ?? "1.0") || 1.0; } catch { return 1.0; } })()
  );
  const ttsSpeedRef = useRef<number>(
    (() => { try { return Number(localStorage.getItem("ttsSpeed") ?? "1.0") || 1.0; } catch { return 1.0; } })()
  );

  // ── Reactive TTS diagnostic state ──────────────────────────────────────────
  // `ttsModeRef` is a ref (non-reactive) for perf; these state mirrors let the
  // UI display the current engine, OpenAI status, and last spoken language.
  const [ttsModeLive, setTtsModeLive] = useState<TtsMode>(
    (() => {
      try {
        const saved = localStorage.getItem("ttsMode");
        if (saved === "browser") return "off"; // clamp legacy value
        return (saved as TtsMode | null) ?? "off";
      } catch { return "off"; }
    })()
  );
  const [openaiTtsOk,     setOpenaiTtsOk]     = useState<boolean | null>(null);
  const [openaiTtsErr,    setOpenaiTtsErr]     = useState<string | null>(null);
  const [lastSpokenLang,  setLastSpokenLang]   = useState<string | null>(null);
  const [lastSpokenEngine,setLastSpokenEngine] = useState<"openai" | null>(null);

  const setTtsMode = useCallback((mode: TtsMode) => {
    ttsModeRef.current = mode;
    setTtsModeLive(mode);
  }, []);
  const setTtsVoice = useCallback((voice: string) => {
    ttsVoiceRef.current = voice;
    try { localStorage.setItem("ttsVoice", voice); } catch { /* ignore */ }
  }, []);
  const setTtsVolume = useCallback((volume: number) => {
    ttsVolumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);
  const setTtsSpeed = useCallback((speed: number) => {
    ttsSpeedRef.current = Math.max(0.25, Math.min(4.0, speed));
  }, []);

  // ── Audio unlock state ─────────────────────────────────────────────────────
  // Mirrors the module-level `audioUnlocked` flag into React state so the UI
  // can show/hide the "Enable Voice" button reactively.
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(() => audioUnlocked);
  useEffect(() => {
    const handler = () => setIsAudioUnlocked(true);
    window.addEventListener("tts:audio:unlocked", handler);
    return () => window.removeEventListener("tts:audio:unlocked", handler);
  }, []);
  const unlockAudioCallback = useCallback(() => {
    unlockAudio();
    setIsAudioUnlocked(true);
  }, []);

  // ── Co-host latency tracking ──────────────────────────────────────────────
  const lastSpeechEmitAtRef = useRef<number | null>(null);
  const lastAnnounceAtRef   = useRef<number | null>(null);
  const [coHostLatency, setCoHostLatency] = useState<{
    stt: number; ai: number; tts: number; total: number;
  } | null>(null);

  // Listen for tts:start to measure TTS synthesis latency
  useEffect(() => {
    const handleTtsStart = () => {
      const announceAt = lastAnnounceAtRef.current;
      if (announceAt === null) return;
      const ttsMs = Date.now() - announceAt;
      lastAnnounceAtRef.current = null;
      setCoHostLatency(prev =>
        prev ? { ...prev, tts: ttsMs, total: prev.stt + prev.ai + ttsMs } : null,
      );
    };
    window.addEventListener("tts:start", handleTtsStart);
    return () => window.removeEventListener("tts:start", handleTtsStart);
  }, []);

  // Replay any text through the TTS pipeline (used for blocked-reply playback).
  const replayTts = useCallback((text: string) => {
    if (ttsModeRef.current !== "openai") return;
    enqueueTts(
      () => playOpenAiTts(text, ttsVoiceRef.current, ttsVolumeRef.current, ttsSpeedRef.current, getToken),
      text,
    );
  }, [getToken]);

  // Legacy compatibility — maps true→openai, false→off (never browser)
  const setTtsEnabled = useCallback((enabled: boolean) => {
    ttsModeRef.current = enabled ? "openai" : "off";
  }, []);

  // ── TTS diagnostic event listeners ─────────────────────────────────────────
  // Listen for custom events dispatched by playOpenAiTts so React state stays
  // in sync with what the module-level TTS function reports.
  useEffect(() => {
    const handleOk = () => {
      setOpenaiTtsOk(true);
      setOpenaiTtsErr(null);
      setLastSpokenEngine("openai");
    };
    const handleErr = (e: Event) => {
      const detail = (e as CustomEvent<{ error?: string }>).detail;
      setOpenaiTtsOk(false);
      setOpenaiTtsErr(detail?.error ?? "TTS failed");
    };
    const handleLang = (e: Event) => {
      const detail = (e as CustomEvent<{ lang?: string; engine?: string }>).detail;
      if (detail?.lang) setLastSpokenLang(detail.lang);
      if (detail?.engine === "openai") {
        setLastSpokenEngine("openai");
      }
    };
    window.addEventListener("tts:openai:ok",  handleOk);
    window.addEventListener("tts:openai:err", handleErr);
    window.addEventListener("tts:lang",       handleLang);
    return () => {
      window.removeEventListener("tts:openai:ok",  handleOk);
      window.removeEventListener("tts:openai:err", handleErr);
      window.removeEventListener("tts:lang",       handleLang);
    };
  }, []);

  const [lastMicEmit,       setLastMicEmit]       = useState<{ text: string; lang: string; ts: number } | null>(null);
  const [lastMicBackendAck, setLastMicBackendAck] = useState<{ ok: boolean; ts: number } | null>(null);

  const [stats, setStats] = useState<LiveStats>({
    viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0,
    totalComments: 0, totalShares: 0, topSupporters: [],
  });
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const supportersRef = useRef<Map<string, number>>(new Map());
  const authRetryRef = useRef(false);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setAutomationsFired([]);
    setAiAnnouncements([]);
    setFlaggedComments([]);
    setRecentXpAwards([]);
    setAchievementUnlocks([]);
    setLuckyDrops([]);
    setLevelUps([]);
    setTranslations({});
    setKingdomUpdates([]);
    setLeaderboardVersion(0);
    setStats({
      viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0,
      totalComments: 0, totalShares: 0, topSupporters: [],
    });
    supportersRef.current = new Map();
  }, []);

  const stopAllSpeech = useCallback(() => {
    stopAllSpeechNow();
    setActiveVoiceName(null);
    setTtsQueueLen(0);
  }, []);

  const clearSpeechQueue = useCallback(() => {
    ttsQueue = Promise.resolve();
    ttsQueueDepth = 0;
    window.dispatchEvent(new CustomEvent("tts:queue", { detail: { depth: 0 } }));
    setTtsQueueLen(0);
    console.log("[TTS] 🗑️ speech queue cleared");
  }, []);

  // Track active voice name and queue depth from window TTS events
  useEffect(() => {
    const onStart = (e: Event) => {
      const name = (e as CustomEvent<{ voice?: string }>).detail?.voice ?? "Speaking…";
      setActiveVoiceName(name);
    };
    const onEnd   = () => setActiveVoiceName(null);
    const onQueue = (e: Event) => {
      const depth = (e as CustomEvent<{ depth: number }>).detail?.depth ?? 0;
      setTtsQueueLen(depth);
    };
    window.addEventListener("tts:start", onStart);
    window.addEventListener("tts:end",   onEnd);
    window.addEventListener("tts:queue", onQueue);
    return () => {
      window.removeEventListener("tts:start", onStart);
      window.removeEventListener("tts:end",   onEnd);
      window.removeEventListener("tts:queue", onQueue);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const connect = async () => {
      authRetryRef.current = false;
      const token = await getToken();
      if (cancelled || !token) return;

      const socket = io(window.location.origin, {
        path: `${BASE_URL}/api/socket.io`,
        transports: ["websocket", "polling"],
        auth: { token },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("session:join", sessionId);
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("session:error", (err: { message: string }) => {
        console.error("[LiveSession] Socket auth error:", err.message);
        if (err.message === "Invalid auth token" && !authRetryRef.current && !cancelled) {
          authRetryRef.current = true;
          console.log("[LiveSession] Token expired — refreshing and reconnecting…");
          socket.removeAllListeners();
          socket.disconnect();
          socketRef.current = null;
          setTimeout(() => { if (!cancelled) void connect(); }, 1500);
        }
      });

      socket.on("tiktok:status", (payload: TikTokStatusEvent) => {
        setTiktokMode(payload.mode);
        setTiktokError(payload.error ?? null);
        setTiktokUsername(payload.username ?? null);
      });

      socket.on("live:event", (event: LiveEvent) => {
        setEvents((prev) => [event, ...prev].slice(0, 200));

        setStats((prev) => {
          const next = { ...prev };
          if (event.type === "viewerCount") {
            next.viewerCount = (event.data.count as number) ?? prev.viewerCount;
          } else if (event.type === "gift") {
            const coins = (event.data.coins as number) ?? 0;
            next.totalGifts += coins;
            if (event.username) {
              const current = supportersRef.current.get(event.username) ?? 0;
              supportersRef.current.set(event.username, current + coins);
              next.topSupporters = Array.from(supportersRef.current.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([username, coins]) => ({ username, coins }));
            }
          } else if (event.type === "like") {
            next.totalLikes += (event.data.likeCount as number) ?? 1;
          } else if (event.type === "follow") {
            next.totalFollows += 1;
          } else if (event.type === "comment") {
            next.totalComments += 1;
          } else if (event.type === "share") {
            next.totalShares += 1;
          }
          return next;
        });
      });

      socket.on("xp:awarded", (payload: XpAwardedEvent) => {
        setRecentXpAwards((prev) => [payload, ...prev].slice(0, 30));
        setEvents((prev) => [{
          type: "xp_awarded" as const,
          sessionId: sessionId!,
          username: payload.viewerName,
          data: {
            xp: payload.xp,
            coins: payload.coins,
            level: payload.level,
            totalXp: payload.totalXp,
            eventType: payload.eventType,
          },
          timestamp: payload.timestamp,
        }, ...prev].slice(0, 200));
      });

      socket.on("level:up", (payload: LevelUpEvent) => {
        setLevelUps((prev) => [payload, ...prev].slice(0, 20));
        setEvents((prev) => [{
          type: "level_up" as const,
          sessionId: sessionId!,
          username: payload.viewerName,
          data: { newLevel: payload.newLevel },
          timestamp: payload.timestamp,
        }, ...prev].slice(0, 200));
      });

      socket.on("achievement:unlocked", (payload: AchievementUnlockEvent) => {
        setAchievementUnlocks((prev) => [payload, ...prev].slice(0, 20));
        setEvents((prev) => [{
          type: "achievement_unlocked" as const,
          sessionId: sessionId!,
          username: payload.viewerName,
          data: {
            achievementName: payload.achievement.name,
            achievementKey: payload.achievement.key,
            xpReward: payload.achievement.xpReward,
          },
          timestamp: payload.timestamp,
        }, ...prev].slice(0, 200));
      });

      socket.on("lucky_drop:fired", (payload: LuckyDropEvent) => {
        setLuckyDrops((prev) => [payload, ...prev].slice(0, 20));
      });

      socket.on("kingdom:update", (payload: KingdomUpdateEvent) => {
        setKingdomUpdates((prev) => [payload, ...prev].slice(0, 20));
      });

      socket.on("leaderboard:update", (_payload: LeaderboardUpdateEvent) => {
        setLeaderboardVersion((v) => v + 1);
      });

      socket.on("automation:fired", (event: AutomationFiredEvent) => {
        setAutomationsFired((prev) => [event, ...prev].slice(0, 50));
      });

      socket.on("tts:play", (payload: { audioBase64: string; mimeType: string; text: string }) => {
        try {
          const binary = atob(payload.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: payload.mimeType ?? "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = Math.max(0, Math.min(1, ttsVolumeRef.current));
          window.dispatchEvent(new CustomEvent("tts:audio", { detail: audio }));
          window.dispatchEvent(new CustomEvent("tts:start"));
          enqueueTts(() => new Promise<void>((resolve) => {
            audio.onended = () => { URL.revokeObjectURL(url); window.dispatchEvent(new CustomEvent("tts:end")); resolve(); };
            audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
            audio.play().catch(() => resolve());
          }));
        } catch (err) {
          console.warn("[tts:play] Failed to play automation audio:", err);
        }
      });

      socket.on("system:message", (payload: { text: string; automationName: string; timestamp: number }) => {
        const ts = payload.timestamp ?? Date.now();
        setEvents((prev) =>
          [
            {
              type: "ai_announcement" as const,
              sessionId: sessionId!,
              username: payload.automationName ?? "Automation",
              data: { text: payload.text, announcementType: "system_message" },
              timestamp: ts,
            },
            ...prev,
          ].slice(0, 200),
        );
      });

      socket.on("viewer:recognition", (payload: Omit<ViewerRecognitionEvent, never>) => {
        setViewerRecognitionEvents((prev) => [payload, ...prev].slice(0, 20));
        console.log(`[Recognition:UI] ⚡ ${payload.viewerName} | tier=${payload.tier} | ${payload.reason}`);
      });

      socket.on("ai:announcement", (payload: Omit<AiAnnouncementEvent, "timestamp">) => {
        const ts = Date.now();
        setAiAnnouncements((prev) => [{ ...payload, timestamp: ts }, ...prev].slice(0, 30));
        setEvents((prev) =>
          [
            {
              type: "ai_announcement" as const,
              sessionId: sessionId!,
              username: "AI Assistant",
              data: { text: payload.text, announcementType: payload.type },
              timestamp: ts,
            },
            ...prev,
          ].slice(0, 200),
        );

        const mode          = ttsModeRef.current;
        const emotion       = ((payload as Record<string,unknown>).emotion       as string | undefined) ?? "neutral";
        const streamerLang  = ((payload as Record<string,unknown>).streamerLang  as string | undefined) ?? "uk";
        const detectedLang  = detectTtsLang(payload.text, streamerLang);

        // ── Normalization preview log (always shown, not just when TTS is on) ──
        // This lets you see raw→normalized pipeline even in mode=off.
        const previewNorm = normalizeTtsText(payload.text, detectedLang);
        if (previewNorm.hasEmojis) {
          console.log(
            `[TTS:Pipeline] raw:        "${payload.text.slice(0, 80)}"` +
            `\n[TTS:Pipeline] normalized: "${previewNorm.text.slice(0, 80)}"` +
            `  [emojiEmotion=${previewNorm.emojiEmotion}]` +
            `\n[TTS:Pipeline] lang=${detectedLang} | emotion=${emotion}`
          );
        }

        console.log(`[TTS] ai:announcement | mode=${mode} | type=${payload.type} | emotion=${emotion} | emojiEmotion=${previewNorm.emojiEmotion} | text="${payload.text.slice(0, 60)}"`);

        if (payload.type === "streamer_speech") {
          const now      = Date.now();
          const emitAt   = lastSpeechEmitAtRef.current;
          const aiMs     = emitAt !== null ? now - emitAt : 0;
          const silenceMs = IS_MOBILE_DETECT ? 900 : 600; // mirrors useStreamerMic SILENCE_MS
          lastSpeechEmitAtRef.current = null;
          lastAnnounceAtRef.current   = now;
          setCoHostLatency({ stt: silenceMs, ai: aiMs, tts: 0, total: silenceMs + aiMs });
          console.log(`[AIReply:Frontend] ✅ Storm reply to mic | aiLatency=${aiMs}ms | text="${payload.text.slice(0, 80)}"`);
        }

        if (mode === "openai") {
          console.log(`[TTSRequested:Frontend] type=${payload.type} | voice=${ttsVoiceRef.current} | lang=${detectedLang} | speed=${ttsSpeedRef.current}`);
          window.dispatchEvent(new CustomEvent("tts:lang", { detail: { lang: detectedLang, engine: "openai" } }));
          enqueueTts(() => playOpenAiTts(payload.text, ttsVoiceRef.current, ttsVolumeRef.current, ttsSpeedRef.current, getToken), payload.text);
        } else {
          // HARD BLOCK: any mode that is not "openai" is treated as "off"
          if (mode !== "off") {
            console.warn(`[BROWSER_TTS_BLOCKED] ttsMode="${mode}" is not "openai" — speech blocked.`);
            if (typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          } else {
            console.log(`[TTS] mode=off — speech skipped`);
          }
        }
      });

      socket.on("live:translation", (payload: { msgId: string; sessionId: number; translatedText: string; targetLang: string }) => {
        setTranslations((prev) => ({ ...prev, [payload.msgId]: payload.translatedText }));
      });

      socket.on("moderation:flagged", (payload: Omit<ModerationFlaggedEvent, "timestamp">) => {
        const flaggedAt = Date.now();
        setFlaggedComments((prev) =>
          [{ ...payload, timestamp: flaggedAt }, ...prev].slice(0, 30),
        );
        setEvents((prev) =>
          prev.filter(
            (e) =>
              !(
                e.type === "comment" &&
                e.username === payload.viewerName &&
                (e.data.text as string) === payload.comment
              ),
          ),
        );
      });

      socket.on("emotion:state", (payload: EmotionalState) => {
        setEmotionState(payload);
      });

      socket.on("session:ended", () => {
        socket.disconnect();
      });
    };

    connect();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.removeAllListeners();
        s.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [sessionId, getToken]);

  // ── Streamer microphone → backend co-host pipeline ────────────────────────
  // [Mic:9] Emits `streamer:speech` via socket with ack callback.
  // (lastMicEmit + lastMicBackendAck state declared at top of hook with other useState calls)

  const sendStreamerSpeech = useCallback((text: string, lang: string) => {
    const socket = socketRef.current;
    console.log(`[Mic:9] sendStreamerSpeech called | socket=${socket ? "CONNECTED" : "NULL"} | sessionId=${sessionId ?? "NULL"} | lang=${lang} | "${text.slice(0, 60)}"`);
    if (!socket || !sessionId) {
      console.warn(`[Mic:9] ✗ BLOCKED — socket=${socket ? "ok" : "NULL"} | sessionId=${sessionId ?? "NULL"}`);
      return;
    }
    const ts = Date.now();
    lastSpeechEmitAtRef.current = ts;   // start AI latency timer
    setLastMicEmit({ text, lang, ts });
    stopAllSpeechNow();  // interrupt any playing TTS before co-host responds
    console.log(`[Mic:9] ✅ socket.emit streamer:speech → backend | sessionId=${sessionId}`);
    socket.emit(
      "streamer:speech",
      { text, lang, sessionId },
      (ack: { ok: boolean; ts: number } | undefined) => {
        console.log(`[Mic:10] ← Backend ACK received | ok=${ack?.ok} | ts=${ack?.ts ?? "no-ts"}`);
        setLastMicBackendAck({ ok: ack?.ok ?? false, ts: Date.now() });
      },
    );
  }, [sessionId]);

  return {
    events,
    translations,
    stats,
    automationsFired,
    aiAnnouncements,
    flaggedComments,
    recentXpAwards,
    achievementUnlocks,
    luckyDrops,
    levelUps,
    kingdomUpdates,
    leaderboardVersion,
    emotionState,
    connected,
    clearEvents,
    setTtsEnabled,
    setTtsMode,
    setTtsVoice,
    setTtsVolume,
    setTtsSpeed,
    tiktokMode,
    tiktokError,
    tiktokUsername,
    sendStreamerSpeech,
    lastMicEmit,
    lastMicBackendAck,
    stopAllSpeech,
    clearSpeechQueue,
    activeVoiceName,
    ttsQueueLen,
    ttsModeLive,
    openaiTtsOk,
    openaiTtsErr,
    lastSpokenLang,
    lastSpokenEngine,
    isAudioUnlocked,
    unlockAudio: unlockAudioCallback,
    replayTts,
    coHostLatency,
    viewerRecognitionEvents,
  };
}
