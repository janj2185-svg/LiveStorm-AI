import { describe, expect, it } from 'vitest';

import { LIORA_PERSONA } from './persona';
import {
  PhysiologyEngine,
  expectedBlinkIntervalSec,
  reactionProfile,
} from './physiology';

describe('reactionProfile', () => {
  it('marks talk as speaking with mouth bias', () => {
    const profile = reactionProfile('talk');
    expect(profile.speaking).toBe(true);
    expect(profile.base.speak ?? 0).toBeGreaterThan(0.4);
  });

  it('maps gift_react to a nod gesture', () => {
    expect(reactionProfile('gift_react').gesture).toBe('nod');
  });

  it('maps wave to a wave gesture and smile', () => {
    const profile = reactionProfile('wave');
    expect(profile.gesture).toBe('wave');
    expect(profile.smileBias).toBeGreaterThan(0.5);
  });
});

describe('PhysiologyEngine', () => {
  it('starts in idle with human breath and open eyes', () => {
    const engine = new PhysiologyEngine(LIORA_PERSONA);
    const sample = engine.sample({ nowMs: 1_000, reducedMotion: false });
    expect(sample.reaction).toBe('idle');
    expect(sample.blink).toBeGreaterThanOrEqual(0);
    expect(sample.blink).toBeLessThan(1);
    expect(sample.breath).toBeGreaterThan(0);
    expect(sample.breath).toBeLessThanOrEqual(1);
    const weightSum = Object.values(sample.weights).reduce((a, b) => a + b, 0);
    expect(weightSum).toBeCloseTo(1, 5);
  });

  it('transitions to listen weights after setReaction', () => {
    const engine = new PhysiologyEngine(LIORA_PERSONA);
    engine.setReaction('listen', 2);
    const sample = engine.sample({ nowMs: 2_800 });
    expect(sample.reaction).toBe('listen');
    expect(sample.weights.listen).toBeGreaterThan(sample.weights.speak);
  });

  it('opens the mouth while talking without external audio', () => {
    const engine = new PhysiologyEngine(LIORA_PERSONA);
    engine.setReaction('talk', 1);
    const sample = engine.sample({ nowMs: 1_500 });
    expect(sample.mouthOpen).toBeGreaterThan(0.1);
    expect(sample.weights.speak).toBeGreaterThan(0.2);
  });

  it('follows external audioLevel for lip-sync', () => {
    const engine = new PhysiologyEngine(LIORA_PERSONA);
    engine.setReaction('talk', 0.5);
    const quiet = engine.sample({ nowMs: 800, audioLevel: 0.05 });
    const loud = engine.sample({ nowMs: 820, audioLevel: 0.9 });
    expect(loud.mouthOpen).toBeGreaterThan(quiet.mouthOpen);
  });

  it('respects reduced motion by freezing pose', () => {
    const engine = new PhysiologyEngine(LIORA_PERSONA);
    engine.setReaction('wave', 1);
    const sample = engine.sample({ nowMs: 1_200, reducedMotion: true });
    expect(sample.headYaw).toBe(0);
    expect(sample.headPitch).toBe(0);
    expect(sample.blink).toBe(0);
  });

  it('fires gift_react nod pitch over the gesture window', () => {
    const engine = new PhysiologyEngine(LIORA_PERSONA);
    engine.setReaction('gift_react', 3);
    const mid = engine.sample({ nowMs: 3_450 });
    expect(Math.abs(mid.headPitch)).toBeGreaterThan(1);
  });
});

describe('expectedBlinkIntervalSec', () => {
  it('centres near one minute divided by blink rate', () => {
    const mid = expectedBlinkIntervalSec(15, 0.5);
    expect(mid).toBeCloseTo(4, 5);
  });
});
