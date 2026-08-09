import { describe, expect, it } from 'vitest';

import {
  assistantAvatarConfig,
  blinkAt,
  computeLiveAvatarFrame,
  speechVisemeAt,
} from './liveAvatarEngine';

describe('liveAvatarEngine', () => {
  it('produces stable breathing motion over time', () => {
    const a = computeLiveAvatarFrame(1000, assistantAvatarConfig('idle'));
    const b = computeLiveAvatarFrame(2000, assistantAvatarConfig('idle'));
    expect(a.breathScale).toBeGreaterThan(0.99);
    expect(a.breathScale).toBeLessThan(1.02);
    expect(b.breathScale).not.toBe(a.breathScale);
  });

  it('blinks in a repeating cycle', () => {
    const open = blinkAt(0);
    const mid = blinkAt(2700);
    expect(open).toBe(0);
    expect(mid).toBeGreaterThan(0.3);
  });

  it('drives mouth visemes when speaking', () => {
    const frame = computeLiveAvatarFrame(500, assistantAvatarConfig('speaking'));
    expect(frame.mouthOpen).toBeGreaterThan(0.2);
    expect(speechVisemeAt(500)).toBeGreaterThan(0.1);
  });

  it('shifts gaze upward while thinking', () => {
    const thinking = computeLiveAvatarFrame(1500, assistantAvatarConfig('thinking'));
    const idle = computeLiveAvatarFrame(1500, assistantAvatarConfig('idle'));
    expect(thinking.gazeY).toBeLessThan(idle.gazeY);
    expect(thinking.browRaise).toBeGreaterThan(idle.browRaise);
  });

  it('maps read-aloud to speaking configuration', () => {
    const config = assistantAvatarConfig('idle', true);
    expect(config.state).toBe('speaking');
    expect(config.expression).toBe('smile');
  });
});
