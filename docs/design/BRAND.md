# SYLORA brand

## The idea

**SYLORA makes intelligence visible.**

That sentence is the brief the entire identity answers. Not "a social platform",
not "a streaming app" — a system where something is always thinking, and where
you can see it working. Every decision below traces back to it.

The material the brand is built from is **light**. Light is what an aurora is:
energy made visible by passing through a medium. It is also, literally, what a
screen emits. A brand made of light is one the medium can actually render —
there is no print-first identity being approximated in pixels here.

---

## The mark

### Concept: the aperture

The symbol is an **aperture** — three blades around a void, the instrument that
gathers light and focuses it into an image. It reads simultaneously as a lens,
an eye, and a portal.

**Why an aperture rather than a letterform.** A monogram ties a global product
to one alphabet; SYLORA ships in scripts an "S" does not exist in. An aperture
is legible everywhere, survives at 16px in a browser tab, and — the deciding
factor — has a *native motion behaviour*. Blades rotate. That single degree of
freedom gives the brand a loading state, a listening state and a generating
state without inventing a separate animation language for each.

**Why not a swoosh, orb, or gradient blob.** Those are the default visual
vocabulary of AI products in this period, which makes them the fastest possible
route to looking like everyone else. The aperture is mechanical, constructed and
specific.

### Construction

Everything derives from one circle. The mark is not drawn; it is computed, in
`src/design-system/brand/Logo.tsx`, which is why it is mathematically identical
at every size and why changing any parameter keeps it symmetric.

| Property | Value |
|---|---|
| Canvas | 48 × 48 |
| Centre | (24, 24) |
| Construction radius | 14.5 |
| Blade weight | 10 (inner edge 9.5, outer edge 19.5) |
| Blade sweep | 66°, repeated every 120° |
| Blade start angles | −90°, 30°, 150° |
| Terminals | Round cap |
| Core radius | 3.4 |

The 66°/54° split between blade and gap is the smallest gap that still reads as
three separate blades once the round caps have eaten into it. The first blade is
centred on the vertical axis so the mark has an unambiguous "up".

### Colour treatments

| Treatment | When | Notes |
|---|---|---|
| `gradient` | Default. Marketing, app chrome, splash | Aurora gradient on the same 135° axis as the brand backdrop, so mark and background agree |
| `currentColor` | Inside buttons, dense UI, single-colour contexts | Inherits, so it is always correct against its container |
| `mono` | Print, embroidery, favicon at 16px, partner lockups | One colour, no core distinction |

The gradient id is generated per instance. Multiple marks on one page must not
share a gradient id or the first one wins and the rest render flat.

### Motion states

| State | Blades | Core | Used for |
|---|---|---|---|
| `rest` | Static | Static | Everywhere by default |
| `thinking` | Rotate, 2.4s linear | Breathe, 1.6s ease-in-out | Assistant generating, long operations |
| `listening` | Static | Breathe, 2.8s ease-in-out | Microphone open, awaiting input |

`linear` is correct for the blades because a real aperture rotates at a constant
rate; the core is eased because breathing is not mechanical. The two periods are
deliberately unrelated (2.4s against 1.6s), so the combined motion never
visibly loops — it reads as alive rather than as an animation.

Under `prefers-reduced-motion`, all movement stops and the core drops to 70%
opacity. The state is still communicated; it just no longer moves.

### Clear space and minimum size

- **Clear space**: one blade weight (10 units at 48, so ~21% of the mark's
  width) on every side. Nothing enters it.
- **Minimum size**: 16px for the mark alone, 24px for the lockup. Below 20px
  use the `mono` treatment — the gradient stops resolving and turns to mud.

---

## The wordmark

**SYLORA**, set in Sora at weight 600 with **+0.14em tracking**.

The wide tracking is the signature and is never reduced. At six letters,
generous spacing reads as confidence, keeps the word legible beside the mark at
small sizes, and gives the name a deliberate, engineered rhythm. A trailing
negative margin of −0.14em cancels the final letter-space so the lockup stays
optically centred.

The wordmark is **live text**, not outlines. It stays crisp at any resolution,
remains selectable and translatable, and cannot drift from the type system.

### Lockup

The entire lockup specification is two numbers:

- Mark-to-wordmark size ratio: **1 : 0.62**
- Gap: **half the mark's height**

Two orientations: `horizontal` (default) and `stacked` (splash, square
placements, app icons).

