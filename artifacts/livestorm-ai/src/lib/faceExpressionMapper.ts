import type { AnimationState } from "@/components/avatar/avatarAnimationMachine";

export type FaceExpression = "neutral" | "smile" | "talking" | "surprised" | "focused";

export interface FaceTrackingData {
  faceDetected: boolean;
  confidence: number;
  expression: FaceExpression;
  mouthOpenValue: number;
  blinkLeft: number;
  blinkRight: number;
  avatarState: AnimationState;
}

const JAW_OPEN_TALKING  = 0.20;
const SMILE_THRESHOLD   = 0.28;
const SURPRISED_BROW    = 0.42;
const FOCUSED_BROW      = 0.28;

export function mapBlendshapesToExpression(
  shapes: Record<string, number>,
): FaceTrackingData {
  const jawOpen    = shapes["jawOpen"]          ?? 0;
  const smileLeft  = shapes["mouthSmileLeft"]   ?? 0;
  const smileRight = shapes["mouthSmileRight"]  ?? 0;
  const smile      = (smileLeft + smileRight) / 2;
  const browUp     = shapes["browInnerUp"]      ?? 0;
  const browDownL  = shapes["browDownLeft"]     ?? 0;
  const browDownR  = shapes["browDownRight"]    ?? 0;
  const browDown   = (browDownL + browDownR) / 2;
  const blinkLeft  = shapes["eyeBlinkLeft"]     ?? 0;
  const blinkRight = shapes["eyeBlinkRight"]    ?? 0;

  let expression: FaceExpression = "neutral";
  if (jawOpen > JAW_OPEN_TALKING) {
    expression = "talking";
  } else if (browUp > SURPRISED_BROW) {
    expression = "surprised";
  } else if (smile > SMILE_THRESHOLD) {
    expression = "smile";
  } else if (browDown > FOCUSED_BROW) {
    expression = "focused";
  }

  const avatarState: AnimationState =
    expression === "talking"   ? "talking"   :
    expression === "surprised" ? "surprised" :
    expression === "smile"     ? "happy"     :
    expression === "focused"   ? "thinking"  :
    "idle";

  return {
    faceDetected: true,
    confidence: 0,
    expression,
    mouthOpenValue: Math.min(1, jawOpen * 1.4),
    blinkLeft,
    blinkRight,
    avatarState,
  };
}
