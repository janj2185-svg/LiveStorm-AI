# Foundations

Colour, typography, space, shape, elevation and grid. Everything in the product
is built from these values, and nothing outside this document is permitted as a
literal in component or screen code.

The authoritative source is `src/design-system/tokens/*.ts`. Running
`pnpm tokens` compiles those modules into three artefacts:

| Artefact | Purpose |
|---|---|
| `src/design-system/styles/tokens.css` | Runtime CSS custom properties, both themes |
| `design/tokens.figma.json` | W3C DTCG format for Figma / Tokens Studio import |
| `design/contrast-audit.json` | Machine-checked WCAG evidence for every text pair |

---

## 1. Colour

### 1.1 Why OKLCH

A designer picking hex values by eye produces ramps where "the same" step looks
heavier in blue than in yellow, because sRGB is not perceptually uniform. OKLCH
separates perceived **L**ightness from **C**hroma and **H**ue, so one fixed
lightness curve reads as the same visual weight at every hue.

That single decision is what lets the system promise contrast ratios *per step*
instead of auditing 600 individual colours.

Colours are emitted twice in `tokens.css`: a gamut-mapped sRGB hex fallback
first, then the authored OKLCH value inside an `@supports` guard. Wide-gamut
displays get the real colour; everything else gets a faithful approximation.
Out-of-gamut colours are mapped by **reducing chroma while holding lightness and
hue**, so a colour that cannot be shown becomes a less saturated version of
itself rather than shifting hue, which is what naive per-channel clipping does.

### 1.2 The 12-step contract

Every family is a 12-step ramp where the step index has a **fixed meaning**. A
component never says "use violet-600"; it says "use step 9 of the active
accent". Re-theming is therefore a hue swap, not a redesign.

| Step | Role | Use |
|---|---|---|
| 1 | `canvas` | Furthest-back app background |
| 2 | `surface` | Cards, sheets, panels |
| 3 | `raised` | Surfaces on surfaces, inputs at rest |
| 4 | `hover` | Interactive background, hovered |
| 5 | `active` | Interactive background, pressed or selected |
| 6 | `borderSubtle` | Dividers, hairlines |
| 7 | `border` | Default component border |
| 8 | `borderStrong` | Decorative emphasis, hovered edge |
| 9 | `solid` | The load-bearing fill: primary buttons, brand marks, state indicators |
| 10 | `solidHover` | Step 9, hovered |
| 11 | `textMuted` | Secondary text |
| 12 | `text` | Primary text |

Steps 1–5 are backgrounds, 6–8 are borders, 9–10 are fills, 11–12 are text. **A
component that respects that grammar is automatically accessible.**

> **Step 8 is not an accessible boundary.** It is decorative emphasis and is
> never the sole indicator of a control or its state. Any boundary that *is* the
> sole indicator must use `--sy-border-interactive` (neutral step 9), which is
> the only border token guaranteed ≥ 3:1.

### 1.3 The curves

Lightness curves are deliberately not mirrors of each other. Dark mode needs a
wider gap between steps 1–3 (depth must be legible in low light); light mode
needs a wider gap between 8–12 (text must punch through a bright field).

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Dark L** | .155 | .188 | .223 | .253 | .285 | .328 | .390 | .482 | .620\* | .678\* | .790 | .968 |
| **Light L** | .994 | .982 | .964 | .945 | .925 | .897 | .860 | .775 | .560\* | .505\* | .472 | .235 |

\* Steps 9 and 10 are solved numerically — see 1.5.

Dark mode starts at L .155, not black. True black clips OLED sub-pixels, kills
the sense of depth, and leaves no room to express elevation with light.

Chroma follows an envelope expressed as a fraction of each family's peak, and
**peaks at step 9** — the one step that must command attention — falling away
toward both ends. Backgrounds stay near-neutral so content, not chrome, carries
the colour. Text desaturates at step 12 because fully saturated body copy
vibrates against its background.

### 1.4 The families

