/**
 * SYLORA depth — elevation, vellum and refraction
 * ---------------------------------------------------------------------------
 * The two themes express depth through different physics, because the same
 * physics do not exist in both.
 *
 * LIGHT (the primary). Depth is *occlusion and illumination*. A raised surface
 * moves closer to white while casting a soft, wide, cool-tinted shadow — the
 * behaviour of a pale object lit from above under a blue sky. Two things follow:
 *
 *   - Shadows are never black. A neutral shadow over a warm-white page reads as
 *     dirt; a cool one reads as air.
 *   - An elevated surface has **no border**. Shadow alone carries the edge.
 *     Border-plus-shadow is the single most reliable way to make a light
 *     interface look like a form from 2012.
 *
 * DARK (optional). Shadows are nearly invisible, because you cannot darken
 * near-black. Depth instead comes from surface lightness rising with elevation,
 * a 1px rim highlight as if lit from above, and a soft dark halo to detach the
 * surface from its backdrop.
 *
 * Every elevation token therefore ships a light and a dark recipe, and
 * components ask for `elevation.raised` rather than for a shadow string.
 */

import type { ThemeMode } from './color';

export interface ElevationLevel {
  /** Ramp step used for the surface fill at this elevation. */
  surfaceStep: number;
  shadow: Record<ThemeMode, string>;
  /** Top rim highlight. Dark mode only; light mode uses shadow alone. */
  rim: Record<ThemeMode, string>;
  usage: string;
}

/**
 * Six levels. More than six and the differences stop being perceptible; fewer
 * and a modal cannot separate from a drawer.
 *
 * Light-mode shadows are built from two layers — a tight contact shadow and a
 * wide ambient one. A single shadow always looks either too hard or too vague;
 * the pair is what reads as a real object on a real surface.
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
      light: 'inset 0 1px 2px 0 var(--shadow-color-06), inset 0 0 0 1px var(--shadow-color-04)',
      dark: 'inset 0 1px 3px 0 var(--shadow-color-32)',
    },
    rim: { light: 'none', dark: 'inset 0 -1px 0 0 var(--rim-color-04)' },
    usage: 'Input wells, track grooves, inset media, segmented-control tracks.',
  },
  surface: {
    surfaceStep: 2,
    shadow: {
      light: '0 1px 2px -1px var(--shadow-color-08), 0 4px 10px -4px var(--shadow-color-06)',
      dark: '0 1px 2px 0 var(--shadow-color-24)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-06)' },
    usage: 'Cards, list rows, panels resting on the page.',
  },
  raised: {
    surfaceStep: 3,
    shadow: {
      light: '0 2px 4px -2px var(--shadow-color-08), 0 10px 24px -8px var(--shadow-color-10)',
      dark: '0 2px 6px -1px var(--shadow-color-32), 0 8px 20px -6px var(--shadow-color-24)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-08)' },
    usage: 'Hovered cards, dropdowns, popovers, floating controls.',
  },
  overlay: {
    surfaceStep: 3,
    shadow: {
      light: '0 8px 16px -10px var(--shadow-color-10), 0 28px 56px -20px var(--shadow-color-14)',
      dark: '0 10px 24px -6px var(--shadow-color-40), 0 28px 56px -16px var(--shadow-color-32)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-10)' },
    usage: 'Dialogs, sheets, command palette.',
  },
  lifted: {
    surfaceStep: 4,
    shadow: {
      light: '0 16px 32px -16px var(--shadow-color-12), 0 48px 88px -32px var(--shadow-color-16)',
      dark: '0 18px 40px -12px var(--shadow-color-48), 0 48px 96px -32px var(--shadow-color-40)',
    },
    rim: { light: 'none', dark: 'inset 0 1px 0 0 var(--rim-color-12)' },
    usage: 'Dragged objects, the single focused element in a spotlight state.',
  },
} as const satisfies Record<string, ElevationLevel>;

export type ElevationToken = keyof typeof ELEVATION;

/**
 * Vellum — SYLORA's translucent material.
 *
 * Named for the material it behaves like rather than for the CSS property that
 * produces it. Vellum is not "frosted glass over a dark scene"; on a bright
 * ground it is a sheet of fine translucent paper, so it *brightens* what is
 * behind it rather than dimming it. That is the difference between a light
 * interface that looks lit and one that looks fogged.
 *
 * Three cooperating layers: a backdrop filter that blurs and lifts brightness
 * and saturation, a translucent fill that keeps text contrast above threshold,
 * and a rim that defines the edge.
 *
 * Used only where a surface genuinely floats over *moving or photographic*
 * content — stream chrome, media controls, navigation above a scrolling feed.
 * Applying it to an ordinary card on a flat page produces blur with nothing to
 * blur, at real GPU cost, for no gain.
 */
