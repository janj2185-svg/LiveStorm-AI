import { composeFrameWeights } from './expressions.js';
import { sampleGesture } from './gestures.js';
import {
  createBlinkClock,
  createBreathClock,
  createGazeClock,
  tickBlink,
  tickBreath,
  tickGaze,
  type BlinkClock,
  type BreathClock,
  type GazeClock,
} from './physiology.js';
import { normalizeReaction, REACTION_PROFILES, type ReactionProfile } from './reactions.js';
import {
  mouthOpenFromIntensity,
  speechIntensityFromAudio,
  speechIntensityFromText,
} from './speech.js';
import {
  DEFAULT_FRAMES,
  DEFAULT_POSE,
  type AvatarLifeState,
  type AvatarReaction,
  type AvatarReactionEvent,
  type AvatarPose,
} from './types.js';

export interface AvatarLifeOptions {
  /** Deterministic RNG for tests. */
  random?: () => number;
  /** Optional external audio RMS 0..1. */
  audioRms?: () => number | null;
  name?: string;
}

/**
 * Continuous "life" simulation for the female co-host avatar.
 * Drive it with requestAnimationFrame via `tick(nowMs)`.
 */
export class AvatarLifeController {
  readonly name: string;
  private readonly random: () => number;
  private readonly audioRms: () => number | null;

  private reaction: AvatarReaction = 'idle';
  private profile: ReactionProfile = REACTION_PROFILES.idle;
  private reactionStartedAt = 0;
  private syncToken: string | null = null;
  private utterance: string | null = null;
  private speechIntensity = 0;
  private lastNow = 0;
  private smile = DEFAULT_POSE.smile;
  private browRaise = DEFAULT_POSE.browRaise;
  private idleSwayPhase = 0;

  private blink: BlinkClock;
  private gaze: GazeClock;
  private breath: BreathClock;
  private lastState: AvatarLifeState;

  constructor(options: AvatarLifeOptions = {}) {
    this.name = options.name ?? 'Sylora';
    this.random = options.random ?? Math.random;
    this.audioRms = options.audioRms ?? (() => null);
    this.blink = createBlinkClock(0, this.random);
    this.gaze = createGazeClock(0, this.random);
    this.breath = createBreathClock(0);
    this.lastState = {
      reaction: 'idle',
      mood: 'neutral',
      speaking: false,
      speechIntensity: 0,
      utterance: null,
      syncToken: null,
      pose: { ...DEFAULT_POSE },
      frames: { ...DEFAULT_FRAMES },
      reactionAgeMs: 0,
    };
  }

  get state(): AvatarLifeState {
    return this.lastState;
  }

  react(event: AvatarReactionEvent | string): void {
    const payload: AvatarReactionEvent =
      typeof event === 'string' ? { reaction: normalizeReaction(event) } : event;
    const reaction = normalizeReaction(payload.reaction);
    this.reaction = reaction;
    this.profile = REACTION_PROFILES[reaction];
    this.reactionStartedAt = payload.at ?? this.lastNow;
    this.syncToken = payload.syncToken ?? null;
    if (payload.utterance !== undefined) this.utterance = payload.utterance;
    if (typeof payload.intensity === 'number') {
      this.speechIntensity = clamp(payload.intensity, 0, 1);
    }
  }

  setUtterance(text: string | null): void {
    this.utterance = text;
  }

  setSpeaking(speaking: boolean): void {
    if (speaking && this.reaction === 'idle') {
      this.react({ reaction: 'talk', utterance: this.utterance });
    } else if (!speaking && this.reaction === 'talk') {
      this.react({ reaction: 'idle' });
    }
  }

  tick(nowMs: number): AvatarLifeState {
    if (!Number.isFinite(nowMs)) return this.lastState;
    const dt = this.lastNow === 0 ? 16 : Math.min(64, Math.max(0, nowMs - this.lastNow));
    this.lastNow = nowMs;

    let age = nowMs - this.reactionStartedAt;
    if (
      this.reaction !== 'idle' &&
      Number.isFinite(this.profile.holdMs) &&
      age >= this.profile.holdMs
    ) {
      this.reaction = 'idle';
      this.profile = REACTION_PROFILES.idle;
      this.reactionStartedAt = nowMs;
      this.syncToken = null;
      age = 0;
    }

    this.idleSwayPhase += dt / 5200;

    const profile = this.profile;
    const speaking = profile.speaking;
    const blink = tickBlink(this.blink, nowMs, this.random);
    const breath = tickBreath(this.breath, dt);
    const gaze = tickGaze(
      this.gaze,
      nowMs,
      dt,
      profile.gazeBiasX,
      profile.gazeBiasY,
      this.random,
    );
    const gesture = sampleGesture(profile.gesture, age, profile.holdMs);

    const rms = this.audioRms();
    const intensity =
      rms != null
        ? speechIntensityFromAudio(rms)
        : speaking
          ? speechIntensityFromText(this.utterance, age, speaking)
          : lerp(this.speechIntensity, 0, Math.min(1, dt / 220));

    this.speechIntensity = intensity;
    this.smile = lerpToward(this.smile, profile.smile, dt, 180);
    this.browRaise = lerpToward(this.browRaise, profile.browRaise, dt, 160);
    const mouthOpen = mouthOpenFromIntensity(intensity, this.smile);

    const swayYaw = Math.sin(this.idleSwayPhase * Math.PI * 2) * 1.4;
    const swayRoll = Math.cos(this.idleSwayPhase * Math.PI * 2 * 0.7) * 0.9;
    const swayPitch = Math.sin(this.idleSwayPhase * Math.PI * 2 * 0.55) * 0.55;

    const pose: AvatarPose = {
      headPitch: profile.headPitch + gesture.headPitch + swayPitch + breath * 0.35,
      headYaw: profile.headYaw + gesture.headYaw + swayYaw,
      headRoll: profile.headRoll + gesture.headRoll + swayRoll,
      breath,
      shoulder: gesture.shoulder + breath * 0.04,
      gazeX: gaze.x,
      gazeY: gaze.y,
      blink,
      browRaise: this.browRaise,
      smile: this.smile,
      mouthOpen,
      gestureProgress: gesture.progress,
    };

    const frames = composeFrameWeights({
      mood: profile.mood,
      smile: pose.smile,
      mouthOpen: pose.mouthOpen,
      blink: pose.blink,
      speaking,
    });

    this.lastState = {
      reaction: this.reaction,
      mood: profile.mood,
      speaking,
      speechIntensity: intensity,
      utterance: this.utterance,
      syncToken: this.syncToken,
      pose,
      frames,
      reactionAgeMs: age,
    };
    return this.lastState;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpToward(current: number, target: number, dtMs: number, tauMs: number): number {
  const alpha = 1 - Math.exp(-dtMs / tauMs);
  return lerp(current, target, alpha);
}