| Family | Hue | Peak chroma (dark / light) | Owns |
|---|---|---|---|
| `neutral` | 282° | 0.023 / 0.019 | Structure, surfaces, text |
| `iris` | 285° | 0.205 / 0.215 | Brand primary, AI, focus rings |
| `flux` | 203° | 0.142 / 0.145 | Live, realtime, presence, connection health |
| `nova` | 335° | 0.196 / 0.205 | Creator identity, gifting, reactions |
| `verdant` | 158° | 0.152 / 0.158 | Success, upward metrics, verification |
| `solar` | 78° | 0.162 / 0.168 | Warnings, achievements, premium, scarcity |
| `crimson` | 24° | 0.188 / 0.196 | Errors, destructive actions, moderation |

**Neutral gets its own, almost flat chroma envelope.** A grey that drifts in
saturation as it lightens looks like a printing error; a grey holding one faint
tint across the whole ramp reads as a designed material. Values stay under 0.01
chroma — below the threshold where most people would call it purple, above the
threshold where the screen feels dead.

Rendered neutral surfaces:

| | 1 | 2 | 3 | 4 | 5 | 12 |
|---|---|---|---|---|---|---|
| Dark | `#0c0c0f` | `#131317` | `#1a1b1f` | `#212227` | `#292a2f` | `#f4f4f6` |
| Light | `#fbfbff` | `#f8f9fe` | `#f2f3f8` | `#ececf2` | `#e5e6ec` | `#1e1e1f` |

### 1.5 Solving step 9 against WCAG

**This is the most important detail in the colour system.**

OKLCH is perceptually uniform. WCAG's relative-luminance formula is not — it
weights green at 0.7152 and blue at 0.0722. A cyan and a violet at *identical*
OKLCH lightness therefore have very different WCAG luminance, and the cyan one
can end up with no text colour that reaches 4.5:1.

Rather than pretend the conflict does not exist, the one step that must carry
text is **solved numerically against the metric that actually governs
accessibility**. The search starts at the curve value and walks outward in 0.005
increments, taking the nearest lightness that reaches 4.6:1 against its best
text colour, so families that already pass are left completely untouched.

Light themes darken their solids; dark themes lighten theirs. Step 10 keeps the
curve's original delta from step 9, so hover feels identical across every
family.

The text colour on a solid fill is likewise **computed, not chosen**: black and
white are measured against the rendered step-9 hex and the winner is emitted as
`--sy-on-{family}`. That is why a solar button gets dark text while an iris
button in light mode gets white text, without anyone deciding it.

### 1.6 Semantic tokens

Screens consume these names, never raw ramp steps.

| Token | Resolves to | Token | Resolves to |
|---|---|---|---|
| `--sy-bg-canvas` | neutral 1 | `--sy-accent-bg` | iris 3 |
| `--sy-bg-surface` | neutral 2 | `--sy-accent-bg-hover` | iris 4 |
| `--sy-bg-raised` | neutral 3 | `--sy-accent-border` | iris 7 |
| `--sy-bg-hover` | neutral 4 | `--sy-accent-solid` | iris 9 |
| `--sy-bg-active` | neutral 5 | `--sy-accent-solid-hover` | iris 10 |
| `--sy-border-subtle` | neutral 6 | `--sy-accent-fg` | iris 11 |
| `--sy-border-default` | neutral 7 | `--sy-fg-quiet` | neutral 8 |
| `--sy-border-strong` | neutral 8 | `--sy-fg-muted` | neutral 11 |
| `--sy-border-interactive` | neutral 9 | `--sy-fg-default` | neutral 12 |

The same `bg` / `border` / `solid` / `fg` quartet exists for `live`, `creator`,
`success`, `warning` and `danger`.

Additional computed tokens:

| Token | Meaning |
|---|---|
| `--sy-on-{family}`, `--sy-on-{role}` | Accessible text colour on that family's step-9 fill |
| `--sy-fg-on-media`, `--sy-fg-on-media-muted` | Text over media. **Does not flip with theme** — media scrims are dark in both, so theme-flipping foreground would make every caption invisible in light mode |
| `--sy-alpha-hi-NN`, `--sy-alpha-lo-NN` | Translucent light and dark veils for use over unknown content |
| `--shadow-color-NN`, `--rim-color-NN` | Consumed by the elevation recipes |

### 1.7 Contrast guarantees

