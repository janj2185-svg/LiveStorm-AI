import type { VisemeId } from "./types.js";
import { clamp } from "./math.js";

/** Rough grapheme → viseme map for Latin + Ukrainian/Cyrillic speech. */
const CHAR_VISEME: Record<string, VisemeId> = {
  " ": "sil",
  ".": "sil",
  ",": "sil",
  "!": "sil",
  "?": "sil",
  "-": "sil",
  a: "aa",
  а: "aa",
  e: "E",
  е: "E",
  є: "E",
  i: "I",
  і: "I",
  ї: "I",
  y: "I",
  и: "I",
  o: "O",
  о: "O",
  u: "U",
  у: "U",
  ю: "U",
  w: "U",
  b: "PP",
  p: "PP",
  m: "PP",
  б: "PP",
  п: "PP",
  м: "PP",
  f: "FF",
  v: "FF",
  ф: "FF",
  в: "FF",
  th: "TH",
  t: "DD",
  d: "DD",
  т: "DD",
  д: "DD",
  k: "kk",
  g: "kk",
  c: "kk",
  к: "kk",
  г: "kk",
  х: "kk",
  ch: "CH",
  j: "CH",
  ч: "CH",
  дж: "CH",
  s: "SS",
  z: "SS",
  sh: "SS",
  с: "SS",
  з: "SS",
  ш: "SS",
  щ: "SS",
  n: "nn",
  l: "nn",
  н: "nn",
  л: "nn",
  r: "RR",
  р: "RR",
  я: "aa",
  ё: "O",
};

const VISEME_JAW: Record<VisemeId, number> = {
  sil: 0,
  PP: 0.05,
  FF: 0.12,
  TH: 0.18,
  DD: 0.22,
  kk: 0.2,
  CH: 0.25,
  SS: 0.15,
  nn: 0.12,
  RR: 0.2,
  aa: 0.72,
  E: 0.45,
  I: 0.28,
  O: 0.58,
  U: 0.4,
};

export interface VisemeFrame {
  viseme: VisemeId;
  weight: number;
  jawOpen: number;
}

/**
 * Build a timed viseme track from plain text. Used when real audio analysis
 * is unavailable so the mouth still moves like a speaking person.
 */
export function buildVisemeTrack(
  text: string,
  charsPerSecond = 14,
): { duration: number; sample: (t: number) => VisemeFrame } {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      duration: 0,
      sample: () => ({ viseme: "sil", weight: 0, jawOpen: 0 }),
    };
  }

  const frames: { t: number; viseme: VisemeId }[] = [];
  let t = 0;
  const dt = 1 / Math.max(6, charsPerSecond);
  const lower = cleaned.toLowerCase();

  for (let i = 0; i < lower.length; i += 1) {
    const digraph = lower.slice(i, i + 2);
    let viseme: VisemeId | undefined = CHAR_VISEME[digraph];
    let advance = 1;
    if (viseme) {
      advance = 2;
    } else {
      viseme = CHAR_VISEME[lower[i]] ?? "DD";
    }
    frames.push({ t, viseme });
    t += dt * advance;
    // tiny micro-pause on punctuation
    if (/[.!?,;:]/.test(lower[i])) t += dt * 2;
    i += advance - 1;
  }

  const duration = t + 0.12;

  return {
    duration,
    sample(at: number): VisemeFrame {
      if (at < 0 || at > duration || frames.length === 0) {
        return { viseme: "sil", weight: 0, jawOpen: 0 };
      }
      let current = frames[0];
      for (const frame of frames) {
        if (frame.t <= at) current = frame;
        else break;
      }
      // soften into silence near the end
      const tail = clamp(1 - (at - (duration - 0.15)) / 0.15, 0, 1);
      const weight = at < 0.04 ? at / 0.04 : tail;
      const jaw = VISEME_JAW[current.viseme] * weight;
      return { viseme: current.viseme, weight, jawOpen: jaw };
    },
  };
}
