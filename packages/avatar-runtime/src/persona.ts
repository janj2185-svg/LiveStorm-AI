import type { PersonaProfile } from "./types.js";

/** Default female AI co-host persona for SYLORA. */
export const LIORA_PERSONA: PersonaProfile = {
  id: "liora",
  displayName: "Liora",
  pronouns: "she/her",
  genderPresentation: "feminine",
  voiceHint: "Warm mid-alto, clear studio diction, gentle pacing",
  defaultEmotion: "warm",
  blinkIntervalSec: [2.4, 5.8],
  breathRateHz: 0.22,
  gazeHoldSec: [1.2, 3.6],
  microMotionScale: 1,
};

export const PERSONAS: Record<string, PersonaProfile> = {
  liora: LIORA_PERSONA,
};
