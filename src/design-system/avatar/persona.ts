/**
 * Sylora — living AI companion visual identity.
 *
 * Photoreal expression plates share one locked camera so motion reads as life,
 * not as a cut between different people. Pose-changing plates (wave/nod) are
 * hard-cut in LivingAvatar to avoid a shattered double-face.
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

export const SYLORA_PERSONA = {
  id: 'sylora',
  name: 'Sylora',
  role: 'Personal AI',
  presenceLine: 'Я поруч · жива · в зборі',
  assetBase: '/avatars/lira',
} as const;

/** @deprecated use SYLORA_PERSONA */
export const LIRA_PERSONA = SYLORA_PERSONA;

/** Plates that change shoulder/pose — never crossfade with neutral. */
export const POSE_CHANGE_EXPRESSIONS: ReadonlySet<ExpressionKey> = new Set(['wave', 'nod']);

export const EXPRESSION_FILES: Record<ExpressionKey, string> = {
  neutral: 'sylora-avatar-neutral.webp',
  listen: 'sylora-avatar-listen.webp',
  speak: 'sylora-avatar-speak.webp',
  smile: 'sylora-avatar-smile.webp',
  nod: 'sylora-avatar-nod.webp',
  wave: 'sylora-avatar-wave.webp',
};

export function expressionUrl(key: ExpressionKey): string {
  return `${SYLORA_PERSONA.assetBase}/${EXPRESSION_FILES[key]}`;
}

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
