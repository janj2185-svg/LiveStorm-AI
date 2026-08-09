/**
 * Human physiology simulation for the living avatar
 * ---------------------------------------------------------------------------
 * Models the involuntary signals that make a face feel alive: blink cadence,
 * respiratory chest motion, saccadic gaze, micro head sway, and speech-driven
 * viseme envelopes. All units are seconds unless noted.
 */

import type { AvatarExpression, AvatarReaction, LivingPersona } from './persona';

export interface PhysiologySample {
  /** 0 open → 1 fully closed. */
  blink: number;
  /** −1…1 horizontal gaze offset. */
  gazeX: number;
  /** −1…1 vertical gaze offset. */
  gazeY: number;
  /** Breath phase 0…1. */
  breath: number;
  /** Head yaw degrees. */
  headYaw: number;
  /** Head pitch degrees. */
  headPitch: number;
  /** Head roll degrees. */
  headRoll: number;
  /** Mouth open amount 0…1 (speech / emotion). */
  mouthOpen: number;
  /** Smile bias 0…1 blended into expression weights. */
  smile: number;
  /** Per-expression blend weights (sum ≈ 1). */
  weights: Record<AvatarExpression, number>;
  /** Active high-level reaction. */
  reaction: AvatarReaction;
}

export interface PhysiologyOptions {
  reducedMotion?: boolean;
  /** External audio amplitude 0…1 for lip-sync; when omitted, speech is synthesised. */
  audioLevel?: number;
  /** Wall-clock ms; injectable for tests. */
  nowMs?: number;
}

interface BlinkEvent {
  start: number;
  duration: number;
}

interface Saccade {
  start: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  duration: number;
}

interface GesturePulse {
  kind: 'nod' | 'glance' | 'wave';
  start: number;
  duration: number;
}

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

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function emptyWeights(): Record<AvatarExpression, number> {
  return {
    neutral: 0,
    smile: 0,
    speak: 0,
    listen: 0,
    think: 0,
    blink: 0,
  };
}

/**
 * Maps co-host reactions onto resting expression bias and optional gesture.
 */
export function reactionProfile(reaction: AvatarReaction): {
  base: Partial<Record<AvatarExpression, number>>;
  gesture: GesturePulse['kind'] | null;
  speaking: boolean;
  smileBias: number;
} {
  switch (reaction) {
    case 'talk':
      return {
        base: { smile: 0.15, speak: 0.55, neutral: 0.3 },
        gesture: null,
        speaking: true,
        smileBias: 0.25,
      };
    case 'listen':
      return {
        base: { listen: 0.7, neutral: 0.3 },
        gesture: null,
        speaking: false,
        smileBias: 0.12,
      };
    case 'thinking':
      return {
        base: { think: 0.75, neutral: 0.25 },
        gesture: null,
        speaking: false,
        smileBias: 0.05,
      };
    case 'smile':
      return {
        base: { smile: 0.85, neutral: 0.15 },
        gesture: null,
        speaking: false,
        smileBias: 0.9,
      };
    case 'wave':
      return {
        base: { smile: 0.7, neutral: 0.3 },
        gesture: 'wave',
        speaking: false,
        smileBias: 0.8,
      };
    case 'gift_react':
      return {
        base: { smile: 0.8, neutral: 0.2 },
        gesture: 'nod',
        speaking: false,
        smileBias: 0.85,
      };
    case 'glance':
      return {
        base: { think: 0.45, listen: 0.25, neutral: 0.3 },
        gesture: 'glance',
        speaking: false,
        smileBias: 0.1,
      };
    case 'idle':
    default:
      return {
        base: { neutral: 0.78, smile: 0.22 },
        gesture: null,
        speaking: false,
        smileBias: 0.18,
      };
  }
}

/**
 * Stateful sampler. Construct once per avatar instance and call `sample(t)`.
 */
export class PhysiologyEngine {
  private readonly persona: LivingPersona;
  private reaction: AvatarReaction = 'idle';
  private reactionSince = 0;
  private blinkQueue: BlinkEvent[] = [];
  private nextBlinkAt = 0;
  private saccade: Saccade | null = null;
  private nextSaccadeAt = 0;
  private gazeX = 0;
  private gazeY = 0;
  private gesture: GesturePulse | null = null;
  private speechPhase = 0;
  private started = false;

  constructor(persona: LivingPersona) {
    this.persona = persona;
  }

