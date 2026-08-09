/**
 * Living avatar contracts.
 *
 * The runtime models a human presence as continuous physiology (blink, breath,
 * gaze) plus discrete social actions that the co-host scheduler already emits:
 * talk / listen / wave / glance / gift_react.
 */

export type AvatarReaction =
  | 'idle'
  | 'talk'
  | 'listen'
  | 'wave'
  | 'glance'
  | 'gift_react'
  | 'think';

export type AvatarMood =
  | 'neutral'
  | 'warm'
  | 'attentive'
  | 'delighted'
  | 'thoughtful';

/** Expression still keys that map 1:1 to shipped portrait assets. */
export type AvatarFrame = 'neutral' | 'warm' | 'listen' | 'speak' | 'blink';

/**
 * Continuous pose sampled every animation frame.
 * Units are normalised: angles in degrees, blend weights in 0..1.
 */
export interface AvatarPose {
  headPitch: number;
  headYaw: number;
  headRoll: number;
  breath: number;
  shoulder: number;
  gazeX: number;
  gazeY: number;
  blink: number;
  browRaise: number;
  smile: number;
  mouthOpen: number;
  gestureProgress: number;
}

export interface FrameWeights {
  neutral: number;
  warm: number;
  listen: number;
  speak: number;
  blink: number;
}

export interface AvatarLifeState {
  reaction: AvatarReaction;
  mood: AvatarMood;
  speaking: boolean;
  speechIntensity: number;
  utterance: string | null;
  syncToken: string | null;
  pose: AvatarPose;
  frames: FrameWeights;
  /** Milliseconds since the current reaction began. */
  reactionAgeMs: number;
}

export interface AvatarReactionEvent {
  reaction: AvatarReaction;
  syncToken?: string | null;
  utterance?: string | null;
  intensity?: number;
  at?: number;
}

export const DEFAULT_POSE: AvatarPose = {
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  breath: 0,
  shoulder: 0,
  gazeX: 0,
  gazeY: 0,
  blink: 0,
  browRaise: 0,
  smile: 0.12,
  mouthOpen: 0,
  gestureProgress: 0,
};

export const DEFAULT_FRAMES: FrameWeights = {
  neutral: 1,
  warm: 0,
  listen: 0,
  speak: 0,
  blink: 0,
};
