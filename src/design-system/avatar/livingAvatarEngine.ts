/**
 * Pure living-avatar motion engine.
 *
 * All timing is deterministic given `(timeMs, reaction, seed)`. React owns the
 * rAF clock; this module only turns time into a human-readable pose so the
 * same cadence can be unit-tested without a DOM.
 */

import { expressionForReaction, type AvatarReaction, type ExpressionKey } from './persona';

export interface AvatarPose {
  /** Dominant expression plate. */
  expression: ExpressionKey;
  /** 0 = fully neutral plate, 1 = fully expression plate. */
  expressionMix: number;
  /** Head orientation in degrees. */
  headYaw: number;
  headPitch: number;
  headRoll: number;
  /** 0–1 breathing cycle (chest/shoulders). */
  breath: number;
  /** 0 open … 1 closed eyelids. */
  blink: number;
  /** Normalized gaze offset (−1…1). */
  gazeX: number;
  gazeY: number;
  /** Mouth openness for talk lip cadence (0…1). */
  lipOpen: number;
  /** Soft smile bias layered on top of the plate mix. */
  warmth: number;
}

export interface EngineOptions {
  /** When true, freeze ambient motion and hold a settled pose. */
  reducedMotion?: boolean;
  /** Optional audio amplitude 0–1 for lip sync (overrides procedural lips). */
  audioLevel?: number;
}

const TWO_PI = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Irregular blink schedule: most intervals 2.4–5.2s, occasional double blink.
 * Returns eyelid closure 0…1 for the current instant.
 */
export function blinkAmount(timeMs: number, seed = 0): number {
  // Phase the schedule so two avatars on screen don't blink in lockstep.
  const t = timeMs + seed * 1373;
  const cycle = 3200 + ((Math.sin(t * 0.00017 + seed) + 1) * 0.5) * 2200;
  const local = t % cycle;
  const close = 70;
  const hold = 40;
  const open = 110;
  if (local < close) return smoothstep(0, close, local);
  if (local < close + hold) return 1;
  if (local < close + hold + open) return 1 - smoothstep(0, open, local - close - hold);

  // Occasional double blink in the second half of long cycles.
  if (cycle > 4200 && local > cycle * 0.55 && local < cycle * 0.55 + close + hold + open) {
    const d = local - cycle * 0.55;
    if (d < close) return smoothstep(0, close, d);
    if (d < close + hold) return 1;
    return 1 - smoothstep(0, open, d - close - hold);
  }
  return 0;
}

function gestureEnvelope(timeMs: number, durationMs: number): number {
  const u = clamp(timeMs / durationMs, 0, 1);
  // Attack / sustain / release shaped like a polite human gesture.
  if (u < 0.18) return smoothstep(0, 0.18, u);
  if (u < 0.62) return 1;
  return 1 - smoothstep(0.62, 1, u);
}

/**
 * Sample the living pose at `timeMs` while `reaction` is active.
 * `reactionStartedAt` anchors one-shot gestures (wave, nod, glance, gift).
 */
