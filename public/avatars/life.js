/**
 * Browser build of the living-avatar physiology for OBS overlays.
 * Kept as plain ES module so /avatar-overlay.html works without a bundler.
 */

const REACTION_PROFILES = {
  idle: { mood: 'neutral', speaking: false, holdMs: Infinity, smile: 0.12, browRaise: 0, gazeBiasX: 0, gazeBiasY: 0, headPitch: 0, headYaw: 0, headRoll: 0, gesture: 'none' },
  listen: { mood: 'attentive', speaking: false, holdMs: 4200, smile: 0.08, browRaise: 0.18, gazeBiasX: 0.04, gazeBiasY: 0.02, headPitch: 1.4, headYaw: -2.2, headRoll: 2.6, gesture: 'nod' },
  think: { mood: 'thoughtful', speaking: false, holdMs: 3600, smile: 0.04, browRaise: 0.28, gazeBiasX: -0.18, gazeBiasY: -0.08, headPitch: -1.2, headYaw: 4.5, headRoll: -3.2, gesture: 'none' },
  talk: { mood: 'warm', speaking: true, holdMs: 2800, smile: 0.34, browRaise: 0.12, gazeBiasX: 0, gazeBiasY: 0.01, headPitch: 0.6, headYaw: 0, headRoll: 0.8, gesture: 'nod' },
  wave: { mood: 'warm', speaking: false, holdMs: 2200, smile: 0.55, browRaise: 0.22, gazeBiasX: 0.06, gazeBiasY: 0, headPitch: 1.8, headYaw: -3, headRoll: 4, gesture: 'wave' },
  glance: { mood: 'attentive', speaking: false, holdMs: 1600, smile: 0.1, browRaise: 0.08, gazeBiasX: 0.42, gazeBiasY: -0.05, headPitch: 0.4, headYaw: 11, headRoll: 1.5, gesture: 'glance' },
  gift_react: { mood: 'delighted', speaking: false, holdMs: 2600, smile: 0.72, browRaise: 0.36, gazeBiasX: 0, gazeBiasY: 0.04, headPitch: 3.2, headYaw: 0, headRoll: -2.4, gesture: 'gift' },
};

