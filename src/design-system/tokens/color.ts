/**
 * SYLORA colour system — "Lumen"
 * ---------------------------------------------------------------------------
 * SYLORA is a light-first product. That is a design decision with consequences
 * far beyond swapping a background, because the two themes cannot use the same
 * physics.
 *
 * In a dark interface, depth and emphasis come from *emission*: things glow.
 * On white, nothing can glow — a halo on a bright ground is invisible. So the
 * light theme is built on the opposite phenomenon, **refraction**: light
 * arrives, passes through the interface, and leaves as spectrum. Colour is
 * something the surface *does to light*, not something painted on it.
 *
 * Three consequences run through this file:
 *
 * 1. THE NEUTRAL SHIFTS HUE.
 *    Real daylight is warm and its shadows are cool, because shadows are lit
 *    by the sky rather than the sun. SYLORA's neutral ramp reproduces that: the
 *    lightest steps carry a faint warm cast, the darkest carry a cool one, and
 *    the interpolation runs through OKLab a/b so the middle passes through true
 *    neutral instead of detouring through green. Greys stop looking like grey
 *    and start looking like a lit material.
 *
 * 2. LIGHT IS DESIGNED FIRST.
 *    The light curve is tuned for a bright, airy, high-white product; the dark
 *    curve is derived to match its rhythm. Dark mode is a supported option, not
 *    the canonical expression.
 *
 * 3. ELEVATION MEANS MORE LIGHT IN BOTH THEMES.
 *    In dark mode a raised surface is lighter than the canvas. In light mode
 *    the canvas is toned porcelain and a raised surface is *brighter* — closer
 *    to white. A card is a lit object either way. This is why the semantic
 *    mapping differs per theme rather than being one shared table.
 */

import { bestTextContrast, oklchToHex } from './color-science';

export type ThemeMode = 'light' | 'dark';

/** The default theme. Light is the product; dark is an option. */
export const DEFAULT_THEME: ThemeMode = 'light';

/** The 12 ramp positions, named so intent survives refactors. */
export const RAMP_ROLES = [
  'base',
  'canvas',
  'hover',
  'active',
  'selected',
  'hairline',
  'border',
  'borderStrong',
  'solid',
  'solidHover',
  'textMuted',
  'text',
] as const;

export type RampRole = (typeof RAMP_ROLES)[number];

/**
 * Lightness curves.
 *
 * LIGHT — the primary. Step 1 is near-white and is where cards live; step 2 is
 * the toned porcelain page behind them. The gap between 1 and 2 is small on
 * purpose: it should read as a change in *illumination*, not as two different
 * greys. Steps 3-5 stay high so interactive fills stay airy, and 6-8 fall away
 * quickly so borders can be genuine hairlines rather than boxes.
 *
 * DARK — derived, and deliberately not a mirror. It starts at L .162 rather
 * than black: true black clips OLED sub-pixels and leaves no room to express
 * elevation with light.
 */
/*
  The light ramp's dark end carries three legible text tiers, not two.

  A bright ground is unforgiving here: the usable contrast range between the
  page and true ink is short, so it is tempting to spend it on one body colour
  and call everything else "quiet". That produces axis ticks, placeholders,
  timestamps and column headers sitting at 2:1 — technically present, and
  unreadable for a large number of people.

  Steps 9, 11 and 12 are therefore all *text* steps in the light theme, spaced
  so each clears 4.5:1 against the canvas while staying visibly distinct from
  its neighbour. Step 8 is released from carrying text and becomes purely a
  border.
*/
const LIGHTNESS: Record<ThemeMode, readonly number[]> = {
  light: [0.996, 0.964, 0.941, 0.918, 0.893, 0.872, 0.828, 0.7, 0.538, 0.482, 0.42, 0.205],
  dark: [0.162, 0.195, 0.23, 0.262, 0.295, 0.335, 0.395, 0.485, 0.62, 0.678, 0.79, 0.968],
};

