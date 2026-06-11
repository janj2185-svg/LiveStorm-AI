import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";

export type ConnectionMode = "real" | "demo" | "error";

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

export type TtsMode = "off" | "browser" | "openai";

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

async function playOpenAiTts(rawText: string, voice: string, volume: number, speed = 1.0): Promise<void> {
  // Normalize FIRST — OpenAI TTS may also read some emoji names
  const { text, hasEmojis, emojiEmotion } = normalizeTtsText(rawText);
  if (!text.trim()) return;
  if (hasEmojis) {
    console.log(`[TTS:Normalize:OpenAI] raw="${rawText.slice(0,60)}" → normalized="${text.slice(0,60)}" | emojiEmotion=${emojiEmotion}`);
  }

  try {
    const res = await fetch(`${API_BASE}/ai/voice`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? `HTTP ${res.status}`;
      console.warn(`[TTS:OpenAI] ✗ HTTP ${res.status}: ${msg} — skipping (Polish browser fallback disabled)`);
      window.dispatchEvent(new CustomEvent("tts:fallback", { detail: { reason: msg } }));
      return; // NEVER fall back to browser TTS — that path can play Polish voices
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioElement = audio; // track so stopAllSpeech() can cancel this
    audio.volume = Math.max(0, Math.min(1, volume));

    window.dispatchEvent(new CustomEvent("tts:audio", { detail: audio }));
    window.dispatchEvent(new CustomEvent("tts:start", { detail: { voice } }));

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        currentAudioElement = null;
        URL.revokeObjectURL(url);
        window.dispatchEvent(new CustomEvent("tts:end"));
        resolve();
      };
      audio.onerror = () => {
        currentAudioElement = null;
        URL.revokeObjectURL(url);
        // NEVER fall back to browser TTS — that path can play Polish voices
        console.warn("[TTS:OpenAI] ✗ audio error — skipping (Polish browser fallback disabled)");
        resolve();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          currentAudioElement = null;
          URL.revokeObjectURL(url);
          // NEVER fall back to browser TTS — that path can play Polish voices
          console.warn("[TTS:OpenAI] ✗ play() rejected — skipping (Polish browser fallback disabled)");
          resolve();
        });
      }
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.warn("[TTS:OpenAI] ✗ error:", msg, "— skipping (Polish browser fallback disabled)");
    window.dispatchEvent(new CustomEvent("tts:fallback", { detail: { reason: msg } }));
    // NEVER fall back to browser TTS — that path can play Polish voices
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
// Browser SpeechSynthesis reads emoji names literally ("smiling face", "fire emoji").
// This layer converts them to natural speech equivalents before ANY TTS engine sees
// the text — browser OR OpenAI.
//
// Emoji emotion classification also drives rate/pitch in playBrowserTts so the
// delivery matches the emotional content without naming the emoji.

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

// ── Voice audit: comprehensive diagnostic log ─────────────────────────────────
// Logs every available browser voice, which one is selected for a given lang,
// and what normalization would produce for example inputs.
export function logVoiceAudit(streamerLang = "uk"): void {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const langs  = ["uk-UA", "ru-RU", "pl-PL", "en-US", "de-DE"];

  console.group("[TTS:VoiceAudit] ──────────────────────────────────");
  console.log(`Available browser voices (${voices.length}):`);
  voices.forEach(v => console.log(`  ${v.lang.padEnd(10)} ${v.name}${v.default ? " ← DEFAULT" : ""}`));

  console.log("\nOpenAI voices (when voiceKey = openai):");
  ["alloy","echo","fable","onyx","nova","shimmer"].forEach(v =>
    console.log(`  ${v} — multilingual, best for long-form Ukrainian text`)
  );

  console.log("\nVoice selection per language:");
  langs.forEach(l => {
    const selected = selectBrowserVoice(l);
    const status   = selected?.lang === l ? "✅ exact match" : selected ? `⚠ fallback: ${selected.lang}` : "❌ none — browser default";
    console.log(`  ${l.padEnd(8)} → ${selected?.name ?? "(none)"} [${status}]`);
  });

  const examples = [
    `Привіт 😄`,
    `😂 Це найкращий жарт`,
    `Нічого собі! 🔥`,
    `Дякую за подарунок ❤️`,
    `😢 Як шкода`,
  ];
  console.log("\nNormalization examples:");
  examples.forEach(raw => {
    const detLang = detectTtsLang(raw, streamerLang);
    const { text, emojiEmotion } = normalizeTtsText(raw, detLang);
    console.log(`  raw:        "${raw}"`);
    console.log(`  normalized: "${text}"  [emojiEmotion=${emojiEmotion}]`);
    console.log(`  lang:       ${detLang}`);
    console.log("");
  });
  console.groupEnd();
}

