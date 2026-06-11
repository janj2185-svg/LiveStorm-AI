/**
 * Emotion Engine — LiveStorm AI
 *
 * Maintains a persistent emotional state per session that evolves in real time.
 * Consumed by: hostAgent, personalityAgent, voiceAgent, battleAgent, memoryAgent.
 * Emitted to frontend via Socket.IO "emotion:state" event.
 */

export type EmotionType =
  | "happy"
  | "excited"
  | "confident"
  | "curious"
  | "playful"
  | "competitive"
  | "grateful"
  | "frustrated"
  | "surprised";

export interface EmotionalHistoryEntry {
  emotion: EmotionType;
  intensity: number;
  trigger: string;
  ts: number;
}

export interface EmotionalState {
  sessionId: number;
  primary: EmotionType;
  intensity: number;          // 1–10
  secondary: EmotionType | null;
  secondaryIntensity: number; // 1–10
  lastUpdatedAt: number;
  lastTrigger: string;
  history: EmotionalHistoryEntry[];  // up to 10 recent transitions
}

export type EmotionalTrigger =
  | "gift_micro"      // < 50 coins
  | "gift_standard"   // 50–499 coins
  | "gift_big"        // 500–1999 coins
  | "gift_whale"      // 2000+ coins
  | "follow"
  | "share"
  | "like_milestone"
  | "vip_comment"
  | "new_viewer"
  | "first_timer"
  | "many_comments"   // burst threshold crossed
  | "silence"         // 2+ min with no activity
  | "battle_start"
  | "battle_win"
  | "battle_losing";

interface TriggerEffect {
  primary: EmotionType;
  primaryIntensity: number;
  secondary?: EmotionType;
  secondaryIntensity?: number;
  halfLifeMs: number;
  label: string;
}

const TRIGGER_EFFECTS: Record<EmotionalTrigger, TriggerEffect> = {
  gift_micro:      { primary: "grateful",     primaryIntensity: 4,  halfLifeMs: 30_000,  label: "small gift received" },
  gift_standard:   { primary: "grateful",     primaryIntensity: 6,  secondary: "excited",     secondaryIntensity: 4, halfLifeMs: 90_000,  label: "gift received" },
  gift_big:        { primary: "excited",      primaryIntensity: 8,  secondary: "grateful",    secondaryIntensity: 7, halfLifeMs: 120_000, label: "big gift received" },
  gift_whale:      { primary: "surprised",    primaryIntensity: 10, secondary: "grateful",    secondaryIntensity: 9, halfLifeMs: 180_000, label: "whale gift received" },
  follow:          { primary: "happy",        primaryIntensity: 5,  halfLifeMs: 45_000,  label: "new follower" },
  share:           { primary: "excited",      primaryIntensity: 5,  halfLifeMs: 45_000,  label: "stream shared" },
  like_milestone:  { primary: "excited",      primaryIntensity: 6,  halfLifeMs: 60_000,  label: "like milestone hit" },
  vip_comment:     { primary: "happy",        primaryIntensity: 7,  halfLifeMs: 30_000,  label: "VIP viewer commented" },
  new_viewer:      { primary: "curious",      primaryIntensity: 5,  halfLifeMs: 30_000,  label: "new viewer appeared" },
  first_timer:     { primary: "curious",      primaryIntensity: 6,  secondary: "happy",       secondaryIntensity: 4, halfLifeMs: 20_000,  label: "first-time commenter" },
  many_comments:   { primary: "excited",      primaryIntensity: 7,  secondary: "playful",     secondaryIntensity: 5, halfLifeMs: 90_000,  label: "comment burst" },
  silence:         { primary: "curious",      primaryIntensity: 3,  halfLifeMs: 999_999, label: "quiet moment" },
  battle_start:    { primary: "competitive",  primaryIntensity: 9,  halfLifeMs: 999_999, label: "battle started" },
  battle_win:      { primary: "confident",    primaryIntensity: 9,  secondary: "excited",     secondaryIntensity: 7, halfLifeMs: 300_000, label: "battle won" },
  battle_losing:   { primary: "competitive",  primaryIntensity: 10, halfLifeMs: 999_999, label: "fighting back" },
};

const BASELINE: Pick<EmotionalState, "primary" | "intensity" | "secondary" | "secondaryIntensity"> = {
  primary: "happy",
  intensity: 3,
  secondary: null,
  secondaryIntensity: 0,
};

