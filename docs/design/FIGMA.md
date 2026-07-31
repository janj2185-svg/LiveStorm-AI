# Figma handoff

The design system's source of truth is code, not a Figma file. This document
explains how to get the system *into* Figma, how to keep it in sync, and how to
build screens there that will survive implementation.

## Why code is the source of truth

Three of the system's guarantees cannot be expressed in a design tool:

1. **Colour ramps are generated**, not picked. Every step's lightness, chroma
   and hue come from a curve, and step 9 is solved numerically against WCAG
   luminance per family per theme. A hand-maintained Figma palette would drift
   the moment a hue changed.
2. **Contrast is build-enforced.** 86 assertions run on every build and fail it
   on regression. Figma has no equivalent gate.
3. **Layout responds to a container**, not a viewport. Figma frames cannot
   express "this screen receives 676px on a 1280px display because the shell
   spent 604px on navigation".

So Figma is the **exploration and communication surface**, and the token export
keeps it honest.

---

## 1. Importing the tokens

`design/tokens.figma.json` is emitted by `pnpm tokens` in **W3C DTCG** format.

### With Tokens Studio for Figma

1. Install the *Tokens Studio for Figma* plugin.
2. Plugin → **Tools → Load from file** → select `design/tokens.figma.json`.
3. The file contains six token sets:

| Set | Contents |
|---|---|
| `light` | `color.*` (7 families × 12 steps) and the 50 `semantic.*` aliases, resolved for the light theme |
| `dark` | The same key structure, resolved for the dark theme |
| `dimension` | `space.*` and `radius.*` (`none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `pill`) |
| `typography` | 15 composite type styles with family, size, line height, weight and tracking |
| `duration` | `instant` 80ms through `ambient` 900ms |
| `cubicBezier` | `enter`, `exit`, `standard`, `emphasized`, `spring`, `anticipate` |

4. Enable `light` and `dark` as **themes**, and `dimension` / `typography` /
   `duration` / `cubicBezier` as **global** sets.
5. **Create Variables** to push them into Figma Variables, using `light` and
   `dark` as the two modes of a `Theme` collection.

**Light is mode 1.** `DEFAULT_THEME` in `src/design-system/tokens/color.ts` is
`'light'`, `:root` carries the light values, and `index.html` ships
`data-theme="light"`. A Figma collection whose first mode is Dark will show
every unbound component in the wrong theme and will quietly train the team to
design the optional theme first. Order the modes Light, then Dark.

### The seven families

| Set token prefix | CSS custom property | Role | Hue |
|---|---|---|---|
| `color/porcelain` | `--sy-porcelain-N` | Neutral: canvas, surfaces, borders, text | Shifts across the ramp — see below |
| `color/aether` | `--sy-aether-N` | Brand, `accent-*` | 196 |
| `color/pulse` | `--sy-pulse-N` | Live and realtime | 272 |
| `color/bloom` | `--sy-bloom-N` | Creator, earnings, gifting | 328 |
| `color/verdigris` | `--sy-verdigris-N` | Success | 152 |
| `color/solar` | `--sy-solar-N` | Warning | 78 |
| `color/rose` | `--sy-rose-N` | Danger, and the live badge's fill | 22 |

`porcelain` is the one family whose hue is not constant. It runs warm at the
light end and cool at the dark end, interpolated through OKLab so the midtones
pass through true neutral rather than detouring through green. In practice this
means **you cannot approximate the neutral ramp by changing the lightness of one
swatch in Figma** — porcelain 2 and porcelain 11 are different hues on purpose.
Bind the variable; do not eyedropper it.

### Colour values

Figma cannot read OKLCH, so every colour is exported as its **gamut-mapped sRGB
hex** — the value a standard display actually renders. Each token's
`$description` carries the authored OKLCH string, so the true value is never
lost:

```json
"9": {
  "$type": "color",
  "$value": "#007e7f",
  "$description": "aether step 9 — oklch(53.80% 0.1180 196)"
}
```

That is `aether.9` in the **light** set. In `dark` the same token is `#00999b`
at `oklch(62.00% 0.1280 196)`: same hue, lifted lightness and chroma, because
step 9 is solved per theme against the theme's own canvas.

On a P3 display the implementation will look marginally more saturated than the
Figma file. That is correct and intended.

---

## 2. The per-theme semantic mapping

**This is the section to read twice.** The accent half of the semantic table is
shared across themes, but the *structural* half is not. Elevation means the
opposite direction on the ramp in each theme: in dark the canvas is the darkest
step and raising a surface climbs toward light; in light the canvas is toned
porcelain and raising a surface climbs *back toward white*, so a card is
brighter than the page it sits on.

| Semantic alias | Light | Dark |
|---|---|---|
| `bg-canvas` | `porcelain.2` | `porcelain.1` |
| `bg-surface` | `porcelain.1` | `porcelain.2` |
| `bg-raised` | `porcelain.1` | `porcelain.3` |
| `bg-hover` | `porcelain.3` | `porcelain.4` |
| `bg-active` | `porcelain.4` | `porcelain.5` |
| `bg-selected` | `porcelain.5` | `porcelain.5` |
| `bg-sunken` | `porcelain.2` | `porcelain.1` |
| `border-subtle` | `porcelain.6` | `porcelain.6` |
| `border-default` | `porcelain.7` | `porcelain.7` |
| `border-strong` | `porcelain.8` | `porcelain.8` |
| `border-interactive` | `porcelain.9` | `porcelain.9` |
| `fg-quiet` | `porcelain.9` | `porcelain.9` |
| `fg-muted` | `porcelain.11` | `porcelain.11` |
| `fg-default` | `porcelain.12` | `porcelain.12` |

Three consequences for a Figma library:

- **`bg-canvas` and `bg-surface` swap direction.** A card variable bound to
  `porcelain.2` because "that is what a card is in dark mode" will render as a
  grey card on a white page in light mode, which is the single most common
  reason a light interface looks cheap. Bind to `semantic/bg-surface`, never to
  a raw step.
- **`bg-surface` and `bg-raised` are the same step in light.** Light does not
  separate a card from a popover by fill; it separates them by shadow. If a
  Figma component distinguishes those two states only by fill colour, it will
  look identical in light mode and correct in dark mode.
- **`bg-sunken` is `bg-canvas` in light and `bg-canvas` in dark**, from opposite
  ends. It is a well cut into a card, reading as the page showing through.

The accent aliases are generated for all six roles (`accent` from `aether`,
`live`, `creator`, `success`, `warning`, `danger`) and differ per theme only in
the tint step:

| Alias | Light | Dark |
|---|---|---|
| `<role>-bg` | family step 2 | family step 3 |
| `<role>-bg-hover` | family step 3 | family step 4 |
| `<role>-border` | family step 7 | family step 7 |
| `<role>-solid` | family step 9 | family step 9 |
| `<role>-solid-hover` | family step 10 | family step 10 |
| `<role>-fg` | family step 11 | family step 11 |

Light leans on step 2 rather than 3 for tinted backgrounds because on a bright
ground step 3 already reads as a filled block rather than a tint.

`on-*` tokens — `--sy-on-accent`, `--sy-on-brand`, `--sy-on-danger` and the
rest — carry the text colour for a solid fill and are computed, not chosen.
Never hand-pick white or black text on a coloured button in Figma; bind it.

---

## 3. Building the library

Recommended file structure:

```
SYLORA — Foundations     variables, type styles, effect styles, grids
SYLORA — Components      the component library
SYLORA — Patterns        shell, navigation, layout templates
SYLORA — Product         screen designs, organised by product area
```

### Variables

| Collection | Modes | Contents |
|---|---|---|
| `Theme` | **Light** (default), Dark | All colour tokens, raw and semantic |
| `Space` | — | The 4px scale. The key is the multiplier, not the pixel value: `space/4` is 16px. Steps run `0–8` contiguously, then thin out (`10, 12, 14, 16, 20, 24, 32, 40`), plus `0.5`, `1.5`, `2.5` for sub-steps and `px` for a literal 1px |
| `Radius` | — | The radius scale |
| `Size` | — | Control heights, shell dimensions |

**Bind everything.** A fill picked from the colour picker rather than a variable
is a fill that will not re-theme, and it is the most common way a Figma library
falls out of step with the code.

### Type styles

Fifteen styles, three faces. The pairing is the largest visible change in the
current direction and the easiest to get wrong in Figma, because Instrument
Serif has **no weight axis** — a Figma layer set to Semibold on it will render
as a synthesised outline, which destroys exactly the thick/thin modulation the
face was chosen for. The code sets `font-synthesis: none` on the display styles
for this reason; Figma has no equivalent, so it has to be a convention.

| Style | Face | Size / line | Weight | Tracking |
|---|---|---|---|---|
| `display1` | Instrument Serif | 76 / 78 | 400 | -0.018em |
| `display2` | Instrument Serif | 58 / 62 | 400 | -0.016em |
| `display3` | Instrument Serif | 44 / 50 | 400 | -0.014em |
| `title1` | Instrument Serif | 34 / 40 | 400 | -0.012em |
| `title2` | Instrument Serif | 27 / 33 | 400 | -0.01em |
| `title3` | Instrument Serif | 21 / 27 | 400 | -0.008em |
| `headline` | Instrument Sans | 17 / 23 | 600 | -0.006em |
| `bodyLarge` | Instrument Sans | 17 / 27 | 400 | -0.001em |
| `body` | Instrument Sans | 15 / 23 | 400 | 0 |
| `bodySmall` | Instrument Sans | 13.5 / 20 | 400 | 0.002em |
| `label` | Instrument Sans | 13.5 / 16 | 550 | 0.006em |
| `caption` | Instrument Sans | 12 / 16 | 450 | 0.01em |
| `overline` | Instrument Sans | 11 / 14 | 600 | 0.14em |
| `mono` | JetBrains Mono | 13 / 20 | 450 | 0 |
| `monoLarge` | JetBrains Mono | 30 / 36 | 500 | -0.014em |

Two things the export cannot carry:

- **Fluid display sizing.** `display1`–`display3` and `title1` interpolate with
  the viewport between 380px and 1440px (`display1` runs 40→76,
  `display2` 32→58, `display3` 27→44, `title1` 25→34). The composite token
  carries the maximum. Design the hero at both ends, or the small end will be
  discovered in build.
- **Optical weight compensation.** Running text is 410 in light and 380 in dark,
  from a nominal 400, because ink thins on a bright ground and blooms on a dark
  one. Instrument Sans is variable, so both are real weights. If the Figma
  library keeps one body style, note which theme it represents — it is 410, the
  light one.

`label`, `caption` and `overline` are set at 550, 450 and 600. Those are
intermediate variable-font weights with no Figma style-name equivalent; set them
numerically in the variable-font weight field, not by picking "Medium".

### Effect styles

Elevation is theme-dependent, so each of the five non-flat levels needs both
modes, and the two modes are built from different ingredients:

| Level | Light | Dark |
|---|---|---|
| `sunken` | Two inset shadows, no rim | One inset shadow plus a bottom inset rim |
| `surface` | `0 1px 2px -1px` at 8% + `0 4px 10px -4px` at 6% | Top inset rim at 6% + `0 1px 2px` at 24% |
| `raised` | `0 2px 4px -2px` at 8% + `0 10px 24px -8px` at 10% | Top inset rim at 8% + two dark halos |
| `overlay` | `0 8px 16px -10px` at 10% + `0 28px 56px -20px` at 14% | Top inset rim at 10% + two dark halos |
| `lifted` | `0 16px 32px -16px` at 12% + `0 48px 88px -32px` at 16% | Top inset rim at 12% + two dark halos |

Two rules that matter more than the numbers:

- **Light shadows are cool, never black.** The shadow colour is
  `oklch(34% 0.042 266)` — `#4a4767` — at the alphas above. A sky-lit shadow
  reads as air; a neutral one reads as dirt. In dark the base is
  `oklch(3% 0.012 268)`, `#04040a`.
- **An elevated surface has no border in light theme.** Shadow alone carries
  the edge; the 1px hairline is scoped to dark. A Figma card component with both
  a stroke and a drop shadow is describing something the code will not build.

Figma cannot express `backdrop-filter` faithfully. For **vellum** surfaces, use
a **Background blur** effect at the recipe's blur radius plus a fill at the
recipe's alpha, and name the layer for the recipe (`vellum/veil`,
`vellum/panel`, `vellum/dome`, `vellum/scrim`):