// Map TTS lang codes → Slavic/close-family fallback chains
// When exact voice not found, try these in order before giving up
const TTS_LANG_FALLBACKS: Record<string, string[]> = {
  "uk-UA": ["uk", "ru-RU", "ru"],     // Ukrainian → Russian (closest available in most browsers)
  "ru-RU": ["ru"],
  "pl-PL": ["pl"],
  "de-DE": ["de"],
  "fr-FR": ["fr"],
  "es-ES": ["es"],
};

function selectBrowserVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Never use a Polish voice unless the requested language is Polish.
  // On Windows, Microsoft Adam/Paulina (pl-PL) sit first in the voice list and
  // the OS will play them in parallel if the utterance lang doesn't match the
  // explicitly set voice — causing the audible "overlap" the user hears.
  const isPolishRequest = lang.startsWith("pl");
  const eligible = isPolishRequest ? voices : voices.filter(v => !v.lang.startsWith("pl"));

  // 1. Exact match
  const exact = eligible.find(v => v.lang === lang);
  if (exact) return exact;

  // 2. Same language code (e.g., "uk" matches "uk-UA")
  const langCode = lang.split("-")[0];
  const partial = eligible.find(v => v.lang.startsWith(langCode));
  if (partial) return partial;

  // 3. Configured fallback chain
  const chain = TTS_LANG_FALLBACKS[lang] ?? [];
  for (const fb of chain) {
    const fallback = eligible.find(v => v.lang === fb || v.lang.startsWith(fb));
    if (fallback) return fallback;
  }

  // 4. Last resort: any eligible (non-Polish) voice — never let the browser pick
  //    its system default, which on Windows is Microsoft Adam (Polish).
  return eligible[0] ?? null;
}

// Storm's fixed voice — ALWAYS Ukrainian/Russian/English, NEVER Polish.
// Used for ALL browser TTS output regardless of what language the text is in.
// Storm has one voice; the content language is irrelevant to which voice speaks.
function selectStormVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Absolute blacklist: Polish voices are permanently excluded
  const eligible = voices.filter(v => !v.lang.startsWith("pl"));
  if (!eligible.length) return null;

  // Priority chain: uk-UA > uk > ru-RU > ru > en-US > en > any non-Polish
  const priorities: Array<(v: SpeechSynthesisVoice) => boolean> = [
    v => v.lang === "uk-UA",
    v => v.lang.startsWith("uk"),
    v => v.lang === "ru-RU",
    v => v.lang.startsWith("ru"),
    v => v.lang === "en-US",
    v => v.lang.startsWith("en"),
  ];
  for (const pred of priorities) {
    const match = eligible.find(pred);
    if (match) return match;
  }
  return eligible[0];
}

