/**
 * Browser bridge for co-host avatar reactions.
 * ---------------------------------------------------------------------------
 * The API `AvatarController` speaks reaction strings. The living avatar listens
 * on this tiny event target so studio / OBS / assistant surfaces stay in sync
 * without importing the FastAPI process into the browser.
 */

import type { AvatarReaction } from './persona';

export type AvatarBridgeEventMap = {
  reaction: AvatarReaction;
  audioLevel: number;
};

type Handler<K extends keyof AvatarBridgeEventMap> = (value: AvatarBridgeEventMap[K]) => void;

class LivingAvatarBridge {
  private readonly listeners: {
    [K in keyof AvatarBridgeEventMap]: Set<Handler<K>>;
  } = {
    reaction: new Set(),
    audioLevel: new Set(),
  };

  private reaction: AvatarReaction = 'idle';
  private audioLevel = 0;

  getReaction(): AvatarReaction {
    return this.reaction;
  }

  getAudioLevel(): number {
    return this.audioLevel;
  }

  setReaction(reaction: AvatarReaction): void {
    this.reaction = reaction;
    for (const handler of this.listeners.reaction) handler(reaction);
  }

  setAudioLevel(level: number): void {
    this.audioLevel = Math.min(1, Math.max(0, level));
    for (const handler of this.listeners.audioLevel) handler(this.audioLevel);
  }

  on<K extends keyof AvatarBridgeEventMap>(event: K, handler: Handler<K>): () => void {
    this.listeners[event].add(handler);
    return () => this.listeners[event].delete(handler);
  }
}

/** Process-wide bridge — one living presence per web runtime. */
export const livingAvatarBridge = new LivingAvatarBridge();
