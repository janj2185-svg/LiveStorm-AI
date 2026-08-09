/**
 * Living avatar pose + reaction contracts for SYLORA AI Co-Host.
 *
 * The runtime simulates continuous human micro-behaviour (breath, blink,
 * saccades, micro-expressions) and maps co-host dialogue reactions onto
 * gesture / emotion timelines that a renderer can drive.
 */

export type AvatarReaction =
  | "idle"
  | "listen"
  | "talk"
  | "wave"
  | "nod"
  | "glance"
  | "gift_react"
  | "think"
  | "smile";

export type AvatarEmotion =
  | "neutral"
  | "warm"
  | "attentive"
  | "delighted"
  | "thoughtful"
  | "speaking";

/** ARKit-inspired viseme ids used for lip sync. */
export type VisemeId =
  | "sil"
  | "PP"
  | "FF"
  | "TH"
  | "DD"
  | "kk"
  | "CH"
  | "SS"
  | "nn"
  | "RR"
  | "aa"
  | "E"
  | "I"
  | "O"
  | "U";

export interface GazeTarget {
  /** -1 left … +1 right */
  x: number;
  /** -1 down … +1 up */
  y: number;
}

export interface HeadPose {
  /** degrees */
  yaw: number;
  pitch: number;
  roll: number;
}

export interface ExpressionWeights {
  neutral: number;
  smile: number;
  listen: number;
  talk: number;
  gift: number;
}

export interface AvatarPose {
  /** monotonic simulation time in seconds */
  time: number;
  reaction: AvatarReaction;
  emotion: AvatarEmotion;
  head: HeadPose;
  gaze: GazeTarget;
  /** 0 closed … 1 open (per eye) */
  blinkL: number;
  blinkR: number;
  /** 0 rest … 1 inhale peak */
  breath: number;
  /** 0..1 mouth openness for speech */
  jawOpen: number;
  /** 0..1 smile pull */
  mouthSmile: number;
  /** active viseme + weight */
  viseme: VisemeId;
  visemeWeight: number;
  /** torso / shoulder micro-sway in degrees */
  shoulderRoll: number;
  /** crossfade weights for photoreal expression plates */
  expressions: ExpressionWeights;
  /** gesture progress 0..1 while a discrete gesture plays */
  gestureProgress: number;
  gestureName: AvatarReaction | null;
}

export interface PersonaProfile {
  id: string;
  displayName: string;
  pronouns: "she/her" | "he/him" | "they/them";
  genderPresentation: "feminine" | "masculine" | "androgynous";
  voiceHint: string;
  defaultEmotion: AvatarEmotion;
  blinkIntervalSec: [number, number];
  breathRateHz: number;
  gazeHoldSec: [number, number];
  microMotionScale: number;
}

export interface LifeEngineOptions {
  persona?: PersonaProfile;
  seed?: number;
  /** when true, prefer looking at the camera */
  cameraEngaged?: boolean;
}

export interface SpeakOptions {
  text: string;
  /** approximate speech rate in characters per second */
  charsPerSecond?: number;
  emotion?: AvatarEmotion;
}
