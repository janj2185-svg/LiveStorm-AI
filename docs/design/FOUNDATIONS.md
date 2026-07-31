# Foundations

Colour, typography, space, shape, depth and grid. Everything in the product is
built from these values, and nothing outside this document is permitted as a
literal in component or screen code.

SYLORA is **light-first**. `:root` is the light theme, `index.html` carries
`data-theme="light"`, and `DEFAULT_THEME` is `'light'`. Dark is a supported
option whose curves are derived to match the light theme's rhythm — it is not
the canonical expression, and it is not an inversion. The two themes express
depth, emphasis and even type weight through *different physics*, and this
document says so at each point where they diverge.

The authoritative source is `src/design-system/tokens/*.ts`. Running
`pnpm tokens` compiles those modules into three artefacts:

| Artefact | Purpose |
|---|---|
| `src/design-system/styles/tokens.css` | Runtime CSS custom properties, both themes |
| `design/tokens.figma.json` | W3C DTCG format for Figma / Tokens Studio import |
| `design/contrast-audit.json` | Machine-checked WCAG evidence for every text pair |

---

## 1. Colour — the Lumen system

### 1.1 Why OKLCH

A designer picking hex values by eye produces ramps where "the same" step looks
heavier in blue than in yellow, because sRGB is not perceptually uniform. OKLCH
separates perceived **L**ightness from **C**hroma and **H**ue, so one fixed
lightness curve reads as the same visual weight at every hue.

That single decision is what lets the system promise contrast ratios *per step*
instead of auditing hundreds of individual colours.

Colours are emitted twice in `tokens.css`: a gamut-mapped sRGB hex fallback
first, then the authored OKLCH value inside an `@supports` guard. Wide-gamut
displays get the real colour; everything else gets a faithful approximation.
Out-of-gamut colours are mapped by **binary-searching chroma downward while
holding lightness and hue** (`gamutMap` in `tokens/color-science.ts`), so a
colour that cannot be shown becomes a less saturated version of itself rather
than shifting hue, which is what naive per-channel clipping does.

### 1.2 The 12-step contract

Every family is a 12-step ramp where the step index has a **fixed meaning**. A
component never says "use teal-600"; it says "use step 9 of the active accent".
Re-theming is therefore a hue swap, not a redesign.

`RAMP_ROLES` in `tokens/color.ts` names the steps, and the names describe the
**light** theme's structural mapping, because light is the theme the curve was
designed for:

| Step | `RAMP_ROLES` name | Light-theme use |
|---|---|---|
| 1 | `base` | Cards, sheets, panels — the near-white raised surface |
| 2 | `canvas` | The toned porcelain page behind them |
| 3 | `hover` | Interactive background, hovered |
| 4 | `active` | Interactive background, pressed |
| 5 | `selected` | Interactive background, selected |
| 6 | `hairline` | Dividers, subtle borders |
| 7 | `border` | Default component border |
| 8 | `borderStrong` | Strong border. **Purely a border — it carries no text** |
| 9 | `solid` | The load-bearing fill: primary buttons, brand marks, state indicators. Also the light theme's third text tier |
| 10 | `solidHover` | Step 9, hovered |
| 11 | `textMuted` | Secondary text |
| 12 | `text` | Primary text |

In the dark theme the same indices carry the same *grammar* — backgrounds low,
borders middle, fills at 9–10, text at the top — but the structural aliases bind
to different steps. See 1.6.

> **Step 8 is not an accessible boundary and is not a text colour.** It is
> decorative emphasis and is never the sole indicator of a control or its state.
> Any boundary that *is* the sole indicator must use `--sy-border-interactive`
> (porcelain step 9), which is the only border token guaranteed ≥ 3:1.

### 1.3 The curves

The **light** curve is the primary and is tuned for a bright, airy, high-white
product. Step 1 is near-white and is where cards live; step 2 is the toned
porcelain page behind them. The gap between 1 and 2 is small on purpose: it
should read as a change in *illumination*, not as two different greys. Steps 3–5
stay high so interactive fills stay airy, and 6–8 fall away quickly so borders
can be genuine hairlines rather than boxes.

The **dark** curve is derived, and deliberately not a mirror. It starts at
L .162 rather than black, because true black clips OLED sub-pixels and leaves no
room to express elevation with light.

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Light L** | .996 | .964 | .941 | .918 | .893 | .872 | .828 | .700 | .538 | .482 | .420 | .205 |
| **Dark L** | .162 | .195 | .230 | .262 | .295 | .335 | .395 | .485 | .620 | .678 | .790 | .968 |

#### Three legible text tiers in light

A bright ground is unforgiving: the usable contrast range between the page and
true ink is short, so it is tempting to spend it on one body colour and call
everything else "quiet". That produces axis ticks, placeholders, timestamps and
column headers sitting at around 2:1 — technically present, and unreadable for a
large number of people.

