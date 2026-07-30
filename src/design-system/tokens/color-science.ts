/**
 * Colour science shared by the token definitions and the token compiler.
 * ---------------------------------------------------------------------------
 * Kept in one place so the ramp generator and the audit can never disagree
 * about what a colour actually renders as.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** OKLCH -> OKLab -> LMS -> linear sRGB. Values may fall outside [0,1]. */
export function oklchToLinearSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const lCone = l + 0.3963377774 * a + 0.2158037573 * b;
  const mCone = l - 0.1055613458 * a - 0.0638541728 * b;
  const sCone = l - 0.0894841775 * a - 1.291485548 * b;

  const lc = lCone ** 3;
  const mc = mCone ** 3;
  const sc = sCone ** 3;

  return {
    r: 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    g: -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    b: -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  };
}

export function inGamut({ r, g, b }: Rgb, epsilon = 0.0001): boolean {
  return (
    r >= -epsilon && r <= 1 + epsilon && g >= -epsilon && g <= 1 + epsilon && b >= -epsilon && b <= 1 + epsilon
  );
}

/**
 * Map an out-of-gamut colour by reducing chroma while holding lightness and
 * hue. Perceptually the colour becomes less saturated rather than shifting
 * hue, which is what naive per-channel clipping produces.
 */
export function gamutMap(l: number, c: number, h: number): Rgb {
  let candidate = oklchToLinearSrgb(l, c, h);
  if (inGamut(candidate)) return candidate;

  let low = 0;
  let high = c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    candidate = oklchToLinearSrgb(l, mid, h);
    if (inGamut(candidate)) low = mid;
    else high = mid;
  }
  return oklchToLinearSrgb(l, low, h);
}

const encodeGamma = (value: number): number => {
  const v = Math.min(1, Math.max(0, value));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

export function oklchToHex(l: number, c: number, h: number): string {
  const linear = gamutMap(l, c, h);
  const toByte = (value: number) =>
    Math.round(encodeGamma(value) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(linear.r)}${toByte(linear.g)}${toByte(linear.b)}`;
}

/** WCAG 2.2 relative luminance from a #rrggbb string. */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

/** Best achievable contrast for a fill, choosing between two candidate text colours. */
export function bestTextContrast(fillHex: string, candidateA: string, candidateB: string): number {
  return Math.max(contrastRatio(candidateA, fillHex), contrastRatio(candidateB, fillHex));
}