  setReaction(reaction: AvatarReaction, atSeconds: number): void {
    if (reaction === this.reaction) return;
    this.reaction = reaction;
    this.reactionSince = atSeconds;
    const profile = reactionProfile(reaction);
    if (profile.gesture) {
      this.gesture = {
        kind: profile.gesture,
        start: atSeconds,
        duration: profile.gesture === 'wave' ? 1.4 : profile.gesture === 'nod' ? 0.9 : 1.1,
      };
    }
    // Humans blink more when attention shifts.
    this.scheduleBlink(atSeconds + 0.08 + hash(atSeconds * 10) * 0.12, 0.11);
  }

  getReaction(): AvatarReaction {
    return this.reaction;
  }

  private scheduleBlink(at: number, duration: number): void {
    this.blinkQueue.push({ start: at, duration });
    if (this.blinkQueue.length > 4) this.blinkQueue.shift();
  }

  private planBlink(now: number): void {
    const bpm = this.persona.physiology.blinksPerMinute;
    const interval = 60 / bpm;
    // Natural jitter ±35%.
    const jitter = 0.65 + hash(Math.floor(now * 3) + 17) * 0.7;
    this.nextBlinkAt = now + interval * jitter;
    const duration = 0.1 + hash(Math.floor(now * 5) + 3) * 0.06;
    this.scheduleBlink(this.nextBlinkAt, duration);
  }

  private planSaccade(now: number): void {
    const [minMs, maxMs] = this.persona.physiology.saccadeIntervalMs;
    const span = maxMs - minMs;
    const wait = (minMs + hash(Math.floor(now * 7) + 41) * span) / 1000;
    this.nextSaccadeAt = now + wait;
    const amplitude = this.reaction === 'thinking' || this.reaction === 'glance' ? 0.55 : 0.28;
    this.saccade = {
      start: now,
      fromX: this.gazeX,
      fromY: this.gazeY,
      toX: (hash(Math.floor(now * 13) + 2) * 2 - 1) * amplitude,
      toY: (hash(Math.floor(now * 17) + 5) * 2 - 1) * amplitude * 0.45,
      duration: 0.045 + hash(Math.floor(now * 11)) * 0.04,
    };
  }

  private blinkAmount(now: number): number {
    let amount = 0;
    this.blinkQueue = this.blinkQueue.filter((event) => now <= event.start + event.duration + 0.05);
    for (const event of this.blinkQueue) {
      const local = (now - event.start) / event.duration;
      if (local < 0 || local > 1) continue;
      // Fast close, slightly slower open — matches orbicularis oculi.
      const close = smoothstep(0, 0.38, local);
      const open = 1 - smoothstep(0.42, 1, local);
      amount = Math.max(amount, Math.min(close, open) === open && local > 0.42 ? open : close > open ? close : Math.min(close, open === 0 ? close : open));
      // Cleaner envelope: triangular with faster attack.
      const attack = smoothstep(0, 0.35, local);
      const release = 1 - smoothstep(0.4, 1, local);
      amount = Math.max(amount, Math.min(attack, release));
    }
    return clamp(amount, 0, 1);
  }

  private updateGaze(now: number): void {
    if (!this.saccade || now >= this.nextSaccadeAt) {
      this.planSaccade(now);
    }
    if (this.saccade) {
      const t = clamp((now - this.saccade.start) / this.saccade.duration, 0, 1);
      const eased = smoothstep(0, 1, t);
      this.gazeX = lerp(this.saccade.fromX, this.saccade.toX, eased);
      this.gazeY = lerp(this.saccade.fromY, this.saccade.toY, eased);
      // Drift slowly toward centre while holding fixation.
      if (t >= 1) {
        this.gazeX *= 0.992;
        this.gazeY *= 0.992;
      }
    }
  }

  private gesturePose(now: number): { yaw: number; pitch: number; roll: number } {
    if (!this.gesture) return { yaw: 0, pitch: 0, roll: 0 };
    const t = (now - this.gesture.start) / this.gesture.duration;
    if (t < 0 || t > 1) {
      if (t > 1) this.gesture = null;
      return { yaw: 0, pitch: 0, roll: 0 };
    }
    const envelope = Math.sin(Math.PI * t);
    switch (this.gesture.kind) {
      case 'nod':
        return { yaw: 0, pitch: envelope * 6.5, roll: envelope * 0.4 };
      case 'wave':
        return {
          yaw: Math.sin(t * Math.PI * 2) * 4.5,
          pitch: envelope * 2.2,
          roll: Math.sin(t * Math.PI * 2) * 3.2,
        };
      case 'glance':
        return { yaw: envelope * 9, pitch: envelope * -1.5, roll: envelope * 1.2 };
      default:
        return { yaw: 0, pitch: 0, roll: 0 };
    }
  }