Steps **9, 11 and 12** are therefore all *text* steps, spaced so each clears
4.5:1 against the canvas while staying visibly distinct from its neighbour. This
is why the light curve drops steeply between 8 (.700) and 9 (.538): step 8 is
released from carrying text and becomes purely a border.

#### Chroma envelope

Chroma is expressed as a fraction of each family's peak and **peaks at step 9** —
the one step that must command attention — falling away toward both ends.

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Light** | .02 | .05 | .10 | .16 | .23 | .31 | .42 | .62 | 1.00 | .98 | .88 | .42 |
| **Dark** | .10 | .18 | .30 | .38 | .46 | .54 | .64 | .80 | 1.00 | .95 | .72 | .28 |

The light envelope is tighter at the top than the dark one: on a bright ground
even a little chroma in a background reads as a tint, and a tinted page is the
fastest way to look cheap. Text desaturates at step 12 because fully saturated
body copy vibrates against its background.

### 1.4 The families

Six hues plus one structural neutral, spaced 44–76 degrees apart so no two are
ever mistaken for each other, each owning exactly one job. Colour communicates
meaning before a word is read. (The source comment says "46-74"; the declared
hues actually give a 44° minimum between `verdigris` and `aether` and a 76°
maximum between `aether` and `pulse`.)

| Family | Hue | Peak chroma (light / dark) | Owns |
|---|---|---|---|
| `porcelain` | 250 nominal, overridden by a tint ramp | 0.020 / 0.024 | Surfaces, structure and text |
| `aether` | 196 | 0.118 / 0.128 | Brand primary, AI, generated content, focus rings |
| `pulse` | 272 | 0.190 / 0.185 | Realtime signal, presence, connection health, sync |
| `bloom` | 328 | 0.200 / 0.196 | Creator identity, gifting, reactions, celebration |
| `verdigris` | 152 | 0.144 / 0.152 | Success, upward metrics, earnings, verification |
| `solar` | 78 | 0.156 / 0.162 | Warnings, achievements, premium and scarcity |
| `rose` | 22 | 0.185 / 0.188 | Errors, destructive actions, moderation removal |

The brand hue is a deep aquamarine, chosen *against the ground* rather than in
isolation: a cool accent on a warm porcelain page is a complementary pair, so it
separates cleanly at any size without needing to shout. It is also the part of
the spectrum the industry has left alone — the default technology blue-violet
sits 60–90 degrees away.

### 1.5 The hue-shifting porcelain ramp

**This is the detail that makes the neutral look like a material rather than a
grey.**

Real daylight is warm and its shadows are cool, because shadows are lit by the
sky rather than the sun. `porcelain` reproduces that. It is the only family that
sets `tintRamp`, which replaces the fixed hue with a tint interpolated in
**OKLab a/b** from step 1 to step 12:

| Theme | From (step 1) | To (step 12) |
|---|---|---|
| Light | `a −0.0006, b 0.006` — sunlit warm | `a 0.004, b −0.014` — sky-cool shadow |
| Dark | `a 0.003, b −0.010` | `a −0.0004, b 0.004` |

Interpolating in a/b rather than in hue angle is the whole trick: a straight
line in a/b passes through the origin region, so the midtones go through **true
neutral**. Interpolating hue directly would swing the middle of the ramp through
an intermediate hue — for a warm-to-cool run, through green.

The rendered effect, from `tokens.css`:

| Light step | 1 | 4 | 8 | 12 |
|---|---|---|---|---|
| OKLCH | `99.60% 0.0060 95.71` | `91.80% 0.0009 39.81` | `70.00% 0.0071 289.08` | `20.50% 0.0146 285.95` |

Hue travels from ~96 (warm) at the light end to ~286 (cool) at the dark end, and
chroma collapses to 0.0009 at step 4 — the point where the ramp crosses true
neutral. The dark theme runs the same physics in the opposite direction (~287 at
step 1, ~96 at step 12), compressed, because the ambient is cooler throughout.

`porcelain` also overrides the shared chroma envelope with a flat
`[1, 1, …, 1]`. A grey that drifts in saturation as it lightens looks like a
printing error; a grey holding one faint tint across the whole ramp reads as a
designed material. Note that the tint branch multiplies by `peakChroma * 50`, so
the emitted chroma values still land between 0.0009 and 0.0146.

Rendered porcelain, gamut-mapped sRGB:

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Light** | `#fffef9` | `#f4f3f0` | `#ecebea` | `#e4e4e3` | `#dcdbdc` | `#d5d4d7` | `#c6c6ca` | `#9e9ea3` | `#6e6d73` | `#5d5d64` | `#4c4c54` | `#16161e` |
| **Dark** | `#0d0d13` | `#14141a` | `#1c1c21` | `#242428` | `#2c2c30` | `#373639` | `#464648` | `#5f5f60` | `#868686` | `#989796` | `#bbbab8` | `#f5f4f1` |

### 1.6 Semantic tokens — a per-theme structural mapping

Screens consume semantic names, never raw ramp steps.

