# Accessibility

The target is **WCAG 2.2 Level AA**, with AAA for body-text contrast.

Accessibility here is structural rather than remedial: the token system makes
most of it automatic, and the component library makes the rest hard to get
wrong. A screen that composes tokens and primitives correctly is accessible by
construction.

---

## 1. What the system guarantees automatically

| Guarantee | Mechanism |
|---|---|
| Body text ≥ 7:1, secondary text ≥ 4.5:1 | The 12-step ramp contract. Steps 11 and 12 are defined by their contrast against the theme's own canvas, surface and hover steps |
| **Quiet text ≥ 4.5:1** | `fg-quiet` is a *text* step (`porcelain.9`) in both themes, and is audited as text against canvas and surface |
| Text on any solid fill ≥ 4.5:1 | Step 9 lightness is solved numerically against WCAG luminance; the text colour is computed, not chosen |
| State indicators ≥ 3:1 | Step 9 is the state-bearing step and is audited against canvas and surface |
| Focus indicator ≥ 3:1 on any background | The two-part ring: brand-coloured inner ring, canvas-coloured outer ring |
| No contrast regression ships | `pnpm tokens` runs the audit on every build and **fails the build** on regression |

Current audit result: **86 / 86 pass**, both themes — 43 assertions each. Full
evidence in `design/contrast-audit.json`, regenerated on every build.

Ratios are computed from the gamut-mapped sRGB hex — what a display actually
renders — so wide-gamut OKLCH rendering has equal or greater separation.

The audit resolves every pair **through the semantic table**, not through raw
step indices, because the structural mapping differs per theme: in light the
canvas is `porcelain.2` and a card is `porcelain.1`, while in dark the canvas is
step 1 and a card is step 2. Auditing raw indices would test the wrong pairs in
light and pass while the product failed.

One caveat when reading `contrast-audit.json`: rows labelled `… on bg-raised`
are measured against `bg-hover`, not `bg-raised`. In both themes `bg-hover` is
the lower-contrast of the two grounds, so the numbers are conservative — but
`bg-raised` itself is not covered. This is a naming bug in `build-tokens.ts`,
recorded in `FOUNDATIONS.md`.

### The three text tiers

The four assertions added since the last count are the two `fg-quiet` checks in
each theme. They exist because a bright ground is unforgiving: the usable
contrast range between the page and true ink is short, and it is tempting to
spend it on one body colour and call everything else "quiet". That produces axis
ticks, placeholders, timestamps and column headers sitting at roughly 2:1 —
technically present, and unreadable for a large number of people.

| Tier | Token | Ramp step | Light on canvas | Dark on canvas | Used for |
|---|---|---|---|---|---|
| Default | `--sy-fg-default` | `porcelain.12` | 16.21:1 | 17.61:1 | Body copy, titles, values |
| Muted | `--sy-fg-muted` | `porcelain.11` | 7.66:1 | 9.99:1 | Secondary text, descriptions, metadata |
| Quiet | `--sy-fg-quiet` | `porcelain.9` | **4.62:1** | 5.32:1 | Placeholders, axis labels, resting tab-bar items |

Step 8 was released from carrying text as part of this and is now purely a
border step.

> **Step 8 is not an accessible boundary.** It is decorative emphasis, audited
> only at 1.5:1 ("perceivable edge"). Any boundary that is the *sole* indicator
> of a control or its state must use `--sy-border-interactive`, the only border
> token guaranteed ≥ 3:1 (5.07:1 light, 5.04:1 dark).

### The tightest assertions

Worth knowing before changing a lightness curve, since these are what will fail
first:

| Assertion | Theme | Ratio | Requires | Headroom |
|---|---|---|---|---|
| `fg-quiet on bg-canvas` | light | 4.62 | 4.5 | 0.12 |
| `on-verdigris text on verdigris-9 solid` | light | 4.75 | 4.5 | 0.25 |
| `on-bloom text on bloom-9 solid` | dark | 4.83 | 4.5 | 0.33 |
| `on-aether text on aether-9 solid` | light | 4.85 | 4.5 | 0.35 |

`fg-quiet` in light theme is the single tightest pair in the system. The light
ramp's step 9 sits at L 0.538 and cannot go much lighter without losing it.

---

## 2. What is specific to the light theme

Light is the primary theme, and it fails differently from a dark one. Four
things in the system exist because of that.

**Ink thins on a bright ground.** A light field eats into dark strokes, which is
the opposite of the blooming that light-on-dark text suffers. Left uncorrected,
the same nominal weight reads noticeably lighter in the light theme than in the
dark one. `WEIGHT_DELTA` therefore corrects in *both* directions, and `base.css`
applies it to running text: `.sy-body`, `.sy-body-lg` and `.sy-body-sm` are
weight **410** in light and **380** in dark. This is legibility work, not
styling — it is what keeps a paragraph at the same perceived weight for a reader
who switches themes.

Related, and easy to break: `font-synthesis-weight: none` on `body` and
`font-synthesis: none` on the display styles. A synthetic bold is a smeared
outline, and on a high-contrast serif at display size it destroys exactly the
thick/thin modulation the face was chosen for.