  private speechMouth(now: number, audioLevel: number | undefined, speaking: boolean): number {
    if (!speaking && (audioLevel === undefined || audioLevel < 0.02)) {
      this.speechPhase = 0;
      return 0;
    }
    if (audioLevel !== undefined) {
      return clamp(audioLevel * 1.35, 0, 1);
    }
    // Procedural viseme-ish envelope: irregular syllables ~4–5 Hz with jaw hold.
    this.speechPhase += 0.016;
    const a = Math.sin(now * 17.2) * 0.5 + 0.5;
    const b = Math.sin(now * 23.7 + 1.7) * 0.5 + 0.5;
    const c = Math.sin(now * 8.1 + 0.4) * 0.5 + 0.5;
    const burst = Math.pow(a * 0.55 + b * 0.3 + c * 0.15, 1.35);
    return clamp(0.15 + burst * 0.85, 0, 1);
  }

  sample(options: PhysiologyOptions = {}): PhysiologySample {
    const now = (options.nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now())) / 1000;
    if (!this.started) {
      this.started = true;
      if (this.reactionSince === 0) this.reactionSince = now;
      this.planBlink(now + 0.4);
      this.planSaccade(now + 0.6);
    }

    if (options.reducedMotion) {
      const profile = reactionProfile(this.reaction);
      const weights = emptyWeights();
      for (const [key, value] of Object.entries(profile.base)) {
        weights[key as AvatarExpression] = value ?? 0;
      }
      normalizeWeights(weights);
      return {
        blink: 0,
        gazeX: 0,
        gazeY: 0,
        breath: 0.5,
        headYaw: 0,
        headPitch: 0,
        headRoll: 0,
        mouthOpen: profile.speaking ? 0.25 : 0,
        smile: profile.smileBias,
        weights,
        reaction: this.reaction,
      };
    }

    if (now >= this.nextBlinkAt - 0.001) {
      this.planBlink(now);
    }

    this.updateGaze(now);
    const blink = this.blinkAmount(now);
    const breathHz = this.persona.physiology.breathsPerMinute / 60;
    const breath = 0.5 + 0.5 * Math.sin(now * Math.PI * 2 * breathHz);
    const sway = this.persona.physiology.headSwayDegrees;
    const idleYaw = Math.sin(now * 0.35) * sway * 0.55 + Math.sin(now * 0.11 + 1.2) * sway * 0.35;
    const idlePitch = Math.sin(now * 0.27 + 0.6) * sway * 0.4;
    const idleRoll = Math.sin(now * 0.19 + 2.1) * sway * 0.25;
    const gesture = this.gesturePose(now);
    const profile = reactionProfile(this.reaction);
    const mouthOpen = this.speechMouth(now, options.audioLevel, profile.speaking);
    const settle = smoothstep(0, 0.45, now - this.reactionSince);

    const weights = emptyWeights();
    for (const [key, value] of Object.entries(profile.base)) {
      weights[key as AvatarExpression] = (value ?? 0) * settle;
    }
    weights.neutral += (1 - settle) * 0.9;
    weights.smile += (1 - settle) * 0.1;

    // Speech drives speak frame; blink frame overlays via opacity separately,
    // but we still bias weights so the crossfade looks intentional.
    if (profile.speaking) {
      weights.speak = Math.max(weights.speak, 0.25 + mouthOpen * 0.7);
      weights.neutral *= 1 - mouthOpen * 0.5;
    }
    if (blink > 0.55) {
      weights.blink = blink;
    }

    // Soft smile micro-pulses while idle — living people don't freeze.
    if (this.reaction === 'idle') {
      const micro = smoothstep(0.55, 1, Math.sin(now * 0.7) * 0.5 + 0.5) * 0.12;
      weights.smile += micro;
    }

    normalizeWeights(weights);

    return {
      blink,
      gazeX: this.gazeX,
      gazeY: this.gazeY,
      breath,
      headYaw: idleYaw + gesture.yaw,
      headPitch: idlePitch + gesture.pitch,
      headRoll: idleRoll + gesture.roll,
      mouthOpen,
      smile: profile.smileBias,
      weights,
      reaction: this.reaction,
    };
  }
}

function normalizeWeights(weights: Record<AvatarExpression, number>): void {
  let sum = 0;
  for (const key of Object.keys(weights) as AvatarExpression[]) {
    weights[key] = Math.max(0, weights[key]);
    sum += weights[key];
  }
  if (sum <= 0) {
    weights.neutral = 1;
    return;
  }
  for (const key of Object.keys(weights) as AvatarExpression[]) {
    weights[key] /= sum;
  }
}

/** Pure helper used by tests — next blink interval around human average. */
export function expectedBlinkIntervalSec(blinksPerMinute: number, jitterUnit = 0.5): number {
  const interval = 60 / blinksPerMinute;
  return interval * (0.65 + jitterUnit * 0.7);
}
