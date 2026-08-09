export type {
  AvatarFrame,
  AvatarLifeState,
  AvatarMood,
  AvatarPose,
  AvatarReaction,
  AvatarReactionEvent,
  FrameWeights,
} from './types.js';
export { DEFAULT_FRAMES, DEFAULT_POSE } from './types.js';
export { AvatarLifeController, type AvatarLifeOptions } from './controller.js';
export { normalizeReaction, REACTION_PROFILES } from './reactions.js';
export { composeFrameWeights, dominantFrame } from './expressions.js';
export {
  mouthOpenFromIntensity,
  speechIntensityFromAudio,
  speechIntensityFromText,
} from './speech.js';
export { sampleGesture } from './gestures.js';
