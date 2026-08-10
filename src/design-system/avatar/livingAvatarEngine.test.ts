import { describe, expect, it } from 'vitest';

import {
  blinkAmount,
  nextIdleReaction,
  reactionDurationMs,
  samplePose,
} from './livingAvatarEngine';
import { expressionForReaction } from './persona';

describe('livingAvatarEngine', () => {
  it('maps co-host reactions onto expression plates', () => {
    expect(expressionForReaction('talk')).toBe('speak');
    expect(expressionForReaction('gift_react')).toBe('smile');
    expect(expressionForReaction('wave')).toBe('wave');
    expect(expressionForReaction('listen')).toBe('listen');
  });

  it('produces a settled reduced-motion pose without ambient sway', () => {
    const pose = samplePose(12_000, 'talk', 11_000, { reducedMotion: true });
    expect(pose.headYaw).toBe(0);
    expect(pose.headRoll).toBe(0);
    expect(pose.blink).toBe(0);
    expect(pose.lipOpen).toBeGreaterThan(0);
    expect(pose.expression).toBe('speak');
  });

  it('drives lip openness while talking', () => {
    const a = samplePose(1000, 'talk', 0);
    const b = samplePose(1080, 'talk', 0);
    expect(a.lipOpen).toBeGreaterThan(0);
    expect(b.expression).toBe('speak');
    expect(a.expressionMix).toBeGreaterThan(0.4);
  });

  it('respects external audio level for lip sync', () => {
    const pose = samplePose(2000, 'talk', 0, { audioLevel: 0.8 });
    expect(pose.lipOpen).toBeGreaterThan(0.7);
  });

  it('blinks fully closed somewhere in a long window', () => {
    let sawClosed = false;
    for (let t = 0; t < 20_000; t += 16) {
      if (blinkAmount(t) > 0.95) {
        sawClosed = true;
        break;
      }
    }
    expect(sawClosed).toBe(true);
  });

  it('nods with changing pitch over the gesture window', () => {
    const start = samplePose(0, 'nod', 0);
    const mid = samplePose(400, 'nod', 0);
    expect(reactionDurationMs('nod')).toBe(1200);
    expect(Math.abs(mid.headPitch - start.headPitch)).toBeGreaterThan(0.5);
  });

  it('rotates sparse ambient life', () => {
    expect(nextIdleReaction(0)).toBe('idle');
    expect(nextIdleReaction(9000)).toBe('glance');
    expect(nextIdleReaction(27_000)).toBe('smile');
  });
});