function playBrowserTts(rawText: string, opts?: { rate?: number; emotion?: string; defaultLang?: string }): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) { resolve(); return; }

    // Chrome bug: speech synthesis pauses when the tab loses focus.
    // Must call resume() before speak() or the utterance queues silently.
    if (synth.paused) {
      console.log("[TTS:Browser] ⚠ synthesis paused — resuming");
      synth.resume();
    }

    const detectedLang = detectTtsLang(rawText, opts?.defaultLang);

    // ── Normalization pipeline ─────────────────────────────────────────────
    // Converts emojis to natural speech equivalents BEFORE SpeechSynthesis sees
    // the text. Without this, browsers read names like "smiling face" / "fire emoji".
    const { text, emojiEmotion, hasEmojis } = normalizeTtsText(rawText, detectedLang);

    if (!text.trim()) { resolve(); return; } // nothing to speak after stripping

    if (hasEmojis) {
      console.log(`[TTS:Normalize] raw="${rawText.slice(0,70)}" → "${text.slice(0,70)}" | emojiEmotion=${emojiEmotion}`);
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = detectedLang;

    // ── Emotion-aware delivery ─────────────────────────────────────────────
    // Two signals: declared `emotion` from the AI (happy/excited/grateful…)
    // and `emojiEmotion` extracted from emojis in the text.
    // Emoji emotion takes priority when it's not neutral.
    const baseRate       = opts?.rate ?? 1.05;
    const declaredEmotion = opts?.emotion ?? "neutral";
    const effectiveEmotion: string = emojiEmotion !== "neutral" ? emojiEmotion : declaredEmotion;

    // Rate modifiers — how fast to speak
    const rateBoost: Record<string, number> = {
      laugh:     +0.12, // laugh rhythm — slightly quicker, more natural
      excited:   +0.10,
      hype:      +0.12,
      funny:     +0.08,
      happy:     +0.06,
      playful:   +0.08,
      confident: +0.05,
      grateful:  +0.03,
      warm:      -0.02, // slightly slower, warmer feel
      curious:   0,
      sad:       -0.14, // slower, heavier delivery
      frustrated:-0.05,
      angry:     +0.05, // forceful but not rushed
      neutral:   0,
    };

    // Pitch modifiers — higher = brighter/lighter, lower = deeper/heavier
    const pitchBoost: Record<string, number> = {
      laugh:     +0.18,
      excited:   +0.14,
      hype:      +0.14,
      funny:     +0.10,
      happy:     +0.08,
      playful:   +0.12,
      confident: +0.04,
      grateful:  +0.06,
      warm:      +0.06,
      curious:   +0.04,
      sad:       -0.18,
      frustrated:-0.08,
      angry:     -0.12,
      neutral:   0,
    };

    const dr = rateBoost[effectiveEmotion]  ?? rateBoost[declaredEmotion]  ?? 0;
    const dp = pitchBoost[effectiveEmotion] ?? pitchBoost[declaredEmotion] ?? 0;

    utt.rate  = Math.min(1.6, Math.max(0.7, baseRate + dr));
    utt.pitch = Math.min(2.0, Math.max(0.3, 1.0 + dp));

    // ── Voice selection: Storm's FIXED voice — never language-dependent ──────
    // Storm has exactly one voice. We NEVER switch the voice based on what
    // language the reply text is in — that is the root cause of the Polish
    // voice bug on Windows (detectTtsLang → pl-PL → Google Polish selected).
    //
    // CRITICAL: utt.lang MUST equal utt.voice.lang.
    // If they differ, Windows plays the OS system-default (often Microsoft Adam
    // Polish) in parallel — producing the audible double-voice overlap.
    const stormVoice = selectStormVoice();
    if (!stormVoice) {
      // No non-Polish voice available — skip entirely rather than let the OS
      // default to a Polish voice.
      console.warn("[TTS:Browser] ⚠ no Storm voice found (uk/ru/en) — skipping to prevent Polish OS default");
      resolve();
      return;
    }
    utt.voice = stormVoice;
    utt.lang  = stormVoice.lang; // MUST match voice.lang — prevents OS double-voice bug
    if (stormVoice.lang !== detectedLang) {
      console.log(`[TTS:Browser] 🎙️ Storm voice "${stormVoice.name}" (${stormVoice.lang}) speaking ${detectedLang} text`);
    }

    // Safety timeout: if onend never fires (Chrome pause/autoplay bug),
    // advance the queue after 12s instead of deadlocking forever.
    const timeout = setTimeout(() => {
      console.warn(`[TTS:Browser] ⏰ timeout — queue forced-advance | lang=${utt.lang}`);
      resolve();
    }, 12_000);

    utt.onstart = () => {
      const voiceName = utt.voice?.name ?? "browser-default";
      console.log(
        `[TTS:Browser] ▶ | lang=${utt.lang} | voice="${voiceName}"` +
        ` | eff-emotion=${effectiveEmotion} | rate=${utt.rate.toFixed(2)} | pitch=${utt.pitch.toFixed(2)}` +
        ` | chars=${text.length}`
      );
      window.dispatchEvent(new CustomEvent("tts:start", { detail: { voice: voiceName } }));
    };
    utt.onend = () => {
      clearTimeout(timeout);
      console.log("[TTS:Browser] ✓ done");
      window.dispatchEvent(new CustomEvent("tts:end"));
      resolve();
    };
    utt.onerror = (e) => {
      clearTimeout(timeout);
      const errMsg = (e as SpeechSynthesisErrorEvent).error ?? "unknown";
      console.warn(`[TTS:Browser] ✗ error: ${errMsg}`);
      if (errMsg !== "interrupted") {
        window.dispatchEvent(new CustomEvent("tts:error", { detail: { reason: errMsg } }));
      }
      resolve();
    };

    synth.speak(utt);
  });
}

