/**
 * SYLORA elevation, glass and glow
 * ---------------------------------------------------------------------------
 * Depth is expressed differently in each theme because the physics differ.
 *
 * In light mode, depth is *occlusion*: a raised object blocks light and casts
 * a shadow. Shadows are tinted with the neutral hue rather than pure black,
 * because a black shadow over a violet-tinted surface reads as a smudge.
 *
 * In dark mode, shadows are nearly invisible — you cannot darken near-black.
 * Depth instead comes from three cooperating signals:
 *   1. Surface lightness      the ramp step rises with elevation
 *   2. Rim light              a 1px top highlight, as if lit from above
 *   3. Ambient occlusion      a soft dark halo to detach from the backdrop
 *
 * Every elevation token therefore ships a light and a dark recipe. Components
 * ask for `elevation.raised`, never for a shadow string.
 */

import type { ThemeMode } from './color';

export interface ElevationLevel {
  /** Ramp step used for the surface fill at this elevation. */
  surfaceStep: number;
  shadow: Record<ThemeMode, string>;
  /** Top rim highlight. Dark mode only; light mode uses a border instead. */
  rim: Record<ThemeMode, string>;
  usage: string;
}

/**
 * Six levels. More than six and the differences stop being perceptible;
 * fewer and modals cannot separate from drawers.
 */
export const ELEVATION = {
  flat: {
    surfaceStep: 1,
    shadow: { light: 'none', dark: 'none' },
    rim: { light: 'none', dark: 'none' },
    usage: 'Page canvas. Never has depth.',
  },
  sunken: {
    surfaceStep: 1,
    shadow: {
      light: 'inset 0 1px 2px 0 var(--shadow-color-08)',
      dark: 'inset 0 1px 3px 0 var(--shadow-color-32)',
    },
    rim: { light: 'none', dark: 'inset 0 -1px 0 0 var(--rim-color-04)' },
    usage: 'Input wells, track grooves, inset media.',
  },
  surface: {
    surfaceStep: 2,
    shadow: {
      light: '0 1px 2px -1px var(--shadow-color-08), 0 1px 3px 0 var(--shadow-color-06)',
      dark: '0 1px 2px 0 var(--shadow-color-24)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-06)' },
    usage: 'Cards, list rows, panels resting on the canvas.',
  },
  raised: {
    surfaceStep: 3,
    shadow: {
      light: '0 2px 4px -2px var(--shadow-color-10), 0 6px 12px -4px var(--shadow-color-10)',
      dark: '0 2px 6px -1px var(--shadow-color-32), 0 8px 20px -6px var(--shadow-color-24)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-08)' },
    usage: 'Hovered cards, dropdowns, popovers, floating controls.',
  },
  overlay: {
    surfaceStep: 3,
    shadow: {
      light: '0 8px 16px -8px var(--shadow-color-12), 0 20px 40px -12px var(--shadow-color-14)',
      dark: '0 10px 24px -6px var(--shadow-color-40), 0 28px 56px -16px var(--shadow-color-32)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-10)' },
    usage: 'Dialogs, sheets, command palette.',
  },
  lifted: {
    surfaceStep: 4,
    shadow: {
      light: '0 16px 32px -12px var(--shadow-color-16), 0 40px 72px -24px var(--shadow-color-16)',
      dark: '0 18px 40px -12px var(--shadow-color-48), 0 48px 96px -32px var(--shadow-color-40)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-12)' },
    usage: 'Dragged objects, the single focused element in a spotlight state.',
  },
} as const satisfies Record<string, ElevationLevel>;

export type ElevationToken = keyof typeof ELEVATION;

/**
 * Glass.
 *
 * Glassmorphism is used with discipline: only where a surface genuinely floats
 * over *moving or photographic* content — stream overlays, media chrome,
 * navigation above a scrolling feed, the AI command surface. Applying it to
 * ordinary cards on a flat background produces blur with nothing to blur, at
 * real GPU cost, and reduces text contrast for no reason.
 *
 * Every glass recipe is three layers:
 *   1. Backdrop filter   blur plus a saturation lift, so colour survives blur
 *   2. Translucent fill  keeps text contrast above threshold
 *   3. Rim               a hairline highlight that defines the edge
 *
 * Fill opacity is the accessibility control. Under `prefers-contrast: more`
 * the whole system falls back to opaque surfaces.
 */
export interface GlassRecipe {
  blur: number;
  saturate: number;
  fillAlpha: Record<ThemeMode, number>;
  rimAlpha: Record<ThemeMode, number>;
  usage: string;
}

export const GLASS = {
  /** Light veil. Sticky headers over scrolling content. */
  veil: {
    blur: 12,
    saturate: 1.4,
    fillAlpha: { dark: 0.62, light: 0.68 },
    rimAlpha: { dark: 0.08, light: 0.5 },
    usage: 'Sticky top bars, tab bars over feeds.',
  },
  /** Standard. Floating panels over media. */
  panel: {
    blur: 24,
    saturate: 1.6,
    fillAlpha: { dark: 0.72, light: 0.76 },
    rimAlpha: { dark: 0.1, light: 0.6 },
    usage: 'Stream chrome, player controls, floating toolbars.',
  },
  /** Heavy. Modal surfaces that must dominate their backdrop. */
  dome: {
    blur: 40,
    saturate: 1.8,
    fillAlpha: { dark: 0.82, light: 0.86 },
    rimAlpha: { dark: 0.14, light: 0.7 },
    usage: 'Command palette, AI surface, media-context dialogs.',
  },
  /** Scrim behind a modal. Blurs so the background reads as out of focus. */
  scrim: {
    blur: 8,
    saturate: 1,
    fillAlpha: { dark: 0.64, light: 0.48 },
    rimAlpha: { dark: 0, light: 0 },
    usage: 'Behind dialogs, drawers and sheets.',
  },
} as const satisfies Record<string, GlassRecipe>;

export type GlassToken = keyof typeof GLASS;

/**
 * Glow.
 *
 * Light emission is SYLORA's signature. It marks things that are *active*:
 * live, generating, focused, earning. Glow is never decorative on a resting
 * element, because if everything glows nothing is emphasised.
 *
 * Values are spread radii; the colour is supplied by the consuming component
 * from its semantic family, so a live badge glows flux and an AI action glows
 * iris without duplicating the recipe.
 */
export const GLOW = {
  subtle: { spread: 8, alpha: 0.24, usage: 'Focused input, selected chip.' },
  base: { spread: 16, alpha: 0.32, usage: 'Primary button hover, active nav item.' },
  strong: { spread: 28, alpha: 0.42, usage: 'Live indicator, AI generating state.' },
  halo: { spread: 48, alpha: 0.28, usage: 'Hero brand mark, celebration moments.' },
} as const;

export type GlowToken = keyof typeof GLOW;

/**
 * Focus ring.
 *
 * A two-part ring: a solid inner ring in the brand colour and an outer offset
 * ring in the canvas colour. The outer ring guarantees the focus indicator
 * survives on top of *any* background, including a brand-coloured button,
 * which a single-ring approach cannot do.
 *
 * 3px total meets WCAG 2.2 focus-appearance minimums with room to spare.
 */
export const FOCUS_RING = {
  /** Inner ring, drawn in the brand colour. */
  width: 2,
  /** Gap between the element and the inner ring. */
  offset: 2,
  /** Outer ring, drawn in the canvas colour. Wide enough to read on any fill. */
  outerWidth: 4,
} as const;