| Recipe | Blur | Saturate | Brightness (light / dark) | Fill alpha (light / dark) | Used for |
|---|---|---|---|---|---|
| `veil` | 14px | 1.5 | 1.06 / 0.96 | 0.66 / 0.62 | Sticky top bars and tab bars over feeds |
| `panel` | 26px | 1.7 | 1.08 / 0.94 | 0.74 / 0.72 | Stream chrome, player controls, floating toolbars |
| `dome` | 44px | 1.9 | 1.10 / 0.92 | 0.86 / 0.82 | Command palette, AI surface, media-context dialogs |
| `scrim` | 10px | 1 | 1 / 1 | 0.42 / 0.64 | Behind dialogs, drawers and sheets |

The brightness figure is the part with no Figma equivalent and the part that
defines the material. In light theme vellum's brightness is **above 1**: it is a
sheet of translucent paper that transmits and lifts what is behind it, not
frosted glass that dims it. A Figma mock that darkens the backdrop under a
floating panel is showing the dark-mode behaviour in the light theme.

### Refraction

The signature treatment has no Figma primitive at all. It is a 1px border whose
hue travels cyan → indigo → magenta along its length — the order light actually
separates in — drawn with a gradient border in CSS. Approximate it with a
gradient stroke using `aether.9 → pulse.9 → bloom.9`, and name the layer for the
weight it represents:

| Token | Weight | Spread | Alpha | Used for |
|---|---|---|---|---|
| `hairline` | 1px | 0 | 0.9 | Brand surfaces, AI-authored cards |
| `edge` | 1px | 10px | 0.55 | Focused brand controls, active states |
| `bloom` | 1.5px | 24px | 0.42 | Live indicators, generating states |
| `halo` | 2px | 48px | 0.3 | Hero brand mark, celebration moments |

The spread is a bloom behind the edge and is only really visible in dark theme,
where a true glow is possible. Refraction is rationed hard in the code — brand
surfaces, AI-authored content, and the single most important action in a view.
A Figma file that uses it on every card is proposing a different system.

### Grids

Create layout grid styles per breakpoint from the table in
[FOUNDATIONS.md](./FOUNDATIONS.md), and a **4px baseline grid** applied
everywhere. Because all line heights are absolute multiples of 4, text lands on
that grid without nudging.

---

## 4. Frame sizes

Design at these exact sizes. They are the real logical resolutions of current
reference hardware, not rounded approximations — a layout that only works at
tidy numbers has not been tested.

| Frame | Size | Reference | Safe top / bottom | Posture |
|---|---|---|---|---|
| iPhone | 393 × 852 | iPhone 15 Pro | 59 / 34 | compact |
| Android | 412 × 915 | Pixel 8 Pro | 48 / 24 | compact |
| Tablet | 834 × 1194 | iPad Pro 11″ portrait | 24 / 20 | medium |
| Web | 1280 × 800 | Desktop browser viewport | 0 / 0 | expanded |
| Desktop | 1512 × 945 | MacBook Pro 14″ scaled | 0 / 0 | expanded |

### The content-column trap

**This is the single most important thing to get right in Figma.** The frame is
not the space your screen gets. The shell takes its chrome first:

| Device | Frame | Column, no context panel | Column, with context panel |
|---|---|---|---|
| iPhone | 393 | 393 | 393 |
| Android | 412 | 412 | 412 |
| Tablet | 834 | 758 | 758 |
| Web | 1280 | 1016 | **676** |
| Desktop | 1512 | 1248 | 908 |

With a context panel, **web at 1280 is narrower than tablet at 834**, because
the expanded posture spends 264px on the rail and 340px on the panel. 676px is
the tightest multi-column case in the product and the one most worth designing
against first.

Build the shell as a component with the rail and context panel as boolean
properties so this is visible while you work, rather than discovered in review.

### Breakpoints

There are two container queries in play, and they read different boxes:

| Container | Thresholds | What changes |
|---|---|---|
| `shell` | 768, 1280 | Rail replaces the bottom tab bar; the context panel appears |
| `screen` | 560, 840, 880 | Content column count inside a screen |

Screen-level decisions should change at **560 / 840 / 880**, not at
device-shaped numbers. A `768` breakpoint applied to a *screen* would fire on
neither the tablet's 758px column nor a 1280 web posture with a panel. The 768
and 1280 figures belong to the shell, which measures the whole viewport.

The `BREAKPOINTS` token in `space.ts` (`compact` 0, `handheld` 480, `tablet`
768, `laptop` 1024, `desktop` 1280, `wide` 1600) is the naming vocabulary and
the source for the grid table. It is not what the layout CSS queries.

---

## 5. Component structure

Mirror the code so a design and its implementation share vocabulary.

| Figma component | Code | Key properties |
|---|---|---|
| `Button` | `Button` | variant, tone, size, icon, iconEnd, loading, disabled |
| `Icon button` | `IconButton` | variant, tone, size, icon |
| `Surface` | `Surface` | elevation, glass, padding, radius, interactive |
| `Badge` | `Badge` | tone, variant, size |
| `Chip` | `Chip` | selected, icon, removable, tone |
| `Avatar` | `Avatar` | size, ring, presence, verified |
| `Field / Input` | `Input` | size, state (rest/hover/focus/error/disabled), icon, trailing |
| `Tabs` | `Tabs` | variant, count, active index |
| `Stat` | `Stat` | polarity, delta direction, tone |

Three of these carry a trap worth encoding in the Figma component:

- **`Surface`'s prop is still called `glass`**, and its values are still
  `panel | veil | dome`, but every class and token it applies is `vellum`. Name
  the Figma property `glass` to match the code, and the layers `vellum/*` to
  match the output.