Verified on every build by `pnpm tokens`, which fails the build on regression.
Ratios are computed from the gamut-mapped sRGB hex — what a display actually
renders — so wide-gamut OKLCH rendering has equal or greater separation.

| Pair | Requirement | Level |
|---|---|---|
| `fg-default` on canvas / surface / raised | ≥ 7:1 | AAA body |
| `fg-muted` on canvas / surface / raised | ≥ 4.5:1 | AA body |
| `{family}-11` text on surface | ≥ 4.5:1 | AA body |
| `on-{family}` text on `{family}-9` | ≥ 4.5:1 | AA body |
| `{family}-9` against canvas and surface | ≥ 3:1 | AA non-text |
| `border-interactive` on surface | ≥ 3:1 | AA non-text |
| Focus ring (iris 9) on canvas and surface | ≥ 3:1 | WCAG 2.2 focus appearance |

**Current result: 82 / 82 pass, both themes.**

---

## 2. Typography

### 2.1 The scale

Built on a 1.2 minor-third ratio from a 16px base, then hand-corrected at the
extremes — a pure geometric scale grows too slowly to feel dramatic at display
sizes and collapses into itself at micro sizes.

**Line heights are absolute, not multipliers**, so text always lands on the 4px
baseline grid. Mixed line-height multipliers are the single most common cause of
vertical rhythm drift in a large product.

| Style | Size | Line | Weight | Tracking | Face | Role |
|---|---|---|---|---|---|---|
| `display1` | 72 | 76 | 620 | −0.035em | Sora | Landing hero. One per page |
| `display2` | 56 | 60 | 620 | −0.030em | Sora | Section hero, onboarding statements |
| `display3` | 44 | 50 | 600 | −0.025em | Sora | Feature headline, empty-state hero |
| `title1` | 34 | 40 | 600 | −0.020em | Sora | Page title |
| `title2` | 27 | 34 | 600 | −0.016em | Sora | Major section heading |
| `title3` | 22 | 28 | 600 | −0.012em | Sora | Card group heading, modal title |
| `headline` | 18 | 24 | 600 | −0.008em | Inter | Card title, list emphasis |
| `bodyLarge` | 17 | 26 | 400 | −0.002em | Inter | Article body, long-form |
| `body` | 15 | 22 | 400 | 0 | Inter | Default UI text |
| `bodySmall` | 13.5 | 20 | 400 | 0.002em | Inter | Secondary text, metadata |
| `label` | 13.5 | 16 | 550 | 0.004em | Inter | Buttons, tabs, form labels |
| `caption` | 12 | 16 | 450 | 0.008em | Inter | Timestamps, helper text, counts |
| `overline` | 11 | 14 | 600 | 0.090em | Inter | Category eyebrow. **Uppercase. Max 3 words** |
| `mono` | 13 | 20 | 450 | 0 | JetBrains | IDs, keys, timecode, code |
| `monoLarge` | 28 | 34 | 500 | −0.010em | JetBrains | Dashboard metrics, wallet balances |

Negative tracking increases with size because large type looks loose at default
spacing; positive tracking increases as size falls because small type looks
cramped. `overline` is the only uppercase style — uppercase destroys word shape
and slows reading, so it is restricted to short category labels where scanning
beats reading.

### 2.2 Fluid display sizing

Display steps are the **only** sizes that scale with the viewport, interpolating
between 380px and 1440px:

| Style | Min | Max |
|---|---|---|
| `display1` | 40 | 72 |
| `display2` | 32 | 56 |
| `display3` | 27 | 44 |
| `title1` | 24 | 34 |

Product text stays fixed. A user who sets a 15px body expects 15px everywhere;
scaling it breaks their calibration and their browser zoom.

### 2.3 Optical corrections

- **Dark-mode weight compensation.** Light text on a dark field blooms, so the
  same weight reads heavier. Dark themes subtract weight from body copy
  (`--sy-type-*-weight` 400 → 380). Without it, dark mode always looks slightly
  shouty next to its light counterpart.
- **Grayscale antialiasing** (`-webkit-font-smoothing: antialiased`), which
  stops light-on-dark text looking bold.
