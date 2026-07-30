/**
 * Token compiler.
 * ---------------------------------------------------------------------------
 * Reads the authoritative TypeScript tokens and emits three artefacts:
 *
 *   src/design-system/styles/tokens.css   CSS custom properties, both themes
 *   design/tokens.figma.json              W3C DTCG format for Figma / Tokens Studio
 *   design/contrast-audit.json            WCAG 2.2 evidence for every text pair
 *
 * Colour is authored in OKLCH but Figma cannot read OKLCH, and older engines
 * need a fallback. This script therefore implements a full OKLCH -> sRGB
 * pipeline including gamut mapping, so the hex values it emits are the true
 * rendered colours rather than approximations.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALPHA_STEPS,
  COLOR_FAMILIES,
  COLOR_FAMILY_NAMES,
  DURATION,
  EASING,
  ELEVATION,
  FLUID_DISPLAY,
  FLUID_VIEWPORT,
  FONT_FAMILIES,
  GLASS,
  GLOW,
  GRADIENTS,
  GRID,
  MEASURE,
  RADIUS,
  SHELL,
  SPACE,
  STAGGER,
  TRANSITION,
  TRAVEL,
  TYPE_SCALE,
  Z_INDEX,
  buildRamp,
  type ColorFamily,
  type ThemeMode,
} from '../src/design-system/tokens/index.js';
import { contrastRatio, oklchToHex } from '../src/design-system/tokens/color-science.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/* ------------------------------------------------------------------ */
/* Ramp materialisation                                                */
/* ------------------------------------------------------------------ */

interface MaterialStep {
  step: number;
  oklch: string;
  hex: string;
}

type MaterialRamp = Record<ColorFamily, MaterialStep[]>;

function materialise(mode: ThemeMode): MaterialRamp {
  return Object.fromEntries(
    COLOR_FAMILY_NAMES.map((family) => [
      family,
      buildRamp(family, mode).map((color, index) => ({
        step: index + 1,
        oklch: `oklch(${(color.l * 100).toFixed(2)}% ${color.c.toFixed(4)} ${color.h})`,
        hex: oklchToHex(color.l, color.c, color.h),
      })),
    ]),
  ) as MaterialRamp;
}

const THEMES: ThemeMode[] = ['dark', 'light'];
const materialised: Record<ThemeMode, MaterialRamp> = {
  dark: materialise('dark'),
  light: materialise('light'),
};

/* ------------------------------------------------------------------ */
/* Semantic layer                                                      */
/* ------------------------------------------------------------------ */

/**
 * Semantic aliases resolve to `family.step` pairs. Screens only ever touch
 * these names, which is what makes a hue change a one-line edit.
 */
const SEMANTIC: Record<string, `${ColorFamily}.${number}`> = {
  'bg-canvas': 'neutral.1',
  'bg-surface': 'neutral.2',
  'bg-raised': 'neutral.3',
  'bg-hover': 'neutral.4',
  'bg-active': 'neutral.5',
  'border-subtle': 'neutral.6',
  'border-default': 'neutral.7',
  'border-strong': 'neutral.8',
  // The only border token guaranteed >= 3:1. Any boundary that is the *sole*
  // indicator of a control or its state must use this, not border-strong.
  'border-interactive': 'neutral.9',
  'fg-quiet': 'neutral.8',
  'fg-muted': 'neutral.11',
  'fg-default': 'neutral.12',
  'accent-bg': 'iris.3',
  'accent-bg-hover': 'iris.4',
  'accent-border': 'iris.7',
  'accent-solid': 'iris.9',
  'accent-solid-hover': 'iris.10',
  'accent-fg': 'iris.11',
  'live-bg': 'flux.3',
  'live-border': 'flux.7',
  'live-solid': 'flux.9',
  'live-fg': 'flux.11',
  'creator-bg': 'nova.3',
  'creator-border': 'nova.7',
  'creator-solid': 'nova.9',
  'creator-fg': 'nova.11',
  'success-bg': 'verdant.3',
  'success-border': 'verdant.7',
  'success-solid': 'verdant.9',
  'success-fg': 'verdant.11',
  'warning-bg': 'solar.3',
  'warning-border': 'solar.7',
  'warning-solid': 'solar.9',
  'warning-fg': 'solar.11',
  'danger-bg': 'crimson.3',
  'danger-border': 'crimson.7',
  'danger-solid': 'crimson.9',
  'danger-fg': 'crimson.11',
};

const resolveSemantic = (mode: ThemeMode, alias: string): MaterialStep => {
  const [family, step] = SEMANTIC[alias].split('.') as [ColorFamily, string];
  return materialised[mode][family][Number(step) - 1];
};

