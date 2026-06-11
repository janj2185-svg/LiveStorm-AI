/**
 * Behavior Engine — LiveStorm AI
 *
 * The "nervous system" layer that gives Storm genuinely human-like vocal
 * behavior. Every output is probabilistic — not scripted. The same event
 * at different emotional intensities produces subtly different micro-behaviors
 * each time, creating the perception of spontaneous consciousness.
 *
 * Built on three disciplines:
 *   BEHAVIORAL PSYCHOLOGY  — micro-variations at unpredictable intervals create
 *                            the illusion of genuine inner life
 *   ACTING TECHNIQUE       — internal state drives external behavior; the character
 *                            doesn't PERFORM emotions, they LEAK from the inside out
 *   AI PERSONALITY DESIGN  — constrained randomness > scripted responses;
 *                            the system chooses, the AI performs
 *
 * The seven behavioral primitives:
 *   1. Stream fatigue        — energy arc that declines naturally over time
 *   2. Humor detection       — extracts laugh signals from viewer text
 *   3. Question complexity   — determines hesitation probability
 *   4. Gift velocity         — rapid gift chains amplify emotional reactions
 *   5. Graduated burst       — excitement that builds in stages, not instantly
 *   6. Battle aftermath      — post-battle emotional memory (relief / disappointment)
 *   7. Paralinguistic inject — vocal texture added to generated text before TTS
 */

import type { EmotionalState, EmotionType, EmotionalTrigger } from "./emotionEngine";

// ══════════════════════════════════════════════════════════════════════════════
// 1. SESSION LIFECYCLE  —  stream fatigue clock
// ══════════════════════════════════════════════════════════════════════════════

const sessionStartTimes = new Map<number, number>();

export function recordSessionStart(sessionId: number): void {
  if (!sessionStartTimes.has(sessionId)) {
    sessionStartTimes.set(sessionId, Date.now());
  }
}

/**
 * Returns a 0.0–1.0 fatigue level based on stream duration.
 *   0.0 = fresh (< 30 min)
 *   0.3 = settled (60 min)
 *   0.6 = tired (90 min)
 *   1.0 = deep fatigue (3+ hours)
 */