**Shadows are cool, never black.** In light theme `--shadow-color-NN` is
`oklch(34% 0.042 266 / a)`. A neutral black shadow over a warm-white page reads
as dirt; a sky-lit one reads as air. Beyond looking right, it matters for
contrast: a cool shadow at 8–16% alpha keeps the surface beneath it inside the
range the audit measured, where a black shadow would drag it down.

**Elevated surfaces have no border in light theme**, which means shadow is the
only thing separating a card from the page. Where a boundary must be
*perceivable* rather than decorative — a control's edge, a selected state — use
`--sy-border-interactive`, not the elevation shadow.

**Three text tiers, not two.** Covered in section 1: on a bright ground the
usable range between page and ink is short, and spending it all on one body
colour is what puts placeholders and axis labels at 2:1.

---

## 3. Colour is never the only signal

Every state carries at least two of: **colour**, **an icon or shape**, **text**,
**weight or fill**.

| State | Signals |
|---|---|
| Active navigation | Accent colour + icon fill change + leading indicator bar (rail) |
| Live | Rose + pulsing dot + the word "LIVE" |
| Verified | Aether + a distinct badge glyph |
| Presence | Colour + position + `aria-label` |
| Positive / negative metric change | Colour + directional arrow + the signed number |
| Gift rarity | Hue + rim weight + diamond pips + the written tier name |
| Unread | Tint + filled dot + bold weight |
| Space privacy | Colour + lock/globe icon + the words "Public" / "Private" / "Invite only" |
| Form error | Danger border + error icon + error text, wired via `aria-describedby` |
| Selected tab | Colour + weight + indicator + `aria-selected` |

`Stat` takes a `polarity` prop for exactly this reason. Colouring every `+`
green would actively mislead on error rate, latency, cost per engagement and
every other metric where falling is the good outcome — those use
`lower-is-better` or `neutral`.

---

## 4. Keyboard

| Requirement | Implementation |
|---|---|
| Everything interactive is reachable | Real `<button>`, `<a>`, `<input>` elements throughout. No `div` click handlers |
| Focus is always visible | `:focus-visible` is styled globally and never removed. `outline: none` appears exactly once, immediately replaced |
| Focus order follows reading order | DOM order matches visual order; no positive `tabindex` anywhere |
| Skip link | `.sy-skip-link` is the first focusable element in the shell and jumps to `#sy-main` |
| Tabs | Full WAI-ARIA roving tabindex: Left/Right move, Home/End jump, only the active tab is tabbable |
| Removable chips | Two sibling buttons inside a shared pill, never a button nested in a button — nesting is invalid HTML and drops the inner control out of the tab order |
| Composite controls | `Switch` uses `role="switch"` + `aria-checked`; `Checkbox` uses `role="checkbox"` + `aria-checked`; both are real buttons |

Under `forced-colors: active` the focus ring falls back to a 3px `Highlight`
outline and the custom shadow is dropped, so the platform's own indicator wins.

---

## 5. Screen readers

| Requirement | Implementation |
|---|---|
| Icon-only controls are named | `IconButton` **requires** a `label` prop. There is no way to render one without a name |
| Decorative icons are silent | `Icon` sets `aria-hidden` unless given a `title`, so an icon beside a text label is not announced twice |
| Inputs are labelled | `Field` owns label association, hint and error wiring; no individual input can get it wrong |
| Errors are announced | `role="alert"` on the error text, linked via `aria-describedby` |
| Busy states are announced | `aria-busy` on loading buttons; `role="status"` on spinners and toasts |
| Progress is announced | `role="progressbar"` with `aria-valuenow` / `min` / `max`, or omitted entirely when indeterminate |
| Tooltips are associated | `aria-describedby` references the tip's `id` — though it sits on the wrapper span rather than on the trigger, so treat `Tooltip` as visual reinforcement and never as a control's only name |
| Charts are not sighted-only | `BarChart` and `Donut` both render the same data as a visually hidden `<table>` with a caption and a `<th scope="row">` per label, and mark the drawn chart `aria-hidden`. `Sparkline` has no table: it is `aria-hidden` by design, and its precise value is always shown as text beside it |
| Landmarks | `nav` with `aria-label="Primary"`, `main`, `aside` with a label, `header`, `article` for posts |
| Headings descend | One `h1` per screen (`PageHeader`), sections use `h2`, cards `h3` |
| Current page is marked | `aria-current="page"` on the active nav item |

`.sy-sr-only` is the single visually-hidden utility: clipped to 1px, never
`display: none`, so content stays in the accessibility tree.

---

## 6. Touch and pointer

- **Minimum target 44 × 44px.** Where a control's visual box is smaller — a
  24px `xs` button, a 20px checkbox — `.sy-touch-target` expands the hit area
  with a centred pseudo-element rather than inflating the visual box.
- **Thumb reach.** Primary destinations sit in the bottom tab bar on phones;
  the top third of a 6.7-inch device is unreachable without shifting grip. The
  gift rail — the highest-intent action on the live viewer — sits in the
  bottom-right corner.