const DECAY_RATE_PER_TICK = 0.8;  // intensity points lost every 30s decay tick

const emotionStates = new Map<number, EmotionalState>();
const lastEventTime  = new Map<number, number>(); // sessionId → timestamp of last event
const commentBursts  = new Map<number, { count: number; windowStart: number }>();

const BURST_WINDOW_MS  = 60_000;
const BURST_THRESHOLD  = 10;
const SILENCE_THRESHOLD_MS = 120_000; // 2 minutes

// ── Public API ────────────────────────────────────────────────────────────────

export function getEmotionalState(sessionId: number): EmotionalState {
  return emotionStates.get(sessionId) ?? createDefault(sessionId);
}

export function applyEmotionalTrigger(
  sessionId: number,
  trigger: EmotionalTrigger,
): EmotionalState {
  const effect = TRIGGER_EFFECTS[trigger];
  const current = emotionStates.get(sessionId) ?? createDefault(sessionId);
  const now = Date.now();

  // Don't override an active battle state with weaker triggers
  if (
    current.primary === "competitive" &&
    current.intensity >= 8 &&
    !["battle_win", "battle_losing", "gift_whale", "gift_big"].includes(trigger)
  ) {
    return current;
  }

  const next: EmotionalState = {
    sessionId,
    primary:             effect.primary,
    intensity:           effect.primaryIntensity,
    secondary:           effect.secondary ?? null,
    secondaryIntensity:  effect.secondaryIntensity ?? 0,
    lastUpdatedAt:       now,
    lastTrigger:         effect.label,
    history: [
      { emotion: effect.primary, intensity: effect.primaryIntensity, trigger: effect.label, ts: now },
      ...current.history,
    ].slice(0, 10),
  };

  emotionStates.set(sessionId, next);
  lastEventTime.set(sessionId, now);
  return next;
}

/** Called on every incoming event so silence detection knows activity happened. */
export function recordActivity(sessionId: number): void {
  lastEventTime.set(sessionId, Date.now());
}

/** Track comment volume; returns 'many_comments' trigger when burst threshold crossed. */
export function trackCommentBurst(sessionId: number): EmotionalTrigger | null {
  const now     = Date.now();
  const tracker = commentBursts.get(sessionId) ?? { count: 0, windowStart: now };

  if (now - tracker.windowStart > BURST_WINDOW_MS) {
    commentBursts.set(sessionId, { count: 1, windowStart: now });
    return null;
  }

  tracker.count += 1;
  commentBursts.set(sessionId, tracker);

  if (tracker.count >= BURST_THRESHOLD) {
    commentBursts.set(sessionId, { count: 0, windowStart: now });
    return "many_comments";
  }

  return null;
}

/** Decay all active sessions toward baseline. Call every 30s from a setInterval. */
export function decayAllEmotions(): void {
  const now = Date.now();

  for (const [sessionId, state] of emotionStates) {
    // Silence detection
    const lastEvt = lastEventTime.get(sessionId) ?? now;
    if (now - lastEvt > SILENCE_THRESHOLD_MS && state.primary !== "curious") {
      const silentState: EmotionalState = {
        ...state,
        primary:           "curious",
        intensity:         3,
        secondary:         null,
        secondaryIntensity: 0,
        lastUpdatedAt:     now,
        lastTrigger:       "quiet moment",
      };
      emotionStates.set(sessionId, silentState);
      continue;
    }

    let { primary, intensity, secondary, secondaryIntensity } = state;

    // Decay secondary faster
    secondaryIntensity = Math.max(0, secondaryIntensity - DECAY_RATE_PER_TICK * 1.5);
    if (secondaryIntensity <= 0) secondary = null;

    // Don't decay persistent states (battle)
    if (primary === "competitive" || primary === "confident") {
      // Decay slowly — these fade naturally only after >5 min
      const ageSecs = (now - state.lastUpdatedAt) / 1000;
      if (ageSecs < 300) {
        emotionStates.set(sessionId, { ...state, secondary, secondaryIntensity });
        continue;
      }
    }

    intensity = Math.max(BASELINE.intensity, intensity - DECAY_RATE_PER_TICK);

    // Revert to baseline when intensity fully decays
    if (intensity <= BASELINE.intensity && primary !== BASELINE.primary) {
      primary   = BASELINE.primary;
      intensity = BASELINE.intensity;
    }

    emotionStates.set(sessionId, { ...state, primary, intensity, secondary, secondaryIntensity });
  }
}