- **`font-synthesis-weight: none`** — variable fonts have real weights; faux
  bolding is never acceptable.
- **`font-variant-numeric: tabular-nums` globally.** Numbers in a product must
  not shift width as they change.

### 2.4 Measure

| Token | Value | Use |
|---|---|---|
| `--sy-measure-tight` | 46ch | Captions, sidebars, narrow columns |
| `--sy-measure-comfortable` | 68ch | Default. Body copy, post text |
| `--sy-measure-wide` | 82ch | Long-form articles at large sizes |

Feed post text is additionally capped at 680px independently of its card, so a
900px-wide card on desktop does not produce 140-character lines.

---

## 3. Space

**One number governs the product: 4.**

Every margin, padding, gap, icon box, control height and radius is a multiple of
4px. The reason is not tidiness — a shared divisor makes optical alignment
automatic. A 40px avatar beside 22px line-height text inside 16px padding lands
on the same lattice, and the row looks composed without anyone nudging it.

| Token | px | Token | px | Token | px |
|---|---|---|---|---|---|
| `0` | 0 | `3` | 12 | `10` | 40 |
| `px` | 1 | `4` | 16 | `12` | 48 |
| `0_5` | 2 | `5` | 20 | `14` | 56 |
| `1` | 4 | `6` | 24 | `16` | 64 |
| `1_5` | 6 | `7` | 28 | `20` | 80 |
| `2` | 8 | `8` | 32 | `24` | 96 |
| `2_5` | 10 | | | `32` | 128 |
| | | | | `40` | 160 |

Dense at the bottom, because that is where interface decisions actually happen:
the difference between 8 and 12 changes how a card feels, while the difference
between 80 and 96 rarely does. The scale **skips values above 24** to prevent
"almost the same" spacing from creeping in.

CSS custom properties replace the dot with an underscore: `--sy-space-1_5`.

---

## 4. Shape

| Token | px | Use |
|---|---|---|
| `none` | 0 | Full-bleed media, table cells |
| `xs` | 4 | Checkboxes, badges, small chips |
| `sm` | 6 | Nested elements, small controls |
| `md` | 10 | Buttons, inputs, list rows |
| `lg` | 14 | Cards, larger buttons, panels |
| `xl` | 20 | Feature cards, floating tab bar |
| `2xl` | 28 | Hero cards, modals |
| `3xl` | 36 | Marketing surfaces |
| `pill` | 999 | Chips, avatars, tab pills, search fields |

**Concentric radii.** Nested elements shrink their radius by exactly their
padding, so inner and outer curves stay concentric: a 20px-radius card with 12px
padding holds an 8px-radius child. `concentricRadius(outer, padding)` in
`space.ts` computes it. Concentric corners are the difference between "rounded"
and "designed".

### Control sizing

Heights are multiples of 4, and every control reaches a 44px touch target even
when its visual box is smaller. **Visual height and touch height are separate
numbers on purpose** — a 32px chip should look like a 32px chip and still be
tappable. `.sy-touch-target` enforces the minimum with a pseudo-element rather
than inflating the visual box.

| Size | Height | Padding X | Gap | Icon | Radius |
|---|---|---|---|---|---|
| `xs` | 24 | 8 | 4 | 14 | `sm` |
| `sm` | 32 | 12 | 6 | 16 | `md` |
| `md` | 40 | 16 | 8 | 18 | `md` |
| `lg` | 48 | 20 | 10 | 20 | `lg` |
| `xl` | 56 | 24 | 12 | 22 | `lg` |

---

## 5. Elevation, glass and glow

Depth is expressed differently per theme because the physics differ.

**Light mode**: depth is occlusion. A raised object blocks light and casts a
shadow. Shadows are tinted with the neutral hue rather than pure black — a black
shadow over a violet-tinted surface reads as a smudge.

**Dark mode**: shadows are nearly invisible, because you cannot darken
near-black. Depth comes from three cooperating signals: **surface lightness**
rising with elevation, a **1px rim highlight** as if lit from above, and
**ambient occlusion** to detach from the backdrop.