- **No hover-only affordances.** Anything revealed on hover is also reachable
  by focus or by an explicit control.
- **Safe areas** are respected via `--safe-top` / `--safe-bottom` with an
  `env(safe-area-inset-*)` fallback, so nothing renders under a notch, a
  Dynamic Island or a home indicator.

---

## 7. Motion and vestibular safety

Under `prefers-reduced-motion: reduce`:

- All `--sy-dur-*` tokens collapse to 1ms — not 0, so `transitionend` still
  fires and awaiting logic does not stall. Every `--sy-transition-*` recipe
  becomes `120ms linear`, which is the short fade that replaces the movement.
- All `--sy-travel-*` distances become 0, so opacity carries every change.
- Ambient animation stops: the lumen field's drift, the orb's rings and core,
  the logo's core pulse, the live badge's dot, the typing dots, the skeleton
  sweep and the bar growth. `.sy-enter` swaps its cascade for a plain opacity
  fade, and the skeleton holds at 0.6 opacity so it still reads as a placeholder.
- The one deliberate exception is `Spinner`, which slows from 640ms to 1600ms
  rather than stopping. An indeterminate wait has nothing else to signal with,
  so it keeps turning at a rate below the flicker threshold.
- Smooth scrolling on `.sy-main` reverts to `auto`.
- Haptics are suppressed, since vestibular and tactile sensitivity frequently
  travel together.

State remains communicated. The AI orb's core drops to 70% opacity for
`thinking` rather than moving.

**One gap.** The logo's lens cluster keeps rotating. The rule in `brand.css`
targets `.sy-logo-mark__blades`, a class from the previous mark; the current
cluster is `.sy-logo-mark__lenses`, so the `thinking` spin is not suppressed.
`BRAND.md` records this under "Known inconsistencies".

---

## 8. Contrast preferences

Under `prefers-contrast: more`:

- Every **vellum** surface becomes opaque `--sy-bg-surface` and takes a
  `--sy-border-interactive` border, with `backdrop-filter` removed entirely.
- **Refraction** loses its spectral edge: `.sy-refract` takes a solid
  `--sy-border-interactive` border over its `--refract-fill`, and
  `.sy-refract-rule` becomes a plain `--sy-border-interactive` rule.
- The **lumen field** is removed (`display: none`).

Translucency and a hue-varying hairline are the two places the system knowingly
trades contrast for character, so they are the first two things to go. Nothing
that carries meaning depends on either: refraction marks *importance*, which is
always also carried by position, size and label, and the lumen field is
atmosphere with no text on it.

---

## 9. Content and language

- **Real content, everywhere.** There is no lorem ipsum in this codebase.
  Placeholder text has even word lengths, no diacritics and never overflows,
  which hides exactly the layout failures that matter. The demo data includes
  deliberately awkward names — Léa Bouchard-Tremblay, Mateo Fernández-Ruiz,
  Dr. Ngozi Adeyemi — and long titles for that reason.
- **Reading measure is capped** at 68ch by default; feed text is additionally
  capped at 680px independently of its card.
- **`text-wrap: balance`** on headings, **`pretty`** on paragraphs, so no
  heading ends on a single orphaned word.
- **Logical properties throughout** (`inline-size`, `padding-inline`,
  `inset-inline-start`), so right-to-left layouts mirror without a second
  stylesheet.
- **Uppercase is restricted** to the `overline` style and the wordmark.
  Uppercase destroys word shape and slows reading.
- **Truncation is never silent** where the full value matters; long titles
  clamp to two lines rather than cutting mid-word.

---

## 10. Verification

| Check | Method | Status |
|---|---|---|
| Contrast, both themes | `pnpm tokens` — 86 automated assertions, build-failing | **86 / 86 pass**, per `design/contrast-audit.json` |
| Horizontal overflow | `pnpm capture` measures every element in every captured combination, excluding intentional scrollers and clipped decoration | Harness present; no overflow report is committed |
| Type safety | `tsc -b` | Clean |
| Rendering, both themes | `pnpm capture --devices iphone,web,desktop --themes light,dark` over all 38 screens | Run locally; no capture set is committed |

The contrast audit is the only check whose evidence lives in the repository.
`design/captures` is generated output and is not committed, so the overflow and
rendering rows describe a procedure rather than a stored result.

### Not yet verified

Stated plainly rather than implied:

- **No screen-reader pass** has been run with NVDA, JAWS or VoiceOver. The ARIA
  contracts above are implemented and reviewed in source, not confirmed in a
  real assistive-technology session.
- **No keyboard-only walkthrough** of all 38 screens has been performed
  end to end.
- **No automated axe/Lighthouse run** is wired into the build. `pnpm test`
  invokes `vitest run`, but the repository contains no test files at all, so
  the command currently asserts nothing.
- **No committed capture set covers all five postures.** `scripts/capture.ts`
  defaults to `--devices desktop --themes light`, so any wider sweep has to be
  asked for explicitly, and `design/captures` is not committed. The harness
  supports all five devices in `src/showcase/devices.ts` and both themes; what
  is missing is stored evidence, not capability.

These are the next things to do, and none of them is blocked by the design
system.