/**
 * Chroma envelope, as a fraction of each family's peak.
 *
 * Saturation peaks at step 9 — the one step that must command attention — and
 * falls away toward both ends. The light envelope is tighter at the top than
 * the dark one: on a bright ground even a little chroma in a background reads
 * as a tint, and a tinted page is the fastest way to look cheap.
 */
const CHROMA_ENVELOPE: Record<ThemeMode, readonly number[]> = {
  light: [0.02, 0.05, 0.1, 0.16, 0.23, 0.31, 0.42, 0.62, 1.0, 0.98, 0.88, 0.42],
  dark: [0.1, 0.18, 0.3, 0.38, 0.46, 0.54, 0.64, 0.8, 1.0, 0.95, 0.72, 0.28],
};

/** A tint expressed in OKLab a/b, so ramps can interpolate through true grey. */
export interface Tint {
  a: number;
  b: number;
}

export interface ColorFamilyDefinition {
  /** OKLCH hue angle in degrees. Ignored when `tintRamp` is present. */
  hue: number;
  /** Peak chroma at step 9, per theme. Tuned to stay inside the sRGB gamut. */
  peakChroma: Record<ThemeMode, number>;
  /** Optional replacement for the shared chroma envelope. */
  chromaEnvelope?: readonly number[];
  /**
   * Interpolate the family's tint in OKLab a/b from step 1 to step 12 instead
   * of holding one hue. Only the neutral uses this — it is what produces warm
   * highlights and cool shadows without the midtones drifting green.
   */
  tintRamp?: Record<ThemeMode, { from: Tint; to: Tint }>;
  /** Why this family exists in the product. */
  rationale: string;
}

/**
 * The SYLORA spectrum.
 *
 * Six hues, spaced 46-74 degrees apart so no two are ever mistaken for each
 * other, each owning exactly one job. Colour communicates meaning before a word
 * is read.
 *
 * The brand hue is a deep aquamarine. It is chosen against the ground rather
 * than in isolation: a cool accent on a warm porcelain page is a complementary
 * pair, so the accent separates cleanly at any size without needing to shout.
 * It is also the part of the spectrum the industry has left alone — the default
 * technology blue-violet sits 60-90 degrees away.
 */
export const COLOR_FAMILIES = {
  /**
   * Structure. Carries a warm cast at the light end and a cool one at the dark
   * end, so a page reads as lit paper and its text reads as ink in shadow.
   */
  porcelain: {
    hue: 250,
    peakChroma: { light: 0.02, dark: 0.024 },
    chromaEnvelope: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    tintRamp: {
      // Light: sunlit warm at the top, sky-cool in the shadows.
      light: { from: { a: -0.0006, b: 0.006 }, to: { a: 0.004, b: -0.014 } },
      // Dark: the same physics, compressed — the ambient is cooler throughout.
      dark: { from: { a: 0.003, b: -0.01 }, to: { a: -0.0004, b: 0.004 } },
    },
    rationale: 'Surfaces, structure and text. Warm in light, cool in shadow.',
  },
  /** Primary brand, and anything intelligent. The colour of SYLORA itself. */
  aether: {
    hue: 196,
    peakChroma: { light: 0.118, dark: 0.128 },
    rationale: 'Brand primary, AI, generated content, focus rings.',
  },
  /** Anything happening *now*: live, streaming, presence, sync. */
  pulse: {
    hue: 272,
    peakChroma: { light: 0.19, dark: 0.185 },
    rationale: 'Realtime signal, presence, connection health, sync.',
  },
  /** Human expression. Creators, gifts, reactions, celebration. */
  bloom: {
    hue: 328,
    peakChroma: { light: 0.2, dark: 0.196 },
    rationale: 'Creator identity, gifting, reactions, celebratory moments.',
  },
  /** Positive outcomes. Success, growth, earnings, verified. */
  verdigris: {
    hue: 152,
    peakChroma: { light: 0.144, dark: 0.152 },
    rationale: 'Success, upward metrics, earnings, verification.',
  },
  /** Attention without alarm. Warnings, achievements, premium tier. */
  solar: {
    hue: 78,
    peakChroma: { light: 0.156, dark: 0.162 },
    rationale: 'Warnings, achievements, premium and scarcity.',
  },
  /** Stop. Destructive actions, errors, moderation removal. */
  rose: {
    hue: 22,
    peakChroma: { light: 0.185, dark: 0.188 },
    rationale: 'Errors, destructive actions, moderation removal.',
  },
} as const satisfies Record<string, ColorFamilyDefinition>;

