/**
 * Liora — SYLORA living AI assistant persona
 * ---------------------------------------------------------------------------
 * A photoreal female co-host whose presence is meant to read as a real person
 * in the frame: soft daylight, natural micro-motion, human blink cadence.
 * Expression stills are cross-faded by the physiology engine rather than
 * swapped as UI chrome.
 */

export type AvatarExpression =
  | 'neutral'
  | 'smile'
  | 'speak'
  | 'listen'
  | 'think'
  | 'blink';

/**
 * Reactions emitted by the co-host orchestrator (`AvatarController.react`).
 * The living avatar maps each to a pose + expression blend.
 */
export type AvatarReaction =
  | 'idle'
  | 'listen'
  | 'talk'
  | 'wave'
  | 'gift_react'
  | 'glance'
  | 'thinking'
  | 'smile';

export interface AvatarLandmark {
  /** Normalised X in the portrait (0–1). */
  x: number;
  /** Normalised Y in the portrait (0–1). */
  y: number;
}

/**
 * Approximate face landmarks for the Liora portrait set (shared framing).
 * Used for gaze highlights, blink lids and mouth emphasis overlays.
 */
export const LIORA_LANDMARKS = {
  leftEye: { x: 0.38, y: 0.42 } satisfies AvatarLandmark,
  rightEye: { x: 0.62, y: 0.42 } satisfies AvatarLandmark,
  nose: { x: 0.5, y: 0.52 } satisfies AvatarLandmark,
  mouth: { x: 0.5, y: 0.64 } satisfies AvatarLandmark,
  chin: { x: 0.5, y: 0.78 } satisfies AvatarLandmark,
} as const;

export const LIORA_FRAMES: Record<AvatarExpression, string> = {
  neutral: '/avatar/liora-neutral.webp',
  smile: '/avatar/liora-smile.webp',
  speak: '/avatar/liora-speak.webp',
  listen: '/avatar/liora-listen.webp',
  think: '/avatar/liora-think.webp',
  blink: '/avatar/liora-blink.webp',
};

export const LIORA_PERSONA = {
  id: 'liora',
  name: 'Liora',
  role: 'SYLORA Assistant',
  tagline: 'Listens like a person. Answers with receipts.',
  frames: LIORA_FRAMES,
  landmarks: LIORA_LANDMARKS,
  /**
   * Resting physiology tuned to adult human norms:
   * ~15 blinks/min, ~14 breaths/min, soft head sway.
   */
  physiology: {
    blinksPerMinute: 15,
    breathsPerMinute: 14,
    saccadeIntervalMs: [900, 2800] as const,
    headSwayDegrees: 1.6,
    shoulderBreathScale: 0.012,
  },
} as const;

export type LivingPersona = typeof LIORA_PERSONA;
