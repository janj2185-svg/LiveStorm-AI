/** Deterministic mulberry32 PRNG for reproducible idle life. */
export function createRng(seed = 1): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function pickRange(rng: () => number, range: [number, number]): number {
  return range[0] + rng() * (range[1] - range[0]);
}

/** Soft normalize expression weights so they sum to 1. */
export function normalizeWeights<T extends Record<string, number>>(weights: T): T {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const out = { ...weights };
  for (const key of Object.keys(out) as (keyof T)[]) {
    out[key] = (out[key] as number) / sum as T[keyof T];
  }
  return out;
}
