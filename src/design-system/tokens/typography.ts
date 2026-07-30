/**
 * SYLORA typography
 * ---------------------------------------------------------------------------
 * Three typefaces, each doing a job no other can do.
 *
 * Sora (display)   — geometric grotesque with a slightly mechanical skeleton.
 *                    Its wide apertures and low contrast hold up at 72px on a
 *                    hero and still read at 20px in a card title. It gives
 *                    SYLORA a voice that is technical without being cold.
 * Inter (text)     — designed for screens at small sizes: tall x-height, open
 *                    counters, real tabular figures. Every piece of running
 *                    text, every label, every button.
 * JetBrains Mono   — numerics that must align in columns, IDs, code, stream
 *                    keys, timecodes. Monospace here is a correctness tool,
 *                    not a stylistic choice.
 *
 * All three are variable fonts, so weight is a continuous axis. That matters
 * for motion: a button label can animate 500 -> 600 on press without the jump
 * you get from swapping static weights.
 */

export const FONT_FAMILIES = {
  display: "'Sora Variable', 'Sora', 'SF Pro Display', system-ui, sans-serif",
  text: "'Inter Variable', 'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;

/**
 * Type scale.
 *
 * Built on a 1.2 minor-third ratio from a 16px base, then hand-corrected at
 * the extremes. A pure geometric scale produces display sizes that grow too
 * slowly to feel dramatic and micro sizes that collapse into each other, so
 * the top three steps are stretched and the bottom two are pinned to legible
 * pixel values.
 *
 * Line heights are absolute, not multipliers, so that text always lands on the
 * 4px baseline grid. Mixed line-height multipliers are the single most common
 * cause of vertical rhythm drift in a large product.
 */
export interface TypeStyle {
  size: number;
  lineHeight: number;
  weight: number;
  tracking: number;
  family: FontFamily;
  role: string;
}

export const TYPE_SCALE = {
  /** Marketing hero only. One per page, never in product chrome. */
  display1: {
    size: 72,
    lineHeight: 76,
    weight: 620,
    tracking: -0.035,
    family: 'display',
    role: 'Landing hero headline.',
  },
  display2: {
    size: 56,
    lineHeight: 60,
    weight: 620,
    tracking: -0.03,
    family: 'display',
    role: 'Section hero, onboarding statements.',
  },
  display3: {
    size: 44,
    lineHeight: 50,
    weight: 600,
    tracking: -0.025,
    family: 'display',
    role: 'Feature headline, empty-state hero.',
  },
  /** In-product headings. */
  title1: {
    size: 34,
    lineHeight: 40,
    weight: 600,
    tracking: -0.02,
    family: 'display',
    role: 'Page title.',
  },
  title2: {
    size: 27,
    lineHeight: 34,
    weight: 600,
    tracking: -0.016,
    family: 'display',
    role: 'Major section heading.',
  },
  title3: {
    size: 22,
    lineHeight: 28,
    weight: 600,
    tracking: -0.012,
    family: 'display',
    role: 'Card group heading, modal title.',
  },
  headline: {
    size: 18,
    lineHeight: 24,
    weight: 600,
    tracking: -0.008,
    family: 'text',
    role: 'Card title, list item emphasis.',
  },
  /** Running text. */
  bodyLarge: {
    size: 17,
    lineHeight: 26,
    weight: 400,
    tracking: -0.002,
    family: 'text',
    role: 'Article body, long-form reading.',
  },
  body: {
    size: 15,
    lineHeight: 22,
    weight: 400,
    tracking: 0,
    family: 'text',
    role: 'Default UI text.',
  },
  bodySmall: {
    size: 13.5,
    lineHeight: 20,
    weight: 400,
    tracking: 0.002,
    family: 'text',
    role: 'Secondary text, descriptions, metadata.',
  },
  /** Functional micro-type. */
  label: {
    size: 13.5,
    lineHeight: 16,
    weight: 550,
    tracking: 0.004,
    family: 'text',
    role: 'Buttons, tabs, form labels.',
  },
  caption: {
    size: 12,
    lineHeight: 16,
    weight: 450,
    tracking: 0.008,
    family: 'text',
    role: 'Timestamps, helper text, counts.',
  },
  /**
   * Overline is the only style that uses uppercase. Uppercase destroys word
   * shape and slows reading, so it is restricted to 1-3 word category labels
   * where scanning beats reading.
   */
  overline: {
    size: 11,
    lineHeight: 14,
    weight: 600,
    tracking: 0.09,
    family: 'text',
    role: 'Category eyebrow. Uppercase. Max 3 words.',
  },
  /** Numeric + machine text. */
  mono: {
    size: 13,
    lineHeight: 20,
    weight: 450,
    tracking: 0,
    family: 'mono',
    role: 'IDs, keys, timecode, code.',
  },
  monoLarge: {
    size: 28,
    lineHeight: 34,
    weight: 500,
    tracking: -0.01,
    family: 'mono',
    role: 'Dashboard metric values, wallet balances.',
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleName = keyof typeof TYPE_SCALE;

/**
 * Fluid display sizing.
 *
 * Display steps are the only sizes that scale with the viewport. Product text
 * stays fixed because a user who sets a 15px body expects 15px everywhere;
 * scaling it breaks their calibration and their browser zoom.
 */
export const FLUID_DISPLAY = {
  display1: { min: 40, max: 72 },
  display2: { min: 32, max: 56 },
  display3: { min: 27, max: 44 },
  title1: { min: 24, max: 34 },
} as const satisfies Partial<Record<TypeStyleName, { min: number; max: number }>>;

/** Viewport range across which fluid type interpolates. */
export const FLUID_VIEWPORT = { min: 380, max: 1440 } as const;

/**
 * Optical weight compensation.
 *
 * Light text on a dark field blooms — the same weight reads heavier in dark
 * mode. Dark themes therefore subtract weight from body copy. Without this,
 * dark mode always looks slightly shouty next to its light counterpart.
 */
export const DARK_MODE_WEIGHT_DELTA = -15;

/** Maximum line length for comfortable reading, in characters. */
export const MEASURE = {
  tight: '46ch',
  comfortable: '68ch',
  wide: '82ch',
} as const;
