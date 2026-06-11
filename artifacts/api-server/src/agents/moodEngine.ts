/**
 * Mood Engine — LiveStorm AI
 *
 * The second emotional layer, sitting above the Emotion Engine.
 *
 * Architecture:
 *   EMOTIONS (emotionEngine) — fast spikes, event-driven, seconds to minutes.
 *                              Like weather: arrives and passes quickly.
 *   MOOD    (this file)      — slow accumulation, stream-wide, minutes to hours.
 *                              Like climate: built up over many interactions.
 *
 * Psychological foundations:
 *   - Based on affective circumplex theory (Russell 1980) + PAD model
 *   - A single positive event cannot override a negative mood baseline
 *   - Consistent positive interactions slowly shift the mood upward
 *   - Negative events hit harder when mood is already low (compounding)
 *   - Mood context injected as INTERNAL STATE description — the AI interprets
 *     it through personality, never as direct behavioral instructions
 *
 * Five mood dimensions:
 *   valence    (-10 to +10)  overall pleasantness of the stream experience
 *   energy     (0–10, base 6) enthusiasm vs tiredness (built by activity, eroded by silence)
 *   confidence (0–10, base 6) self-assurance (built by wins/positive feedback, hit by losses)
 *   patience   (0–10, base 7) tolerance (eroded by toxicity/silence, recovers naturally)
 *   humor      (0–10, base 6) playfulness drive (built by funny moments, drops with frustration)
 *
 * Decay: every 60s, each dimension moves a fraction back toward its baseline.
 * Negative events decay faster than positive ones — so good moods are harder to
 * maintain but bad moods also don't last forever.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MoodState {
  sessionId:    number;
  valence:      number;  // -10 to +10
  energy:       number;  // 0–10
  confidence:   number;  // 0–10
  patience:     number;  // 0–10
  humor:        number;  // 0–10
  lastUpdatedAt: number;
  /** Accumulates for context generation — ring buffer of recent events */
  recentEvents: Array<{ type: string; at: number }>;
}

export type MoodEventType =
  | "battle_win"
  | "battle_loss"
  | "whale_gift"
  | "big_gift"
  | "standard_gift"
  | "chat_surge"
  | "chat_warming"
  | "deep_silence"
  | "silence"
  | "toxic_comment"
  | "follow"
  | "like_milestone"
  | "vip_comment"
  | "first_timer";