/**
 * Text placed on a solid step-9 fill.
 *
 * Computed, not chosen: for each family we measure black and white against the
 * rendered step-9 hex and keep whichever wins. This is why a solar button gets
 * dark text while an iris button gets light text without anyone deciding it.
 */
function onSolidColor(mode: ThemeMode, family: ColorFamily): string {
  const solid = materialised[mode][family][8].hex;
  const rampTop = materialised[mode].neutral[11].hex;
  const rampBottom = materialised[mode].neutral[0].hex;
  return contrastRatio(rampTop, solid) >= contrastRatio(rampBottom, solid) ? rampTop : rampBottom;
}

/* ------------------------------------------------------------------ */
/* CSS emission                                                        */
/* ------------------------------------------------------------------ */

const lines: string[] = [];
const push = (line = '') => lines.push(line);

push('/*');
push(' * SYLORA design tokens — GENERATED FILE, DO NOT EDIT.');
push(' * Source of truth: src/design-system/tokens/*.ts');
push(' * Regenerate:      pnpm tokens');
push(' *');
push(' * Colours are emitted twice: a gamut-mapped sRGB hex fallback first, then');
push(' * the authored OKLCH value inside an @supports guard. Engines with wide-gamut');
push(' * support get the real colour; everything else gets a faithful approximation.');
push(' */');
push();

/* --- Theme-independent primitives --- */
push(':root {');
push('  /* Spacing — 4px lattice */');
for (const [key, value] of Object.entries(SPACE)) {
  push(`  --sy-space-${key.replace('.', '_')}: ${value}px;`);
}
push();
push('  /* Radius — concentric-safe scale */');
for (const [key, value] of Object.entries(RADIUS)) {
  push(`  --sy-radius-${key}: ${value}px;`);
}
push();
push('  /* Typography */');
for (const [key, value] of Object.entries(FONT_FAMILIES)) {
  push(`  --sy-font-${key}: ${value};`);
}
for (const [name, style] of Object.entries(TYPE_SCALE)) {
  const fluid = FLUID_DISPLAY[name as keyof typeof FLUID_DISPLAY];
  const size = fluid
    ? `clamp(${fluid.min}px, ${(
        ((fluid.max - fluid.min) / (FLUID_VIEWPORT.max - FLUID_VIEWPORT.min)) *
        100
      ).toFixed(4)}vw + ${(
        fluid.min -
        ((fluid.max - fluid.min) / (FLUID_VIEWPORT.max - FLUID_VIEWPORT.min)) * FLUID_VIEWPORT.min
      ).toFixed(3)}px, ${fluid.max}px)`
    : `${style.size}px`;
  push(`  --sy-type-${name}-size: ${size};`);
  push(`  --sy-type-${name}-line: ${style.lineHeight}px;`);
  push(`  --sy-type-${name}-weight: ${style.weight};`);
  push(`  --sy-type-${name}-tracking: ${style.tracking}em;`);
}
push();
push('  /* Measure */');
for (const [key, value] of Object.entries(MEASURE)) {
  push(`  --sy-measure-${key}: ${value};`);
}
push();
push('  /* Motion */');
for (const [key, value] of Object.entries(DURATION)) {
  push(`  --sy-dur-${key}: ${value}ms;`);
}
for (const [key, value] of Object.entries(EASING)) {
  push(`  --sy-ease-${key}: ${value};`);
}
for (const [key, value] of Object.entries(TRANSITION)) {
  push(`  --sy-transition-${key}: ${value};`);
}
for (const [key, value] of Object.entries(STAGGER)) {
  if (typeof value === 'number' && key !== 'maxItems') push(`  --sy-stagger-${key}: ${value}ms;`);
}
for (const [key, value] of Object.entries(TRAVEL)) {
  push(`  --sy-travel-${key}: ${value}px;`);
}
push();
push('  /* Layout shell */');
for (const [key, value] of Object.entries(SHELL)) {
  push(`  --sy-shell-${key}: ${value}px;`);
}
push();
push('  /* Z-index */');
for (const [key, value] of Object.entries(Z_INDEX)) {
  push(`  --sy-z-${key}: ${value};`);
}
push();
push('  /* Glass */');
for (const [key, recipe] of Object.entries(GLASS)) {
  push(`  --sy-glass-${key}-blur: ${recipe.blur}px;`);
  push(`  --sy-glass-${key}-saturate: ${recipe.saturate};`);
}
push();
push('  /* Glow spreads */');
for (const [key, recipe] of Object.entries(GLOW)) {
  push(`  --sy-glow-${key}-spread: ${recipe.spread}px;`);
  push(`  --sy-glow-${key}-alpha: ${recipe.alpha};`);
}
push('}');
push();

