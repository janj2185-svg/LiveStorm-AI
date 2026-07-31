/**
 * SYLORA typography
 * ---------------------------------------------------------------------------
 * Three typefaces, each doing a job no other can do.
 *
 * Instrument Serif (display) — a high-contrast modern serif. Almost no
 *   technology product sets its headlines in a serif, which is exactly why
 *   SYLORA does: it is the fastest way to be recognisable at a glance, and the
 *   modulation between thick and thin strokes is what makes a headline read as
 *   *considered* rather than merely large. It is used only above 27px, where
 *   that modulation is visible; below that it would simply be a serif.
 *
 * Instrument Sans (text) — the serif's designed companion. A precise, slightly
 *   narrow neo-grotesque with a tall x-height and open counters, so it holds up
 *   at 12px in a data table and still looks refined at 22px in a card title.
 *   Sharing a family with the display face is what keeps the pairing from
 *   reading as two unrelated decisions.
 *
 * JetBrains Mono (numeric and machine) — monospace as a correctness tool, not a
 *   stylistic one. Money, IDs, timecodes and stream keys must align in columns.
 *
 * A serif for display and a sans for text is a centuries-old pairing from print.
 * Using it in a live-streaming product is the point: it borrows the authority of
 * editorial typography for a surface that normally has none.
 */

export const FONT_FAMILIES = {
  display: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
  text: "'Instrument Sans Variable', 'Instrument Sans', -apple-system, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;

/**
 * Type scale.
 *
 * Built on a 1.2 minor-third ratio from a 16px base, then hand-corrected at the
 * extremes: a pure geometric scale grows too slowly to feel dramatic at display
 * sizes and collapses into itself at micro sizes.
 *
 * Line heights are absolute, not multipliers, so text always lands on the 4px
 * baseline grid. Mixed line-height multipliers are the single most common cause
 * of vertical rhythm drift in a large product.
 *
 * Display styles sit at weight 400. Instrument Serif has no weight axis, and it
 * does not need one — at 44px and above, a high-contrast serif at regular
 * weight already carries more presence than a bold sans, without the density
 * that makes a hero feel heavy.
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
  /** Marketing and hero. One per page, never in product chrome. */
  display1: {
    size: 76,
    lineHeight: 78,
    weight: 400,
    tracking: -0.018,
    family: 'display',
    role: 'Landing hero headline.',
  },
  display2: {
    size: 58,
    lineHeight: 62,
    weight: 400,
    tracking: -0.016,
    family: 'display',
    role: 'Section hero, onboarding statements.',
  },
  display3: {
    size: 44,
    lineHeight: 50,
    weight: 400,
    tracking: -0.014,
    family: 'display',
    role: 'Feature headline, empty-state hero.',
  },
  /**
   * Page title. The last display-face step — below this the serif's contrast
   * stops reading and the sans takes over.
   */
  title1: {
    size: 34,
    lineHeight: 40,
    weight: 400,
    tracking: -0.012,
    family: 'display',
    role: 'Page title.',
  },
  /** In-product headings, set in the text face. */
  /**
   * Section headings stay in the serif. This is the decision that gives the
   * product its voice: a live-streaming interface whose section headings are
   * set in a high-contrast serif reads as edited rather than generated, and
   * that contrast against the dense sans data below it is the whole effect.
   *
   * 21px is the floor. Below it the thick/thin modulation stops resolving and
   * the sans takes over at `headline`.
   */
  title2: {
    size: 27,
    lineHeight: 33,
    weight: 400,
    tracking: -0.01,
    family: 'display',
    role: 'Major section heading.',
  },
  title3: {
    size: 21,
    lineHeight: 27,
    weight: 400,
    tracking: -0.008,
    family: 'display',
    role: 'Card group heading, modal title.',
  },
  headline: {
    size: 17,
    lineHeight: 23,
    weight: 600,
    tracking: -0.006,
    family: 'text',
    role: 'Card title, list item emphasis.',
  },
  /** Running text. */
  bodyLarge: {
    size: 17,
    lineHeight: 27,
    weight: 400,
    tracking: -0.001,
    family: 'text',
    role: 'Article body, long-form reading.',
  },
  body: {
    size: 15,
    lineHeight: 23,
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
  /**
   * Functional micro-type.
   *
   * Labels carry slightly wider tracking than the old system. On a bright
   * ground, tightly set small text closes up and reads as a smudge; a little
   * air is what makes a control feel precise rather than cramped.
   */
  label: {
    size: 13.5,
    lineHeight: 16,
    weight: 550,
    tracking: 0.006,
    family: 'text',
    role: 'Buttons, tabs, form labels.',
  },
  caption: {
    size: 12,
    lineHeight: 16,
    weight: 450,
    tracking: 0.01,
    family: 'text',
    role: 'Timestamps, helper text, counts.',
  },
  /**
   * The only uppercase style. Uppercase destroys word shape and slows reading,
   * so it is restricted to 1-3 word category labels where scanning beats
   * reading. Its very wide tracking is a deliberate brand signal — it is the
   * typographic equivalent of the refraction hairline.
   */
  overline: {
    size: 11,
    lineHeight: 14,
    weight: 600,
    tracking: 0.14,
    family: 'text',
    role: 'Category eyebrow. Uppercase. Max 3 words.',
  },
  /** Numeric and machine text. */
  mono: {
    size: 13,
    lineHeight: 20,
    weight: 450,
    tracking: 0,
    family: 'mono',
    role: 'IDs, keys, timecode, code.',
  },
  monoLarge: {
    size: 30,
    lineHeight: 36,
    weight: 500,
    tracking: -0.014,
    family: 'mono',
    role: 'Dashboard metric values, wallet balances.',
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleName = keyof typeof TYPE_SCALE;

/**
 * Fluid display sizing.
 *
 * Display steps are the only sizes that scale with the viewport. Product text
 * stays fixed: a user who sets a 15px body expects 15px everywhere, and scaling
 * it breaks their calibration and their browser zoom.
 */
export const FLUID_DISPLAY = {
  display1: { min: 40, max: 76 },
  display2: { min: 32, max: 58 },
  display3: { min: 27, max: 44 },
  title1: { min: 25, max: 34 },
} as const satisfies Partial<Record<TypeStyleName, { min: number; max: number }>>;

/** Viewport range across which fluid type interpolates. */
export const FLUID_VIEWPORT = { min: 380, max: 1440 } as const;

/**
 * Optical weight compensation.
 *
 * Dark text on a light ground *thins* — the bright field eats into the strokes,
 * which is the opposite of the blooming that light-on-dark text suffers. The
 * light theme therefore adds a little weight to body copy and the dark theme
 * removes it, so the two read as the same voice.
 */
export const WEIGHT_DELTA: Record<'light' | 'dark', number> = {
  light: 10,
  dark: -20,
};

/** Maximum line length for comfortable reading, in characters. */
export const MEASURE = {
  tight: '46ch',
  comfortable: '68ch',
  wide: '82ch',
} as const;