export function normalizeReaction(raw) {
  if (!raw) return 'idle';
  const key = String(raw).trim().toLowerCase().replace(/-/g, '_');
  return Object.hasOwn(REACTION_PROFILES, key) ? key : 'idle';
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpToward(current, target, dtMs, tauMs) {
  return lerp(current, target, 1 - Math.exp(-dtMs / tauMs));
}

function envelopePulse(progress, attack, release) {
  if (progress < attack) return progress / attack;
  if (progress > release) return Math.max(0, 1 - (progress - release) / (1 - release));
  return 1;
}

function sampleGesture(kind, ageMs, holdMs) {
  const progress = !Number.isFinite(holdMs) ? 0 : clamp(ageMs / Math.max(holdMs, 1), 0, 1);
  if (kind === 'wave') {
    const envelope = envelopePulse(progress, 0.15, 0.85);
    const swing = Math.sin(progress * Math.PI * 4) * envelope;
    return { shoulder: 0.55 * envelope + swing * 0.18, headPitch: 1.2 * envelope, headYaw: -2.4 * envelope + swing * 1.1, headRoll: 3.2 * envelope, progress };
  }
  if (kind === 'nod') {
    const nods = Math.sin(progress * Math.PI * 2.2) * envelopePulse(progress, 0.05, 0.9);
    return { shoulder: 0.08 * Math.abs(nods), headPitch: nods * 2.8, headYaw: 0, headRoll: nods * 0.4, progress };
  }
  if (kind === 'glance') {
    const envelope = envelopePulse(progress, 0.08, 0.92);
    return { shoulder: 0.04 * envelope, headPitch: 0.3 * envelope, headYaw: 8 * envelope, headRoll: 1.2 * envelope, progress };
  }
  if (kind === 'gift') {
    const envelope = envelopePulse(progress, 0.1, 0.88);
    const bounce = Math.sin(progress * Math.PI * 3) * envelope;
    return { shoulder: 0.28 * envelope, headPitch: 2.4 * envelope + bounce * 1.4, headYaw: bounce * 1.2, headRoll: -2.1 * envelope, progress };
  }
  return { shoulder: 0, headPitch: 0, headYaw: 0, headRoll: 0, progress };
}

function composeFrameWeights({ mood, smile, mouthOpen, blink, speaking }) {
  let warm = 0;
  let listen = 0;
  let speak = 0;
  let neutral = 1;
  if (mood === 'attentive' || mood === 'thoughtful') {
    listen = mood === 'thoughtful' ? 0.72 : 0.85;
    neutral = 1 - listen;
  } else if (mood === 'delighted') {
    warm = 0.55 + smile * 0.35;
    speak = mouthOpen * 0.35;
    neutral = Math.max(0, 1 - warm - speak);
  } else if (mood === 'warm' || speaking) {
    warm = 0.25 + smile * 0.55;
    speak = mouthOpen * (speaking ? 0.95 : 0.45);
    const sum = warm + speak;
    if (sum > 1) {
      warm /= sum;
      speak /= sum;
    }
    neutral = Math.max(0, 1 - warm - speak);
  } else {
    warm = smile * 0.35;
    speak = mouthOpen * 0.25;
    neutral = Math.max(0, 1 - warm - speak);
  }
  const openSum = neutral + warm + listen + speak;
  if (openSum > 0) {
    const openScale = 1 - blink;
    neutral = (neutral / openSum) * openScale;
    warm = (warm / openSum) * openScale;
    listen = (listen / openSum) * openScale;
    speak = (speak / openSum) * openScale;
  }
  return { neutral, warm, listen, speak, blink };
}

const VOWELS = new Set('aeiouyаеєиіїоуюяAEIOUYАЕЄИІЇОУЮЯ');

function speechIntensityFromText(utterance, ageMs, speaking) {
  if (!speaking) return 0;
  const text = (utterance ?? '').trim();
  if (!text) {
    return clamp(0.35 + 0.35 * Math.sin(ageMs / 90) + 0.15 * Math.sin(ageMs / 37), 0, 1);
  }
  const chars = Array.from(text);
  const index = Math.floor((ageMs / 1000) * 12) % Math.max(chars.length, 1);
  const ch = chars[index] ?? ' ';
  if (/[\s.,!?;:—-]/.test(ch)) return 0.04 * Math.abs(Math.sin(ageMs / 200));
  return clamp((VOWELS.has(ch) ? 0.62 : 0.28) + 0.18 * Math.sin(ageMs / 55 + index), 0, 1);
}

export class AvatarLifeController {
  constructor(options = {}) {
    this.name = options.name ?? 'Sylora';
    this.random = options.random ?? Math.random;
    this.reaction = 'idle';
    this.profile = REACTION_PROFILES.idle;
    this.reactionStartedAt = 0;
    this.syncToken = null;
    this.utterance = null;
    this.speechIntensity = 0;
    this.lastNow = 0;
    this.smile = 0.12;
    this.browRaise = 0;
    this.idleSwayPhase = 0;
    this.blink = { nextBlinkAt: 2500 + this.random() * 3000, phase: 'open', phaseStartedAt: 0, doublePending: false, amount: 0 };
    this.gaze = { targetX: 0, targetY: 0, currentX: 0, currentY: 0, nextSaccadeAt: 1000 };
    this.breathPhase = 0;
    this.state = this._empty();
  }

  _empty() {
    return {
      reaction: 'idle',
      mood: 'neutral',
      speaking: false,
      speechIntensity: 0,
      utterance: null,
      syncToken: null,
      pose: { headPitch: 0, headYaw: 0, headRoll: 0, breath: 0, shoulder: 0, gazeX: 0, gazeY: 0, blink: 0, browRaise: 0, smile: 0.12, mouthOpen: 0, gestureProgress: 0 },
      frames: { neutral: 1, warm: 0, listen: 0, speak: 0, blink: 0 },
      reactionAgeMs: 0,
    };
  }

  react(event) {
    const payload = typeof event === 'string' ? { reaction: normalizeReaction(event) } : event;
    this.reaction = normalizeReaction(payload.reaction);
    this.profile = REACTION_PROFILES[this.reaction];
    this.reactionStartedAt = payload.at ?? this.lastNow;
    this.syncToken = payload.syncToken ?? null;
    if (payload.utterance !== undefined) this.utterance = payload.utterance;
  }

  tick(nowMs) {
    const dt = this.lastNow === 0 ? 16 : Math.min(64, Math.max(0, nowMs - this.lastNow));
    this.lastNow = nowMs;
    let age = nowMs - this.reactionStartedAt;
    if (this.reaction !== 'idle' && Number.isFinite(this.profile.holdMs) && age >= this.profile.holdMs) {
      this.reaction = 'idle';
      this.profile = REACTION_PROFILES.idle;
      this.reactionStartedAt = nowMs;
      this.syncToken = null;
      age = 0;
    }
    this.idleSwayPhase += dt / 5200;
    const blink = this._tickBlink(nowMs);
    this.breathPhase = (this.breathPhase + dt / 4000) % 1;
    const breath = Math.sin(this.breathPhase * Math.PI * 2);
    const gaze = this._tickGaze(nowMs, dt);
    const gesture = sampleGesture(this.profile.gesture, age, this.profile.holdMs);
    const intensity = this.profile.speaking
      ? speechIntensityFromText(this.utterance, age, true)
      : lerp(this.speechIntensity, 0, Math.min(1, dt / 220));
    this.speechIntensity = intensity;
    this.smile = lerpToward(this.smile, this.profile.smile, dt, 180);
    this.browRaise = lerpToward(this.browRaise, this.profile.browRaise, dt, 160);
    const mouthOpen = clamp(intensity * (1 - this.smile * 0.22), 0, 1);
    const swayYaw = Math.sin(this.idleSwayPhase * Math.PI * 2) * 1.4;
    const swayRoll = Math.cos(this.idleSwayPhase * Math.PI * 2 * 0.7) * 0.9;
    const swayPitch = Math.sin(this.idleSwayPhase * Math.PI * 2 * 0.55) * 0.55;
    const pose = {
      headPitch: this.profile.headPitch + gesture.headPitch + swayPitch + breath * 0.35,
      headYaw: this.profile.headYaw + gesture.headYaw + swayYaw,
      headRoll: this.profile.headRoll + gesture.headRoll + swayRoll,
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
      mood: this.profile.mood,
      smile: pose.smile,
      mouthOpen: pose.mouthOpen,
      blink: pose.blink,
      speaking: this.profile.speaking,
    });
    this.state = {
      reaction: this.reaction,
      mood: this.profile.mood,
      speaking: this.profile.speaking,
      speechIntensity: intensity,
      utterance: this.utterance,
      syncToken: this.syncToken,
      pose,
      frames,
      reactionAgeMs: age,
    };
    return this.state;
  }

  _tickBlink(now) {
    const clock = this.blink;
    if (clock.phase === 'open') {
      clock.amount = 0;
      if (now >= clock.nextBlinkAt) {
        clock.phase = 'closing';
        clock.phaseStartedAt = now;
        clock.doublePending = this.random() < 0.18;
      }
      return clock.amount;
    }
    const elapsed = now - clock.phaseStartedAt;
    if (clock.phase === 'closing') {
      const t = Math.min(1, elapsed / 140);
      clock.amount = t * t * t;
      if (t >= 1) {
        clock.phase = 'closed';
        clock.phaseStartedAt = now;
      }
      return clock.amount;
    }
    if (clock.phase === 'closed') {
      clock.amount = 1;
      if (elapsed >= 40) {
        clock.phase = 'opening';
        clock.phaseStartedAt = now;
      }
      return clock.amount;
    }
    const t = Math.min(1, elapsed / 160);
    clock.amount = 1 - (1 - t) ** 3;
    if (t >= 1) {
      clock.phase = 'open';
      clock.amount = 0;
      clock.nextBlinkAt = clock.doublePending
        ? now + 120 + this.random() * 160
        : now + 2400 + this.random() * 3200;
      clock.doublePending = false;
    }
    return clock.amount;
  }

  _tickGaze(now, dtMs) {
    const clock = this.gaze;
    if (now >= clock.nextSaccadeAt) {
      clock.targetX = this.profile.gazeBiasX + (this.random() * 0.32 - 0.16);
      clock.targetY = this.profile.gazeBiasY + (this.random() * 0.2 - 0.1);
      clock.nextSaccadeAt = now + 800 + this.random() * 1800;
    }
    const alpha = 1 - Math.exp(-dtMs / 120);
    clock.currentX += (clock.targetX - clock.currentX) * alpha;
    clock.currentY += (clock.targetY - clock.currentY) * alpha;
    return { x: clock.currentX, y: clock.currentY };
  }
}
