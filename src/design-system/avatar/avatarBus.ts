/**
 * Browser-side AvatarController compatible with co-host reaction names
 * (`listen`, `talk`, `wave`, `glance`, `gift_react`, …).
 *
 * The FastAPI co-host orchestrator calls `AvatarController.react(...)`.
 * This adapter mirrors that contract in the design-system gallery / OBS
 * browser source so the living avatar can be driven by the same strings.
 */

import type { AvatarReaction } from './persona';

const KNOWN: ReadonlySet<string> = new Set([
  'idle',
  'listen',
  'talk',
  'wave',
  'nod',
  'glance',
  'gift_react',
  'think',
  'smile',
]);

export function normalizeAvatarReaction(reaction: string): AvatarReaction {
  if (KNOWN.has(reaction)) return reaction as AvatarReaction;
  return 'idle';
}

export type AvatarReactionHandler = (
  reaction: AvatarReaction,
  meta?: { syncToken?: string | null },
) => void;

/**
 * Tiny pub/sub so a co-host WS fan-out (or demo controls) can drive every
 * mounted LivingAvatar without prop drilling through the shell.
 */
export class LivingAvatarBus {
  private listeners = new Set<AvatarReactionHandler>();
  private last: { reaction: AvatarReaction; syncToken?: string | null } = {
    reaction: 'idle',
  };

  subscribe(handler: AvatarReactionHandler): () => void {
    this.listeners.add(handler);
    handler(this.last.reaction, { syncToken: this.last.syncToken });
    return () => {
      this.listeners.delete(handler);
    };
  }

  async react(reaction: string, options: { syncToken?: string | null } = {}): Promise<void> {
    const normalized = normalizeAvatarReaction(reaction);
    this.last = { reaction: normalized, syncToken: options.syncToken ?? null };
    for (const listener of this.listeners) {
      listener(normalized, { syncToken: options.syncToken ?? null });
    }
  }
}

/** Process-wide bus used by the gallery and future OBS browser source. */
export const livingAvatarBus = new LivingAvatarBus();
