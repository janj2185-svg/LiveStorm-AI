# SYLORA brand

## The idea

**SYLORA makes intelligence visible.**

That sentence is the brief the entire identity answers. Not "a social platform",
not "a streaming app" — a system where something is always thinking, and where
you can see it working.

The material the brand is built from is **light**, and the product is
**light-first**: `:root` is the light theme, `index.html` carries
`data-theme="light"`, and `DEFAULT_THEME` in `src/design-system/tokens/color.ts`
is `'light'`. Dark is a supported option, not the canonical expression.

That decision changes what the brand is allowed to be made of. On a dark ground
a brand can *emit* — a halo, a glow, a bloom. On a bright ground nothing can
glow, because a halo on white is invisible. So the identity is built on the
other thing light does when it meets a surface: it **refracts**. Light arrives,
passes through the interface, and leaves as spectrum. Colour is something the
surface *does to light* rather than something painted on it.

Every device below is that one idea applied at a different scale: the mark is
three filters splitting light, the emphasis language is a spectral hairline, the
ambient backdrop is light caught in paper, and the neutral ramp is warm sunlight
with cool sky-lit shadows.

---

## The mark

### Concept: three lenses

The symbol is **three overlapping lenses**, each passing one part of the
spectrum and mixing where they cross. It shows the mechanism rather than a
metaphor for it: this is what actually happens when light meets a medium, drawn
at brand scale.

**Why lenses rather than a letterform.** A monogram ties a global product to one
alphabet; SYLORA ships in scripts an "S" does not exist in. Three lenses are
legible in every writing system, survive at 16px in a browser tab, and have a
*native motion behaviour* — they rotate. That single degree of freedom gives the
brand a loading, listening and generating state without inventing a separate
animation language for each.

**Why not a Venn diagram of three circles.** The lens `rx:ry` ratio is roughly
3:2, which makes the silhouette a rounded triangle rather than a circle. Three
equal circles read as a colour-theory illustration, which is precisely what this
must not look like.

### Construction

Everything derives from one circle. The mark is not drawn; it is computed in
`src/design-system/brand/Logo.tsx`, which is why it is mathematically identical
at every size and why changing any parameter keeps it symmetric.

| Property | Value |
|---|---|
| `viewBox` | 48 × 48 |
| Centre | (24, 24) |
| Construction radius | 7.4 — distance from centre to each lens centre |
| Lens radii | `rx` 13.6, `ry` 9.2 |
| Lens placement angles | −90°, 30°, 150° |
| Lens rotation | Each lens is rotated about its own centre by its placement angle, so its long axis points at the mark's centre |
| Core radius | 2.5 |

The three lens centres are computed from the construction circle, so they land
at exact thirds:

| Index | Angle | `cx` | `cy` | Colour (`spectral`) |
|---|---|---|---|---|
| 0 | −90° | 24 | 16.6 | `var(--sy-aether-9)` |
| 1 | 30° | 30.409 | 27.7 | `var(--sy-pulse-9)` |
| 2 | 150° | 17.591 | 27.7 | `var(--sy-bloom-9)` |

−90° puts the first lens on the vertical axis, so the mark has an unambiguous
"up". The three colours are the refraction order — cyan, indigo, magenta — which
is the same order as the `prism` gradient.

The core is a plain circle at the centre, filled with `var(--sy-bg-surface)` in
the `spectral` treatment and with `currentColor` otherwise. It is the light the
lenses are resolving, and it is **never blended**.

### Blending physics per theme

This is the detail that makes the mark belong to a light-first system.

| Theme | `mix-blend-mode` | Physical model | Result |
|---|---|---|---|
| Light | `multiply` | The lenses are *filters* subtracting from transmitted light | Overlaps deepen; the centre is the darkest point |
| Dark | `screen` | There is no ambient light to subtract, so the lenses become *emitters* | Overlaps brighten; the centre goes toward white |

Same geometry, same three colours, opposite arithmetic — and the correct physics
in each theme. It is the clearest expression anywhere in the system of why the
two themes are not inversions of each other.

`.sy-logo-mark` sets `isolation: isolate`, so the lenses blend only with each
other. Without it they would blend with whatever sits behind the mark and the
same logo would render differently on a card, on media and on the page.

Under `forced-colors: active`, blending is unavailable: the lenses drop to
`fill: none` with a 1.5px `currentColor` stroke, so the mark stays legible as
outline geometry.

### Tone treatments

| `tone` | When | Behaviour |
|---|---|---|
| `spectral` | Default. Marketing, app chrome, splash, entry screens | Three lens colours from `aether`, `pulse` and `bloom` step 9; blending per theme; core filled with `--sy-bg-surface` |
| `currentColor` | Inside buttons, dense UI, single-colour contexts | All three lenses and the core inherit the text colour, at 62% opacity on the lenses so the overlaps still read |
| `mono` | Print, embroidery, favicon at 16px, partner lockups | Identical to `currentColor`; no blending, no core distinction |