/** Determine gift tier trigger from coin value. */
export function giftTierTrigger(coins: number): EmotionalTrigger {
  if (coins >= 2000) return "gift_whale";
  if (coins >= 500)  return "gift_big";
  if (coins >= 50)   return "gift_standard";
  return "gift_micro";
}

/** Clean up session data when session ends. */
export function clearEmotionalState(sessionId: number): void {
  emotionStates.delete(sessionId);
  lastEventTime.delete(sessionId);
  commentBursts.delete(sessionId);
}

// ── Prompt / Voice helpers ────────────────────────────────────────────────────

/**
 * Returns a text block injected into the AI system prompt.
 * Tells the AI what to FEEL without using the word "emotion".
 */
export function getEmotionPromptContext(state: EmotionalState): string {
  if (state.intensity < 4) return ""; // baseline — no special injection

  const intensityLabel =
    state.intensity >= 9 ? "very intense" :
    state.intensity >= 7 ? "strong" :
    state.intensity >= 5 ? "moderate" : "mild";

  const lines = [
    `[Inner State] You are feeling ${state.primary.toUpperCase()} right now — ${intensityLabel} (${state.intensity}/10).`,
    `Triggered by: ${state.lastTrigger}.`,
  ];

  if (state.secondary && state.secondaryIntensity >= 3) {
    lines.push(`Also feeling: ${state.secondary} (${state.secondaryIntensity}/10).`);
  }

  lines.push(`Let this shape your energy, word choice, and sentence length naturally. Never state the emotion explicitly.`);

  return lines.join("\n");
}

/**
 * Returns a TTS speed modifier (+/-) based on the current emotional state.
 * Applied on top of the voice profile's base speed.
 */
export function getVoiceSpeedModifier(state: EmotionalState): number {
  const baseModifiers: Record<EmotionType, number> = {
    excited:     0.15,
    surprised:   0.20,
    competitive: 0.12,
    confident:   0.05,
    playful:     0.05,
    happy:       0.00,
    curious:     0.00,
    grateful:   -0.05,
    frustrated: -0.05,
  };

  const base = baseModifiers[state.primary] ?? 0;
  // Scale by intensity: intensity 10 = full modifier, intensity 1 = 10%
  return base * (state.intensity / 10);
}

// ── UI metadata ────────────────────────────────────────────────────────────────

export const EMOTION_META: Record<EmotionType, { emoji: string; label: string; color: string; bgClass: string }> = {
  happy:       { emoji: "😊", label: "Happy",       color: "#22c55e", bgClass: "bg-green-500/15 border-green-500/25" },
  excited:     { emoji: "🔥", label: "Excited",     color: "#f97316", bgClass: "bg-orange-500/15 border-orange-500/25" },
  confident:   { emoji: "💪", label: "Confident",   color: "#6366f1", bgClass: "bg-indigo-500/15 border-indigo-500/25" },
  curious:     { emoji: "🤔", label: "Curious",     color: "#06b6d4", bgClass: "bg-cyan-500/15 border-cyan-500/25" },
  playful:     { emoji: "😄", label: "Playful",     color: "#ec4899", bgClass: "bg-pink-500/15 border-pink-500/25" },
  competitive: { emoji: "⚔️", label: "Competitive", color: "#ef4444", bgClass: "bg-red-500/15 border-red-500/25" },
  grateful:    { emoji: "🙏", label: "Grateful",    color: "#f59e0b", bgClass: "bg-amber-500/15 border-amber-500/25" },
  frustrated:  { emoji: "😤", label: "Frustrated",  color: "#84cc16", bgClass: "bg-lime-500/15 border-lime-500/25" },
  surprised:   { emoji: "😲", label: "Surprised",   color: "#a855f7", bgClass: "bg-purple-500/15 border-purple-500/25" },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function createDefault(sessionId: number): EmotionalState {
  return {
    sessionId,
    ...BASELINE,
    lastUpdatedAt: Date.now(),
    lastTrigger:   "stream started",
    history:       [],
  };
}