/* --- Responsive grid --- */
push('/* Responsive grid — column count, margin and gutter per breakpoint */');
for (const [breakpoint, config] of Object.entries(GRID)) {
  const minWidth = {
    compact: 0,
    handheld: 480,
    tablet: 768,
    laptop: 1024,
    desktop: 1280,
    wide: 1600,
  }[breakpoint as keyof typeof GRID];
  const open = minWidth === 0 ? ':root {' : `@media (min-width: ${minWidth}px) { :root {`;
  const close = minWidth === 0 ? '}' : '} }';
  push(open);
  push(`  --sy-grid-columns: ${config.columns};`);
  push(`  --sy-grid-margin: ${config.margin}px;`);
  push(`  --sy-grid-gutter: ${config.gutter}px;`);
  push(`  --sy-grid-max: ${config.maxContent === null ? '100%' : `${config.maxContent}px`};`);
  push(close);
}
push();

/* --- Colour, per theme --- */
function emitTheme(mode: ThemeMode, selector: string, useOklch: boolean) {
  push(`${selector} {`);
  push(`  color-scheme: ${mode};`);

  for (const family of COLOR_FAMILY_NAMES) {
    for (const entry of materialised[mode][family]) {
      push(`  --sy-${family}-${entry.step}: ${useOklch ? entry.oklch : entry.hex};`);
    }
  }
  push();

  for (const alias of Object.keys(SEMANTIC)) {
    const resolved = resolveSemantic(mode, alias);
    push(`  --sy-${alias}: ${useOklch ? resolved.oklch : resolved.hex};`);
  }
  push();

  for (const family of COLOR_FAMILY_NAMES) {
    if (family === 'neutral') continue;
    push(`  --sy-on-${family}: ${onSolidColor(mode, family)};`);
  }
  push();

  // Translucent overlays. `hi` is a light veil, `lo` is a dark veil.
  const hi = materialised[mode].neutral[11];
  const lo = materialised[mode].neutral[0];
  for (const alpha of ALPHA_STEPS) {
    const token = String(Math.round(alpha * 100)).padStart(2, '0');
    push(
      `  --sy-alpha-hi-${token}: ${
        useOklch ? hi.oklch.replace(')', ` / ${alpha})`) : `${hi.hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      };`,
    );
    push(
      `  --sy-alpha-lo-${token}: ${
        useOklch ? lo.oklch.replace(')', ` / ${alpha})`) : `${lo.hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      };`,
    );
  }
  push();

  // Shadow and rim colours consumed by the elevation recipes.
  const shadowBase = mode === 'dark' ? 'oklch(2% 0.01 282' : 'oklch(28% 0.03 282';
  const shadowHex = mode === 'dark' ? '#040207' : '#3b3448';
  for (const alpha of [0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.24, 0.32, 0.4, 0.48]) {
    const token = String(Math.round(alpha * 100)).padStart(2, '0');
    push(
      `  --shadow-color-${token}: ${
        useOklch ? `${shadowBase} / ${alpha})` : `${shadowHex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      };`,
    );
  }
  for (const alpha of [0.04, 0.06, 0.08, 0.1, 0.12]) {
    const token = String(Math.round(alpha * 100)).padStart(2, '0');
    push(
      `  --rim-color-${token}: ${
        useOklch ? hi.oklch.replace(')', ` / ${alpha})`) : `${hi.hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      };`,
    );
  }
  push();

  // Elevation recipes: shadow plus, in dark mode, a rim highlight.
  for (const [name, level] of Object.entries(ELEVATION)) {
    const shadow = level.shadow[mode];
    const rim = level.rim[mode];
    const composed = [rim, shadow].filter((part) => part && part !== 'none').join(', ') || 'none';
    push(`  --sy-elevation-${name}: ${composed};`);
  }
  push();

  // Glass fill and rim, per recipe.
  for (const [name, recipe] of Object.entries(GLASS)) {
    const surface = materialised[mode].neutral[1];
    const rimSource = materialised[mode].neutral[11];
    push(
      `  --sy-glass-${name}-fill: ${
        useOklch
          ? surface.oklch.replace(')', ` / ${recipe.fillAlpha[mode]})`)
          : `${surface.hex}${Math.round(recipe.fillAlpha[mode] * 255).toString(16).padStart(2, '0')}`
      };`,
    );
    push(
      `  --sy-glass-${name}-rim: ${
        useOklch
          ? rimSource.oklch.replace(')', ` / ${recipe.rimAlpha[mode]})`)
          : `${rimSource.hex}${Math.round(recipe.rimAlpha[mode] * 255).toString(16).padStart(2, '0')}`
      };`,
    );
  }
  push();

  // Signature gradients, built from step 9 of each stop family.
  for (const [name, gradient] of Object.entries(GRADIENTS)) {
    const stops = gradient.stops
      .map((family, index) => {
        const entry = materialised[mode][family][8];
        const position = (index / (gradient.stops.length - 1)) * 100;
        return `${useOklch ? entry.oklch : entry.hex} ${position.toFixed(0)}%`;
      })
      .join(', ');
    push(`  --sy-gradient-${name}: linear-gradient(${gradient.angle}deg, ${stops});`);
  }

  push('}');
  push();
}

