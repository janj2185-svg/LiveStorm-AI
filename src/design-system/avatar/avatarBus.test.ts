import { describe, expect, it, vi } from 'vitest';

import { LivingAvatarBus, normalizeAvatarReaction } from './avatarBus';

describe('livingAvatarBus', () => {
  it('normalizes unknown reactions to idle', () => {
    expect(normalizeAvatarReaction('talk')).toBe('talk');
    expect(normalizeAvatarReaction('explode')).toBe('idle');
  });

  it('fans out react() to subscribers', async () => {
    const bus = new LivingAvatarBus();
    const seen: string[] = [];
    const unsubscribe = bus.subscribe((reaction) => {
      seen.push(reaction);
    });
    expect(seen).toEqual(['idle']);
    await bus.react('wave', { syncToken: 's1' });
    await bus.react('gift_react');
    expect(seen).toEqual(['idle', 'wave', 'gift_react']);
    unsubscribe();
    await bus.react('talk');
    expect(seen).toEqual(['idle', 'wave', 'gift_react']);
  });
});
