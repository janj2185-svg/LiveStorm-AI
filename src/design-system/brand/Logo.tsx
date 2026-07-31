/**
 * SYLORA brand marks
 * ---------------------------------------------------------------------------
 * THE IDEA
 * SYLORA makes intelligence visible, and the mark shows the mechanism rather
 * than a metaphor for it: **three lenses overlapping**, each passing one part
 * of the spectrum, mixing where they cross. It is what actually happens when
 * light meets a medium, drawn at brand scale.
 *
 * WHY THIS AND NOT A LETTER
 * A letterform ties a global product to one alphabet; SYLORA ships in scripts
 * an "S" does not exist in. Three lenses are legible in every writing system,
 * survive at 16px in a browser tab, and have a native motion behaviour — they
 * rotate — which gives the brand a loading, listening and generating state
 * without inventing a separate animation language for each.
 *
 * WHY IT BLENDS DIFFERENTLY PER THEME
 * This is the detail that makes the mark belong to a light-first system. On a
 * bright ground the lenses **multiply**, because that is what physical filters
 * do to transmitted light: overlaps get deeper and the centre goes darkest. On
 * a dark ground they **screen**, because there is no light to subtract and the
 * lenses become emitters: overlaps get brighter and the centre goes white.
 *
 * The same geometry, the same three colours, the correct physics in each
 * theme — and the mark reads as unmistakably itself in both.
 *
 * CONSTRUCTION
 * Everything derives from one circle. Three identical ellipses sit on a
 * construction circle at exact thirds, each rotated so its long axis points at
 * the centre. Because the geometry is computed rather than drawn, the mark is
 * mathematically identical at every size and any parameter change stays
 * symmetric.
 *
 *   viewBox        48 x 48
 *   centre         (24, 24)
 *   construction r 7.4      distance from centre to each lens centre
 *   lens           rx 13.6, ry 9.2
 *   placement      -90, 30, 150 degrees
 *
 * The rx:ry ratio of roughly 3:2 is what makes the silhouette a rounded
 * triangle rather than a circle — a Venn diagram of three circles reads as a
 * colour-theory illustration, which is precisely what this must not look like.
 */

import type { CSSProperties } from 'react';

const VIEWBOX = 48;
const CENTRE = VIEWBOX / 2;
const CONSTRUCTION_RADIUS = 7.4;
const LENS_RX = 13.6;
const LENS_RY = 9.2;
const CORE_RADIUS = 2.5;

/** Lens placements. -90 puts the first lens on the vertical axis. */
const LENS_ANGLES = [-90, 30, 150];

export interface Lens {
  cx: number;
  cy: number;
  angle: number;
}

export const LENSES: Lens[] = LENS_ANGLES.map((angle) => {
  const rad = (angle * Math.PI) / 180;
  return {
    cx: Number((CENTRE + CONSTRUCTION_RADIUS * Math.cos(rad)).toFixed(3)),
    cy: Number((CENTRE + CONSTRUCTION_RADIUS * Math.sin(rad)).toFixed(3)),
    angle,
  };
});

/** The three spectral stops, in refraction order. */
const LENS_COLORS = ['var(--sy-aether-9)', 'var(--sy-pulse-9)', 'var(--sy-bloom-9)'];

export type LogoTone = 'spectral' | 'currentColor' | 'mono';
export type LogoState = 'rest' | 'thinking' | 'listening';