push('/* ===== Fallback layer: gamut-mapped sRGB ===== */');
emitTheme('dark', '[data-theme="dark"], :root', false);
emitTheme('light', '[data-theme="light"]', false);

push('/* ===== Wide-gamut layer: authored OKLCH ===== */');
push('@supports (color: oklch(50% 0.1 200)) {');
const oklchLines: string[] = [];
const originalPush = lines.push.bind(lines);
lines.push = ((...args: string[]) => oklchLines.push(...args)) as typeof lines.push;
emitTheme('dark', '[data-theme="dark"], :root', true);
emitTheme('light', '[data-theme="light"]', true);
lines.push = originalPush;
for (const line of oklchLines) push(line ? `  ${line}` : '');
push('}');
push();

push('/* Reduced motion: replace travel with a short fade, keep events firing. */');
push('@media (prefers-reduced-motion: reduce) {');
push('  :root {');
for (const key of Object.keys(DURATION)) push(`    --sy-dur-${key}: 1ms;`);
for (const key of Object.keys(TRANSITION)) push(`    --sy-transition-${key}: 120ms linear;`);
for (const key of Object.keys(TRAVEL)) push(`    --sy-travel-${key}: 0px;`);
push('  }');
push('}');

const cssPath = resolve(ROOT, 'src/design-system/styles/tokens.css');
mkdirSync(dirname(cssPath), { recursive: true });
writeFileSync(cssPath, `${lines.join('\n')}\n`, 'utf8');

/* ------------------------------------------------------------------ */
/* Figma / DTCG export                                                 */
/* ------------------------------------------------------------------ */

interface DtcgToken {
  $type: string;
  $value: string | number;
  $description?: string;
}

const figma: Record<string, unknown> = {
  $description:
    'SYLORA design tokens in W3C DTCG format. Import via Tokens Studio for Figma. ' +
    'Colours are gamut-mapped sRGB equivalents of the authored OKLCH values.',
};

for (const mode of THEMES) {
  const colorGroup: Record<string, Record<string, DtcgToken>> = {};
  for (const family of COLOR_FAMILY_NAMES) {
    colorGroup[family] = Object.fromEntries(
      materialised[mode][family].map((entry) => [
        String(entry.step),
        {
          $type: 'color',
          $value: entry.hex,
          $description: `${family} step ${entry.step} — ${entry.oklch}`,
        },
      ]),
    );
  }
  const semanticGroup = Object.fromEntries(
    Object.entries(SEMANTIC).map(([alias, target]) => [
      alias,
      {
        $type: 'color',
        $value: resolveSemantic(mode, alias).hex,
        $description: `Alias of ${target}`,
      } satisfies DtcgToken,
    ]),
  );
  figma[mode] = { color: colorGroup, semantic: semanticGroup };
}

figma.dimension = {
  space: Object.fromEntries(
    Object.entries(SPACE).map(([key, value]) => [key, { $type: 'dimension', $value: `${value}px` }]),
  ),
  radius: Object.fromEntries(
    Object.entries(RADIUS).map(([key, value]) => [key, { $type: 'dimension', $value: `${value}px` }]),
  ),
};

figma.typography = Object.fromEntries(
  Object.entries(TYPE_SCALE).map(([name, style]) => [
    name,
    {
      $type: 'typography',
      $value: {
        fontFamily: FONT_FAMILIES[style.family],
        fontSize: `${style.size}px`,
        lineHeight: `${style.lineHeight}px`,
        fontWeight: style.weight,
        letterSpacing: `${style.tracking}em`,
      },
      $description: style.role,
    },
  ]),
);

figma.duration = Object.fromEntries(
  Object.entries(DURATION).map(([key, value]) => [key, { $type: 'duration', $value: `${value}ms` }]),
);