export type ColorFamily = keyof typeof COLOR_FAMILIES;

export const COLOR_FAMILY_NAMES = Object.keys(COLOR_FAMILIES) as ColorFamily[];

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

/** Reference text colours, taken from the raw curve so the solver stays acyclic. */
function referenceTextPair(mode: ThemeMode): [string, string] {
  const l = LIGHTNESS[mode];
  const ramp = COLOR_FAMILIES.porcelain.tintRamp![mode];
  const toOklch = (index: number) => {
    const t = index / 11;
    const a = ramp.from.a + (ramp.to.a - ramp.from.a) * t;
    const b = ramp.from.b + (ramp.to.b - ramp.from.b) * t;
    return oklchToHex(l[index], Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI);
  };
  return [toOklch(11), toOklch(0)];
}

/**
 * Minimum contrast that step 9 must achieve with its best text colour.
 * 4.6 rather than 4.5 leaves headroom for 8-bit quantisation.
 */
const SOLID_TEXT_TARGET = 4.6;

/**
 * Solve the lightness of step 9.
 *
 * OKLCH is perceptually uniform; WCAG's relative-luminance formula is not — it
 * weights green at 0.7152 and blue at 0.0722. A cyan and a violet at identical
 * OKLCH lightness therefore have very different WCAG luminance, and the cyan
 * one can end up with no text colour that reaches 4.5:1.
 *
 * Rather than pretend the conflict does not exist, the one step that must carry
 * text is solved numerically against the metric that actually governs
 * accessibility. The search starts at the curve value and walks outward in
 * 0.005 increments, so families that already pass are left untouched.
 */
function solveSolidLightness(family: ColorFamily, mode: ThemeMode, chroma: number): number {
  const base = LIGHTNESS[mode][8];
  const hue = COLOR_FAMILIES[family].hue;
  const [textA, textB] = referenceTextPair(mode);

  const satisfies = (l: number) =>
    bestTextContrast(oklchToHex(l, chroma, hue), textA, textB) >= SOLID_TEXT_TARGET;

  if (satisfies(base)) return base;

  for (let delta = 0.005; delta <= 0.36; delta += 0.005) {
    // Light themes darken their solids; dark themes lighten theirs. Trying the
    // theme-appropriate direction first keeps the ramp monotonic.
    const primary = mode === 'light' ? base - delta : base + delta;
    if (primary > 0.02 && primary < 0.98 && satisfies(primary)) return Number(primary.toFixed(4));

    const secondary = mode === 'light' ? base + delta : base - delta;
    if (secondary > 0.02 && secondary < 0.98 && satisfies(secondary)) return Number(secondary.toFixed(4));
  }

  return base;
}

