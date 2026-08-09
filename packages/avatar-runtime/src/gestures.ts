import type { ReactionProfile } from './reactions.js';

export interface GestureSample {
  shoulder: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  progress: number;
}

/**
 * Choreograph upper-body social gestures. These are subtle — broadcast avatars
 * that flail read as puppets. The wave is a shoulder lift + micro head bow,
 * not a full arm swing (the portrait framing is chest-up).
 */
export function sampleGesture(
  kind: ReactionProfile['gesture'],
  ageMs: number,
  holdMs: number,
): GestureSample {
  const progress = holdMs === Number.POSITIVE_INFINITY ? 0 : clamp(ageMs / Math.max(holdMs, 1), 0, 1);

  if (kind === 'none') {
    return { shoulder: 0, headPitch: 0, headYaw: 0, headRoll: 0, progress };
  }

  if (kind === 'wave') {
    const envelope = envelopePulse(progress, 0.15, 0.85);
    const swing = Math.sin(progress * Math.PI * 4) * envelope;
    return {
      shoulder: 0.55 * envelope + swing * 0.18,
      headPitch: 1.2 * envelope,
      headYaw: -2.4 * envelope + swing * 1.1,
      headRoll: 3.2 * envelope,
      progress,
    };
  }

  if (kind === 'nod') {
    const nods = Math.sin(progress * Math.PI * 2.2) * envelopePulse(progress, 0.05, 0.9);
    return {
      shoulder: 0.08 * Math.abs(nods),
      headPitch: nods * 2.8,
      headYaw: 0,
      headRoll: nods * 0.4,
      progress,
    };
  }

  if (kind === 'glance') {
    const envelope = envelopePulse(progress, 0.08, 0.92);
    return {
      shoulder: 0.04 * envelope,
      headPitch: 0.3 * envelope,
      headYaw: 8 * envelope,
      headRoll: 1.2 * envelope,
      progress,
    };
  }

  // gift
  const envelope = envelopePulse(progress, 0.1, 0.88);
  const bounce = Math.sin(progress * Math.PI * 3) * envelope;
  return {
    shoulder: 0.28 * envelope,
    headPitch: 2.4 * envelope + bounce * 1.4,
    headYaw: bounce * 1.2,
    headRoll: -2.1 * envelope,
    progress,
  };
}

function envelopePulse(progress: number, attack: number, release: number): number {
  if (progress < attack) return progress / attack;
  if (progress > release) return Math.max(0, 1 - (progress - release) / (1 - release));
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