The **structural** half of the table is defined **per theme**, because
"elevated" means the opposite direction on the ramp in each. In dark, the canvas
is the darkest step and raising a surface moves toward light. In light, the
canvas is toned porcelain and raising a surface moves *back toward white*: a
card is **brighter than the page it sits on**, exactly as a lit object is
brighter than its surroundings.

Sharing one table would give the light theme grey cards on a white page, which
reads as recessed and is the single most common reason a light UI looks cheap.

| Token | Light | Dark |
|---|---|---|
| `--sy-bg-canvas` | `porcelain.2` | `porcelain.1` |
| `--sy-bg-surface` | `porcelain.1` | `porcelain.2` |
| `--sy-bg-raised` | `porcelain.1` | `porcelain.3` |
| `--sy-bg-hover` | `porcelain.3` | `porcelain.4` |
| `--sy-bg-active` | `porcelain.4` | `porcelain.5` |
| `--sy-bg-selected` | `porcelain.5` | `porcelain.5` |
| `--sy-bg-sunken` | `porcelain.2` | `porcelain.1` |
| `--sy-border-subtle` | `porcelain.6` | `porcelain.6` |
| `--sy-border-default` | `porcelain.7` | `porcelain.7` |
| `--sy-border-strong` | `porcelain.8` | `porcelain.8` |
| `--sy-border-interactive` | `porcelain.9` | `porcelain.9` |
| `--sy-fg-quiet` | `porcelain.9` | `porcelain.9` |
| `--sy-fg-muted` | `porcelain.11` | `porcelain.11` |
| `--sy-fg-default` | `porcelain.12` | `porcelain.12` |

Three consequences worth internalising:

1. **`bg-surface` is lighter than `bg-canvas` in light mode.** A card is a lit
   object. Never reach for a grey fill to make a card "stand out".
2. **`bg-sunken` is a real role**, not an alias of the canvas. In light it is
   `porcelain.2`, so a well cut into a near-white card reads as the page showing
   through. Inputs use it (see 5.4).
3. **`fg-quiet` is a text tier, not a border.** It is `porcelain.9` in both
   themes and is audited at 4.5:1 against both the canvas and the surface. Step
   8 is the border it used to be confused with.

**Accent** aliases are shared across themes, because an accent's relationship to
its own ramp does not change with the ambient light — only the ramp does. The
one exception is the tinted background step:

| Token | Light | Dark |
|---|---|---|
| `--sy-{role}-bg` | family step **2** | family step **3** |
| `--sy-{role}-bg-hover` | family step **3** | family step **4** |
| `--sy-{role}-border` | family step 7 | family step 7 |
| `--sy-{role}-solid` | family step 9 | family step 9 |
| `--sy-{role}-solid-hover` | family step 10 | family step 10 |
| `--sy-{role}-fg` | family step 11 | family step 11 |

Light leans on step 2 rather than 3 because on a bright ground step 3 is already
enough colour to read as a filled block.

The roles are `accent` (from `brand` → `aether`), `live` (`pulse`), `creator`
(`bloom`), `success` (`verdigris`), `warning` (`solar`) and `danger` (`rose`).
`brand` is spelled `accent` in the alias table because that is the name the
component layer uses.

Additional computed tokens:

| Token | Meaning |
|---|---|
| `--sy-on-{family}` | Accessible text colour on that family's step-9 fill. Computed, not chosen: porcelain 12 and porcelain 1 are both measured against the rendered step-9 hex and the winner wins |
| `--sy-on-{role}` | The same value under its semantic name, so a component can ask for "text on the danger fill" without knowing danger is rose |
| `--sy-on-accent` | Emitted **in addition to** `--sy-on-brand`, because `.sy-tone-accent` reads `--sy-on-accent`. Without it every primary button in the product fell back to inherited page ink on a saturated fill, at 2.98:1 |
| `--sy-fg-on-media`, `--sy-fg-on-media-muted` | Text over media. **Does not flip with theme** — they resolve to the dark ramp's steps 12 and 11 in both themes, because media scrims are dark in both |
| `--sy-scrim-on-media` | `oklch(12% 0.02 282 / 0.78)`, identical in both themes |
| `--sy-alpha-hi-NN`, `--sy-alpha-lo-NN` | Translucent veils at 04/08/12/16/24/32/48/64/80/92. `hi` is step 12 of the **active** theme's porcelain ramp and `lo` is step 1, so their apparent polarity flips: in dark `hi` is a near-white veil, in light it is near-black ink. They are only safe inside a `data-theme="dark"` media surface, which is where every current use sits |
| `--shadow-color-NN`, `--rim-color-NN` | Consumed by the elevation recipes. See 5.1 |
| `--sy-gradient-{name}` | The four signature gradients, built from step 9 of each stop family |

### 1.7 Solving step 9 against WCAG

