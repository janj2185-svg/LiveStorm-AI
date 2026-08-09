/**
 * Lira — SYLORA's living AI assistant persona.
 *
 * Photoreal expression plates are authored as stills and driven by the living
 * avatar engine (blink, breath, gaze, lip cadence, gesture reactions). The
 * plates share one identity so crossfades read as muscle change, not as a cut.
 */

export type ExpressionKey = 'neutral' | 'listen' | 'speak' | 'smile' | 'nod' | 'wave';

/** Reactions accepted by the co-host AvatarController contract. */
export type AvatarReaction =
  | 'idle'
  | 'listen'
  | 'talk'
  | 'wave'
  | 'nod'
  | 'glance'
  | 'gift_react'
  | 'think'
  | 'smile';

export const LIRA_PERSONA = {
  id: 'lira',
  name: 'Lira',
  role: 'SYLORA Assistant',
  /** Short Ukrainian display line used on the presence stage. */
  presenceLine: 'Живий аватар · природна міміка',
  assetBase: '/avatars/lira',
} as const;

export const EXPRESSION_FILES: Record<ExpressionKey, string> = {
  neutral: 'sylora-avatar-neutral.webp',
  listen: 'sylora-avatar-listen.webp',
  speak: 'sylora-avatar-speak.webp',
  smile: 'sylora-avatar-smile.webp',
  nod: 'sylora-avatar-nod.webp',
  wave: 'sylora-avatar-wave.webp',
};

export function expressionUrl(key: ExpressionKey): string {
  return `${LIRA_PERSONA.assetBase}/${EXPRESSION_FILES[key]}`;
}

/** Map a co-host / UI reaction onto the expression plate that should dominate. */
export function expressionForReaction(reaction: AvatarReaction): ExpressionKey {
  switch (reaction) {
    case 'listen':
      return 'listen';
    case 'talk':
      return 'speak';
    case 'wave':
      return 'wave';
    case 'nod':
      return 'nod';
    case 'gift_react':
    case 'smile':
      return 'smile';
    case 'glance':
      return 'listen';
    case 'think':
      return 'neutral';
    case 'idle':
    default:
      return 'neutral';
  }
}
