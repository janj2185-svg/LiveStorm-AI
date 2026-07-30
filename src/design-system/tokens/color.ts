/**
 * SYLORA colour system
 * ---------------------------------------------------------------------------
 * Every colour in the product is generated, never hand-picked.
 *
 * WHY OKLCH
 * A designer picking hex values by eye produces ramps where "the same" step
 * looks heavier in blue than in yellow, because sRGB is not perceptually
 * uniform. OKLCH separates perceived Lightness from Chroma and Hue, so a fixed
 * lightness curve reads as the same visual weight at every hue. That single
 * decision is what lets us promise contrast ratios per *step* instead of
 * auditing 600 individual colours.
 *
 * THE 12-STEP CONTRACT
 * Each family is a 12-step ramp where the step index has a fixed meaning.
 * A component never says "use violet-600"; it says "use step 9 of the active
 * accent". Re-theming is therefore a hue swap, not a redesign.
 *
 *   1  canvas          furthest-back app background
 *   2  surface         cards, sheets, panels
 *   3  raised          surfaces stacked on surfaces, inputs at rest
 *   4  hover           interactive background, hovered
 *   5  active          interactive background, pressed / selected
 *   6  borderSubtle    dividers, hairlines, low-emphasis separation
 *   7  border          default component border
 *   8  borderStrong    focus ring companion, hovered border, sliders
 *   9  solid           the load-bearing fill: primary buttons, brand marks
 *  10  solidHover      step 9, hovered
 *  11  textMuted       secondary text — guaranteed >= 4.5:1 on steps 1-2
 *  12  text            primary text — guaranteed >= 15:1 on step 1
 *
 * Steps 1-5 are backgrounds, 6-8 are borders, 9-10 are fills, 11-12 are text.
 * Any component that respects that grammar is automatically accessible.
 */

import { bestTextContrast, oklchToHex } from './color-science';

export type ThemeMode = 'dark' | 'light';