OKLCH is perceptually uniform. WCAG's relative-luminance formula is not — it
weights green at 0.7152 and blue at 0.0722. A cyan and a violet at *identical*
OKLCH lightness therefore have very different WCAG luminance, and the cyan one
can end up with no text colour that reaches 4.5:1.

Rather than pretend the conflict does not exist, the one step that must carry
text is **solved numerically against the metric that actually governs
accessibility**. `solveSolidLightness` walks outward from the curve value in
0.005 increments and takes the nearest lightness whose best text colour reaches
**4.6:1** — 4.6 rather than 4.5 leaves headroom for 8-bit quantisation. The
theme-appropriate direction is tried first (light darkens its solids, dark
lightens theirs) so the ramp stays monotonic. Step 10 keeps the curve's original
delta from step 9, so hover feels identical across every family.

Two facts about the current palette:

- **No family is currently displaced.** Every step 9 in `tokens.css` sits at the
  curve value — `53.80%` in light, `62.00%` in dark — because every hue already
  clears 4.6:1 there. The solver is a guard rail for future hue changes, not an
  active correction.
- **`porcelain` is never solved.** Families with a `tintRamp` skip the solver
  entirely, because a near-neutral step 9 has no hue problem to correct.

The text colour on a solid fill is likewise computed, not chosen. Note the
result in the light theme: because every step 9 sits at L .538, **all six
accents take the near-white porcelain 1 as their `on-` colour**, including
`solar`. The dark theme inverts this and takes porcelain 1 (`#0d0d13`) for all
six.

### 1.8 Contrast guarantees

Verified on every build by `pnpm tokens`, which fails the build on regression.
Ratios are computed from the gamut-mapped sRGB hex — what a display actually
renders — so wide-gamut OKLCH rendering has equal or greater separation. The
audit resolves through the *semantic* table rather than raw step indices,
because the structural mapping differs per theme and raw indices would test the
wrong pairs in light.

| Pair | Requirement | Level |
|---|---|---|
| `fg-default` on three background steps | ≥ 7:1 | AAA body |
| `fg-muted` on the same three | ≥ 4.5:1 | AA body |
| `fg-quiet` on canvas and surface | ≥ 4.5:1 | AA body |
| `{family}-11` text on surface | ≥ 4.5:1 | AA body |
| `on-{family}` text on `{family}-9` | ≥ 4.5:1 | AA body |
| `{family}-9` against canvas and surface | ≥ 3:1 | AA non-text |
| `{family}-8` emphasis on surface | ≥ 1.5:1 | Perceivable edge |
| `border-default` on surface | ≥ 1.15:1 | Perceivable hairline |
| `border-strong` on surface | ≥ 1.4:1 | Perceivable edge |
| `border-interactive` on surface | ≥ 3:1 | AA non-text |
| Focus ring (`aether` 9) on canvas and surface | ≥ 3:1 | WCAG 2.2 focus appearance |

The third background step is labelled `bg-raised` in the audit output but is
resolved from `bg-hover`, so those rows measure porcelain 3 in light and
porcelain 4 in dark. The label is wrong; the assertion is not unsafe, because in
both themes `bg-hover` is the *lower*-contrast ground of the two. See "Known
inconsistencies".

**Current result: 86 / 86 pass, both themes.** Selected measured values:

| Pair | Light | Dark |
|---|---|---|
| `fg-default` on `bg-canvas` | 16.21 | 17.61 |
| `fg-muted` on `bg-canvas` | 7.66 | 9.99 |
| `fg-quiet` on `bg-canvas` | 4.62 | 5.32 |
| `fg-quiet` on `bg-surface` | 5.07 | 5.04 |
| `border-interactive` on surface | 5.07 | 5.04 |
| Focus ring on canvas | 4.41 | 5.56 |

`fg-quiet` on `bg-canvas` at 4.62:1 in light is the tightest text assertion in
the system — 1.027× its requirement — and it is the one that governs how far the
light curve's step 9 can move. The next three tightest are all `on-{family}` on
a step-9 fill: `verdigris` in light at 4.75, `bloom` in dark at 4.83 and `aether`
in light at 4.85.

---

## 2. Typography

Three typefaces, each doing a job no other can do.

| Token | Stack |
|---|---|
| `--sy-font-display` | `'Instrument Serif', 'Iowan Old Style', Georgia, serif` |
| `--sy-font-text` | `'Instrument Sans Variable', 'Instrument Sans', -apple-system, 'Segoe UI', system-ui, sans-serif` |
| `--sy-font-mono` | `'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', monospace` |

**Instrument Serif** is a high-contrast modern serif. Almost no technology
product sets its headlines in a serif, which is exactly why SYLORA does: it is
the fastest way to be recognisable at a glance, and the modulation between thick
and thin strokes is what makes a headline read as *considered* rather than
merely large. **Instrument Sans** is its designed companion — a precise,
slightly narrow neo-grotesque with a tall x-height and open counters. Sharing a
family with the display face is what keeps the pairing from reading as two
unrelated decisions. **JetBrains Mono** is a correctness tool: money, IDs,
timecodes and stream keys must align in columns.