/** Build one 12-step ramp for a family in a theme. */
export function buildRamp(family: ColorFamily, mode: ThemeMode): OklchColor[] {
  const definition: ColorFamilyDefinition = COLOR_FAMILIES[family];
  const lightness = LIGHTNESS[mode];
  const envelope = definition.chromaEnvelope ?? CHROMA_ENVELOPE[mode];
  const peak = definition.peakChroma[mode];
  const tint = definition.tintRamp?.[mode];

  const solidChroma = peak * envelope[8];
  const solvedSolid = tint ? lightness[8] : solveSolidLightness(family, mode, solidChroma);
  // Step 10 is step 9 hovered; it keeps the curve's original delta so the hover
  // feels identical across every family.
  const solidDelta = solvedSolid - lightness[8];

  return lightness.map((l, index) => {
    const adjusted = index === 8 ? solvedSolid : index === 9 ? l + solidDelta : l;

    if (tint) {
      // Interpolate the tint in OKLab a/b, so the ramp passes through true
      // neutral in the middle instead of swinging through an intermediate hue.
      const t = index / (lightness.length - 1);
      const a = tint.from.a + (tint.to.a - tint.from.a) * t;
      const b = tint.from.b + (tint.to.b - tint.from.b) * t;
      return {
        l: Number(Math.min(0.999, Math.max(0.02, adjusted)).toFixed(4)),
        c: Number((Math.hypot(a, b) * peak * 50 * envelope[index]).toFixed(4)),
        h: Number((((Math.atan2(b, a) * 180) / Math.PI + 360) % 360).toFixed(2)),
      };
    }

    return {
      l: Number(Math.min(0.999, Math.max(0.02, adjusted)).toFixed(4)),
      c: Number((peak * envelope[index]).toFixed(4)),
      h: definition.hue,
    };
  });
}

export function formatOklch({ l, c, h }: OklchColor): string {
  return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h})`;
}

export type ColorRamps = Record<ColorFamily, OklchColor[]>;

export function buildAllRamps(mode: ThemeMode): ColorRamps {
  return Object.fromEntries(
    COLOR_FAMILY_NAMES.map((family) => [family, buildRamp(family, mode)]),
  ) as ColorRamps;
}

export function formatOklchAlpha({ l, c, h }: OklchColor, alpha: number): string {
  return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h} / ${alpha})`;
}

export const ALPHA_STEPS = [0.04, 0.08, 0.12, 0.16, 0.24, 0.32, 0.48, 0.64, 0.8, 0.92] as const;

/**
 * Semantic aliases.
 *
 * The mapping is per theme, because "raised" means something different in each.
 * In dark, elevation climbs the ramp toward light. In light, the page is toned
 * porcelain and elevation climbs *back toward white* — so a card is brighter
 * than its page, exactly as a lit object is brighter than its surroundings.
 * One shared table could not express that, and forcing one would give the light
 * theme grey cards on a white page: recessed, flat, and cheap-looking.
 */
export const SEMANTIC_ROLES = {
  brand: 'aether',
  live: 'pulse',
  creator: 'bloom',
  success: 'verdigris',
  warning: 'solar',
  danger: 'rose',
} as const satisfies Record<string, ColorFamily>;

export type SemanticRole = keyof typeof SEMANTIC_ROLES;

/**
 * Signature gradients.
 *
 * `prism` is the brand's core gesture: cyan to indigo to magenta is the order
 * light actually separates into when it is refracted, so the gradient is a
 * physical fact rather than a palette choice. It appears as hairline edges and
 * thin sweeps — never as a large filled area, where it would read as decoration
 * instead of as light.
 */
export const GRADIENTS = {
  prism: {
    stops: ['aether', 'pulse', 'bloom'] as ColorFamily[],
    angle: 104,
    rationale: 'The brand gesture. Refraction order: cyan, indigo, magenta.',
  },
  beam: {
    stops: ['aether', 'pulse'] as ColorFamily[],
    angle: 118,
    rationale: 'Live and realtime surfaces; the narrow end of the spectrum.',
  },
  ember: {
    stops: ['bloom', 'solar'] as ColorFamily[],
    angle: 128,
    rationale: 'Creator earnings, gifting, celebration.',
  },
  daylight: {
    stops: ['porcelain', 'aether'] as ColorFamily[],
    angle: 160,
    rationale: 'Ambient wash; colour barely surfacing out of the page.',
  },
} as const;

export type GradientName = keyof typeof GRADIENTS;
