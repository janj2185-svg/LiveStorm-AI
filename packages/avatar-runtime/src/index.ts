export type {
  AvatarEmotion,
  AvatarPose,
  AvatarReaction,
  ExpressionWeights,
  GazeTarget,
  HeadPose,
  LifeEngineOptions,
  PersonaProfile,
  SpeakOptions,
  VisemeId,
} from "./types.js";

export { LIORA_PERSONA, PERSONAS } from "./persona.js";
export { AvatarLifeEngine } from "./engine.js";
export { normalizeReaction, gestureDuration, sampleGesture } from "./gestures.js";
export { buildVisemeTrack } from "./visemes.js";
export { createRng, clamp, lerp, smoothstep } from "./math.js";