`currentColor` and `mono` cannot rely on blending to stay legible, which is why
they carry an explicit `opacity` of 0.62 on the lenses instead.

### Motion states

| `state` | Lens cluster | Core | Used for |
|---|---|---|---|
| `rest` | Static | Static | Everywhere by default |
| `thinking` | Rotates, 3.2s linear | Breathes, 1.6s ease-in-out | Assistant generating, long operations |
| `listening` | Static | Breathes, 2.8s ease-in-out | Microphone open, awaiting input |

`linear` is correct for the cluster because a real mechanism rotates at a
constant rate; the core is eased because breathing is not mechanical. The two
periods are deliberately unrelated, so the combined motion never visibly loops.
The core's breath is `scale` 1 → 1.35 with opacity 0.85 → 1.

`listening` breathes the core only, so an idle microphone does not look like a
spinner.

### Clear space and minimum size

- **Clear space**: half the mark's height on every side. This is the one number
  the code does state — `LogoLockup` sets `gap: size * 0.5` — so the lockup's
  internal gap and the mark's exclusion zone are the same measure.
- **Minimum size**: 16px for the mark alone, 24px for the lockup; below roughly
  20px use `mono`, because three blended translucent lenses stop resolving at
  that size and turn to mud.

Only the clear-space figure is enforced anywhere in code. `Logo.tsx` states that
the mark should "survive at 16px in a browser tab", but the minimum sizes and
the 20px `mono` threshold are editorial guidance carried forward from the
previous specification and are not asserted by any token, prop default or test.

---

## The wordmark

**SYLORA**, set in the display face (`--sy-font-display`, Instrument Serif) at
weight 600 with **+0.14em tracking**, in `--sy-fg-default`.

The wide tracking is the signature and is never reduced. At six letters,
generous spacing reads as considered, keeps the word legible beside the mark at
small sizes, and gives the name a deliberate rhythm. A trailing negative margin
of −0.14em cancels the final letter-space so the lockup stays optically centred.

The wordmark is **live text**, not outlines. It stays crisp at any resolution,
remains selectable and translatable, and cannot drift from the type system.

> Instrument Serif ships a single weight and no variable weight axis (see
> `src/design-system/tokens/typography.ts`). `.sy-logo-wordmark` requests
> `font-weight: 600`, which the browser can only satisfy by synthesising. This
> is noted in "Known inconsistencies" below.

### Lockup

The entire lockup specification is two numbers:

- Mark-to-wordmark size ratio: **1 : 0.62**
- Gap: **half the mark's height**

Two orientations: `horizontal` (default) and `stacked` (splash, square
placements, app icons).

**Product qualifiers** — "Studio", "Business", "Admin" — are set in the *text*
face (`--sy-font-text`, Instrument Sans) at 0.34× the mark size, weight 550,
+0.16em tracking, uppercase, in `--sy-fg-muted`. Using the text face rather than
the display face is what makes a qualifier read as a *label attached to the
brand* rather than part of the brand itself.

---

## The AI orb

The assistant's presence indicator. It is **deliberately not the logo**: the
logo is the company, the orb is a participant in the conversation. They share
the palette but not the geometry, which is what keeps that distinction legible.

Two counter-rotating rings around a soft core. Counter-rotation is what stops it
reading as a loading spinner — spinners turn one way, living things do not.

| State | Behaviour |
|---|---|
| `idle` | Outer ring 6s, mid ring 4s reversed |
| `thinking` | Outer 1.6s, mid 1.1s, core pulses 1.4s to `scale` 1.28 |
| `speaking` | Core scales on a 0.7s cycle (1 → 1.18 → 0.94) with low amplitude, so it never competes with the words |

The rings are conic gradients from `--sy-aether-9` to `--sy-pulse-9`, clipped to
a 1.5px border using two backgrounds and `border-box` clipping, which produces a
gradient *stroke* without an SVG. The core is filled with `--sy-gradient-beam`
and carries a bloom sized by `--sy-refract-edge-spread`.

The orb is `aria-hidden` — it is a decorative presence indicator, and the
assistant's name is always adjacent as text.

---

## Colour — the Lumen system

Six hues plus one structural neutral, spaced 44–76 degrees apart so no two are
ever mistaken for each other, each owning exactly one job. Full specification in
[FOUNDATIONS.md](./FOUNDATIONS.md).

