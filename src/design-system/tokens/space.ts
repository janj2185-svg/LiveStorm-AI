/**
 * SYLORA space, shape and layout
 * ---------------------------------------------------------------------------
 * One number governs the entire product: 4.
 *
 * Every margin, padding, gap, icon box, control height and radius is a
 * multiple of 4px. The reason is not tidiness — it is that a shared divisor
 * makes optical alignment automatic. When a 40px avatar sits beside 22px
 * line-height text inside 16px padding, the shapes land on the same lattice
 * and the row looks composed without anyone nudging it.
 */

/**
 * Spacing scale.
 *
 * Dense at the bottom because that is where interface decisions actually
 * happen — the difference between 8 and 12 changes how a card feels, while
 * the difference between 80 and 96 rarely does. The scale deliberately skips
 * values above 24 to prevent "almost the same" spacing from creeping in.
 */
export const SPACE = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
  40: 160,
} as const;

export type SpaceToken = keyof typeof SPACE;

/**
 * Corner radii.
 *
 * SYLORA uses a *continuous* radius language: nested elements shrink their
 * radius by exactly their padding so the inner and outer curves stay
 * concentric. A 20px-radius card with 12px padding holds a 8px-radius child.
 * Concentric corners are the difference between "rounded" and "designed".
 */
export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  '3xl': 36,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof RADIUS;

/** Inner radius for a concentric child. Never guess this value. */
export function concentricRadius(outerRadius: number, padding: number): number {
  return Math.max(0, outerRadius - padding);
}

/**
 * Breakpoints.
 *
 * Named for the device posture they describe, not the hardware. Layout should
 * respond to how far the screen is from the user's eyes and which thumb can
 * reach it, which is what these names encode.
 */
export const BREAKPOINTS = {
  /** Small handsets, 1 column, thumb-first. */
  compact: 0,
  /** Large handsets and small foldables. */
  handheld: 480,
  /** Tablets portrait, split-view. */
  tablet: 768,
  /** Tablets landscape, small laptops. Sidebars appear. */
  laptop: 1024,
  /** Desktop. Full three-region shell. */
  desktop: 1280,
  /** Large desktop. Content stops growing; margins absorb the rest. */
  wide: 1600,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export const BREAKPOINT_ORDER: Breakpoint[] = [
  'compact',
  'handheld',
  'tablet',
  'laptop',
  'desktop',
  'wide',
];

/**
 * Responsive grid.
 *
 * Column counts step 4 -> 8 -> 12 so that a 12-column desktop layout can be
 * halved to 6, thirded to 4, and still divide evenly on tablet. Content is
 * capped at 1440 because beyond roughly 90 characters the eye loses the line
 * return, and because unbounded growth turns a designed layout into a
 * stretched one.
 */
export const GRID = {
  compact: { columns: 4, margin: 16, gutter: 16, maxContent: null },
  handheld: { columns: 4, margin: 20, gutter: 16, maxContent: null },
  tablet: { columns: 8, margin: 28, gutter: 20, maxContent: null },
  laptop: { columns: 12, margin: 32, gutter: 24, maxContent: 1120 },
  desktop: { columns: 12, margin: 40, gutter: 24, maxContent: 1280 },
  wide: { columns: 12, margin: 48, gutter: 28, maxContent: 1440 },
} as const satisfies Record<Breakpoint, {
  columns: number;
  margin: number;
  gutter: number;
  maxContent: number | null;
}>;

/**
 * Control sizing.
 *
 * Heights are multiples of 4 and every interactive control reaches at least a
 * 44px hit target on touch, even when its visual box is smaller. The visual
 * height and the touch height are separate numbers on purpose: a 32px chip
 * should look like a 32px chip and still be tappable.
 */
export const CONTROL = {
  xs: { height: 24, paddingX: 8, gap: 4, icon: 14, radius: RADIUS.sm },
  sm: { height: 32, paddingX: 12, gap: 6, icon: 16, radius: RADIUS.md },
  md: { height: 40, paddingX: 16, gap: 8, icon: 18, radius: RADIUS.md },
  lg: { height: 48, paddingX: 20, gap: 10, icon: 20, radius: RADIUS.lg },
  xl: { height: 56, paddingX: 24, gap: 12, icon: 22, radius: RADIUS.lg },
} as const;

export type ControlSize = keyof typeof CONTROL;

/** Minimum touch target. Enforced via pseudo-element, never by inflating the visual box. */
export const MIN_TOUCH_TARGET = 44;

/**
 * Layout shell dimensions.
 *
 * SYLORA's desktop shell is three regions: a navigation rail, a content
 * column, and a contextual panel. The rail has two states because navigation
 * should be able to recede when the user is creating.
 */
export const SHELL = {
  railCollapsed: 76,
  railExpanded: 264,
  contextPanel: 340,
  contextPanelWide: 400,
  topBar: 64,
  tabBar: 60,
  /** Extra bottom padding for home-indicator devices. */
  safeAreaFallback: 20,
} as const;

/**
 * Z-index.
 *
 * A short, ordered list. Any value not in this list is a bug — arbitrary
 * z-index numbers are how stacking contexts become unfixable.
 */
export const Z_INDEX = {
  base: 0,
  raised: 10,
  sticky: 100,
  navigation: 200,
  overlayScrim: 300,
  drawer: 400,
  modal: 500,
  popover: 600,
  toast: 700,
  tooltip: 800,
  /** Debug and dev-only affordances sit above everything. */
  spotlight: 900,
} as const;

export type ZIndexToken = keyof typeof Z_INDEX;
