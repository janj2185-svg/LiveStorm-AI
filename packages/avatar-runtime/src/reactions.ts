import type { AvatarMood, AvatarReaction } from './types.js';

export interface ReactionProfile {
  mood: AvatarMood;
  speaking: boolean;
  /** How long the reaction owns the face before drifting back toward idle. */
  holdMs: number;
  smile: number;
  browRaise: number;
  gazeBiasX: number;
  gazeBiasY: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  gesture: 'none' | 'wave' | 'nod' | 'glance' | 'gift';
}

export const REACTION_PROFILES: Record<AvatarReaction, ReactionProfile> = {
  idle: {
    mood: 'neutral',
    speaking: false,
    holdMs: Number.POSITIVE_INFINITY,
    smile: 0.12,
    browRaise: 0,
    gazeBiasX: 0,
    gazeBiasY: 0,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    gesture: 'none',
  },
  listen: {
    mood: 'attentive',
    speaking: false,
    holdMs: 4200,
    smile: 0.08,
    browRaise: 0.18,
    gazeBiasX: 0.04,
    gazeBiasY: 0.02,
    headPitch: 1.4,
    headYaw: -2.2,
    headRoll: 2.6,
    gesture: 'nod',
  },
  think: {
    mood: 'thoughtful',
    speaking: false,
    holdMs: 3600,
    smile: 0.04,
    browRaise: 0.28,
    gazeBiasX: -0.18,
    gazeBiasY: -0.08,
    headPitch: -1.2,
    headYaw: 4.5,
    headRoll: -3.2,
    gesture: 'none',
  },
  talk: {
    mood: 'warm',
    speaking: true,
    holdMs: 2800,
    smile: 0.34,
    browRaise: 0.12,
    gazeBiasX: 0,
    gazeBiasY: 0.01,
    headPitch: 0.6,
    headYaw: 0,
    headRoll: 0.8,
    gesture: 'nod',
  },
  wave: {
    mood: 'warm',
    speaking: false,
    holdMs: 2200,
    smile: 0.55,
    browRaise: 0.22,
    gazeBiasX: 0.06,
    gazeBiasY: 0,
    headPitch: 1.8,
    headYaw: -3,
    headRoll: 4,
    gesture: 'wave',
  },
  glance: {
    mood: 'attentive',
    speaking: false,
    holdMs: 1600,
    smile: 0.1,
    browRaise: 0.08,
    gazeBiasX: 0.42,
    gazeBiasY: -0.05,
    headPitch: 0.4,
    headYaw: 11,
    headRoll: 1.5,
    gesture: 'glance',
  },
  gift_react: {
    mood: 'delighted',
    speaking: false,
    holdMs: 2600,
    smile: 0.72,
    browRaise: 0.36,
    gazeBiasX: 0,
    gazeBiasY: 0.04,
    headPitch: 3.2,
    headYaw: 0,
    headRoll: -2.4,
    gesture: 'gift',
  },
};

/** Co-host scheduler strings → runtime reactions. */
export function normalizeReaction(raw: string | null | undefined): AvatarReaction {
  if (!raw) return 'idle';
  const key = raw.trim().toLowerCase().replace(/-/g, '_');
  switch (key) {
    case 'talk':
    case 'speak':
    case 'speaking':
      return 'talk';
    case 'listen':
    case 'listening':
      return 'listen';
    case 'wave':
    case 'hello':
    case 'greet':
      return 'wave';
    case 'glance':
    case 'look':
      return 'glance';
    case 'gift_react':
    case 'gift':
    case 'react':
      return 'gift_react';
    case 'think':
    case 'thinking':
      return 'think';
    case 'idle':
    case 'rest':
      return 'idle';
    default:
      return 'idle';
  }
}