export interface LogoMarkProps {
  size?: number;
  tone?: LogoTone;
  /**
   * `thinking` rotates the lens cluster and pulses the core — used while the
   * assistant generates. `listening` breathes the core only, so an idle
   * microphone does not look like a spinner.
   */
  state?: LogoState;
  /** Give the mark an accessible name when it is not accompanied by the wordmark. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function LogoMark({
  size = 32,
  tone = 'spectral',
  state = 'rest',
  title,
  className,
  style,
}: LogoMarkProps) {
  const spectral = tone === 'spectral';

  return (
    <svg
      className={[
        'sy-logo-mark',
        `sy-logo-mark--${state}`,
        spectral && 'sy-logo-mark--spectral',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Grouped so the cluster rotates as one object. */}
      <g className="sy-logo-mark__lenses">
        {LENSES.map((lens, index) => (
          <ellipse
            key={lens.angle}
            className="sy-logo-mark__lens"
            cx={lens.cx}
            cy={lens.cy}
            rx={LENS_RX}
            ry={LENS_RY}
            transform={`rotate(${lens.angle} ${lens.cx} ${lens.cy})`}
            fill={spectral ? LENS_COLORS[index] : 'currentColor'}
            /* Mono and currentColor cannot rely on blending to stay legible. */
            opacity={spectral ? undefined : 0.62}
          />
        ))}
      </g>

      {/* The core: the light the lenses are resolving. Never blended. */}
      <circle
        className="sy-logo-mark__core"
        cx={CENTRE}
        cy={CENTRE}
        r={CORE_RADIUS}
        fill={spectral ? 'var(--sy-bg-surface)' : 'currentColor'}
      />
    </svg>
  );
}

export interface LogoWordmarkProps {
  size?: number;
  className?: string;
}

/**
 * Wordmark.
 *
 * Set in the display serif with +0.14em tracking. The wide tracking is the
 * point: at six letters, generous spacing reads as confidence and keeps the
 * word legible when it sits beside the mark at small sizes. The letters are
 * rendered as live text rather than outlines so the wordmark stays crisp at
 * any resolution and remains selectable and translatable.
 */
export function LogoWordmark({ size = 20, className }: LogoWordmarkProps) {
  return (
    <span
      className={['sy-logo-wordmark', className].filter(Boolean).join(' ')}
      style={{ fontSize: size }}
    >
      SYLORA
    </span>
  );
}

export interface LogoLockupProps {
  size?: number;
  orientation?: 'horizontal' | 'stacked';
  tone?: LogoTone;
  state?: LogoState;
  /** Optional product qualifier: "Studio", "Business", "Admin". */
  suffix?: string;
  className?: string;
}

/**
 * Lockup.
 *
 * Mark-to-wordmark ratio is fixed at 1 : 0.62 with a gap of exactly half the
 * mark's height. Those two numbers are the entire lockup specification — no
 * one ever has to eyeball the spacing again.
 */
export function LogoLockup({
  size = 32,
  orientation = 'horizontal',
  tone = 'spectral',
  state = 'rest',
  suffix,
  className,
}: LogoLockupProps) {
  return (
    <span
      className={[
        'sy-logo-lockup',
        `sy-logo-lockup--${orientation}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ gap: size * 0.5 }}
    >
      <LogoMark size={size} tone={tone} state={state} />
      <span className="sy-logo-lockup__text">
        <LogoWordmark size={size * 0.62} />
        {suffix && (
          <span className="sy-logo-lockup__suffix" style={{ fontSize: size * 0.34 }}>
            {suffix}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * AI orb.
 *
 * The assistant's presence indicator. It is *deliberately* not the logo: the
 * logo is the company, the orb is a participant in the conversation. Sharing
 * the palette but not the geometry keeps that distinction legible.
 *
 * Two counter-rotating rings at unrelated speeds produce an organic,
 * non-repeating motion from purely deterministic parts.
 */
export interface AiOrbProps {
  size?: number;
  state?: 'idle' | 'thinking' | 'speaking';
  className?: string;
}

export function AiOrb({ size = 40, state = 'idle', className }: AiOrbProps) {
  return (
    <span
      className={['sy-ai-orb', `sy-ai-orb--${state}`, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="sy-ai-orb__ring sy-ai-orb__ring--outer" />
      <span className="sy-ai-orb__ring sy-ai-orb__ring--mid" />
      <span className="sy-ai-orb__core" />
    </span>
  );
}