| Family | Hue | Owns |
|---|---|---|
| `aether` | 196° | The brand itself. AI, generated content, focus rings |
| `pulse` | 272° | Realtime signal, presence, connection health, sync |
| `bloom` | 328° | Creator identity, gifting, reactions, celebration |
| `verdigris` | 152° | Success, upward metrics, earnings, verification |
| `solar` | 78° | Warnings, achievements, premium and scarcity |
| `rose` | 22° | Errors, destructive actions, moderation removal |
| `porcelain` | 250° nominal | Structure, surfaces and text. Hue-shifting — see below |

**`aether` is the brand colour.** Where a single colour must represent SYLORA it
is `aether` step 9: `#007e7f` in light, `#00999b` in dark.

The brand hue is chosen *against the ground*, not in isolation. A deep
aquamarine on a warm porcelain page is a complementary pair, so the accent
separates cleanly at any size without needing to shout. It is also the part of
the spectrum the industry has left alone — the default technology blue-violet
sits 60–90 degrees away.

**`porcelain` is not a grey.** Its tint is interpolated in OKLab a/b from warm at
the light end to cool at the dark end, so the light ramp runs from hue ~96
(sunlit) at step 1 to hue ~286 (sky-lit shadow) at step 12, passing through
effectively zero chroma at step 4. That is the daylight physics of warm light
and cool shadows, and it is why a SYLORA page reads as lit paper and its text
reads as ink in shadow.

### Signature gradients

Interpolating hue at constant lightness in OKLCH traces the perceptual rim of
the gamut instead of cutting through grey, which is why these never look muddy.
Every gradient is built from step 9 of each stop family, so both themes get the
same gesture at their own lightness.

| Gradient | Stops | Angle | Used for |
|---|---|---|---|
| `prism` | `aether` → `pulse` → `bloom` | 104° | The brand gesture. The refraction order: cyan, indigo, magenta. Refraction edges, story rings, gradient text |
| `beam` | `aether` → `pulse` | 118° | Live and realtime surfaces; the narrow end of the spectrum. The AI orb's core |
| `ember` | `bloom` → `solar` | 128° | Creator earnings, gifting, celebration |
| `daylight` | `porcelain` → `aether` | 160° | Ambient wash; colour barely surfacing out of the page |

`prism` appears as hairline edges and thin sweeps — **never as a large filled
area**, where it would read as decoration instead of as light.

### The lumen field

`.sy-lumen` is SYLORA's ambient backdrop and the light theme's answer to a dark
theme's glow. Rather than colour emitted *onto* a dark page, it is colour caught
*in* a bright one: two very wide, very pale spectral washes that behave like
sunlight falling through glass onto paper.

| Layer | Colour | Size | Opacity (light / dark) | Placement |
|---|---|---|---|---|
| `::before` | `--sy-aether-9` radial | 92vmax square | 0.10 / 0.40 | Top-start, offset −38vmax / −26vmax |
| `::after` | `--sy-bloom-9` radial | 92vmax square | 0.08 / 0.32 | Bottom-end, offset −42vmax / −30vmax |

The values are deliberately extreme in one direction — enormous radius, tiny
opacity. A saturated wash on white reads as a stain; a 10% wash across 92vmax
reads as light in the room. Dark mode can afford four times the presence,
because there is no white to stain. Blur is baked into the gradient stops rather
than applied as a filter, because filters on full-viewport elements are
expensive.

The two layers drift on independent `translate3d` + `scale` cycles with a
default period of 26s, overridable per surface with `--sy-lumen-duration`.

It appears on the three entry surfaces (Welcome, Authentication, Onboarding) and
nowhere in dense product chrome. It is decorative, its animation is removed under
`prefers-reduced-motion`, and the whole element is `display: none` under
`prefers-contrast: more`.

---

## Typography

Three typefaces, each doing a job no other can do. Full scale in
[FOUNDATIONS.md](./FOUNDATIONS.md).

| Face | Role | Why |
|---|---|---|
| **Instrument Serif** | Display and all section headings | A high-contrast modern serif. Almost no technology product sets its headlines in a serif, which is exactly why SYLORA does — and the modulation between thick and thin strokes is what makes a headline read as *considered* rather than merely large |
| **Instrument Sans** | Body and UI | The serif's designed companion. A precise, slightly narrow neo-grotesque with a tall x-height and open counters, so it holds at 12px in a data table and stays refined at 21px in a card title |
| **JetBrains Mono** | Numeric and machine | Monospace as a correctness tool, not a style choice — money, IDs, timecodes and stream keys must align in columns |

A serif for display and a sans for text is a centuries-old pairing from print.
Using it in a live-streaming product is the point: it borrows the authority of
editorial typography for a surface that normally has none. Sharing a family with
the display face is what keeps the pairing from reading as two unrelated
decisions.