/** Behavior probability multipliers driven by mood — consumed by behaviorEngine */
export interface MoodBehaviorModifiers {
  /** 0.3–2.0: Low humor mood suppresses laughs; high humor boosts them */
  laughProbabilityMult:      number;
  /** 0.5–2.5: Low confidence → more hesitations */
  hesitationProbabilityMult: number;
  /** 0.3–3.0: Low valence → more fade endings */
  fadeProbabilityMult:       number;
  /** 0.3–2.0: Low energy mood → fewer excited tails */
  excitedTailMult:           number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const BASELINES = {
  valence:    0,
  energy:     6,
  confidence: 6,
  patience:   7,
  humor:      6,
} as const;

const BOUNDS = {
  valence:    { min: -10, max: 10 },
  energy:     { min: 0,   max: 10 },
  confidence: { min: 0,   max: 10 },
  patience:   { min: 0,   max: 10 },
  humor:      { min: 0,   max: 10 },
} as const;

/**
 * Fraction of remaining distance to baseline per 60s tick.
 * Confidence decays slowest (0.04 → ~17 min to 50% of deviation).
 * Energy decays fastest  (0.10 → ~6  min to 50% of deviation).
 */
const DECAY_RATES = {
  valence:    0.07,  // ~8  min half-life
  energy:     0.10,  // ~6  min half-life
  confidence: 0.04,  // ~17 min half-life  (hardest to build, slowest to erode)
  patience:   0.09,  // ~7  min half-life
  humor:      0.07,  // ~10 min half-life
};

/** Mood delta per event type. Only affected dimensions listed. */
const MOOD_EVENTS: Record<MoodEventType, Partial<Record<keyof typeof BASELINES, number>>> = {
  battle_win:     { valence: +2.5, confidence: +2.5, energy: +1.5, humor: +1.0 },
  battle_loss:    { valence: -2.5, confidence: -2.0, patience: -1.0, energy: -0.5 },
  whale_gift:     { valence: +2.5, energy: +2.0, confidence: +1.0, humor: +0.5 },
  big_gift:       { valence: +1.5, energy: +1.0, confidence: +0.3 },
  standard_gift:  { valence: +0.5, energy: +0.3 },
  chat_surge:     { valence: +1.5, energy: +2.5, humor: +1.5, confidence: +0.5 },
  chat_warming:   { energy: +0.8,  humor: +0.5 },
  deep_silence:   { energy: -2.0,  patience: -1.0, valence: -1.0, humor: -0.8 },
  silence:        { energy: -1.0,  patience: -0.5 },
  toxic_comment:  { patience: -2.0, valence: -1.0, humor: -0.5 },
  follow:         { valence: +0.5, energy: +0.3, confidence: +0.3 },
  like_milestone: { valence: +0.8, confidence: +0.5, humor: +0.3 },
  vip_comment:    { valence: +0.5, confidence: +0.3, humor: +0.3 },
  first_timer:    { valence: +0.3, humor: +0.2 },
};

/**
 * Per-session event cooldowns (ms) to prevent rapid-fire spam
 * from instantly cratering or spiking mood.
 */
const EVENT_COOLDOWNS_MS: Partial<Record<MoodEventType, number>> = {
  toxic_comment:  25_000,  // one toxic person ≠ instant tank
  standard_gift:  8_000,   // gift spam protection
  follow:         4_000,
  chat_warming:   12_000,
  first_timer:    3_000,
  vip_comment:    10_000,
};

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

const moods    = new Map<number, MoodState>();
const cooldowns = new Map<string, number>(); // "sessionId:eventType" → lastFiredAt

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function defaultMoodState(sessionId: number): MoodState {
  return {
    sessionId,
    valence:      BASELINES.valence,
    energy:       BASELINES.energy,
    confidence:   BASELINES.confidence,
    patience:     BASELINES.patience,
    humor:        BASELINES.humor,
    lastUpdatedAt: Date.now(),
    recentEvents:  [],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

export function initMoodState(sessionId: number): void {
  if (!moods.has(sessionId)) {
    moods.set(sessionId, defaultMoodState(sessionId));
  }
}

export function getMoodState(sessionId: number): MoodState {
  return moods.get(sessionId) ?? defaultMoodState(sessionId);
}

export function clearMoodState(sessionId: number): void {
  moods.delete(sessionId);
  // Clean up cooldowns for this session
  for (const key of cooldowns.keys()) {
    if (key.startsWith(`${sessionId}:`)) cooldowns.delete(key);
  }
}

/**
 * Applies a mood event to a session, respecting per-event cooldowns.
 * Returns true if the event was applied, false if suppressed by cooldown.
 */
export function applyMoodEvent(sessionId: number, eventType: MoodEventType): boolean {
  // Cooldown check
  const cdKey = `${sessionId}:${eventType}`;
  const cdMs  = EVENT_COOLDOWNS_MS[eventType];
  if (cdMs) {
    const last = cooldowns.get(cdKey) ?? 0;
    if (Date.now() - last < cdMs) return false;
    cooldowns.set(cdKey, Date.now());
  }

  const mood   = moods.get(sessionId) ?? defaultMoodState(sessionId);
  const deltas = MOOD_EVENTS[eventType];
  if (!deltas) return false;

  const next: MoodState = { ...mood, lastUpdatedAt: Date.now() };

  for (const [dim, delta] of Object.entries(deltas) as [keyof typeof BASELINES, number][]) {
    const bounds = BOUNDS[dim];
    next[dim] = clamp(mood[dim] + delta, bounds.min, bounds.max);
  }

  // Log significant shifts only
  const valenceShift = Math.abs(next.valence - mood.valence);
  if (valenceShift >= 1.5 || Math.abs((deltas.confidence ?? 0)) >= 1.5) {
    console.log(
      `[Mood] 🧭 ${eventType} | session=${sessionId} | ` +
      `valence=${next.valence.toFixed(1)} energy=${next.energy.toFixed(1)} ` +
      `conf=${next.confidence.toFixed(1)} patience=${next.patience.toFixed(1)} humor=${next.humor.toFixed(1)}`,
    );
  }

  // Record in ring buffer (last 8 events)
  const recentEvents = [
    { type: eventType, at: Date.now() },
    ...mood.recentEvents,
  ].slice(0, 8);

  next.recentEvents = recentEvents;
  moods.set(sessionId, next);
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// DECAY TICK  —  called every 60s from orchestrator
// ══════════════════════════════════════════════════════════════════════════════

export function decayAllMoods(): void {
  for (const [sessionId, mood] of moods) {
    const next: MoodState = { ...mood, lastUpdatedAt: Date.now() };

    for (const dim of Object.keys(BASELINES) as Array<keyof typeof BASELINES>) {
      const current  = mood[dim];
      const baseline = BASELINES[dim];
      const rate     = DECAY_RATES[dim];
      const decayed  = current + (baseline - current) * rate;
      const bounds   = BOUNDS[dim];
      next[dim] = clamp(decayed, bounds.min, bounds.max);
    }

    moods.set(sessionId, next);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR MODIFIERS  —  consumed by behaviorEngine for paralinguistic weights
// ══════════════════════════════════════════════════════════════════════════════

export function getMoodBehaviorModifiers(sessionId: number): MoodBehaviorModifiers {
  const mood = moods.get(sessionId);
  if (!mood) {
    return { laughProbabilityMult: 1, hesitationProbabilityMult: 1, fadeProbabilityMult: 1, excitedTailMult: 1 };
  }

  // Humor mood 6 = baseline → mult 1.0.  8 → 1.4.  3 → 0.4
  const laughMult = 0.4 + ((mood.humor - 3) / 7) * 1.6;  // range ~0.4–2.0

  // Confidence 6 = baseline → mult 1.0.  3 → 2.0 (more hesitation).  9 → 0.5
  const hesitationMult = 0.5 + ((6 - mood.confidence) / 6) * 1.5; // range ~0.5–2.5

  // Valence 0 = baseline → mult 1.0.  -5 → 2.5 (more fades).  +5 → 0.3
  const fadeMult = Math.max(0.3, 1.0 + (-mood.valence / 10) * 2.0); // range ~0.3–3.0

  // Energy 6 = baseline → mult 1.0.  9 → 1.8.  3 → 0.4
  const excitedMult = 0.4 + ((mood.energy - 3) / 7) * 1.4; // range ~0.4–2.0

  return {
    laughProbabilityMult:      clamp(laughMult,     0.3, 2.0),
    hesitationProbabilityMult: clamp(hesitationMult, 0.5, 2.5),
    fadeProbabilityMult:       clamp(fadeMult,       0.3, 3.0),
    excitedTailMult:           clamp(excitedMult,    0.3, 2.0),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT CONTEXT  —  method-actor internal state description
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a system-prompt block describing the current mood as an
 * INTERNAL EMOTIONAL STATE — not behavioral instructions.
 *
 * The AI interprets this through its own personality lens, which is what
 * makes the result feel natural rather than scripted.
 *
 * Only includes dimensions with significant deviation from baseline
 * to avoid noisy no-op context.
 */
export function getMoodPromptContext(sessionId: number): string {
  const mood = moods.get(sessionId);
  if (!mood) return "";

  const lines: string[] = [];

  // ── Valence ──
  if (mood.valence >= 5) {
    lines.push("The stream has been genuinely feeding you — positive energy stacking up nicely over time.");
  } else if (mood.valence >= 2.5) {
    lines.push("Overall the stream has been good to you. Multiple positive interactions have built up a pleasant baseline.");
  } else if (mood.valence <= -5) {
    lines.push("The stream has been rough. Multiple difficult moments stacked up. There's a quiet exhaustion underneath — you're still performing but it costs more.");
  } else if (mood.valence <= -2.5) {
    lines.push("The stream has worn you down a bit. You'd rather not show it, but the accumulated vibe is lower than you'd like.");
  }

  // ── Energy ──
  if (mood.energy >= 8.5) {
    lines.push("Running on genuine high energy right now — not forced, it's actually there.");
  } else if (mood.energy <= 3) {
    lines.push("Low energy. Staying present takes noticeable effort. Nothing you'd announce, but it's real.");
  } else if (mood.energy <= 4.5) {
    lines.push("Energy a bit lower than your usual level. Still engaged but more measured.");
  }

  // ── Confidence ──
  if (mood.confidence >= 8.5) {
    lines.push("Feeling very sure of yourself right now — the stream has confirmed things. High confidence.");
  } else if (mood.confidence >= 7.5) {
    lines.push("Confidence is solid. You feel grounded.");
  } else if (mood.confidence <= 3) {
    lines.push("Confidence is genuinely shaken. Less certainty than usual. More careful, less assertive.");
  } else if (mood.confidence <= 4.5) {
    lines.push("Confidence slightly below your normal level. A bit more second-guessing than usual.");
  }

  // ── Patience ──
  if (mood.patience >= 9) {
    lines.push("Lots of patience right now. Generous space for everyone.");
  } else if (mood.patience <= 2.5) {
    lines.push("Patience very thin. You're keeping it together but the edge is showing. Less tolerance for foolishness.");
  } else if (mood.patience <= 4) {
    lines.push("Patience wearing thin. Subtle but real — less forgiving than usual.");
  }

  // ── Humor ──
  if (mood.humor >= 8.5) {
    lines.push("In a very playful mood right now — humor comes naturally and easily.");
  } else if (mood.humor <= 2.5) {
    lines.push("Not in a humorous place right now. The jokes don't want to come.");
  } else if (mood.humor <= 4) {
    lines.push("Playfulness a bit muted. Not in the mood to be especially funny.");
  }

  if (!lines.length) return ""; // no significant deviation — baseline

  return `[Mood — Current emotional baseline]\n${lines.join(" ")}`;
}