### 2.1 The scale

Built on a 1.2 minor-third ratio from a 16px base, then hand-corrected at the
extremes — a pure geometric scale grows too slowly to feel dramatic at display
sizes and collapses into itself at micro sizes.

**Line heights are absolute, not multipliers**, so text always lands on the 4px
baseline grid. Mixed line-height multipliers are the single most common cause of
vertical rhythm drift in a large product.

| Style | Size | Line | Weight | Tracking | Face | Role |
|---|---|---|---|---|---|---|
| `display1` | 76 | 78 | 400 | −0.018em | Serif | Landing hero. One per page |
| `display2` | 58 | 62 | 400 | −0.016em | Serif | Section hero, onboarding statements |
| `display3` | 44 | 50 | 400 | −0.014em | Serif | Feature headline, empty-state hero |
| `title1` | 34 | 40 | 400 | −0.012em | Serif | Page title |
| `title2` | 27 | 33 | 400 | −0.010em | Serif | Major section heading |
| `title3` | 21 | 27 | 400 | −0.008em | Serif | Card group heading, modal title |
| `headline` | 17 | 23 | 600 | −0.006em | Sans | Card title, list item emphasis |
| `bodyLarge` | 17 | 27 | 400 | −0.001em | Sans | Article body, long-form reading |
| `body` | 15 | 23 | 400 | 0 | Sans | Default UI text |
| `bodySmall` | 13.5 | 20 | 400 | 0.002em | Sans | Secondary text, descriptions, metadata |
| `label` | 13.5 | 16 | 550 | 0.006em | Sans | Buttons, tabs, form labels |
| `caption` | 12 | 16 | 450 | 0.010em | Sans | Timestamps, helper text, counts |
| `overline` | 11 | 14 | 600 | 0.140em | Sans | Category eyebrow. **Uppercase. Max 3 words** |
| `mono` | 13 | 20 | 450 | 0 | Mono | IDs, keys, timecode, code |
| `monoLarge` | 30 | 36 | 500 | −0.014em | Mono | Dashboard metric values, wallet balances |

**All six serif steps sit at weight 400.** Instrument Serif has no weight axis
and does not need one: at these sizes a high-contrast serif at regular weight
already carries more presence than a bold sans, without the density that makes a
hero feel heavy. `.sy-display-*` and `.sy-title-*` set `font-synthesis: none`
for the same reason — synthetic weight would smear the modulation the face is
chosen for.

**The serif runs down to `title3` at 21px.** That is the floor: below it the
thick/thin modulation stops resolving and `headline` takes over in the sans.
Section headings staying in the serif is the decision that gives the product its
voice — a live-streaming interface whose section headings are set in a
high-contrast serif reads as edited rather than generated, and the contrast
against the dense sans data below it is the whole effect.

Negative tracking increases with size because large type looks loose at default
spacing; positive tracking increases as size falls because small type looks
cramped. `label` carries wider tracking than a dark-first system would use: on a
bright ground, tightly set small text closes up and reads as a smudge, and a
little air is what makes a control feel precise rather than cramped.
`overline`'s very wide 0.14em tracking is a deliberate brand signal — the
typographic equivalent of the refraction hairline.

### 2.2 Fluid display sizing

Display steps are the **only** sizes that scale with the viewport, interpolating
linearly between 380px and 1440px:

| Style | Min | Max |
|---|---|---|
| `display1` | 40 | 76 |
| `display2` | 32 | 58 |
| `display3` | 27 | 44 |
| `title1` | 25 | 34 |

Product text stays fixed. A user who sets a 15px body expects 15px everywhere;
scaling it breaks their calibration and their browser zoom.

Because these four sizes are fluid, `base.css` gives them **ratio** line heights
(1.06, 1.08, 1.14, 1.18) rather than the absolute `--sy-type-*-line` tokens — an
absolute line height cannot track a clamped font size. `title2` and below use
the absolute token.

### 2.3 Bidirectional optical weight compensation

Dark ink on a bright ground **thins**: the light field eats into the strokes.
Light text on a dark ground does the opposite and **blooms**. A system that
corrects in only one direction will always have one theme that reads slightly
wrong, which is why compensation now runs both ways.

| Theme | `WEIGHT_DELTA` | Rendered body weight |
|---|---|---|
| Light | +10 | 410 |
| Dark | −20 | 380 |

Applied by `base.css` to `.sy-body`, `.sy-body-lg` and `.sy-body-sm`. The two
themes therefore correct in opposite directions so the voice reads the same in
both, which is the whole reason a light-first system cannot simply invert.

Supporting corrections:

- **Grayscale antialiasing** (`-webkit-font-smoothing: antialiased`), which
  stops light-on-dark text looking bold.
- **`font-synthesis-weight: none`** globally, and `font-synthesis: none` on the
  serif classes — faux bolding is never acceptable.
