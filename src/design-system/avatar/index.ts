export { LivingAvatar, type LivingAvatarProps } from './LivingAvatar';
export {
  LIRA_PERSONA,
  EXPRESSION_FILES,
  expressionUrl,
  expressionForReaction,
  type AvatarReaction,
  type ExpressionKey,
} from './persona';
export {
  samplePose,
  blinkAmount,
  reactionDurationMs,
  nextIdleReaction,
  type AvatarPose,
} from './livingAvatarEngine';
export { useLivingAvatar, type LivingAvatarController } from './useLivingAvatar';
export {
  LivingAvatarBus,
  livingAvatarBus,
  normalizeAvatarReaction,
  type AvatarReactionHandler,
} from './avatarBus';

