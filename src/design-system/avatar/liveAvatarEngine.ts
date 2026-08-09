/**
 * Deterministic animation engine for the SYLORA live assistant avatar.
 * All motion is computed from elapsed time so frames are reproducible in tests.
 */

export type LiveAvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type LiveAvatarExpression = 'neutral' | 'smile' | 'attentive' | 'thoughtful';
export type LiveAvatarGesture = 'none' | 'nod' | 'tilt' | 'glance';

export interface LiveAvatarConfig {
  state: LiveAvatarState;
  expression: LiveAvatarExpression;
  gesture: LiveAvatarGesture;
  /** 0–1 speech intensity when state is `speaking`. */
  speechIntensity?: number;
}

export interface LiveAvatarFrame {
  /** Subtle vertical breathing scale (1 = rest). */
  breathScale: number;
  /** Head rotation in degrees. */
  headRotate: number;
  /** Head translation in normalised canvas units (-1…1). */
  headShiftX: number;
  headShiftY: number;
  /** 0 = eyes open, 1 = fully closed. */
  blinkAmount: number;
  /** Gaze offset in normalised units. */
  gazeX: number;
  gazeY: number;
  /** 0 = closed mouth, 1 = wide open (viseme). */
  mouthOpen: number;
  /** 0–1 smile curve. */
  smile: number;
  /** Brow raise 0–1. */
  browRaise: number;
  /** Gesture progress 0–1. */
  gestureProgress: number;
}

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Pseudo-random blink schedule: returns 0–1 blink amount for a given time. */
export function blinkAt(elapsedMs: number, seed = 0): number {
  const interval = 2800 + (seed % 7) * 340;
  const phase = (elapsedMs + seed * 137) % interval;
  const blinkStart = interval - 180;
  if (phase < blinkStart) return 0;
  const t = (phase - blinkStart) / 180;
  return Math.sin(t * Math.PI);
}

/** Layered sine waves approximate natural speech viseme rhythm. */
export function speechVisemeAt(elapsedMs: number, intensity = 0.75): number {
  const t = elapsedMs / 1000;
  const base =
    0.35 +
    0.25 * Math.abs(Math.sin(t * 11.3)) +
    0.18 * Math.abs(Math.sin(t * 17.7 + 0.4)) +
    0.12 * Math.abs(Math.sin(t * 23.1 + 1.1));
  return clamp(base * intensity, 0.05, 0.95);
}

function expressionSmile(expression: LiveAvatarExpression): number {
  switch (expression) {
    case 'smile':
      return 0.55;
    case 'attentive':
      return 0.25;
    case 'thoughtful':
      return 0.08;
    default:
      return 0.18;
  }
}

function expressionBrow(expression: LiveAvatarExpression, state: LiveAvatarState): number {
  if (state === 'thinking' || expression === 'thoughtful') return 0.35;
  if (expression === 'attentive' || state === 'listening') return 0.18;
  return 0.05;
}

function stateGaze(state: LiveAvatarState, elapsedMs: number): { x: number; y: number } {
  const t = elapsedMs / 1000;
  switch (state) {
    case 'thinking':
      return { x: -0.012, y: -0.018 + Math.sin(t * 0.7) * 0.004 };
    case 'listening':
      return { x: Math.sin(t * 0.9) * 0.006, y: 0.004 };
    case 'speaking':
      return { x: Math.sin(t * 1.4) * 0.003, y: 0.002 };
    default:
      return { x: Math.sin(t * 0.55) * 0.005, y: Math.cos(t * 0.43) * 0.003 };
  }
}

function gestureMotion(
  gesture: LiveAvatarGesture,
  elapsedMs: number,
): { rotate: number; shiftX: number; shiftY: number; progress: number } {
  if (gesture === 'none') {
    return { rotate: 0, shiftX: 0, shiftY: 0, progress: 0 };
  }

  const cycle = 2200;
  const phase = (elapsedMs % cycle) / cycle;
  const active = smoothstep(0.05, 0.2, phase) * (1 - smoothstep(0.75, 0.95, phase));

  switch (gesture) {
    case 'nod':
      return { rotate: Math.sin(phase * TAU * 2) * 2.8 * active, shiftX: 0, shiftY: 0.008 * active, progress: active };
    case 'tilt':
      return { rotate: Math.sin(phase * TAU) * 3.5 * active, shiftX: 0.01 * active, shiftY: 0, progress: active };
    case 'glance':
      return {
        rotate: 0,
        shiftX: 0.018 * active,
        shiftY: 0,
        progress: active,
      };
    default:
      return { rotate: 0, shiftX: 0, shiftY: 0, progress: 0 };
  }
}

/**
 * Compute one animation frame from elapsed milliseconds and configuration.
 */
export function computeLiveAvatarFrame(
  elapsedMs: number,
  config: LiveAvatarConfig,
): LiveAvatarFrame {
  const t = elapsedMs / 1000;
  const breath = 1 + Math.sin(t * 1.15) * 0.004 + Math.sin(t * 2.3) * 0.002;
  const sway = Math.sin(t * 0.62) * 0.55 + Math.sin(t * 1.07 + 0.8) * 0.25;
  const gaze = stateGaze(config.state, elapsedMs);
  const gesture = gestureMotion(config.gesture, elapsedMs);

  let mouthOpen = 0.04 + expressionSmile(config.expression) * 0.06;
  if (config.state === 'speaking') {
    mouthOpen = speechVisemeAt(elapsedMs, config.speechIntensity ?? 0.8);
  }

  const blink = blinkAt(elapsedMs);

  return {
    breathScale: breath,
    headRotate: sway * 0.45 + gesture.rotate,
    headShiftX: Math.sin(t * 0.48) * 0.006 + gesture.shiftX,
    headShiftY: Math.cos(t * 0.39) * 0.004 + gesture.shiftY,
    blinkAmount: blink,
    gazeX: gaze.x + gesture.shiftX * 0.35,
    gazeY: gaze.y,
    mouthOpen,
    smile: expressionSmile(config.expression),
    browRaise: expressionBrow(config.expression, config.state),
    gestureProgress: gesture.progress,
  };
}

/** Map assistant UI mode to avatar configuration. */
export function assistantAvatarConfig(
  state: LiveAvatarState,
  readingAloud = false,
): LiveAvatarConfig {
  if (readingAloud || state === 'speaking') {
    return { state: 'speaking', expression: 'smile', gesture: 'none', speechIntensity: 0.85 };
  }
  if (state === 'thinking') {
    return { state: 'thinking', expression: 'thoughtful', gesture: 'none' };
  }
  if (state === 'listening') {
    return { state: 'listening', expression: 'attentive', gesture: 'tilt' };
  }
  return { state: 'idle', expression: 'neutral', gesture: 'none' };
}