| Level | Surface step | Use |
|---|---|---|
| `flat` | 1 | Page canvas. Never has depth |
| `sunken` | 1 | Input wells, track grooves, inset media |
| `surface` | 2 | Cards, list rows, panels on the canvas |
| `raised` | 3 | Hovered cards, dropdowns, popovers |
| `overlay` | 3 | Dialogs, sheets, command palette |
| `lifted` | 4 | Dragged objects, spotlight focus |

Six levels, because beyond six the differences stop being perceptible and below
six modals cannot separate from drawers.

### Glass

Glassmorphism is used with discipline: **only where a surface genuinely floats
over moving or photographic content** — stream overlays, media chrome,
navigation above a scrolling feed. Applying it to ordinary cards on a flat
background produces blur with nothing to blur, at real GPU cost, and reduces
text contrast for no reason.

Every recipe is three layers: a backdrop filter (blur plus a saturation lift, so
colour survives blur), a translucent fill that keeps text contrast above
threshold, and a rim hairline that defines the edge.

| Recipe | Blur | Saturate | Fill α (dark / light) | Use |
|---|---|---|---|---|
| `veil` | 12px | 1.4 | 0.62 / 0.68 | Sticky top bars, tab bars over feeds |
| `panel` | 24px | 1.6 | 0.72 / 0.76 | Stream chrome, player controls |
| `dome` | 40px | 1.8 | 0.82 / 0.86 | Command palette, AI surface |
| `scrim` | 8px | 1.0 | 0.64 / 0.48 | Behind dialogs and drawers |

Fill opacity is the accessibility control. Under `prefers-contrast: more` the
entire system falls back to opaque surfaces, and the whole effect is wrapped in
`@supports` so an engine without `backdrop-filter` gets an opaque surface rather
than an unreadable one.

### Glow

Light emission is the signature. It marks things that are **active**: live,
generating, focused, earning. Glow is never decorative on a resting element,
because if everything glows nothing is emphasised.

| Token | Spread | Alpha | Use |
|---|---|---|---|
| `subtle` | 8px | 0.24 | Focused input, selected chip |
| `base` | 16px | 0.32 | Primary button hover, active nav |
| `strong` | 28px | 0.42 | Live indicator, AI generating |
| `halo` | 48px | 0.28 | Hero brand mark, celebration |

### Focus ring

A **two-part ring**: a solid 2px inner ring in the brand colour at 2px offset,
and a 4px outer ring in the canvas colour. The outer ring guarantees the
indicator survives on top of *any* background, including a brand-coloured
button — which a single-ring approach cannot do. Under
`forced-colors: active` the system's own `Highlight` colour takes over.

---

## 6. Grid and breakpoints

Breakpoints are named for the **device posture** they describe, not the
hardware — layout should respond to how far the screen is from the user's eyes
and which thumb can reach it.

| Breakpoint | Min | Columns | Margin | Gutter | Max content |
|---|---|---|---|---|---|
| `compact` | 0 | 4 | 16 | 16 | — |
| `handheld` | 480 | 4 | 20 | 16 | — |
| `tablet` | 768 | 8 | 28 | 20 | — |
| `laptop` | 1024 | 12 | 32 | 24 | 1120 |
| `desktop` | 1280 | 12 | 40 | 24 | 1280 |
| `wide` | 1600 | 12 | 48 | 28 | 1440 |

Column counts step 4 → 8 → 12 so a 12-column layout halves to 6, thirds to 4,
and still divides evenly on tablet. Content caps at 1440 because beyond roughly
90 characters the eye loses the line return.

> **Screens do not use these numbers directly.** A screen responds to its
> *content column*, which the shell has already reduced. See
> [PATTERNS.md](./PATTERNS.md) for the content-column table and the 560 / 840 /
> 880 thresholds screens actually query.

### Z-index

A short, ordered list. **Any value not in this list is a bug** — arbitrary
z-index numbers are how stacking contexts become unfixable.

| Token | Value | Token | Value |
|---|---|---|---|
| `base` | 0 | `modal` | 500 |
| `raised` | 10 | `popover` | 600 |
| `sticky` | 100 | `toast` | 700 |
| `navigation` | 200 | `tooltip` | 800 |
| `overlayScrim` | 300 | `spotlight` | 900 |
| `drawer` | 400 | | |