The serif is used **only at 21px and above** (`title3` is the floor). Below that
the thick/thin modulation stops resolving and it would be a serif for its own
sake, so `headline` and everything under it switch to the sans.

---

## Voice

The interface writes the way a good colleague talks.

| Principle | Do | Don't |
|---|---|---|
| Say what happened | "Your January payout of €4,182.60 is processing" | "Payout status: pending" |
| Attribute claims | "Watch time is up 18% week over week, driven by the Thursday broadcast" | "Your content is performing well!" |
| Be specific about numbers | "14 questions unanswered after 48 hours" | "Several questions need attention" |
| Never celebrate on the user's behalf | "Achievement unlocked: Steady Signal" | "Congratulations!! You're amazing!" |
| Name the cost | "This removes the post for everyone. It cannot be undone." | "Are you sure?" |

**Sentence case everywhere.** Title Case is decorative and slows scanning.
Uppercase appears only in the `overline` style, the wordmark and the lockup
suffix.

**No exclamation marks in product surfaces.** The interface is not excited.

**The assistant never claims certainty it does not have.** Every AI-authored
statement carries a source, and every AI-proposed action is an offer the user
accepts — never something already done.

---

## Signature treatments

Three visual devices are reserved and must not be used decoratively.

| Treatment | Reserved for | Implementation |
|---|---|---|
| **Refraction edge** | Brand surfaces, AI-authored content, and the single most important action in a view | `.sy-refract` — a 1px transparent border with `var(--sy-gradient-prism) border-box` behind a solid `padding-box` fill. `.sy-refract--bloom` adds the outer bloom; `.sy-refract-rule` is the same hairline as a standalone divider |
| **Vellum** | Surfaces genuinely floating over moving or photographic content | `.sy-vellum` and its `--veil` / `--dome` modifiers; never over a flat background |
| **Lumen field** | Entry surfaces only | `.sy-lumen`; never in dense product chrome |

The refraction edge is the one visual device unique to SYLORA, so it is rationed
hard. At 1px it is almost subliminal — you register that an edge is *alive*
before you register that it is coloured. **If everything refracts, nothing is
emphasised.**

In the current product it appears in seven places: the Welcome screen's
assistant card, the Home brief, the Search hero, the Assistant's proposal card,
the Assistant's generating turn (which adds `--bloom`), the Authentication
divider and the Live Studio's thanks divider.

Under `prefers-contrast: more`, `.sy-refract` and `.sy-refract-rule` fall back to
a solid `--sy-border-interactive` edge: a hue-varying hairline is one of the two
places the system knowingly trades contrast for character, so it is the first to
go.

---

## What the brand is not

- Not a gradient blob, an orb, or a neural-network diagram.
- **Not glow-based.** A halo is invisible on white. Emphasis is refraction, and
  there is no `GLOW` token anywhere in the system.
- Not neon-on-black cyberpunk. The dark theme starts at L .162, not black,
  because true black clips OLED sub-pixels and leaves no room to express
  elevation with light.
- Not playful. There is exactly one overshoot easing curve and it is reserved
  for moments that genuinely warrant physicality — a gift landing, a reward
  claimed.
- Not maximal. The densest screens in the product — Analytics, Live Studio,
  Admin — are the quietest ones. Colour there carries information only.

---

## Known inconsistencies

Recorded rather than papered over. Each is a real difference between this
document's sources.

| Where | What |
|---|---|
| `Logo.tsx`, `LogoWordmark` doc comment | Says the wordmark is "set in Sora at weight 600". Sora is no longer in the system; `brand.css` sets `--sy-font-display`, which is Instrument Serif |
| `brand.css`, `.sy-logo-wordmark` | Requests `font-weight: 600` from Instrument Serif, which ships one weight and no variable axis. The browser can only synthesise it |
| `brand.css`, reduced-motion block | Disables animation on `.sy-logo-mark__blades`, a class from the old aperture mark that no longer exists. The current cluster is `.sy-logo-mark__lenses`, so the `thinking` rotation is **not** suppressed under `prefers-reduced-motion` |
| `motion.ts`, `AMBIENT.auroraDrift` | Still named for the old aurora field, is 24000ms, and is not emitted as a CSS variable. `.sy-lumen` uses its own 26s default |
| `Logo.tsx`, `AiOrb` doc comment | Says "three nested rings at different rotation speeds". The component renders two rings (`--outer`, `--mid`) plus a core, which is what `brand.css` describes and styles |
| `Logo.tsx`, `LogoTone` | `mono` and `currentColor` are indistinguishable. `LogoMark` only branches on `tone === 'spectral'`, and no CSS targets a mono variant, so the two produce identical output |