export function samplePose(
  timeMs: number,
  reaction: AvatarReaction,
  reactionStartedAt: number,
  options: EngineOptions = {},
): AvatarPose {
  const reduced = Boolean(options.reducedMotion);
  const age = Math.max(0, timeMs - reactionStartedAt);
  const expression = expressionForReaction(reaction);

  if (reduced) {
    return {
      expression,
      expressionMix: reaction === 'idle' ? 0 : 0.85,
      headYaw: 0,
      headPitch: reaction === 'nod' ? 4 : 0,
      headRoll: 0,
      breath: 0.5,
      blink: 0,
      gazeX: 0,
      gazeY: 0,
      lipOpen: reaction === 'talk' ? 0.25 : 0,
      warmth: reaction === 'smile' || reaction === 'gift_react' ? 0.7 : 0.15,
    };
  }

  const breath = (Math.sin(timeMs * 0.0011) + 1) * 0.5;
  const swayYaw = Math.sin(timeMs * 0.00055) * 1.6 + Math.sin(timeMs * 0.0013) * 0.55;
  const swayPitch = Math.sin(timeMs * 0.00047 + 1.2) * 0.9;
  const swayRoll = Math.sin(timeMs * 0.00039 + 0.4) * 0.45;

  // Micro saccades — gaze drifts, then settles, like a live conversation.
  const gazeX =
    Math.sin(timeMs * 0.00063) * 0.22 +
    Math.sin(timeMs * 0.0021 + 2.1) * 0.08 +
    Math.sin(timeMs * 0.00019) * 0.12;
  const gazeY =
    Math.sin(timeMs * 0.00071 + 0.8) * 0.12 + Math.sin(timeMs * 0.0017) * 0.05;

  let headYaw = swayYaw;
  let headPitch = swayPitch;
  let headRoll = swayRoll;
  let expressionMix = 0.12 + breath * 0.04;
  let lipOpen = 0;
  let warmth = 0.12 + breath * 0.05;
  let blink = blinkAmount(timeMs, 3);

  switch (reaction) {
    case 'listen': {
      expressionMix = lerp(0.55, 0.92, (Math.sin(timeMs * 0.002) + 1) * 0.5);
      headYaw = swayYaw * 0.55 + 3.2;
      headPitch = swayPitch * 0.7 - 1.2;
      warmth = 0.2;
      break;
    }
    case 'talk': {
      expressionMix = 0.7 + Math.sin(timeMs * 0.008) * 0.12;
      // Procedural lip cadence approximating speech rhythm without audio.
      const syllable = Math.abs(Math.sin(timeMs * 0.018)) ** 1.35;
      const phrase = 0.35 + 0.65 * ((Math.sin(timeMs * 0.0035) + 1) * 0.5);
      lipOpen =
        options.audioLevel != null
          ? clamp(options.audioLevel * 1.15, 0, 1)
          : clamp(syllable * phrase, 0.05, 0.95);
      headYaw = swayYaw * 0.7;
      headPitch = swayPitch * 0.85 - lipOpen * 0.8;
      warmth = 0.28 + lipOpen * 0.15;
      // Suppress blink mid-phoneme bursts slightly — speakers blink less while talking.
      blink *= 1 - lipOpen * 0.35;
      break;
    }
    case 'wave': {
      const g = gestureEnvelope(age, 2200);
      expressionMix = lerp(0.2, 1, g);
      headYaw = swayYaw + lerp(0, -6, g);
      headRoll = swayRoll + lerp(0, 3.5, g);
      warmth = lerp(0.15, 0.75, g);
      break;
    }
    case 'nod': {
      const g = gestureEnvelope(age, 1100);
      // Two-beat nod.
      const nodWave = Math.sin(age * 0.012) * g;
      expressionMix = lerp(0.15, 0.95, g);
      headPitch = swayPitch + nodWave * 7.5;
      warmth = 0.35;
      break;
    }
    case 'glance': {
      const g = gestureEnvelope(age, 1600);
      expressionMix = lerp(0.1, 0.7, g);
      headYaw = swayYaw + lerp(0, 11, g);
      headPitch = swayPitch - 1.5 * g;
      break;
    }
    case 'gift_react': {
      const g = gestureEnvelope(age, 2400);
      expressionMix = lerp(0.2, 1, g);
      warmth = lerp(0.2, 0.95, g);
      headPitch = swayPitch - 2 * g;
      headYaw = swayYaw * (1 - g * 0.4);
      break;
    }
    case 'smile': {
      expressionMix = 0.85;
      warmth = 0.9;
      headPitch = swayPitch - 0.8;
      break;
    }
    case 'think': {
      expressionMix = 0.25;
      headYaw = swayYaw * 0.5 - 4;
      headPitch = swayPitch + 2.5;
      headRoll = swayRoll + 1.2;
      warmth = 0.1;
      blink = Math.max(blink, smoothstep(0, 1, Math.sin(timeMs * 0.0015)));
      break;
    }
    case 'idle':
    default: {
      expressionMix = 0.08 + breath * 0.06;
      warmth = 0.12 + breath * 0.04;
      break;
    }
  }

  return {
    expression,
    expressionMix: clamp(expressionMix, 0, 1),
    headYaw,
    headPitch,
    headRoll,
    breath,
    blink: clamp(blink, 0, 1),
    gazeX: clamp(gazeX, -1, 1),
    gazeY: clamp(gazeY, -1, 1),
    lipOpen: clamp(lipOpen, 0, 1),
    warmth: clamp(warmth, 0, 1),
  };
}

/** One-shot reactions auto-return to idle after their gesture window. */
export function reactionDurationMs(reaction: AvatarReaction): number | null {
  switch (reaction) {
    case 'wave':
      return 2300;
    case 'nod':
      return 1200;
    case 'glance':
      return 1700;
    case 'gift_react':
      return 2500;
    case 'smile':
      return 2800;
    default:
      return null;
  }
}

export function nextIdleReaction(timeMs: number): AvatarReaction {
  // Sparse ambient life so an idle presence still feels inhabited.
  const bucket = Math.floor(timeMs / 9000) % 5;
  if (bucket === 1) return 'glance';
  if (bucket === 3) return 'smile';
  return 'idle';
}

export { TWO_PI, clamp, lerp };