/** The 12 ramp positions, named so intent survives refactors. */
export const RAMP_ROLES = [
  'canvas',
  'surface',
  'raised',
  'hover',
  'active',
  'borderSubtle',
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
 * Dark starts at L .155 rather than pure black: true black clips OLED
 * sub-pixels, kills the sense of depth, and makes elevation impossible to
 * express with light. Starting slightly above black leaves room for shadow
 * *and* glow.
 *
 * The two curves are deliberately not mirrors. Dark mode needs a wider gap
 * between steps 1-3 (depth must be legible in low light), while light mode
 * needs a wider gap between 8-12 (text must punch through a bright field).
 */
const LIGHTNESS: Record<ThemeMode, readonly number[]> = {
  dark: [0.155, 0.188, 0.223, 0.253, 0.285, 0.328, 0.39, 0.482, 0.62, 0.678, 0.79, 0.968],
  light: [0.994, 0.982, 0.964, 0.945, 0.925, 0.897, 0.86, 0.775, 0.56, 0.505, 0.472, 0.235],
};

/**
 * Chroma envelope, expressed as a fraction of each family's peak chroma.
 *
 * Saturation peaks at step 9 — the one step that must command attention — and
 * falls away toward both ends. Backgrounds stay near-neutral so that content,
 * not chrome, carries the colour. Text desaturates at step 12 because fully
 * saturated body copy vibrates against its background and fatigues the eye.
 */
const CHROMA_ENVELOPE: Record<ThemeMode, readonly number[]> = {
  dark: [0.1, 0.18, 0.3, 0.38, 0.46, 0.54, 0.64, 0.8, 1.0, 0.95, 0.72, 0.28],
  light: [0.03, 0.07, 0.14, 0.22, 0.3, 0.38, 0.48, 0.66, 1.0, 0.96, 0.86, 0.4],
};

export interface ColorFamilyDefinition {
  /** OKLCH hue angle in degrees. */
  hue: number;
  /** Peak chroma at step 9, per theme. Tuned to stay inside the sRGB gamut. */
  peakChroma: Record<ThemeMode, number>;
  /**
   * Optional replacement for the shared chroma envelope.
   * Only the neutral family uses this: accents want saturation concentrated at
   * step 9, whereas the neutral needs an almost flat, very low chroma so every
   * surface carries the same faint violet cast.
   */
  chromaEnvelope?: readonly number[];
  /** Why this hue exists in the product. */
  rationale: string;
}

/**
 * Neutral chroma envelope.
 *
 * Deliberately flat. A grey that drifts in saturation as it gets lighter looks
 * like a printing error; a grey that holds one faint tint across the whole
 * ramp reads as a designed material. Values stay under 0.01 chroma, which is
 * below the threshold where most people would call it "purple" but above the
 * threshold where the screen feels dead.
 */
const NEUTRAL_ENVELOPE = [0.3, 0.34, 0.38, 0.4, 0.42, 0.42, 0.4, 0.36, 0.3, 0.28, 0.22, 0.12] as const;

/**
 * The SYLORA spectrum.
 *
 * SYLORA's brand idea is "living light" — an aurora is light made visible by
 * energy passing through a medium. The palette is therefore an aurora sampled
 * at six points, not an arbitrary set of brand colours. Each hue owns exactly
 * one job, so colour alone communicates meaning before a single word is read.
 */
export const COLOR_FAMILIES = {
  /**
   * Structural neutral. Carries a 282 degrees violet cast at very low chroma so
   * greys feel related to the brand instead of dead. Pure grey next to a violet
   * accent reads as dirty; a 0.014-chroma tint reads as intentional.
   */
  neutral: {
    hue: 282,
    peakChroma: { dark: 0.023, light: 0.019 },
    chromaEnvelope: NEUTRAL_ENVELOPE,
    rationale: 'Structure, surfaces, text. Violet-tinted so neutrals belong to the brand.',
  },
  /** Primary brand + anything intelligent. The colour of SYLORA itself. */
  iris: {
    hue: 285,
    peakChroma: { dark: 0.205, light: 0.215 },
    rationale: 'Brand primary, AI, generated content, focus rings.',
  },
  /** Realtime. Anything happening *now*: live, streaming, presence, sync. */
  flux: {
    hue: 203,
    peakChroma: { dark: 0.142, light: 0.145 },
    rationale: 'Live state, realtime signal, presence, connection health.',
  },
  /** Human expression. Creators, gifts, reactions, celebration. */
  nova: {
    hue: 335,
    peakChroma: { dark: 0.196, light: 0.205 },
    rationale: 'Creator identity, gifting, reactions, celebratory moments.',
  },
  /** Positive outcomes. Success, growth, earnings, verified. */
  verdant: {
    hue: 158,
    peakChroma: { dark: 0.152, light: 0.158 },
    rationale: 'Success, upward metrics, earnings, verification.',
  },
  /** Attention without alarm. Warnings, achievements, premium tier. */
  solar: {
    hue: 78,
    peakChroma: { dark: 0.162, light: 0.168 },
    rationale: 'Warnings, achievements, premium and scarcity.',
  },
  /** Stop. Destructive actions, errors, moderation removal. */
  crimson: {
    hue: 24,
    peakChroma: { dark: 0.188, light: 0.196 },
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

/**
 * Reference text colours, taken straight from the neutral curve so the solver
 * below cannot become circular.
 */
function referenceTextPair(mode: ThemeMode): [string, string] {
  const l = LIGHTNESS[mode];
  const e = NEUTRAL_ENVELOPE;
  const peak = COLOR_FAMILIES.neutral.peakChroma[mode];
  const hue = COLOR_FAMILIES.neutral.hue;
  return [oklchToHex(l[11], peak * e[11], hue), oklchToHex(l[0], peak * e[0], hue)];
}

/**
 * Minimum contrast that step 9 must achieve with its best text colour.
 * 4.6 rather than 4.5 leaves headroom for the rounding that happens when a
 * colour is quantised to 8 bits per channel.
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
 * Rather than pretend the conflict does not exist, the one step that must
 * carry text is solved numerically against the metric that actually governs
 * accessibility. The search starts at the curve value and walks outward in
 * 0.005 increments, taking the nearest lightness that satisfies the target, so
 * families that already pass are left completely untouched.
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

  const solidChroma = peak * envelope[8];
  const solvedSolid = solveSolidLightness(family, mode, solidChroma);
  // Step 10 is step 9 hovered; it keeps the curve's original delta so the
  // hover feels identical across every family.
  const solidDelta = solvedSolid - lightness[8];

  return lightness.map((l, index) => {
    const adjusted = index === 8 ? solvedSolid : index === 9 ? l + solidDelta : l;
    return {
      l: Number(Math.min(0.99, Math.max(0.02, adjusted)).toFixed(4)),
      c: Number((peak * envelope[index]).toFixed(4)),
      h: definition.hue,
    };
  });
}

/** Serialise to a CSS `oklch()` value. */
export function formatOklch({ l, c, h }: OklchColor): string {
  return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h})`;
}

export type ColorRamps = Record<ColorFamily, OklchColor[]>;

export function buildAllRamps(mode: ThemeMode): ColorRamps {
  return Object.fromEntries(
    COLOR_FAMILY_NAMES.map((family) => [family, buildRamp(family, mode)]),
  ) as ColorRamps;
}

/**
 * Alpha overlays.
 *
 * Glass surfaces, scrims and hover states must work over *unknown* content —
 * a video frame, a photo, a gradient. Solid ramp steps cannot do that, so the
 * system ships a parallel set of translucent neutrals. `formatOklchAlpha`
 * keeps them in the same colour space as everything else.
 */
export function formatOklchAlpha({ l, c, h }: OklchColor, alpha: number): string {
  return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h} / ${alpha})`;
}

export const ALPHA_STEPS = [0.04, 0.08, 0.12, 0.16, 0.24, 0.32, 0.48, 0.64, 0.8, 0.92] as const;

/**
 * Semantic aliases.
 *
 * Screens consume these names, never raw ramp steps. Changing what "danger"
 * means becomes a one-line edit, and a designer reading a spec never has to
 * decode a number.
 */
export const SEMANTIC_ROLES = {
  brand: 'iris',
  live: 'flux',
  creator: 'nova',
  success: 'verdant',
  warning: 'solar',
  danger: 'crimson',
} as const satisfies Record<string, ColorFamily>;

export type SemanticRole = keyof typeof SEMANTIC_ROLES;

/**
 * Signature gradients.
 *
 * The aurora is expressed as motion across hue at *constant* lightness, which
 * is why these never look muddy: in OKLCH, interpolating hue at fixed L and C
 * traces the perceptual rim of the gamut instead of cutting through grey.
 */
export const GRADIENTS = {
  aurora: {
    stops: ['iris', 'flux', 'nova'] as ColorFamily[],
    angle: 135,
    rationale: 'Primary brand gradient. Intelligence to signal to expression.',
  },
  signal: {
    stops: ['flux', 'iris'] as ColorFamily[],
    angle: 120,
    rationale: 'Live and realtime surfaces.',
  },
  ember: {
    stops: ['nova', 'solar'] as ColorFamily[],
    angle: 135,
    rationale: 'Creator earnings, gifting, celebration.',
  },
  depth: {
    stops: ['neutral', 'iris'] as ColorFamily[],
    angle: 160,
    rationale: 'Ambient backgrounds; colour barely surfacing out of structure.',
  },
} as const;

export type GradientName = keyof typeof GRADIENTS;
