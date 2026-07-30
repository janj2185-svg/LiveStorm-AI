/**
 * SYLORA brand marks
 * ---------------------------------------------------------------------------
 * THE IDEA
 * SYLORA's product is intelligence made visible. The mark is therefore an
 * *aperture*: three blades around a void, the instrument that gathers light
 * and focuses it into an image. It is the shape of a lens, an eye, and a
 * portal at the same time.
 *
 * WHY AN APERTURE AND NOT A LETTER
 * A letterform mark ties a global brand to one alphabet. An aperture is
 * legible in every writing system, survives at 16px in a browser tab, and —
 * crucially — has a native motion behaviour. Blades rotate. That single degree
 * of freedom gives the brand a loading state, a listening state and a
 * generating state without inventing a separate animation language.
 *
 * CONSTRUCTION
 * Everything derives from one circle. Blades are arcs of a single construction
 * radius, stroked with round caps, spaced at exact thirds. The centre void is
 * the negative space left behind. Because the geometry is computed rather than
 * drawn, the mark is mathematically identical at every size and any parameter
 * change stays symmetric.
 *
 *   viewBox        48 x 48
 *   centre         (24, 24)
 *   construction r 14.5
 *   blade weight   10  -> inner edge 9.5, outer edge 19.5
 *   blade sweep    66 degrees, repeated every 120 degrees
 *   core radius    3.4
 *
 * The 66/54 split between blade and gap is the smallest gap that still reads
 * as three separate blades once round caps have eaten into it.
 */

import type { CSSProperties } from 'react';

const VIEWBOX = 48;
const CENTRE = VIEWBOX / 2;
const CONSTRUCTION_RADIUS = 14.5;
const BLADE_WEIGHT = 10;
const BLADE_SWEEP = 66;
const CORE_RADIUS = 3.4;

/** Point on the construction circle at a given angle. */
function pointAt(angleDeg: number, radius = CONSTRUCTION_RADIUS): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTRE + radius * Math.cos(rad), CENTRE + radius * Math.sin(rad)];
}

/** One blade, as an SVG arc command. Angles increase clockwise on screen. */
function bladePath(startAngle: number): string {
  const [x1, y1] = pointAt(startAngle);
  const [x2, y2] = pointAt(startAngle + BLADE_SWEEP);
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${CONSTRUCTION_RADIUS} ${CONSTRUCTION_RADIUS} 0 0 1 ${x2.toFixed(
    3,
  )} ${y2.toFixed(3)}`;
}

/** Blades begin at -90 so the first one is centred on the vertical axis. */
const BLADE_ANGLES = [-90, 30, 150];
export const BLADE_PATHS = BLADE_ANGLES.map(bladePath);

export type LogoTone = 'gradient' | 'currentColor' | 'mono';
export type LogoState = 'rest' | 'thinking' | 'listening';

export interface LogoMarkProps {
  size?: number;
  tone?: LogoTone;
  /**
   * `thinking` spins the blades and pulses the core — used while the assistant
   * generates. `listening` breathes the core only, so an idle microphone does
   * not look like a spinner.
   */
  state?: LogoState;
  /** Give the mark an accessible name when it is not accompanied by the wordmark. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

let gradientSeed = 0;

export function LogoMark({
  size = 32,
  tone = 'gradient',
  state = 'rest',
  title,
  className,
  style,
}: LogoMarkProps) {
  // Unique per instance: multiple marks on one page must not share a gradient
  // id, or the first one wins and the rest render flat.
  const gradientId = `sy-logo-gradient-${(gradientSeed += 1)}`;
  const stroke = tone === 'gradient' ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg
      className={['sy-logo-mark', `sy-logo-mark--${state}`, className].filter(Boolean).join(' ')}
      style={style}
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {tone === 'gradient' && (
        <defs>
          {/*
            The gradient runs across the mark on the same 135 degree axis as the
            brand's aurora gradient, so the logo and the backdrop agree.
          */}
          <linearGradient id={gradientId} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--sy-iris-9)" />
            <stop offset="52%" stopColor="var(--sy-flux-9)" />
            <stop offset="100%" stopColor="var(--sy-nova-9)" />
          </linearGradient>
        </defs>
      )}

      {/* Blades. Grouped so the whole aperture can rotate as one object. */}
      <g className="sy-logo-mark__blades">
        {BLADE_PATHS.map((d, index) => (
          <path
            key={d}
            d={d}
            stroke={stroke}
            strokeWidth={BLADE_WEIGHT}
            strokeLinecap="round"
            style={{ ['--blade-index' as string]: index }}
          />
        ))}
      </g>

      {/* The core: the light the aperture is gathering. */}
      <circle
        className="sy-logo-mark__core"
        cx={CENTRE}
        cy={CENTRE}
        r={CORE_RADIUS}
        fill={tone === 'gradient' ? 'var(--sy-flux-9)' : 'currentColor'}
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
 * Set in Sora at weight 600 with +0.14em tracking. The wide tracking is the
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
  tone = 'gradient',
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
 * Three nested rings at different rotation speeds produce an organic,
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