- **`font-variant-numeric: tabular-nums` globally.** Numbers in a product must
  not shift width as they change.

### 2.4 Measure

| Token | Value | Use |
|---|---|---|
| `--sy-measure-tight` | 46ch | Captions, sidebars, narrow columns |
| `--sy-measure-comfortable` | 68ch | Default. Body copy, post text. Applied by `.sy-measure` |
| `--sy-measure-wide` | 82ch | Long-form articles at large sizes |

---

## 3. Space

**One number governs the product: 4.**

Every margin, padding, gap, icon box, control height and radius is a multiple of
4px. The reason is not tidiness — a shared divisor makes optical alignment
automatic. A 40px avatar beside 23px line-height text inside 16px padding lands
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

Heights are multiples of 4, and every control reaches a 44px touch target
(`MIN_TOUCH_TARGET`) even when its visual box is smaller. **Visual height and
touch height are separate numbers on purpose** — a 32px chip should look like a
32px chip and still be tappable. `.sy-touch-target` enforces the minimum with a
pseudo-element rather than inflating the visual box.

| Size | Height | Padding X | Gap | Icon | Radius |
|---|---|---|---|---|---|
| `xs` | 24 | 8 | 4 | 14 | `sm` |
| `sm` | 32 | 12 | 6 | 16 | `md` |
| `md` | 40 | 16 | 8 | 18 | `md` |
| `lg` | 48 | 20 | 10 | 20 | `lg` |
| `xl` | 56 | 24 | 12 | 22 | `lg` |

---

## 5. Depth — elevation, vellum and refraction

The two themes express depth through different physics, because the same physics
do not exist in both.

**Light (the primary).** Depth is *occlusion and illumination*. A raised surface
moves closer to white while casting a soft, wide, cool-tinted shadow — the
behaviour of a pale object lit from above under a blue sky.

**Dark (optional).** Shadows are nearly invisible, because you cannot darken
near-black. Depth comes instead from surface lightness rising with elevation, a
1px rim highlight as if lit from above, and a soft dark halo to detach the
surface from its backdrop.

Every elevation token therefore ships a light and a dark recipe, and components
ask for `elevation="raised"` rather than for a shadow string.

### 5.1 Two light-first rules that are not negotiable

**Shadows are never black.** `--shadow-color-NN` is built from
`oklch(34% 0.042 266)` in light (hex fallback `#4a4767`) and
`oklch(3% 0.012 268)` in dark (`#04040a`). Under real daylight a shadow is lit
by the sky, so it takes on the sky's colour. A neutral black shadow over a
warm-white page reads as dirt; a cool one reads as air. This is the same physics
that gives the porcelain ramp its warm-to-cool shift.

**An elevated surface has no border in light mode.** Shadow alone carries the
edge. `.sy-surface` sets `border: 1px solid transparent` and only
`[data-theme='dark'] .sy-surface` fills in `--sy-border-subtle`, because a
shadow on near-black cannot define an edge on its own. Border-plus-shadow is the
single most reliable way to make a bright interface look like a form from 2012,
and removing it is most of what separates "clean" from "premium".

`--rim-color-NN` is drawn from porcelain 12 at 04–12% alpha and is consumed only
by the dark recipes.

### 5.2 Elevation levels

Six levels. More than six and the differences stop being perceptible; fewer and
a modal cannot separate from a drawer. Light-mode shadows are built from two
layers — a tight contact shadow and a wide ambient one — because a single shadow
always looks either too hard or too vague.

| Level | Light shadow | Dark shadow + rim | Use |
|---|---|---|---|
| `flat` | none | none | Page canvas. Never has depth |
| `sunken` | `inset 0 1px 2px 0 /06`, `inset 0 0 0 1px /04` | `inset 0 1px 3px 0 /32`, rim `inset 0 -1px 0 0 /04` | Input wells, track grooves, inset media, segmented-control tracks |
| `surface` | `0 1px 2px -1px /08`, `0 4px 10px -4px /06` | `0 1px 2px 0 /24`, rim `inset 0 1px 0 0 /06` | Cards, list rows, panels resting on the page |
| `raised` | `0 2px 4px -2px /08`, `0 10px 24px -8px /10` | `0 2px 6px -1px /32`, `0 8px 20px -6px /24`, rim `/08` | Hovered cards, dropdowns, popovers, floating controls |
| `overlay` | `0 8px 16px -10px /10`, `0 28px 56px -20px /14` | `0 10px 24px -6px /40`, `0 28px 56px -16px /32`, rim `/10` | Dialogs, sheets, command palette |
| `lifted` | `0 16px 32px -16px /12`, `0 48px 88px -32px /16` | `0 18px 40px -12px /48`, `0 48px 96px -32px /40`, rim `/12` | Dragged objects, the single focused element in a spotlight state |

`/NN` is the `--shadow-color-NN` alpha suffix. Rim highlights are `none` in
light at every level.