figma.cubicBezier = Object.fromEntries(
  Object.entries(EASING)
    .filter(([, value]) => value.startsWith('cubic-bezier'))
    .map(([key, value]) => [
      key,
      {
        $type: 'cubicBezier',
        $value: value.replace('cubic-bezier(', '').replace(')', '').split(',').map((n) => Number(n.trim())),
      },
    ]),
);

const figmaPath = resolve(ROOT, 'design/tokens.figma.json');
mkdirSync(dirname(figmaPath), { recursive: true });
writeFileSync(figmaPath, `${JSON.stringify(figma, null, 2)}\n`, 'utf8');

/* ------------------------------------------------------------------ */
/* Contrast audit                                                      */
/* ------------------------------------------------------------------ */

interface AuditRow {
  theme: ThemeMode;
  pair: string;
  ratio: number;
  requirement: number;
  level: string;
  pass: boolean;
}

const audit: AuditRow[] = [];

function check(theme: ThemeMode, pair: string, fg: string, bg: string, requirement: number, level: string) {
  const ratio = contrastRatio(fg, bg);
  audit.push({ theme, pair, ratio, requirement, level, pass: ratio >= requirement });
}

for (const mode of THEMES) {
  const ramp = materialised[mode];
  const canvas = ramp.neutral[0].hex;
  const surface = ramp.neutral[1].hex;
  const raised = ramp.neutral[2].hex;

  // Body and secondary text against all three background steps.
  for (const [bgName, bg] of [
    ['canvas', canvas],
    ['surface', surface],
    ['raised', raised],
  ] as const) {
    check(mode, `fg-default on bg-${bgName}`, ramp.neutral[11].hex, bg, 7, 'AAA body');
    check(mode, `fg-muted on bg-${bgName}`, ramp.neutral[10].hex, bg, 4.5, 'AA body');
  }

  // Accent text and solid fills.
  for (const family of COLOR_FAMILY_NAMES) {
    if (family === 'neutral') continue;
    check(mode, `${family}-11 text on surface`, ramp[family][10].hex, surface, 4.5, 'AA body');
    check(mode, `on-${family} text on ${family}-9 solid`, onSolidColor(mode, family), ramp[family][8].hex, 4.5, 'AA body');
    // Step 9 is the state-bearing step: a selected border, a filled control,
    // an active indicator. It must clear the 3:1 non-text threshold.
    check(mode, `${family}-9 solid against canvas`, ramp[family][8].hex, canvas, 3, 'AA non-text');
    check(mode, `${family}-9 solid against surface`, ramp[family][8].hex, surface, 3, 'AA non-text');
    // Step 8 is decorative emphasis — a hovered edge, a nested divider. It is
    // never the sole indicator of a control, so it only has to be visible.
    check(mode, `${family}-8 emphasis on surface`, ramp[family][7].hex, surface, 1.5, 'Perceivable edge');
  }

  // Structural borders.
  check(mode, 'border-default on surface', ramp.neutral[6].hex, surface, 1.3, 'Perceivable hairline');
  check(mode, 'border-strong on surface', ramp.neutral[7].hex, surface, 1.5, 'Perceivable edge');
  check(mode, 'border-interactive on surface', ramp.neutral[8].hex, surface, 3, 'AA non-text');
  check(mode, 'focus ring (iris-9) on canvas', ramp.iris[8].hex, canvas, 3, 'AA focus indicator');
  check(mode, 'focus ring (iris-9) on surface', ramp.iris[8].hex, surface, 3, 'AA focus indicator');
}

const failures = audit.filter((row) => !row.pass);
const auditPath = resolve(ROOT, 'design/contrast-audit.json');
mkdirSync(dirname(auditPath), { recursive: true });
writeFileSync(
  auditPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      standard: 'WCAG 2.2',
      note:
        'Ratios computed from gamut-mapped sRGB hex, which is what a display actually renders. ' +
        'Wide-gamut OKLCH rendering has equal or greater separation.',
      summary: { total: audit.length, passed: audit.length - failures.length, failed: failures.length },
      results: audit,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`tokens.css        ${lines.length} lines`);
console.log(`tokens.figma.json ${Object.keys(figma).length} groups`);
console.log(`contrast-audit    ${audit.length - failures.length}/${audit.length} passed`);

if (failures.length > 0) {
  console.error('\nContrast failures:');
  for (const row of failures) {
    console.error(`  [${row.theme}] ${row.pair}: ${row.ratio}:1 (needs ${row.requirement}:1 — ${row.level})`);
  }
  process.exitCode = 1;
}
