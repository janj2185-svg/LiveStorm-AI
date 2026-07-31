# SYLORA

A complete design system and product surface for **SYLORA** — an AI-first
ecosystem combining live streaming, social networking, content creation, AI
assistants, education, business tools, creator monetization, a marketplace and
communities.

Thirty-eight fully designed screens, a generated colour system with
build-enforced contrast, an original brand identity and icon set, a motion
system, and a design gallery that renders every screen in true-resolution device
chrome in both themes.

**The full specification lives in [`docs/design/`](./docs/design/README.md).**

---

## Quick start

```bash
pnpm install
pnpm dev
```

Open the gallery, pick a screen from the left, and switch device and theme from
the top bar. Every view is deep-linkable:

```
#/<screenId>?device=<iphone|android|tablet|web|desktop>&theme=<dark|light>
```

Append `&chrome=0` to render the device on its own.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Design gallery with hot reload |
| `pnpm build` | Compile tokens, typecheck, bundle. **Fails on any contrast regression** |
| `pnpm tokens` | Regenerate `tokens.css`, `tokens.figma.json` and `contrast-audit.json` |
| `pnpm capture` | Screenshot every screen in every posture and theme, and report horizontal overflow |
| `pnpm typecheck` | TypeScript only |
| `pnpm preview` | Serve the production build |

## Layout

```
src/design-system/
  tokens/       colour, typography, space, motion, elevation   (authoritative)
  styles/       tokens.css (GENERATED), base, brand, components, patterns, screens
  brand/        LogoMark, LogoWordmark, LogoLockup, AiOrb
  icons/        113 icons on a documented 24×24 construction grid
  primitives/   28 components
  patterns/     AppShell, PageHeader

src/screens/    38 product screens grouped by area, plus shared composites
src/showcase/   the design gallery and device frames

scripts/
  build-tokens.ts     token compiler and WCAG auditor
  capture.ts          headless screenshot and overflow harness (no browser dependency)
  contact-sheet.py    tiles captures into reviewable sheets

design/
  tokens.figma.json   W3C DTCG export for Figma / Tokens Studio
  contrast-audit.json WCAG evidence, regenerated on every build
```

## How it works

Colour is **generated, not picked**. Each family is one hue and one peak chroma;
a shared lightness curve produces a 12-step ramp where the step index has a
fixed meaning. Because OKLCH is perceptually uniform, contrast becomes a
property of the step rather than something audited per colour — and where OKLCH
and WCAG's green-weighted luminance formula disagree, the one step that carries
text is solved numerically against WCAG.

Layout responds to a **container, not the viewport**. The shell and every screen
are driven by container queries, so one implementation is correct at 393px
inside a phone frame and at 1512px full-screen. A screen receives a *content
column* — and on a 1280px display with a context panel, that column is 676px,
narrower than a tablet's.

Nothing is communicated by **colour alone**. Every state carries at least two
signals.

`src/design-system/styles/tokens.css` is generated. Edit the TypeScript token
modules and run `pnpm tokens`.

## Status

A complete, production-grade design system and a fully designed product surface.

It is **not** a working application: there is no router, data layer, network or
backend. Screens render realistic fixture data, and controls that would call a
service are designed and styled but inert.
[`docs/design/FLOWS.md`](./docs/design/FLOWS.md) marks every step of every user
flow as Working, Rendered, Handoff or Absent, so the boundary is explicit.
