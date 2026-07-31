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
| Body text ≥ 7:1, secondary text ≥ 4.5:1 | The 12-step ramp contract. Steps 11 and 12 are defined by their contrast against steps 1–3 |
| Text on any solid fill ≥ 4.5:1 | Step 9 lightness is solved numerically against WCAG luminance; the text colour is computed, not chosen |
| State indicators ≥ 3:1 | Step 9 is the state-bearing step and is audited against canvas and surface |
| Focus indicator ≥ 3:1 on any background | The two-part ring: brand-coloured inner ring, canvas-coloured outer ring |
| No contrast regression ships | `pnpm tokens` runs the audit on every build and **fails the build** on regression |

Current audit result: **82 / 82 pass**, both themes. Full evidence in
`design/contrast-audit.json`, regenerated on every build.

Ratios are computed from the gamut-mapped sRGB hex — what a display actually
renders — so wide-gamut OKLCH rendering has equal or greater separation.

> **Step 8 is not an accessible boundary.** It is decorative emphasis. Any
> boundary that is the *sole* indicator of a control or its state must use
> `--sy-border-interactive`, the only border token guaranteed ≥ 3:1.

---

## 2. Colour is never the only signal

Every state carries at least two of: **colour**, **an icon or shape**, **text**,
**weight or fill**.

| State | Signals |
|---|---|
| Active navigation | Accent colour + icon fill change + leading indicator bar (rail) |
| Live | Crimson + pulsing dot + the word "LIVE" |
| Verified | Iris + a distinct badge glyph |
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

## 3. Keyboard

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

## 4. Screen readers

| Requirement | Implementation |
|---|---|
| Icon-only controls are named | `IconButton` **requires** a `label` prop. There is no way to render one without a name |
| Decorative icons are silent | `Icon` sets `aria-hidden` unless given a `title`, so an icon beside a text label is not announced twice |
| Inputs are labelled | `Field` owns label association, hint and error wiring; no individual input can get it wrong |
| Errors are announced | `role="alert"` on the error text, linked via `aria-describedby` |
| Busy states are announced | `aria-busy` on loading buttons; `role="status"` on spinners and toasts |
| Progress is announced | `role="progressbar"` with `aria-valuenow` / `min` / `max`, or omitted entirely when indeterminate |
| Tooltips are associated | `aria-describedby` links trigger to tip. A `role="tooltip"` element nothing references is invisible to assistive technology |
| Charts are not sighted-only | `BarChart` and `Donut` each render the same data as a visually hidden `<table>` |
| Landmarks | `nav` with `aria-label="Primary"`, `main`, `aside` with a label, `header`, `article` for posts |
| Headings descend | One `h1` per screen (`PageHeader`), sections use `h2`, cards `h3` |
| Current page is marked | `aria-current="page"` on the active nav item |

`.sy-sr-only` is the single visually-hidden utility: clipped to 1px, never
`display: none`, so content stays in the accessibility tree.

---

## 5. Touch and pointer

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

## 6. Motion and vestibular safety

Under `prefers-reduced-motion: reduce`:

- All durations collapse to 1ms — not 0, so `transitionend` still fires and
  awaiting logic does not stall.
- All travel distances become 0, so opacity carries every change.
- Ambient animation stops entirely: aurora drift, logo rotation, orb rotation,
  live pulse, skeleton sweep, bar growth.
- Smooth scrolling is disabled.
- Haptics are suppressed, since vestibular and tactile sensitivity frequently
  travel together.

State remains communicated. The AI orb's core drops to 70% opacity for
`thinking` rather than moving.

---

## 7. Contrast preferences

Under `prefers-contrast: more`:

- Every glass surface becomes **opaque** and takes a
  `--sy-border-interactive` border. Translucency is the one place the system
  knowingly trades contrast for depth, so it is the first thing to go.
- The aurora backdrop is removed.

---

## 8. Content and language

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

## 9. Verification

| Check | Method | Status |
|---|---|---|
| Contrast, both themes | `pnpm tokens` — 82 automated assertions, build-failing | **82 / 82 pass** |
| Horizontal overflow | `pnpm capture` measures every element in every captured combination, excluding intentional scrollers and clipped decoration | **0 detected across 191 captures** |
| Type safety | `tsc -b` | Clean |
| Rendering, both themes | 191 screenshots across iPhone, Web and Desktop | Reviewed |

### Not yet verified

Stated plainly rather than implied:

- **No screen-reader pass** has been run with NVDA, JAWS or VoiceOver. The ARIA
  contracts above are implemented and reviewed in source, not confirmed in a
  real assistive-technology session.
- **No keyboard-only walkthrough** of all 38 screens has been performed
  end to end.
- **No automated axe/Lighthouse run** is wired into the build.
- **Tablet and Android captures are missing** from the visual sweep — a
  limitation of the capture harness, not a known layout failure. Those postures
  were reviewed manually in the gallery.

These are the next things to do, and none of them is blocked by the design
system.
