# SYLORA design system

The complete design specification for SYLORA — an AI-first ecosystem combining
live streaming, social networking, content creation, AI assistants, education,
business tools, creator monetization, a marketplace and communities.

This is not a mockup deck. Every screen in this specification is **running
code**, rendered in both themes, in true-resolution device chrome. The
specification and the product cannot drift apart, because they are the same
thing.

---

## Documents

| Document | What it covers |
|---|---|
| [BRAND.md](./BRAND.md) | Brand idea, the three-lens mark and its per-theme blending physics, wordmark, lockup, AI orb, the Lumen palette, gradients, the `.sy-lumen` field, voice, signature treatments |
| [FOUNDATIONS.md](./FOUNDATIONS.md) | Colour (OKLCH, the 12-step contract, the hue-shifting porcelain ramp, per-theme semantic mapping, WCAG solving), typography, space, shape, elevation, vellum, refraction, grid, z-index |
| [MOTION.md](./MOTION.md) | The five laws, duration and easing scales, choreography, the full interaction catalogue, reduced motion, sound, haptics |
| [PATTERNS.md](./PATTERNS.md) | The posture model, container queries, the content-column table, navigation, immersive screens, safe areas, depth, layout utilities, composition recipes |
| [COMPONENTS.md](./COMPONENTS.md) | Every primitive and composite: props, variants, states, sizing, light-first behaviours, accessibility contract, do and don't |
| [SCREENS.md](./SCREENS.md) | All 38 screens: purpose, hierarchy, anatomy, responsive behaviour, interactions |
| [FLOWS.md](./FLOWS.md) | Twelve end-to-end user flows with diagrams, branches, edge cases and honest implementation status |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | WCAG 2.2 AA conformance, what is guaranteed automatically, what is specific to the light theme, what is verified and what is not |
| [FIGMA.md](./FIGMA.md) | Importing the tokens, the per-theme semantic mapping, library structure, frame sizes, the content-column trap, handoff annotation |
| [SCREEN_AUTHORING_GUIDE.md](./SCREEN_AUTHORING_GUIDE.md) | How to build a new screen so it matches every other one |

---

## The five decisions everything else follows from

**1. Light is the theme the system is designed for.**
`:root` is light, `index.html` ships `data-theme="light"`, and `DEFAULT_THEME`
is `'light'`. Dark is a supported option, derived to match the light curve's
rhythm — not the canonical expression with a light skin bolted on. This is a
structural decision, not a default value, because a bright ground fails
differently: elevation has to mean *more light* rather than less, shadows have
to be sky-lit rather than black, emphasis cannot be a halo, and ink thins
instead of blooming. Each of those has a specific answer in the system, and each
is documented where it applies.

The one deliberate exception is media playback. The player, stories, shorts, the
live viewer's stage and the studio's monitors carry `data-theme="dark"` on the
element itself, in both themes, because the picture is the light source and
chrome around it should recede. Everything else is light-native.

**2. Colour is generated, never picked.**
Ramps are computed in OKLCH from one hue and one peak chroma per family. That is
what makes contrast a property of the *step index* rather than something audited
per colour. Where OKLCH and WCAG disagree — and they do, because WCAG's
luminance formula weights green at 0.7152 — the one step that carries text is
solved numerically against WCAG. 86 contrast assertions run on every build and
fail it on regression.

The neutral is the exception that proves the rule: `porcelain` shifts hue across
its own ramp, warm at the light end and cool at the dark end, because that is
what warm light and sky-lit shadow actually do. It is interpolated through OKLab
so the midtones pass through true neutral rather than detouring through green.

**3. Space is one number.**
Everything is a multiple of 4. A shared divisor makes optical alignment
automatic rather than something a designer nudges into place.

**4. Layout responds to its container, not the viewport.**
The shell and every screen are driven by container queries. A screen receives a
*content column*, and on a 1280px display with a context panel that column is
676px — narrower than a tablet's. Designing to device widths produces layouts
that break in exactly the postures nobody tested.

**5. Motion explains causality.**
Things enter from where they came from, duration follows distance, exits are
faster than entrances, and nothing important waits on an animation. Reduced
motion is a real mode, not a downgrade.

Running underneath all five: **nothing is communicated by colour alone.** Every
state carries at least two signals. Live is `rose` *and* a pulsing dot *and* the
word LIVE. A rising metric is green *and* an arrow *and* a signed number — and
`Stat` takes a `polarity` prop, because a rising error rate is not good news.
[ACCESSIBILITY.md](./ACCESSIBILITY.md) has the full table.

---

## Running it

```bash
pnpm install
pnpm dev        # the design gallery
pnpm build      # tokens, typecheck, bundle. Fails on contrast regression
pnpm tokens     # regenerate tokens.css, tokens.figma.json, contrast-audit.json
pnpm capture    # screenshot every screen in every posture and theme
```

Every view in the gallery is deep-linkable:

```
#/<screenId>?device=<iphone|android|tablet|web|desktop>&theme=<light|dark>
```

Add `&chrome=0` to render the device alone. Omitted parameters default to
`theme=light` and `device=desktop`.

---

## Repository map

```
src/design-system/
  tokens/       colour, typography, space, motion, elevation   (authoritative)
  styles/       tokens.css (GENERATED), base, brand, components, patterns, screens
  brand/        LogoMark, LogoWordmark, LogoLockup, AiOrb
  icons/        the icon set and its construction grid
  primitives/   every reusable control
  patterns/     AppShell, PageHeader

src/screens/    38 product screens, grouped by area, plus shared composites
src/showcase/   the design gallery and device frames

scripts/
  build-tokens.ts     the token compiler and contrast auditor
  capture.ts          headless screenshot and overflow harness
  contact-sheet.py    tiles captures into reviewable sheets

design/
  tokens.figma.json   W3C DTCG export for Figma
  contrast-audit.json WCAG evidence, regenerated every build
```

---

## Status

| Area | State |
|---|---|
| Token system, both themes | Complete, build-enforced |
| Brand marks and motion | Complete |
| Icon set | 113 icons on a documented 24×24 grid |
| Primitives | 26 controls in `primitives/index.tsx` plus `Icon`, and 9 shared composites in `screens/components.tsx` |
| Shell and layout | Three postures, container-query driven |
| Screens | 38, all rendering real content |
| Documentation | Complete |

**What this is:** a complete, production-grade design system and a fully
designed product surface, implemented as running code.

**What this is not:** a working application. There is no router, no data layer,
no network and no backend. Screens render realistic fixture data; controls that
would call a service are labelled and styled but inert.
[FLOWS.md](./FLOWS.md) marks every step of every flow as Working, Rendered,
Handoff or Absent, so the boundary is explicit rather than implied.