export function getStreamFatigue(sessionId: number): number {
  const start = sessionStartTimes.get(sessionId);
  if (!start) return 0;
  const elapsedMin = (Date.now() - start) / 60_000;
  if (elapsedMin < 30)  return 0;
  if (elapsedMin < 60)  return 0.2;
  if (elapsedMin < 90)  return 0.4;
  if (elapsedMin < 120) return 0.6;
  if (elapsedMin < 180) return 0.8;
  return 1.0;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. HUMOR DETECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface HumorSignal {
  isHumorous: boolean;
  intensity: "mild" | "strong" | "unhinged";
}

const UNHINGED_LAUGH = /lmfao|lmaoooo|💀{2,}|😭{2,}|🤣{3,}|dead\s*(💀|😭)|i'?m\s+dead|i\s+cant|im\s+done/i;
const STRONG_LAUGH   = /lmao|lol{2,}|haha{2,}|😂{2,}|🤣{1,2}|💀|😹|hilarious|dying|pls\s+stop/i;
const MILD_LAUGH     = /haha|lol|😂|funny|cute|😄|😆|jk|joke|chuckle/i;

export function detectHumor(text: string): HumorSignal {
  if (UNHINGED_LAUGH.test(text)) return { isHumorous: true,  intensity: "unhinged" };
  if (STRONG_LAUGH.test(text))   return { isHumorous: true,  intensity: "strong"   };
  if (MILD_LAUGH.test(text))     return { isHumorous: true,  intensity: "mild"     };
  return                                { isHumorous: false, intensity: "mild"     };
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. QUESTION COMPLEXITY DETECTION
// ══════════════════════════════════════════════════════════════════════════════

export type QuestionComplexity = "none" | "simple" | "moderate" | "complex";

const PHILOSOPHICAL_WORDS = /why|what do you think|opinion|feel|believe|think about|meaning|life|important|advice|story|experience|ever feel|hard for you|biggest|dream|real|truth/i;

export function detectQuestionComplexity(text: string): QuestionComplexity {
  if (!text.includes("?")) return "none";
  const len = text.trim().length;
  if (PHILOSOPHICAL_WORDS.test(text) && len > 20) return "complex";
  if (len > 40) return "moderate";
  if (len > 10) return "simple";
  return "none";
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. GIFT VELOCITY  —  rapid gift chains amplify emotional reactions
// ══════════════════════════════════════════════════════════════════════════════

const giftTimestamps = new Map<number, number[]>();

export function recordGiftVelocity(sessionId: number): void {
  const now    = Date.now();
  const recent = (giftTimestamps.get(sessionId) ?? []).filter(t => now - t < 60_000);
  recent.push(now);
  giftTimestamps.set(sessionId, recent);
}

/**
 * Returns how the current gift chain should AMPLIFY the emotion trigger.
 * "wave"  = 2–3 gifts in 60s → upgrade trigger tier
 * "storm" = 4+ gifts in 60s → upgrade to whale tier
 */
export function getGiftVelocityAmplification(sessionId: number): "none" | "wave" | "storm" {
  const now   = Date.now();
  const count = (giftTimestamps.get(sessionId) ?? []).filter(t => now - t < 60_000).length;
  if (count >= 4) return "storm";
  if (count >= 2) return "wave";
  return "none";
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. GRADUATED COMMENT BURST  —  excitement that builds in stages
// ══════════════════════════════════════════════════════════════════════════════

const commentBurstTs = new Map<number, number[]>();

export interface BurstResult {
  /** Emotion trigger to apply — null if below threshold */
  trigger: EmotionalTrigger | null;
  /** Human-readable label for logs */
  burstLabel: "quiet" | "warming" | "engaged" | "buzzing" | "wild";
  /** Count in the last 30s window */
  count30s: number;
}

/**
 * Tracks comments in a rolling 30s window and returns the appropriate
 * emotional trigger. Replaces the single-threshold `trackCommentBurst`.
 *
 * Stages:
 *   1–2 /30s  → quiet     (no trigger)
 *   3–7 /30s  → warming   (burst_building — playful 5)
 *   8–12/30s  → engaged   (many_comments  — excited 7)
 *   13+/30s   → buzzing   (burst_peak     — excited 9)
 */
export function recordCommentForBurst(sessionId: number): BurstResult {
  const now    = Date.now();
  const recent = (commentBurstTs.get(sessionId) ?? []).filter(t => now - t < 30_000);
  recent.push(now);
  commentBurstTs.set(sessionId, recent.slice(-60)); // cap stored entries

  const count = recent.length;

  if (count >= 13) return { trigger: "burst_peak",    burstLabel: "wild",    count30s: count };
  if (count >= 8)  return { trigger: "many_comments", burstLabel: "buzzing", count30s: count };
  if (count >= 3)  return { trigger: "burst_building",burstLabel: "warming", count30s: count };
  return               { trigger: null,               burstLabel: "quiet",   count30s: count };
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. BATTLE AFTERMATH  —  post-battle emotional memory
// ══════════════════════════════════════════════════════════════════════════════

const battleAftermaths = new Map<number, { result: "win" | "loss"; at: number }>();

export function recordBattleAftermath(sessionId: number, result: "win" | "loss"): void {
  battleAftermaths.set(sessionId, { result, at: Date.now() });
}

/**
 * Returns a prompt context string describing the post-battle emotional state.
 * Active for 90 seconds after battle ends. Returns "" if no recent battle.
 */
export function getBattleAftermathContext(sessionId: number): string {
  const aftermath = battleAftermaths.get(sessionId);
  if (!aftermath) return "";

  const ageSec = (Date.now() - aftermath.at) / 1000;
  if (ageSec > 90) return "";

  const fresh = ageSec < 20;

  if (aftermath.result === "win") {
    return fresh
      ? `[Battle Aftermath] You just won that battle — the relief is real and fresh underneath the confidence. You PROVED something just now. Let that quiet satisfaction bleed into your tone. Don't announce it.`
      : `[Battle Aftermath] You won the battle moments ago. The adrenaline is fading into a warm, grounded confidence. Still sharp, but more settled.`;
  } else {
    return fresh
      ? `[Battle Aftermath] You just lost that battle. The disappointment is real — don't mask it completely. There's a quiet "watch me come back" energy underneath. Let it sharpen your edge slightly without showing weakness.`
      : `[Battle Aftermath] You lost a battle recently. The sting is fading into quiet determination. You're recalibrating — more focused, less performative.`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. PARALINGUISTIC INJECTION  —  vocal texture added to text before TTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Personality-specific paralinguistic profiles.
 *
 * These produce GENUINELY DIFFERENT vocal textures per personality:
 *   - Friendly laughs warmly and openly
 *   - Savage reacts with dry restraint or a single clipped sound
 *   - Motivational reacts with explosive energy
 *   - Professional barely reacts (relies on word choice only)
 *   - Funny escalates every reaction into theatrical absurdity
 *   - Flirty gets charmingly flustered
 *
 * All sounds have been chosen to render naturally in OpenAI TTS:
 *   "Ha—"   → clipped laugh then brief pause
 *   "Hmm..."→ thinking hum with trailing pause
 *   "Oh—"   → exclamation then pause
 *   "..."   → silence/pause
 */
interface ParalinguisticProfile {
  laughs:      string[];  // when humor detected
  hesitations: string[];  // before complex questions
  reactions:   string[];  // when surprised or high-intensity
  fades:       string[];  // stream fatigue trailing energy (suffix)
  excitedTail: string[];  // excited peak emphasis (suffix)
}

const PARALINGUISTIC_PROFILES: Record<string, ParalinguisticProfile> = {
  friendly: {
    laughs:      ["Ha— ", "Haha, ", "Haha— okay— ", "Oh no— haha, "],
    hesitations: ["Hmm... ", "Okay so... ", "Oh, that's... hmm... "],
    reactions:   ["Oh! ", "Oh wow— ", "Wait— "],
    fades:       [" ...yeah.", " really.", " honestly."],
    excitedTail: [" no for real!", " seriously!", " I love this!"],
  },
  savage: {
    laughs:      ["Ha. ", "...", "Nah— "],
    hesitations: ["...", "Okay— ", "Wait. "],
    reactions:   ["Huh. ", "Oh? ", "...wait. "],
    fades:       [" ...yeah.", " period.", ""],
    excitedTail: [" no cap.", " fr.", ""],
  },
  motivational: {
    laughs:      ["HA— ", "HAHA— okay— ", "OKAY— "],
    hesitations: ["Hold on— ", "Wait— ", "Okay— "],
    reactions:   ["OH— ", "WAIT— ", "WOW— "],
    fades:       [],  // motivational NEVER fades
    excitedTail: [" LET'S GO!", " THAT'S IT!", ""],
  },
  professional: {
    laughs:      [],  // professional expresses humor through word choice only
    hesitations: ["Hmm... ", "Well— ", "Interesting— "],
    reactions:   ["Well— ", "Hmm— ", "Noteworthy— "],
    fades:       [" ...noted.", " ...indeed."],
    excitedTail: [" Precisely.", " Indeed."],
  },
  funny: {
    laughs:      ["HAHA— ", "Ha— wait— ", "Okay I'm dead— ", "HA— okay— "],
    hesitations: ["Okay— wait— ", "Hold on— wait— ", "...okay— "],
    reactions:   ["WAIT WHAT— ", "OKAY— ", "Ha— "],
    fades:       [" ...okay.", " I'm done.", ""],
    excitedTail: [" I can't.", " okay I'm fine.", ""],
  },
  flirty: {
    laughs:      ["Ha— stop— ", "Okay— haha— ", "Oh no— haha, "],
    hesitations: ["Hmm... ", "Oh... ", "I mean— "],
    reactions:   ["Oh— ", "Oh stop— ", "Wait— "],
    fades:       [" ...yeah. 😊", " ...hi.", ""],
    excitedTail: [" stop it.", " seriously though.", ""],
  },
};

// Regex to detect if AI already generated a reaction starter (don't double-inject)
const REACTION_STARTER_RE = /^(ha|hm|hmm|oh|wait|okay|ok|wow|omg|nah|ugh|yes|yeah|well|hold|ugh|whoa|lol|lmao|no—|wait—|oh—)/i;

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface ParalinguisticOpts {
  emotionState:       EmotionalState;
  personalityKey:     string;
  humor:              HumorSignal;
  questionComplexity: QuestionComplexity;
  streamFatigue:      number;
}

/**
 * Injects paralinguistic markers into generated text before TTS synthesis.
 *
 * Probabilities are weighted by emotion intensity and signal strength.
 * If the AI already generated a reaction starter, prefix injection is skipped.
 * Never injects when text is too short (< 8 chars) — would look wrong.
 */
export function injectParalinguistics(text: string, opts: ParalinguisticOpts): string {
  const { emotionState, personalityKey, humor, questionComplexity, streamFatigue } = opts;
  const profile = PARALINGUISTIC_PROFILES[personalityKey] ?? PARALINGUISTIC_PROFILES.friendly!;
  const trimmed = text.trim();

  if (trimmed.length < 8) return text; // too short — don't touch it

  const alreadyHasStarter = REACTION_STARTER_RE.test(trimmed);
  let result = trimmed;
  const rng = Math.random();

  // ── Priority 1: Laughter (humor detected) ────────────────────────────────
  if (humor.isHumorous && !alreadyHasStarter && profile.laughs.length > 0) {
    const prob = humor.intensity === "unhinged" ? 0.82 :
                 humor.intensity === "strong"   ? 0.65 : 0.40;
    if (rng < prob) {
      const laugh = pickRandom(profile.laughs);
      if (laugh) return laugh + result;
    }
    return result; // decided not to laugh — exit, don't layer another modifier
  }

  // ── Priority 2: Surprise reaction (high-intensity surprised state) ────────
  if (emotionState.primary === "surprised" && emotionState.intensity >= 6 && !alreadyHasStarter) {
    if (rng < 0.55) {
      const reaction = pickRandom(profile.reactions);
      if (reaction) return reaction + result;
    }
    return result;
  }

  // ── Priority 3: Hesitation (complex question OR high-curiosity) ──────────
  if (!alreadyHasStarter) {
    const hesitationProb =
      questionComplexity === "complex"  ? 0.65 :
      questionComplexity === "moderate" ? 0.30 :
      (emotionState.primary === "curious" && emotionState.intensity >= 6) ? 0.35 : 0;

    if (hesitationProb > 0 && rng < hesitationProb) {
      const hesitation = pickRandom(profile.hesitations);
      if (hesitation) result = hesitation + result;
    }
  }

  // ── Priority 4: Excited tail (high-energy moments) ───────────────────────
  if (
    profile.excitedTail.length > 0 &&
    (emotionState.primary === "excited" || emotionState.primary === "competitive") &&
    emotionState.intensity >= 7 &&
    !result.endsWith("!") && !result.endsWith("!\"") && !result.endsWith("!")
  ) {
    if (Math.random() < 0.28) {
      const tail = pickRandom(profile.excitedTail);
      if (tail) result = result + tail;
    }
  }

  // ── Priority 5: Stream fatigue fade (quiet ending after long streams) ────
  if (
    profile.fades.length > 0 &&
    streamFatigue >= 0.5 &&
    !result.endsWith("!") && !result.endsWith("!")
  ) {
    if (Math.random() < 0.18) {
      const fade = pickRandom(profile.fades);
      if (fade) result = result + fade;
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT CONTEXT GENERATORS  —  behavioral signals injected into system prompts
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a system-prompt addition describing the stream's energy arc.
 * Only returns content when fatigue level warrants it (after 60+ min).
 */
export function getStreamFatiguePromptContext(sessionId: number): string {
  const fatigue = getStreamFatigue(sessionId);
  if (fatigue < 0.2) return "";

  if (fatigue >= 0.8) {
    return `[Stream Arc — Deep] You've been live for over 3 hours. Your energy is genuine but softer now — more reflective, warmer, more honest. Sentences shorter. Less performance, more real connection. You're not tired of the people, just settling into a late-stream groove.`;
  }
  if (fatigue >= 0.6) {
    return `[Stream Arc] You've been live for 90+ minutes. The high-energy opener has settled into a comfortable, natural flow. Still fully present — but you're in your groove now, not performing. Warmer, steadier, more conversational.`;
  }
  return `[Stream Arc] You've been live for about an hour. Still energized but settling from the opening surge — finding your natural rhythm.`;
}

/**
 * Generates a prompt hint about behavioral signals for the current event.
 * Tells the AI about humor and question complexity so it can shape word choice.
 * This is a HINT — the AI decides how to act on it, not a direct instruction.
 */
export function getBehaviorPromptContext(opts: {
  humor:              HumorSignal;
  questionComplexity: QuestionComplexity;
}): string {
  const lines: string[] = [];

  if (opts.humor.isHumorous) {
    const hintMap = {
      unhinged: `[Signal] This is genuinely hilarious. If it lands for you, let the laugh out naturally before responding. Don't suppress it.`,
      strong:   `[Signal] This is funny. If it's actually funny to you right now, let that come through — a real reaction, not a performed one.`,
      mild:     `[Signal] There's something playful or amusing here. Let that lift your energy slightly if it does.`,
    };
    lines.push(hintMap[opts.humor.intensity]);
  }

  if (opts.questionComplexity === "complex") {
    lines.push(`[Signal] This is a deep or personal question. Take a beat before answering — the pause matters. Don't rush to fill the space.`);
  } else if (opts.questionComplexity === "moderate") {
    lines.push(`[Signal] This needs a real answer. Don't deflect or over-perform — just respond genuinely.`);
  }

  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// STATE CLEANUP
// ══════════════════════════════════════════════════════════════════════════════

export function clearBehaviorState(sessionId: number): void {
  sessionStartTimes.delete(sessionId);
  giftTimestamps.delete(sessionId);
  commentBurstTs.delete(sessionId);
  battleAftermaths.delete(sessionId);
}