`ELEVATION` also declares a `surfaceStep` per level (1, 1, 2, 3, 3, 4). It is
part of the interface but the compiler does not read it — surface fills come
from the semantic aliases in `components.css` instead. See "Known
inconsistencies".

### 5.3 Vellum

Vellum is SYLORA's translucent material, named for the material it behaves like
rather than for the CSS property that produces it. It is not "frosted glass over
a dark scene": on a bright ground it is a sheet of fine translucent paper, so it
**brightens** what is behind it rather than dimming it. That is the difference
between a light interface that looks lit and one that looks fogged.

Three cooperating layers: a backdrop filter that blurs and lifts brightness and
saturation, a translucent fill that keeps text contrast above threshold, and a
rim that defines the edge.

| Recipe | Blur | Saturate | Brightness (light / dark) | Fill α (light / dark) | Rim α (light / dark) | Use |
|---|---|---|---|---|---|---|
| `veil` | 14px | 1.5 | 1.06 / 0.96 | 0.66 / 0.62 | 0.72 / 0.08 | Sticky top bars and tab bars over feeds |
| `panel` | 26px | 1.7 | 1.08 / 0.94 | 0.74 / 0.72 | 0.80 / 0.10 | Stream chrome, player controls, floating toolbars |
| `dome` | 44px | 1.9 | 1.10 / 0.92 | 0.86 / 0.82 | 0.90 / 0.14 | Command palette, AI surface, media-context dialogs |
| `scrim` | 10px | 1.0 | 1.00 / 1.00 | 0.42 / 0.64 | 0 / 0 | Behind dialogs, drawers and sheets |

**Brightness above 1 in light is the whole trick.** Ordinary frosted glass
darkens what is behind it, which on a bright product reads as a grey smear.
Lifting brightness while blurring reproduces fine translucent paper held over an
image: it stays light, and the content beneath stays legible as shape.

The fill is the *surface* step, so vellum brightens toward the card colour in
light and toward the panel colour in dark. The rim is drawn from the brightest
step of the active ramp — porcelain 1 in light, porcelain 12 in dark — so it is
a near-white hairline in both. The alphas differ by an order of magnitude
because the two are doing different jobs: in light the rim *is* the edge, and in
dark it is a top highlight that would read as glare at full strength.

Only three of the four recipes have a class. `.sy-vellum` *is* `panel`;
`.sy-vellum--veil` and `.sy-vellum--dome` override it. `scrim` exists only as
tokens, and screens consume `--sy-vellum-scrim-blur` directly on their own
overlay elements — `media.css`, `comms.css`, `learning.css` and `commerce.css`
each do this. Its `saturate`, `brightness`, fill and rim values are emitted but
unread.

Vellum is used **only where a surface genuinely floats over moving or
photographic content** — stream chrome, media controls, navigation above a
scrolling feed. Applying it to an ordinary card on a flat page produces blur
with nothing to blur, at real GPU cost, for no gain.

Fill opacity is the accessibility control. The whole effect is wrapped in
`@supports (backdrop-filter: …)` so an engine without support gets an opaque
`--sy-bg-surface` rather than an unreadable one, and under
`prefers-contrast: more` every vellum class becomes opaque with a
`--sy-border-interactive` edge.

### 5.4 Inputs invert

Inputs are the one place the light theme goes *down* rather than up. A field is
a well you write into, so `.sy-input` takes `--sy-bg-canvas` with
`--sy-elevation-sunken`, while every other control sits above the page. That
inversion is what makes a form scannable at a glance: everything raised is a
control, everything recessed is a place to type. On focus the well fills to
`--sy-bg-surface` — the field lights up as it becomes active. In dark the
inversion is meaningless, so `[data-theme='dark'] .sy-input` takes `bg-raised`
and drops the inset shadow.

### 5.5 Refraction

Refraction replaces the glow language a dark-first system would use. A halo is
invisible on white, so emphasis on a bright ground comes from the other thing
light does when it meets a surface: it **separates**.

A refraction edge is a hairline whose hue travels along its length, in the order
light actually splits — cyan, indigo, magenta. At 1px it is almost subliminal:
you register that an edge is *alive* before you register that it is coloured.

| Token | Weight | Spread | Alpha | Use |
|---|---|---|---|---|
| `hairline` | 1px | 0 | 0.90 | Brand surfaces, AI-authored cards |
| `edge` | 1px | 10px | 0.55 | Focused brand controls, active states |
| `bloom` | 1.5px | 24px | 0.42 | Live indicators, generating states |
| `halo` | 2px | 48px | 0.30 | Hero brand mark, celebration moments |

`weight` is the border width; `spread` is the optional bloom behind the edge,
which only becomes visible in dark mode where a true glow is possible.

Emitted as `--sy-refract-{token}-weight`, `-spread` and `-alpha`. Consumed by:

| Class | Effect |
|---|---|
| `.sy-refract` | The gradient stroke: `--sy-gradient-prism` on `border-box` behind a solid `padding-box` fill, at `hairline` weight. Override the fill with `--refract-fill` |
| `.sy-refract--bloom` | Adds the outer bloom, sized by `--sy-refract-bloom-spread` |
| `.sy-refract-rule` | The same hairline as a standalone 1px divider at 75% opacity |

It is rationed hard — brand surfaces, AI-authored content, and the single most
important action in a view. Nothing else. If everything refracts, nothing is
emphasised. **There is no `GLOW` token in the system.**

`.sy-surface` declares its elevation *fills* inside `:where()`, which strips
their specificity to zero, so a surface can be raised **and** refracting at the
same time. Without that, `.sy-surface--raised` and `.sy-refract` are both one
class deep, the later stylesheet wins, and the spectral edge silently never
paints.

### 5.6 Focus ring

A **two-part ring**: a solid 2px inner ring in `--sy-accent-solid` at 2px
offset, and a 4px outer ring in `--sy-bg-canvas` drawn as a `box-shadow`. The
outer ring guarantees the indicator survives on top of *any* background,
including a brand-coloured button — which a single-ring approach cannot do.
Under `forced-colors: active` the system's own `Highlight` colour takes over and
the box-shadow is dropped.

| Property | Value |
|---|---|
| Inner ring width | 2px |
| Offset | 2px |
| Outer ring width | 4px |

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

The grid tokens (`--sy-grid-columns`, `--sy-grid-margin`, `--sy-grid-gutter`,
`--sy-grid-max`) are the **only** tokens emitted behind a width `@media` query.
Every layout in the product responds to its container instead; the other media
query in `tokens.css` is the `prefers-reduced-motion` override.

> **Screens do not use these numbers directly.** A screen responds to its
> *content column*, which the shell has already reduced. See
> [PATTERNS.md](./PATTERNS.md) for the content-column table and the 560 / 840 /
> 880 thresholds screens actually query.

### Shell dimensions

| Token | px |
|---|---|
| `--sy-shell-railCollapsed` | 76 |
| `--sy-shell-railExpanded` | 264 |
| `--sy-shell-contextPanel` | 340 |
| `--sy-shell-contextPanelWide` | 400 |
| `--sy-shell-topBar` | 64 |
| `--sy-shell-tabBar` | 60 |
| `--sy-shell-safeAreaFallback` | 20 |

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

---

## 7. Known inconsistencies

| Where | What |
|---|---|
| `build-tokens.ts`, contrast audit | The third background is named `raised` and every row it produces is labelled `… on bg-raised`, but it is assigned `resolveSemantic(mode, 'bg-hover')`. In light that means the rows measure porcelain 3, not the porcelain 1 that `bg-raised` actually resolves to. Both themes happen to be tested against the lower-contrast of the two grounds, so the assertion is conservative rather than unsafe, but `bg-raised` itself is never audited |
| `typography.ts`, `WEIGHT_DELTA` | Exported but imported nowhere. `build-tokens.ts` does not emit it, and `base.css` hardcodes the results (`font-weight: 410` in light, `380` in dark). The numbers agree today; nothing enforces that they keep agreeing |
| `typography.ts`, file-level comment | Says Instrument Serif "is used only above 27px". `title2` is 27 and `title3` is 21, and both declare `family: 'display'` |
| `typography.ts`, `title1` and `title2` comments | `title1` is annotated "the last display-face step", and the comment directly above `title2` reads "In-product headings, set in the text face". `title2` and `title3` are both `display`. The `title2` block's own longer comment states the correct rule — that section headings stay in the serif down to a 21px floor |
| `color.ts`, `COLOR_FAMILIES` comment | Says the six hues are "spaced 46-74 degrees apart". The declared hues give 44° minimum (`verdigris` 152 to `aether` 196) and 76° maximum (`aether` 196 to `pulse` 272) |
| `elevation.ts`, `ElevationLevel.surfaceStep` | Declared for all six levels but never read by `build-tokens.ts`. Surface fills come from the semantic aliases in `components.css` |
| `build-tokens.ts` section comments | The emitted blocks are still labelled `/* Glass */` and `/* Glow spreads */` above the vellum and refraction loops |
| `build-tokens.ts`, alpha veils | The comment reads "`hi` is a light veil, `lo` is a dark veil". Both are taken from the *active* theme's porcelain ramp — step 12 and step 1 — so the description holds in dark and is exactly inverted in light |
| `build-tokens.ts`, `onSolidColor` doc comment | Says "a solar button gets dark text while an iris button gets light text". `iris` no longer exists, and in the current light palette *every* accent takes light text |
| `base.css`, typography comment | Says "the display face stops at `title-1`" and that `title-2` and below switch to the sans, but the rule it annotates applies `--sy-font-display` down to `.sy-title-3`. The rule matches `typography.ts`; the comment does not |
| `index.html` | `theme-color` is `#f8f7f4`, described as matching the porcelain canvas. The rendered light canvas is `#f4f3f0` |
