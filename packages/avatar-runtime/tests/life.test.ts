import { describe, expect, it } from 'vitest';

import { AvatarLifeController } from '../src/controller.js';
import { composeFrameWeights, dominantFrame } from '../src/expressions.js';
import { normalizeReaction } from '../src/reactions.js';
import { speechIntensityFromText } from '../src/speech.js';

function fixedRandom(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length] ?? 0.5;
    i += 1;
    return value;
  };
}

describe('normalizeReaction', () => {
  it('maps co-host scheduler tokens', () => {
    expect(normalizeReaction('talk')).toBe('talk');
    expect(normalizeReaction('gift_react')).toBe('gift_react');
    expect(normalizeReaction('Gift-React')).toBe('gift_react');
    expect(normalizeReaction('unknown')).toBe('idle');
  });
});

describe('AvatarLifeController', () => {
  it('keeps the face alive while idle — blink eventually closes', () => {
    const life = new AvatarLifeController({
      random: fixedRandom([0.9, 0.1, 0.5, 0.5, 0.5]),
    });
    let sawBlink = false;
    for (let t = 0; t < 8000; t += 16) {
      const state = life.tick(t);
      if (state.pose.blink > 0.5) sawBlink = true;
    }
    expect(sawBlink).toBe(true);
  });

  it('enters talk with warm/speak frames and returns to idle after hold', () => {
    const life = new AvatarLifeController({ random: () => 0.5 });
    life.react({
      reaction: 'talk',
      utterance: 'Привіт, я з тобою на стрімі.',
      syncToken: 'sync-1',
      at: 0,
    });
    const speaking = life.tick(120);
    expect(speaking.reaction).toBe('talk');
    expect(speaking.speaking).toBe(true);
    expect(speaking.syncToken).toBe('sync-1');
    expect(speaking.frames.speak + speaking.frames.warm).toBeGreaterThan(0.35);

    const after = life.tick(3200);
    expect(after.reaction).toBe('idle');
    expect(after.speaking).toBe(false);
  });

  it('plays wave then settles', () => {
    const life = new AvatarLifeController({ random: () => 0.4 });
    life.react({ reaction: 'wave', at: 0 });
    let mid = life.tick(0);
    for (let t = 16; t <= 900; t += 16) {
      mid = life.tick(t);
    }
    expect(mid.reaction).toBe('wave');
    expect(mid.pose.shoulder).toBeGreaterThan(0.1);
    expect(mid.pose.smile).toBeGreaterThan(0.2);
  });
});

describe('expression composite', () => {
  it('blink dominates when eyelids close', () => {
    const weights = composeFrameWeights({
      mood: 'warm',
      smile: 0.5,
      mouthOpen: 0.4,
      blink: 1,
      speaking: true,
    });
    expect(dominantFrame(weights)).toBe('blink');
    expect(weights.blink).toBe(1);
  });
});

describe('speech intensity', () => {
  it('opens more on vowels than on pauses', () => {
    const vowel = speechIntensityFromText('aaaa', 10, true);
    const pause = speechIntensityFromText('a...', 200, true);
    expect(vowel).toBeGreaterThan(pause);
  });
});