// ── Stop all speech immediately and flush the queue ───────────────────────────
function stopAllSpeechNow(): void {
  // 1. Cancel every pending and active browser utterance
  if (typeof window !== "undefined" && window.speechSynthesis) {
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
  // If synthesis is paused (Chrome tab-switch bug), the queue may be deadlocked.
  // Reset it so the next item plays immediately rather than waiting forever.
  if (typeof window !== "undefined" && window.speechSynthesis?.paused) {
    window.speechSynthesis.resume();
    ttsQueue = Promise.resolve();
    ttsQueueDepth = 0;
    console.log("[TTS:Browser] 🔄 queue reset — synthesis was paused");
  }
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
      try { return (localStorage.getItem("ttsMode") as TtsMode | null) ?? "off"; }
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

  const setTtsMode = useCallback((mode: TtsMode) => { ttsModeRef.current = mode; }, []);
  const setTtsVoice = useCallback((voice: string) => { ttsVoiceRef.current = voice; }, []);
  const setTtsVolume = useCallback((volume: number) => {
    ttsVolumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);
  const setTtsSpeed = useCallback((speed: number) => {
    ttsSpeedRef.current = Math.max(0.25, Math.min(4.0, speed));
  }, []);

  // Legacy compatibility
  const setTtsEnabled = useCallback((enabled: boolean) => {
    ttsModeRef.current = enabled ? "browser" : "off";
  }, []);

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

        if (mode === "openai") {
          console.log(`[TTS] → OpenAI TTS | voice=${ttsVoiceRef.current} | speed=${ttsSpeedRef.current}`);
          enqueueTts(() => playOpenAiTts(payload.text, ttsVoiceRef.current, ttsVolumeRef.current, ttsSpeedRef.current), payload.text);
        } else if (mode === "browser") {
          const selectedVoice = selectBrowserVoice(detectedLang);
          console.log(
            `[TTS] → Browser | lang=${detectedLang} | streamLang=${streamerLang}` +
            ` | voice="${selectedVoice?.name ?? "none"}" (${selectedVoice?.lang ?? "?"})` +
            ` | emotion=${emotion} | rate=${ttsSpeedRef.current}`
          );
          enqueueTts(() => playBrowserTts(payload.text, { rate: ttsSpeedRef.current, emotion, defaultLang: streamerLang }), payload.text);
        } else {
          console.log(`[TTS] mode=off — speech skipped`);
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
  // Emits a `streamer:speech` event via the existing socket connection.
  // The backend socket handler validates auth + session and enqueues at P3.
  const sendStreamerSpeech = useCallback((text: string, lang: string) => {
    const socket = socketRef.current;
    if (!socket || !sessionId) {
      console.warn("[CoHostMic] sendStreamerSpeech: no socket or session");
      return;
    }
    console.log(`[CoHostMic] → streamer:speech | lang=${lang} | "${text.slice(0, 60)}"`);
    socket.emit("streamer:speech", { text, lang, sessionId });
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
    stopAllSpeech,
    clearSpeechQueue,
    activeVoiceName,
    ttsQueueLen,
  };
}