**Product qualifiers** — "Studio", "Business", "Admin" — are set in Inter, not
Sora, at 0.34× the mark size with +0.16em tracking, uppercase, in
`--sy-fg-muted`. Using the text face rather than the display face is what makes
a qualifier read as a *label attached to the brand* rather than part of the
brand itself.

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
| `thinking` | Outer 1.6s, mid 1.1s, core pulses 1.4s |
| `speaking` | Core scales on a 0.7s cycle with low amplitude, so it never competes with the words |

The rings are conic gradients clipped to a border using `mask-composite`, which
produces a gradient *stroke* without an SVG.

---

## Colour

The palette is an aurora sampled at six points, not an arbitrary set of brand
colours. Each hue owns exactly one job, so colour communicates meaning before a
single word is read. Full specification in [FOUNDATIONS.md](./FOUNDATIONS.md).

| Family | Hue | Owns |
|---|---|---|
| **Iris** | 285° | The brand itself. AI, generated content, focus |
| **Flux** | 203° | Realtime. Live state, presence, connection |
| **Nova** | 335° | Human expression. Creators, gifts, celebration |
| **Verdant** | 158° | Success, growth, earnings, verification |
| **Solar** | 78° | Warning, achievement, premium, scarcity |
| **Crimson** | 24° | Errors, destructive actions, moderation |
| **Neutral** | 282° | Structure. Violet-tinted so greys belong to the brand |

**Iris is the brand colour.** Where a single colour must represent SYLORA, it is
iris step 9.

### Signature gradients

Interpolating hue at constant lightness in OKLCH traces the perceptual rim of
the gamut instead of cutting through grey. That is why these never look muddy —
it is a property of the colour space, not of careful stop placement.

| Gradient | Stops | Angle | Used for |
|---|---|---|---|
| `aurora` | iris → flux → nova | 135° | Primary brand gradient. Logo, hero, story rings |
| `signal` | flux → iris | 120° | Live and realtime surfaces |
| `ember` | nova → solar | 135° | Earnings, gifting, celebration |
| `depth` | neutral → iris | 160° | Ambient backgrounds; colour barely surfacing |

### The aurora field

The ambient backdrop: two large, slowly drifting radial gradients on a 24-second
cycle. Blur is baked into the gradient stops rather than applied as a filter,
because filters on full-viewport elements are expensive.

It appears on entry surfaces (welcome, auth, onboarding) and nowhere in dense
product chrome. It is decorative, it is the first thing disabled under
`prefers-reduced-motion`, and it is removed entirely under
`prefers-contrast: more`.

---

## Typography

Three typefaces, each doing a job no other can do. Full scale in
[FOUNDATIONS.md](./FOUNDATIONS.md).

| Face | Role | Why |
|---|---|---|
| **Sora** | Display | Geometric grotesque with a slightly mechanical skeleton. Wide apertures and low contrast hold at 72px and still read at 20px. Technical without being cold |
| **Inter** | Text | Built for screens at small sizes: tall x-height, open counters, real tabular figures |
| **JetBrains Mono** | Numeric and machine | Monospace as a correctness tool, not a style choice — money, IDs, timecodes and stream keys must align |

All three are variable fonts, so weight is a continuous axis. That matters for
motion: a label can animate 500 → 600 on press without the jump you get from
swapping static weights.

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
Uppercase appears only in the `overline` style and the wordmark.

**No exclamation marks in product surfaces.** The interface is not excited.

**The assistant never claims certainty it does not have.** Every AI-authored
statement carries a source, and every AI-proposed action is an offer the user
accepts — never something already done.

---

## Signature treatments

Three visual devices are reserved and must not be used decoratively.

| Treatment | Reserved for | Implementation |
|---|---|---|
| **Aurora hairline border** | Assistant-authored surfaces, and only those | A 1px transparent border with `var(--sy-gradient-aurora) border-box` behind a solid `padding-box` fill |
| **Glow** | Things that are *active*: live, generating, focused, earning | `--sy-glow-*` spread and alpha, coloured from the semantic family |
| **Glass** | Surfaces genuinely floating over moving or photographic content | `--sy-glass-*` recipes; never over a flat background |

If everything glows, nothing is emphasised. These three are the brand's
punctuation, not its body text.

---

## What the brand is not

- Not a gradient blob, an orb, or a neural-network diagram.
- Not neon-on-black cyberpunk. The dark theme starts at L 0.155, not black,
  because true black clips OLED sub-pixels and makes depth impossible to
  express with light.
- Not playful. There is exactly one overshoot easing curve and it is reserved
  for moments that genuinely warrant physicality — a gift landing, a reward
  claimed.
- Not maximal. The densest screens in the product — Analytics, Live Studio,
  Admin — are the quietest ones. Colour there carries information only.
