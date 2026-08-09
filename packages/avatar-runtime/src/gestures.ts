import type { AvatarEmotion, AvatarReaction, ExpressionWeights, HeadPose } from "./types.js";
import { clamp, lerp, normalizeWeights, smoothstep } from "./math.js";

export interface GestureSample {
  head: HeadPose;
  emotion: AvatarEmotion;
  expressions: ExpressionWeights;
  mouthSmile: number;
  gestureProgress: number;
  done: boolean;
}

const EMPTY_EXPR: ExpressionWeights = {
  neutral: 1,
  smile: 0,
  listen: 0,
  talk: 0,
  gift: 0,
};

function expr( partial: Partial<ExpressionWeights>): ExpressionWeights {
  return normalizeWeights({ ...EMPTY_EXPR, ...partial, neutral: partial.neutral ?? 0.05 });
}

/**
 * Discrete human gestures keyed to co-host AvatarController reactions.
 * Curves are authored to feel like soft living motion, not robotic snaps.
 */
export function sampleGesture(
  reaction: AvatarReaction,
  elapsed: number,
  duration: number,
): GestureSample {
  const u = duration <= 0 ? 1 : clamp(elapsed / duration, 0, 1);
  const ease = smoothstep(0, 0.2, u) * (1 - smoothstep(0.75, 1, u));
  const done = u >= 1;

  switch (reaction) {
    case "nod": {
      const pitch = Math.sin(u * Math.PI * 2) * 7 * (1 - Math.abs(u - 0.5) * 0.4);
      return {
        head: { yaw: 0, pitch, roll: 0 },
        emotion: "warm",
        expressions: expr({ smile: 0.35 * ease, neutral: 0.65 }),
        mouthSmile: 0.25 * ease,
        gestureProgress: u,
        done,
      };
    }
    case "wave": {
      const yaw = Math.sin(u * Math.PI * 2.2) * 10 * ease;
      const roll = Math.sin(u * Math.PI * 2.2) * 4 * ease;
      return {
        head: { yaw, pitch: -2 * ease, roll },
        emotion: "warm",
        expressions: expr({ smile: 0.55 * ease, neutral: 0.45 }),
        mouthSmile: 0.45 * ease,
        gestureProgress: u,
        done,
      };
    }
    case "glance": {
      const yaw = Math.sin(smoothstep(0, 1, u) * Math.PI) * 14;
      return {
        head: { yaw, pitch: 1.5 * ease, roll: yaw * 0.08 },
        emotion: "attentive",
        expressions: expr({ listen: 0.7 * ease, neutral: 0.3 }),
        mouthSmile: 0.05,
        gestureProgress: u,
        done,
      };
    }
    case "gift_react": {
      const pitch = -3 * ease + Math.sin(u * Math.PI) * 2;
      return {
        head: { yaw: Math.sin(u * Math.PI) * 3, pitch, roll: 0 },
        emotion: "delighted",
        expressions: expr({ gift: 0.75 * ease, smile: 0.25 * ease }),
        mouthSmile: 0.7 * ease,
        gestureProgress: u,
        done,
      };
    }
    case "listen": {
      return {
        head: { yaw: -4 * ease, pitch: 2 * ease, roll: -1 * ease },
        emotion: "attentive",
        expressions: expr({ listen: 0.85, neutral: 0.15 }),
        mouthSmile: 0.08,
        gestureProgress: u,
        done,
      };
    }
    case "talk": {
      return {
        head: { yaw: Math.sin(u * Math.PI * 1.3) * 2, pitch: -1, roll: 0 },
        emotion: "speaking",
        expressions: expr({ talk: 0.7, smile: 0.15, neutral: 0.15 }),
        mouthSmile: 0.2,
        gestureProgress: u,
        done,
      };
    }
    case "think": {
      return {
        head: { yaw: 6 * ease, pitch: 4 * ease, roll: 2 * ease },
        emotion: "thoughtful",
        expressions: expr({ listen: 0.4, neutral: 0.6 }),
        mouthSmile: 0,
        gestureProgress: u,
        done,
      };
    }
    case "smile": {
      return {
        head: { yaw: 0, pitch: -1.5 * ease, roll: 0 },
        emotion: "warm",
        expressions: expr({ smile: 0.9 * ease, neutral: 0.1 }),
        mouthSmile: 0.65 * ease,
        gestureProgress: u,
        done,
      };
    }
    case "idle":
    default:
      return {
        head: { yaw: 0, pitch: 0, roll: 0 },
        emotion: "neutral",
        expressions: expr({ neutral: 1 }),
        mouthSmile: 0,
        gestureProgress: 1,
        done: true,
      };
  }
}

export function gestureDuration(reaction: AvatarReaction): number {
  switch (reaction) {
    case "nod":
      return 1.05;
    case "wave":
      return 1.6;
    case "glance":
      return 1.35;
    case "gift_react":
      return 1.8;
    case "listen":
      return 2.4;
    case "talk":
      return 0; // held while speaking
    case "think":
      return 2.2;
    case "smile":
      return 1.4;
    default:
      return 0;
  }
}

export function blendHead(a: HeadPose, b: HeadPose, t: number): HeadPose {
  return {
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    roll: lerp(a.roll, b.roll, t),
  };
}

export function blendExpressions(
  a: ExpressionWeights,
  b: ExpressionWeights,
  t: number,
): ExpressionWeights {
  return normalizeWeights({
    neutral: lerp(a.neutral, b.neutral, t),
    smile: lerp(a.smile, b.smile, t),
    listen: lerp(a.listen, b.listen, t),
    talk: lerp(a.talk, b.talk, t),
    gift: lerp(a.gift, b.gift, t),
  });
}

/** Map co-host decision reaction strings onto the typed reaction set. */
export function normalizeReaction(raw: string | null | undefined): AvatarReaction {
  if (!raw) return "idle";
  const key = raw.trim().toLowerCase();
  const allowed: AvatarReaction[] = [
    "idle",
    "listen",
    "talk",
    "wave",
    "nod",
    "glance",
    "gift_react",
    "think",
    "smile",
  ];
  return (allowed.find((r) => r === key) ?? "idle") as AvatarReaction;
}