export interface VellumRecipe {
  blur: number;
  saturate: number;
  /** Brightness lift. Above 1 in light mode: vellum transmits, it does not dim. */
  brightness: Record<ThemeMode, number>;
  fillAlpha: Record<ThemeMode, number>;
  rimAlpha: Record<ThemeMode, number>;
  usage: string;
}

export const VELLUM = {
  /** Light veil. Sticky headers over scrolling content. */
  veil: {
    blur: 14,
    saturate: 1.5,
    brightness: { light: 1.06, dark: 0.96 },
    fillAlpha: { light: 0.66, dark: 0.62 },
    rimAlpha: { light: 0.72, dark: 0.08 },
    usage: 'Sticky top bars and tab bars over feeds.',
  },
  /** Standard. Floating panels over media. */
  panel: {
    blur: 26,
    saturate: 1.7,
    brightness: { light: 1.08, dark: 0.94 },
    fillAlpha: { light: 0.74, dark: 0.72 },
    rimAlpha: { light: 0.8, dark: 0.1 },
    usage: 'Stream chrome, player controls, floating toolbars.',
  },
  /** Heavy. Modal surfaces that must dominate their backdrop. */
  dome: {
    blur: 44,
    saturate: 1.9,
    brightness: { light: 1.1, dark: 0.92 },
    fillAlpha: { light: 0.86, dark: 0.82 },
    rimAlpha: { light: 0.9, dark: 0.14 },
    usage: 'Command palette, AI surface, media-context dialogs.',
  },
  /** Scrim behind a modal. Blurs so the background reads as out of focus. */
  scrim: {
    blur: 10,
    saturate: 1,
    brightness: { light: 1, dark: 1 },
    fillAlpha: { light: 0.42, dark: 0.64 },
    rimAlpha: { light: 0, dark: 0 },
    usage: 'Behind dialogs, drawers and sheets.',
  },
} as const satisfies Record<string, VellumRecipe>;

export type VellumToken = keyof typeof VELLUM;

/**
 * Refraction — the signature treatment.
 *
 * This replaces the glow language that a dark-first system would use. A halo is
 * invisible on white, so emphasis on a bright ground comes from the other thing
 * light does when it meets a surface: it *separates*.
 *
 * A refraction edge is a hairline whose hue travels along its length, in the
 * order light actually splits — cyan, indigo, magenta. At 1px it is almost
 * subliminal; you register that an edge is *alive* before you register that it
 * is coloured. It is the one visual device unique to SYLORA, so it is rationed
 * hard: it marks brand surfaces, AI-authored content, and the single most
 * important action in a view. Nothing else.
 *
 * `weight` is the border width; `spread` is the optional bloom behind the edge,
 * which only becomes visible in dark mode where a true glow is possible.
 */
export const REFRACTION = {
  hairline: { weight: 1, spread: 0, alpha: 0.9, usage: 'Brand surfaces, AI-authored cards.' },
  edge: { weight: 1, spread: 10, alpha: 0.55, usage: 'Focused brand controls, active states.' },
  bloom: { weight: 1.5, spread: 24, alpha: 0.42, usage: 'Live indicators, generating states.' },
  halo: { weight: 2, spread: 48, alpha: 0.3, usage: 'Hero brand mark, celebration moments.' },
} as const;

export type RefractionToken = keyof typeof REFRACTION;

/**
 * Focus ring.
 *
 * Two parts: a solid inner ring in the brand colour and an outer offset ring in
 * the canvas colour. The outer ring guarantees the indicator survives on top of
 * *any* background, including a brand-coloured button, which a single ring
 * cannot do. Together they clear the WCAG 2.2 focus-appearance minimum with
 * room to spare.
 */
export const FOCUS_RING = {
  /** Inner ring, drawn in the brand colour. */
  width: 2,
  /** Gap between the element and the inner ring. */
  offset: 2,
  /** Outer ring, drawn in the canvas colour. Wide enough to read on any fill. */
  outerWidth: 4,
} as const;