- **`Chip`'s removable form is two sibling buttons**, not one button with an
  icon inside it. A button nested in a button is invalid HTML and drops the
  inner control out of the tab order. If the Figma component has a single
  clickable area with a decorative ×, the design is describing something that
  cannot be built accessibly.
- **`Stat`'s `polarity`** is `higher-is-better | lower-is-better | neutral`, not
  a colour choice. Green-for-positive would actively mislead on error rate,
  latency and cost per engagement. Model it as a variant property, not as a
  fill override.

Use **variant properties**, not separate components, wherever the code uses a
prop. If Figma needs a component the code does not have, that is a signal the
system is missing something — raise it rather than working around it.

### Naming

Match the token names exactly: `color/aether/9`, `semantic/bg-surface`,
`space/4`, `radius/lg`, `type/title2`, `elevation/raised`. A designer saying
"aether 9" and an engineer writing `--sy-aether-9` should be describing the same
thing without translation.

Where an old file still says `iris`, `flux`, `nova`, `verdant`, `crimson`,
`neutral`, `aurora`, `signal`, `depth`, `glass` or `glow`, it predates the
current direction. The mapping is:

| Old | Current |
|---|---|
| `neutral` | `porcelain` |
| `iris` | `aether` |
| `flux` | `pulse` |
| `nova` | `bloom` |
| `verdant` | `verdigris` |
| `crimson` | `rose` |
| `aurora` (gradient) | `prism` |
| `signal` (gradient) | `beam` |
| `depth` (gradient) | `daylight` |
| `.sy-aurora` (backdrop) | `.sy-lumen` |
| `glass` | `vellum` |
| `glow` | `refraction` |

---

## 6. Annotating a screen for handoff

A screen is ready to build when it states:

1. **Which theme it is drawn in.** Light unless there is a reason. Media
   playback surfaces — the player, stories, shorts, the live viewer's stage, the
   studio's monitors — are the exception: they stay dark in both themes, because
   the picture is the light source, and they say so with `data-theme="dark"` on
   the specific element rather than on the page.
2. **Whether it is immersive.** Welcome, Authentication, Onboarding, the live
   viewer, the player, stories and shorts render full-bleed with no product
   shell. Everything else gets the shell, and therefore the content column from
   section 4.
3. **Which breakpoints it changes at**, in content-column terms, and what
   changes at each.
4. **Which components it uses**, by name, and which are new.
5. **Every state**: loading, empty, error, and the states of any control that
   holds state.
6. **What is scrollable**, and in which direction.
7. **What is fixed** versus what scrolls away.
8. **The accessible name** of every icon-only control.
9. **Any motion** beyond the catalogue in [MOTION.md](./MOTION.md).

Anything not annotated will be built from the defaults in this system — which is
usually the right outcome, and is why the defaults are documented.

---

## 7. Keeping in sync

| Direction | Process |
|---|---|
| Code → Figma | Re-run `pnpm tokens`, reload `design/tokens.figma.json` in Tokens Studio, push to Variables. Colour, space, radius, type and motion all update |
| Figma → Code | Token changes are proposed as edits to `src/design-system/tokens/*.ts`, never applied directly to CSS. The compiler regenerates everything and the contrast audit gates the change |

`src/design-system/styles/tokens.css` is generated and carries a
`DO NOT EDIT` header. Editing it directly is the one way to break the guarantee
that Figma and the product agree.

Note that the export carries colour, dimension, type and motion — and nothing
else. Elevation recipes, vellum recipes and refraction tokens are emitted as CSS
custom properties but are **not** in `tokens.figma.json`, because DTCG has no
faithful type for a two-layer theme-dependent shadow or a backdrop filter. Those
three have to be rebuilt by hand as Figma effect styles from the tables in
section 3, and re-checked against `src/design-system/tokens/elevation.ts` when
they change.

---

## 8. The gallery is the reference

Before designing a new screen, open the running gallery. Every one of the 38
screens renders as real code, in both themes, in true-resolution device chrome,
and each view is deep-linkable:

```
#/<screenId>?device=<iphone|android|tablet|web|desktop>&theme=<light|dark>
```

Append `&chrome=0` to render the device alone, which is what the screenshot
pipeline uses. Omitted parameters default to `theme=light` and
`device=desktop`, except where a screen declares a `preferredDevice`, which the
gallery follows unless the URL asks for something else.

A running screen answers questions a static mockup cannot: whether the layout
survives 676px, whether the focus order makes sense, whether the porcelain ramp's
hue shift is doing what you expected between a card and its page. Check there
first.
