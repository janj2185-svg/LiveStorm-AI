# Layout and navigation specification

How a SYLORA screen is placed on a surface: postures, navigation, safe areas,
grids, depth, and the recipes for assembling each kind of screen.

Source of truth for this document:

| Area | File |
|---|---|
| Shell markup and posture rationale | `src/design-system/patterns/AppShell.tsx` |
| Shell and layout CSS | `src/design-system/styles/patterns.css` |
| Layout utilities, vellum, refraction, focus | `src/design-system/styles/base.css` |
| Shared screen composites | `src/design-system/styles/screens.css` |
| Shell dimensions, grid, z-index | `src/design-system/tokens/space.ts` |
| Elevation, vellum and refraction recipes | `src/design-system/tokens/elevation.ts` |
| Reference device widths | `src/showcase/devices.ts` |

---

## 1. The posture model

SYLORA runs on phones held in one hand, tablets on a desk, and desktops with a
mouse. Rather than three codebases the shell has three *postures*, chosen by the
width of the shell's own container.

| Posture | Shell container width | Structure | Grid template |
|---|---|---|---|
| compact | `< 768px` | Top bar + content + floating bottom tab bar | `1fr` / `'body'` |
| medium | `≥ 768px` | Collapsed 76px icon rail + content | `auto 1fr` / `'rail body'` |
| expanded | `≥ 1280px` | Expanded 264px rail + content + 340px context panel | `auto 1fr auto` / `'rail body context'` |

There are exactly two thresholds — **768** and **1280** — and they are declared
once each, in `patterns.css`, as `@container shell (min-width: …)`.

What changes at each threshold:

| Element | compact | medium (≥768) | expanded (≥1280) |
|---|---|---|---|
| `.sy-rail` | `display: none` | `display: flex`, 76px (`--sy-shell-railCollapsed`), items centred, `padding-inline: 0` | 264px (`--sy-shell-railExpanded`), `padding-inline: var(--sy-space-3)`, items left-aligned |
| `.sy-rail__label` | hidden | hidden | `display: inline` |
| `.sy-rail__badge` | hidden | hidden | `display: grid` |
| `.sy-rail__brand` | — | logo **mark** only, centred | full **lockup**, left-aligned |
| `.sy-tabbar` | visible, floating | `display: none` | `display: none` |
| `.sy-context` | `display: none` | `display: none` | `display: flex`, 340px |
| `.sy-main` bottom padding | `tabBar + safe-bottom + 24px` | 32px (`--sy-space-8`) | 32px |
| `.sy-topbar__search` | hidden below 768 | visible | visible |
| `.sy-topbar__brand` | visible | hidden (identity moved to the rail) | hidden |

The rail is hidden with `display`, not unmounted, so focus order and
screen-reader landmarks stay stable when the shell is resized.

---

## 2. Why container queries, not media queries

The shell responds to the size of the box it is given, not the size of the
browser window. That makes the same component correct inside a phone frame in
the design gallery, inside a tablet split-view, and full-screen on a desktop —
with one implementation and no device sniffing. Nothing in the shell reads the
viewport.

There are two containers:

| Container name | Declared on | Queried by |
|---|---|---|
| `shell` | `.sy-shell-frame` (`container: shell / inline-size`) | `.sy-shell`, `.sy-rail`, `.sy-tabbar`, `.sy-context`, `.sy-topbar__*` |
| `screen` | `.sy-main` (`container: screen / inline-size`), or `.sy-shell--immersive` for immersive screens | `.sy-screen__inner`, `.sy-cols--*`, `.sy-scroller`, and every screen-group stylesheet |

### The wrapper rule

**An element never matches a container query it declares itself.** This is the
single most important structural fact in the system, and it is why two wrappers
exist that otherwise look redundant:

- `.sy-shell-frame` owns the `shell` container; `.sy-shell` is the element whose
  `grid-template-columns` changes with posture. Collapsing these two into one
  element would silently pin the shell to its compact posture forever, because
  `.sy-shell` would be the container and could not match `@container shell
  (min-width: 768px)`.
- `.sy-main` owns the `screen` container; `.sy-screen` is the screen's own root.
  Putting the container on `.sy-main` rather than on `.sy-screen` is deliberate:
  a screen's root can then be restyled by a container query, which it could not
  do if it were its own container.

This is the one structural wrapper convention in the whole system. If a screen
appears stuck at its narrowest layout, the first thing to check is whether
something has moved a `container` declaration onto the element it is meant to
style.

A `@media` query inside a screen stylesheet is a bug: it would respond to the
browser window instead of the device frame, and the design gallery renders five
device frames at once inside a single window.

---

## 3. The content column

This is the non-obvious part of the system and the most common source of broken
screens.

The shell subtracts its own chrome before a screen sees any width. The width a
screen actually receives on each reference device:

| Device | Device width | Shell chrome subtracted | Content column |
|---|---|---|---|
| iPhone (iPhone 15 Pro) | 393 | none | **393** |
| Android (Pixel 8 Pro) | 412 | none | **412** |
| Tablet (iPad Pro 11") | 834 | 76 (collapsed rail) | **758** |
| Web (browser at 1280) | 1280 | 264 (expanded rail) + 340 (context panel) = 604 | **676** |
| Desktop (MacBook Pro 14") | 1512 | 604 | **908** |

Two consequences that are easy to get wrong:

1. **Web at 1280 is narrower than tablet at 834.** The widest device is not the
   widest content column, because the expanded posture spends 604px on
   navigation. 676px is the tightest multi-column case in the product and the
   easiest width to break. A layout that works at 393 and at 1512 can still fail
   at 1280.
2. **A `min-width: 768px` container query on the `screen` container fires on
   neither the tablet (758) nor the 1280 web posture (676).** Device-shaped
   numbers are the wrong numbers here.

### Screen breakpoints

The system therefore uses **560 / 840 / 880** against the `screen` container.
These land cleanly either side of the five real widths above:

| Threshold | Fires on | Does not fire on | What it does |
|---|---|---|---|
| 560 | 676, 758, 908 | 393, 412 | `.sy-screen__inner` padding 16 → 24px; `.sy-cols--2/3/4` become 2 columns; `.sy-scroller` bleed widens to 24px |
| 840 | 908 only | 393, 412, 676, 758 | `.sy-cols` gap 16 → 24px; `.sy-cols--3` becomes 3 columns; `.sy-cols--4` becomes 4 |
| 880 | 908 only | 393, 412, 676, 758 | `.sy-screen__inner` padding 24 → 32px; `.sy-cols--sidebar` and `.sy-cols--sidebar-start` become two-pane |

The practical reading: **676 and 758 behave the same** (two columns, 24px
padding, single-pane), and only the 908 desktop column gets three- and
four-column grids or a sidebar. A screen that needs a different split at 758
than at 676 must add its own threshold between those two numbers in its group
stylesheet.

The "fires on" column above assumes a screen that carries a context panel, which
is where the widths are tightest. Only four screens do — `home`, `assistant`,
`creator-dashboard` and `wallet`. On the other 27 non-immersive screens the
expanded posture only deducts the 264px rail, so the columns are 1016 and 1248
and **all three thresholds fire at both web and desktop**. The panel-bearing case
is the one worth designing against.

Note that `SCREEN_AUTHORING_GUIDE.md` cites 640 / 768 / 1024 / 1280 as the
screen breakpoints, and group stylesheets do use those numbers. Measured against
the five real content widths they behave like this:

| Threshold used in screens | Fires on | Effectively means |
|---|---|---|
| 480, 560, 600, 640 | 676, 758, 908 | "not a phone" |
| 700, 720, 768 | 758, 908 | "tablet or desktop", **not** the 1280 web posture |
| 900, 960, 992 | 908 | "desktop column only" |
| 1024, 1100, 1152, 1280 | nothing at the reference widths | dead at 393–1512; only reaches a browser wider than about 1630px |

So a `@container screen (min-width: 1024px)` rule never applies on any of the
five reference devices. When a screen needs a desktop-only layout, the working
threshold is somewhere between 759 and 908 — the system layer uses 840 and 880 —
and when it needs to separate tablet from the 1280 web posture, the threshold
must fall between 677 and 758.

---

## 4. Navigation

### 4.1 Five primary destinations, and no more

`SHELL_NAV` in `src/screens/registry.ts` defines five: Home, Discover, Live,
Messages, You. `SHELL_NAV_SECONDARY` holds Studio, Analytics, Wallet,
Marketplace, Settings, rendered below a divider in the rail and **never** in the
tab bar.

Five is the ceiling for two reasons. The bottom tab bar divides its width evenly
between items on a 393px screen; at six items each target falls below a
comfortable thumb width, and the 10px labels start truncating. And a primary
navigation list is a claim about what the product *is* — every added destination
weakens the other four. Secondary destinations are reached from the rail on
larger surfaces and from within screens on phones.

By default only the first four primary items reach the phone tab bar
(`nav.slice(0, 4)`); `tabBarItems` can override which ids appear, and the rest
move behind a "More" affordance owned by the screen.

### 4.2 Navigation rail

| Property | Value |
|---|---|
| Width, collapsed | 76px (`--sy-shell-railCollapsed`) |
| Width, expanded | 264px (`--sy-shell-railExpanded`) |
| Padding | `12px 8px` collapsed; `padding-inline: 12px` expanded |
| Background / border | `--sy-bg-surface`, 1px `--sy-border-subtle` on the inline end |
| Brand block | 48px tall, 12px bottom margin; mark only when collapsed, full lockup when expanded |
| Item height | 44px — the minimum touch target, even though the rail is a pointer surface |
| Item radius | `--sy-radius-md` (10px) |
| Item gap | 12px between icon and label; 2px between items |
| Icon | 20px, `filled` when active |
| Badge | 18px pill, `--sy-accent-solid` fill with `--sy-on-accent` text, 11px weight 600; visible only in the expanded posture |
| Live dot | 7px `--sy-rose-9` with a 2px `--sy-bg-surface` ring, pulsing at 1.8s |
| Footer | `margin-block-start: auto` — pinned to the bottom |

### 4.3 The active state carries three redundant signals

`.sy-rail__item.is-active` changes three things at once, so the selection
survives greyscale, colour-vision differences and low contrast:

1. **Fill** — the icon switches from stroke to `filled`, adding a 20%
   `currentColor` fill under the stroke. This is a weight change, visible with no
   colour at all.
2. **Colour** — background `--sy-accent-bg`, foreground `--sy-accent-fg`.
3. **Position** — a 3px indicator bar drawn with `::before` at the inline start,
   inset 25% top and bottom, with a pill radius on its outer end.

The tab bar carries the same idea with two of the three: `filled` icon plus
`--sy-accent-fg`. Both also set `aria-current="page"`, which is the fourth,
non-visual signal.

### 4.4 Bottom tab bar (compact only)

| Property | Value |
|---|---|
| Height | 60px (`--sy-shell-tabBar`) |
| Position | `absolute`, `inset-inline: var(--sy-space-3)` (12px), `inset-block-end: calc(safe-bottom + var(--sy-space-2))` |
| Stacking | `--sy-z-navigation` (200) |
| Radius | `--sy-radius-xl` (20px) |
| Material | `.sy-vellum .sy-vellum--veil` — 14px blur, 1.5 saturate, brightness 1.06 in light and 0.96 in dark |
| Shadow | `--sy-elevation-overlay` |
| Item | `flex: 1`, column, 3px gap, icon 22px, label 10px weight 550 truncated |
| Item rest colour | `--sy-fg-quiet` — a legible text step in both themes, not a border step |
| Item press | `scale: 0.92` over `--sy-transition-press` |
| Badge | 16px min-width pill, `--sy-rose-9` fill with `--sy-on-danger` text, 10px weight 700, offset `top: -4px; inset-inline-start: 60%` |
| Live dot | 7px `--sy-rose-9`, pulsing |

**Why navigation moves to the bottom on phones.** The top third of a 6.7-inch
phone is unreachable without shifting grip. Primary destinations belong under
the thumb; the top bar keeps only identity, context and low-frequency actions.

**Why it floats rather than sitting flush.** The bar is inset 12px on each side
and lifted clear of the home indicator, and it is vellum, so the feed stays
partly visible beneath it. In light theme the veil's `brightness(1.06)` means
the feed showing through is *brightened* rather than fogged — the bar reads as a
sheet of translucent paper over the page, not as a grey smear across it. That
preserves the sense that the content is continuous and the navigation is a layer
on top of it. The cost is that `.sy-main` must reserve the space — see section 5.

### 4.5 Context panel

| Property | Value |
|---|---|
| Width | 340px (`--sy-shell-contextPanel`) |
| Appears at | `≥ 1280px` shell width only |
| Background / border | `--sy-bg-surface`, 1px `--sy-border-subtle` on the inline start |
| Header | 64px tall (`--sy-shell-topBar`), 16px padding-inline, `h2.sy-label`, bottom hairline |
| Body | `flex: 1`, `overflow-y: auto`, 16px padding |
| Landmark | `aside` with `aria-label` from `contextPanelTitle`, defaulting to "Contextual information" |

The panel is supplementary by definition: it only exists in the widest posture,
so nothing essential to completing a task may live there. A screen declares it
through `contextPanel` / `contextPanelTitle` in its `ScreenDefinition`.

`--sy-shell-contextPanelWide` (400px) exists as a token but is not currently
used by any rule.

### 4.6 Top bar

| Property | Value |
|---|---|
| Height | `calc(64px + safe-top)` (`--sy-shell-topBar` + inset) |
| Position | `sticky`, `inset-block-start: 0`, `z-index: var(--sy-z-sticky)` (100) |
| Padding | `padding-block-start: safe-top`, `padding-inline: 16px` |
| Material | `.sy-vellum .sy-vellum--veil` |
| Border | 1px `--sy-border-subtle` on the block end |
| Gap | 12px |

`.sy-topbar__search` is hidden below 768px: the screen owns its own search field
in thumb reach, and showing both would be a duplicate control and a wasted 40px
of a 393px screen. `.sy-topbar__brand` is hidden from 768px up, because identity
lives in the rail once there is one.

The shell also renders a `.sy-skip-link` ("Skip to content") as the first
focusable element, targeting `#sy-main`; it translates into view on
`:focus-visible` and sits at `--sy-z-spotlight` (900). `.sy-main` has
`tabIndex={-1}` so the skip target can receive focus, and its focus outline is
suppressed because it is a scroll region, not a control.

---

## 5. Safe areas

On a notched phone the status bar and home indicator sit *inside* the viewport,
so chrome that starts at `y=0` renders underneath the hardware.

Two custom properties carry the insets:

```css
var(--safe-top,    env(safe-area-inset-top, 0px))
var(--safe-bottom, env(safe-area-inset-bottom, 0px))
```

The design gallery supplies `--safe-top` / `--safe-bottom` from the device
profile (`DeviceFrame.tsx` sets them on `.sy-device__viewport`); on a real device
the fallback chain reaches `env(safe-area-inset-*)`, and finally `0px` on
surfaces that have no insets at all. `SHELL.safeAreaFallback` (20px) exists as a
token for cases that need a fixed reserve.

Reference insets:

| Device | `safeTop` | `safeBottom` |
|---|---|---|
| iPhone | 59 | 34 |
| Android | 48 | 24 |
| Tablet | 24 | 20 |
| Desktop / Web | 0 | 0 |

Which chrome consumes them:

| Element | Consumption |
|---|---|
| `.sy-topbar` | `block-size: calc(var(--sy-shell-topBar) + safe-top)` and `padding-block-start: safe-top` — the bar grows, the content inside it does not move under the notch |
| `.sy-tabbar` | `inset-block-end: calc(safe-bottom + var(--sy-space-2))` — floats clear of the home indicator rather than under it |
| `.sy-main` | `padding-block-end: calc(var(--sy-shell-tabBar) + safe-bottom + var(--sy-space-6))` in compact — 60 + inset + 24, so the last item in a scroll is never trapped behind the floating bar. From 768px up this becomes a flat 32px |
| Immersive chrome | Screens apply the insets themselves, e.g. the live viewer's top strip uses `padding: calc(var(--safe-top, 0px) + var(--sy-space-3)) …` and its bottom strip mirrors it with `--safe-bottom` |

`html` also sets `scroll-padding-block-start: calc(var(--sy-shell-topBar) +
var(--sy-space-4))` (80px) so anchor jumps and `:target` scrolls do not land
under the sticky top bar.

---

## 6. Responsive grid

From `GRID` in `src/design-system/tokens/space.ts`, emitted as
`--sy-grid-columns`, `--sy-grid-margin`, `--sy-grid-gutter` and `--sy-grid-max`.

| Breakpoint | From | Columns | Margin | Gutter | Max content |
|---|---|---|---|---|---|
| `compact` | 0 | 4 | 16px | 16px | none (100%) |
| `handheld` | 480 | 4 | 20px | 16px | none (100%) |
| `tablet` | 768 | 8 | 28px | 20px | none (100%) |
| `laptop` | 1024 | 12 | 32px | 24px | 1120px |
| `desktop` | 1280 | 12 | 40px | 24px | 1280px |
| `wide` | 1600 | 12 | 48px | 28px | 1440px |

Column counts step 4 → 8 → 12 so that a 12-column desktop layout can be halved
to 6, thirded to 4, and still divide evenly on tablet. Content is capped at 1440
because beyond roughly 90 characters the eye loses the line return, and because
unbounded growth turns a designed layout into a stretched one.

Two caveats:

1. These variables are switched by **viewport** `@media` queries in
   `tokens.css`, not by container queries. They are correct for full-window
   layouts and for `.sy-grid`'s gutter, but they are not posture-aware. Screens
   should size their own columns from `screen` container queries and use the
   grid tokens for gutters.
2. `.sy-container` consumes `--sy-grid-max` and `--sy-grid-margin`. Screens do
   **not** use `.sy-container`; they use `.sy-screen__inner`, which is
   container-query driven and capped independently at 1440px.

---

## 7. Layout utilities

### 7.1 The content column

`.sy-screen__inner` is the responsive content column every non-immersive screen
uses.

| Property | Value |
|---|---|
| Width | 100% |
| Max width | 1440px |
| Margin | `margin-inline: auto` |
| Padding-inline | 16px (`--sy-space-4`) below 560; 24px (`--sy-space-6`) from 560; 32px (`--sy-space-8`) from 880 |

It is capped independently of the viewport: the shell has already subtracted the
rail and context panel, so this only has to stop the content column from running
past a comfortable reading width on very large displays.

`.sy-screen` itself only sets `min-block-size: 100%`, so a short screen still
fills the scroll area.

### 7.2 Column helpers

| Class | Behaviour |
|---|---|
| `.sy-cols` | Grid, one column, `gap: var(--sy-space-4)`; gap becomes 24px at `screen ≥ 840` |
| `.sy-cols--2` | 2 columns from 560 |
| `.sy-cols--3` | 2 columns from 560, 3 columns from 840 |
| `.sy-cols--4` | 2 columns from 560, 4 columns from 840 |
| `.sy-cols--sidebar` | `minmax(0, 1fr) 300px` from 880; single column below |
| `.sy-cols--sidebar-start` | `250px minmax(0, 1fr)` from 880; single column below |

Because 880 only fires on the 908px desktop column, both sidebar layouts are
single-column at 676 and 758 — plan the stacking order accordingly, since the
sidebar will appear *below* the main pane on every posture except desktop.

### 7.3 Auto-fitting grid

`.sy-grid` is the preferred card layout because it removes almost every
breakpoint:

```css
.sy-grid {
  display: grid;
  gap: var(--sy-grid-gutter);
  grid-template-columns: repeat(auto-fill, minmax(min(var(--min, 260px), 100%), 1fr));
}
```

Set `--min` to the smallest acceptable card width and the browser decides the
column count. The `min(…, 100%)` guard is what stops a 260px minimum from
overflowing a 240px column. Values in use across the product range from 124px
(gift tiles) to 280px (community cards).

### 7.4 Horizontal scroller

`.sy-scroller` is a snapping, edge-bleeding rail:

| Property | Value |
|---|---|
| Layout | `display: flex`, `gap: var(--sy-space-3)` (12px) |
| Snap | `scroll-snap-type: x mandatory`; children get `scroll-snap-align: start` and `flex-shrink: 0` |
| Bleed | `margin-inline: calc(var(--sy-space-4) * -1)` with matching padding, so cards run to the screen edge; both become 24px from `screen ≥ 560` |
| Scrollbar | Hidden (`scrollbar-width: none` plus the WebKit pseudo-element) |

The negative margin exactly cancels `.sy-screen__inner`'s padding at the same
threshold — if a screen changes its own inner padding, the bleed must change
with it.

### 7.5 Flex utilities and the gap scale

| Class | Behaviour |
|---|---|
| `.sy-stack` | `display: flex; flex-direction: column` |
| `.sy-row` | `display: flex; flex-direction: row; align-items: center` |
| `.sy-between` | `justify-content: space-between` |
| `.sy-center` | `align-items: center; justify-content: center` |
| `.sy-wrap` | `flex-wrap: wrap` |
| `.sy-grow` | `flex: 1 1 auto; min-width: 0` — the `min-width: 0` is what stops long text from refusing to shrink |
| `.sy-shrink-0` | `flex-shrink: 0` |
| `.sy-divider` | 1px full-width rule in `--sy-border-subtle`; `.sy-divider--vertical` for the inline axis |

Gap scale, matching the spacing lattice:

| Class | Token | px |
|---|---|---|
| `.sy-gap-1` | `--sy-space-1` | 4 |
| `.sy-gap-2` | `--sy-space-2` | 8 |
| `.sy-gap-3` | `--sy-space-3` | 12 |
| `.sy-gap-4` | `--sy-space-4` | 16 |
| `.sy-gap-5` | `--sy-space-5` | 20 |
| `.sy-gap-6` | `--sy-space-6` | 24 |
| `.sy-gap-8` | `--sy-space-8` | 32 |
| `.sy-gap-10` | `--sy-space-10` | 40 |
| `.sy-gap-12` | `--sy-space-12` | 48 |

There is no `.sy-gap-7`; the scale is deliberately sparse so "almost the same"
spacing cannot creep in.

### 7.6 Section rhythm and entrance choreography

| Class | Behaviour |
|---|---|
| `.sy-screen-section` | Column, 16px gap, **32px bottom margin** — the standard gap between sections |
| `.sy-enter` | Cascades direct children in with `sy-enter-up` (opacity 0 → 1, `translate: 0 var(--sy-travel-medium)` → 0) over `--sy-dur-slow` (380ms) with `--sy-ease-enter` |
| `.sy-tile-icon` | 40 x 40px icon tile, `--sy-radius-md`, `--tone-bg` / `--tone-fg` with neutral fallbacks; `--lg` is 48px with `--sy-radius-lg` |
| `.sy-kv` | Key/value row: space-between, 10px block padding, hairline separator, last child unruled |

The cascade uses 40ms steps (`--sy-stagger-base`) and is capped at eight
children: `nth-child(n + 8)` all share the 280ms delay, so a long list does not
turn the cascade into a progress bar. Under `prefers-reduced-motion` the
transform is dropped and only an opacity fade remains.

---

## 8. Z-index scale

A short, ordered list. **Any value not in this list is a bug** — arbitrary
z-index numbers are how stacking contexts become unfixable.

| Token | Value | Used by |
|---|---|---|
| `--sy-z-base` | 0 | Default flow, `.sy-lumen` |
| `--sy-z-raised` | 10 | In-card floating elements |
| `--sy-z-sticky` | 100 | `.sy-topbar`, sticky filter bars |
| `--sy-z-navigation` | 200 | `.sy-tabbar` |
| `--sy-z-overlayScrim` | 300 | Scrim behind drawers and dialogs |
| `--sy-z-drawer` | 400 | Side drawers and sheets |
| `--sy-z-modal` | 500 | Dialogs |
| `--sy-z-popover` | 600 | Menus, pickers, command palette |
| `--sy-z-toast` | 700 | Toast stack |
| `--sy-z-tooltip` | 800 | `.sy-tooltip` |
| `--sy-z-spotlight` | 900 | `.sy-skip-link`, debug and dev-only affordances |

Two rules follow from the ordering. A scrim must always sit exactly one step
below the thing it dims, which is why `overlayScrim` (300) is below `drawer`
(400) and `modal` (500). And local stacking inside a component should use
`z-index: 1` or `2` within its own stacking context — `.sy-media__content` and
the live viewer's chrome layers do exactly this — rather than reaching for a
global token.

---

## 9. Immersive screens

A screen is immersive when there is no product shell around it — either because
the content *is* the interface, or because the user is not yet inside the
product. `ScreenDefinition.immersive` marks them, and `AppShell` short-circuits:

```tsx
if (immersive) {
  return <div className="sy-shell-frame sy-shell--immersive">{children}</div>;
}
```

`.sy-shell--immersive` is `display: block`, `block-size: 100%`, background
`--sy-bg-canvas`, and it declares `container: screen / inline-size` itself —
because there is no `.sy-main` to do it. There is no rail, no tab bar, no top
bar and no context panel: the screen owns the full surface and must therefore
supply its own back affordance, its own safe-area padding, and its own scroll
containment.

### 9.1 The seven immersive screens, and why they are two different kinds

| Screen | Group | Why immersive |
|---|---|---|
| Welcome | Entry | Pre-authentication. There is nothing to navigate to yet, so navigation chrome would be a promise the product cannot keep. |
| Authentication | Entry | Same. |
| Onboarding | Entry | Same. |
| Video player | Media | The picture is the product. |
| Stories | Media | The picture is the product. |
| Shorts | Media | The picture is the product. |
| Live viewer | Live | The picture is the product. |

**The default fill is the page canvas, not black**, and that is the single
decision that keeps both kinds working. The two groups sit at opposite ends of
the range: the entry screens are the *brightest* pages in the product, and the
media screens are the *darkest*. Media screens set their own dark theme on their
own root (section 9.3); defaulting the frame to black instead would have made
every landing page flash dark before its own styles applied.

### 9.2 The chrome budget

Chrome on an immersive screen is borrowed pixels that must be handed back.

| Screen | Top strip | Bottom region | Protected band |
|---|---|---|---|
| Live viewer | ≤ 12% of the frame | ≤ 45% (chat sheet is 38% of the frame on phones, plus the controls and gift rail overlay) | The middle band, so a 16:9 stream is fully visible at all times |
| Video player | ≤ 12% | ≤ 24% | The central 64%, where faces, subtitles and burned-in graphics live |

The centre transport on the player occupies only a horizontal band through the
middle, so the protected region is never fully covered. The two screens follow
the same rule with different bottom budgets because the live viewer has to carry
chat.

Both use absolute layers over the media, with the safe-area insets folded into
the padding of each strip rather than into the stage. The stage is never
letterboxed by chrome.

### 9.3 Media surfaces stay dark in both themes

The product is light-native everywhere except where a picture is playing. A
playback surface is not a page that happens to be dark — it is a *light source*,
and the interface around a light source has to be darker than it or the picture
stops being the brightest thing in the frame.

So those surfaces re-declare the theme on their own subtree rather than
hard-coding colours:

| Element | Declared on | Effect |
|---|---|---|
| `.sy-player` | `data-theme="dark"` on the screen root | Whole player, both stage and transport |
| `.sy-stories-screen` | `data-theme="dark"` on the screen root | Whole stories surface |
| `.sy-shorts` | `data-theme="dark"` on the screen root | Whole shorts reel |
| `.sy-live-viewer__stage` | `data-theme="dark"` on the stage only | The stage is dark; the chat rail beside it stays in the room's theme |
| `.sy-monitor__screen` | `data-theme="dark"` per monitor | The studio's programme and preview monitors are dark; the tool around them is not |
| `.sy-disc__hero-top`, `.sy-disc__hero-body` | `data-theme="dark"` on the overlay layers | Discover's hero sits on a scrimmed cover, so its foregrounds resolve against dark |

The mechanism matters as much as the result. `data-theme="dark"` re-points every
`--sy-*` token on that subtree, so a caption over video asks for
`--sy-fg-default` exactly as it would anywhere else and gets the dark ramp's
answer. Writing `color: #fff` would have produced the same pixels and none of
the theming.

Two related tokens do the same job from the other direction:
`--sy-fg-on-media` and `--sy-fg-on-media-muted` resolve to the **dark** ramp's
text colours *regardless of the active theme*, because photographic and
generative covers are darkened by the same scrim in both themes. Text over an
image must not flip with the theme; without these, every caption over a cover
would become invisible in light mode.

### 9.4 When vellum is and is not appropriate

Vellum is correct here and almost nowhere else. The layer genuinely floats over
moving photographic content, and blurring it is what keeps a caption legible
when the scene behind it cuts from dark to bright.

**Use vellum when** the surface floats over media, over a scrolling feed, or
over a blurred backdrop — stream overlays, media chrome, the top bar, the tab
bar, the AI command surface.

**Do not use vellum when** the surface sits on a flat background. Applying it to
ordinary cards produces blur with nothing to blur, at real GPU cost, and reduces
text contrast for no reason.

Immersive media screens also drop surface tokens for their chrome: a surface
token assumes a canvas underneath it, and here the backdrop is a live picture,
so the media group uses translucent whites instead.

---

## 10. Depth: elevation, vellum and refraction

The two themes express depth through different physics, because the same physics
do not exist in both.

**Light is the primary, and there depth is occlusion and illumination.** A
raised surface moves closer to white while casting a soft, wide, cool-tinted
shadow — the behaviour of a pale object lit from above under a blue sky. Two
rules follow, and both are load-bearing:

- **Shadows are never black.** `--shadow-color-NN` in light theme is
  `oklch(34% 0.042 266 / a)`. Under real daylight a shadow is lit by the sky, so
  it takes the sky's colour; a neutral black shadow over a warm-white page reads
  as dirt, while a cool one reads as air. This is the same physics that gives
  the porcelain ramp its warm-to-cool shift.
- **An elevated surface has no border.** Shadow alone carries the edge.
  Border-plus-shadow is the single most reliable way to make a light interface
  look like a form from 2012, and removing it is most of what separates "clean"
  from "premium".

**Dark is optional, and there shadows barely exist** — you cannot darken
near-black. Depth comes instead from surface lightness rising with elevation, a
1px rim highlight as if lit from above, and a soft dark halo detaching the
surface from its backdrop. The hairline stays, because a shadow on near-black
cannot define an edge on its own.

### 10.1 Six elevation levels

Six, because more than six and the differences stop being perceptible; fewer and
modals cannot separate from drawers.

| Level | Fill in light | Fill in dark | Usage |
|---|---|---|---|
| `flat` | transparent | transparent | Page canvas. Never has depth. |
| `sunken` | `--sy-bg-sunken` (`porcelain.2`) | `--sy-bg-sunken` (`porcelain.1`) | Input wells, track grooves, inset media, segmented-control tracks. |
| `surface` | `--sy-bg-surface` (`porcelain.1`) | `--sy-bg-surface` (`porcelain.2`) | Cards, list rows, panels resting on the page. |
| `raised` | `--sy-bg-raised` (`porcelain.1`) | `--sy-bg-raised` (`porcelain.3`) | Hovered cards, dropdowns, popovers, floating controls. |
| `overlay` | `--sy-bg-raised` | `--sy-bg-raised` | Dialogs, sheets, command palette. |
| `lifted` | `--sy-bg-surface` | `--sy-bg-surface` | Dragged objects, the single focused element in a spotlight state. |

In light theme `bg-surface` and `bg-raised` both resolve to `porcelain.1`, so
`surface`, `raised`, `overlay` and `lifted` separate by **shadow alone**. In
dark they are different ramp steps and the fill does the separating. That
asymmetry is the per-theme structural mapping, not a component decision — see
`FOUNDATIONS.md`.

Every level ships a light and a dark recipe. Light-mode shadows are built from
two layers, a tight contact shadow and a wide ambient one, because a single
shadow always looks either too hard or too vague; the pair is what reads as a
real object on a real surface.

| Level | Light shadow | Dark shadow | Dark rim |
|---|---|---|---|
| `sunken` | `inset 0 1px 2px 0 …-06, inset 0 0 0 1px …-04` | `inset 0 1px 3px 0 …-32` | `inset 0 -1px 0 0 var(--rim-color-04)` |
| `surface` | `0 1px 2px -1px …-08, 0 4px 10px -4px …-06` | `0 1px 2px 0 …-24` | `inset 0 1px 0 0 var(--rim-color-06)` |
| `raised` | `0 2px 4px -2px …-08, 0 10px 24px -8px …-10` | `0 2px 6px -1px …-32, 0 8px 20px -6px …-24` | `inset 0 1px 0 0 var(--rim-color-08)` |
| `overlay` | `0 8px 16px -10px …-10, 0 28px 56px -20px …-14` | `0 10px 24px -6px …-40, 0 28px 56px -16px …-32` | `inset 0 1px 0 0 var(--rim-color-10)` |
| `lifted` | `0 16px 32px -16px …-12, 0 48px 88px -32px …-16` | `0 18px 40px -12px …-48, 0 48px 96px -32px …-40` | `inset 0 1px 0 0 var(--rim-color-12)` |

`…-NN` is `var(--shadow-color-NN)`. Rim highlights are **dark-mode only**: every
level declares `rim.light: 'none'`, and the build composes rim and shadow into a
single `--sy-elevation-{level}` value per theme.

Light and dark also read the shadow scale differently. Light uses alphas from
4% to 16%; dark reaches 48%, because a shadow on near-black has to work much
harder to be seen at all.

Components ask for `elevation="raised"`, never for a shadow string.

**Inputs are the exception, in one direction only.** `.sy-input` is the single
place the light theme goes *down*: a field takes `--sy-bg-canvas` and
`--sy-elevation-sunken` while every other control sits above the page.
Everything raised is a control; everything recessed is a place to type.

### 10.2 The four vellum recipes

Vellum is SYLORA's translucent material, named for what it behaves like rather
than for the CSS property that produces it. It is not "frosted glass over a dark
scene": on a bright ground it is a sheet of fine translucent paper, so it
**brightens** what is behind it rather than dimming it. That is the difference
between a light interface that looks lit and one that looks fogged.

Three cooperating layers: a backdrop filter that blurs and lifts brightness and
saturation, a translucent fill that keeps text contrast above threshold, and a
rim that defines the edge.

| Recipe | Class | Blur | Saturate | Brightness (light / dark) | Fill alpha (light / dark) | Rim alpha (light / dark) | Usage |
|---|---|---|---|---|---|---|---|
| `veil` | `.sy-vellum--veil` | 14px | 1.5 | 1.06 / 0.96 | 0.66 / 0.62 | 0.72 / 0.08 | Sticky top bars, tab bars over feeds |
| `panel` | `.sy-vellum` (base) | 26px | 1.7 | 1.08 / 0.94 | 0.74 / 0.72 | 0.80 / 0.10 | Stream chrome, player controls, floating toolbars |
| `dome` | `.sy-vellum--dome` | 44px | 1.9 | 1.10 / 0.92 | 0.86 / 0.82 | 0.90 / 0.14 | Command palette, AI surface, media-context dialogs |
| `scrim` | tokens only | 10px | 1.0 | 1.00 / 1.00 | 0.42 / 0.64 | 0 / 0 | Behind dialogs, drawers and sheets. Blurs so the background reads as out of focus |

The brightness column is the whole trick, and it is the one number that inverts
between themes. Above 1 in light, below 1 in dark.

Two more per-theme facts about how the tokens are built:

- The **fill** is drawn from `bg-surface`, so vellum brightens toward the card
  colour in light and toward the panel colour in dark.
- The **rim** is drawn from `porcelain.1` in light and `porcelain.12` in dark —
  in both cases the end of the ramp that reads as "more light" against that
  theme's ground. This is why light rim alphas (0.72–0.90) look enormous next to
  dark ones (0.08–0.14): they are near-white on near-white, not white on black.

`panel` is the base `.sy-vellum` class — there is no `.sy-vellum--panel`. The
`scrim` recipe exists as tokens (`--sy-vellum-scrim-*`) but has no utility class
and is not reachable from `Surface`'s `glass` prop; screens that need it apply
the tokens directly.

Fill opacity is the accessibility control:

- The whole effect sits behind `@supports (backdrop-filter: blur(1px))`. Without
  support the surface becomes opaque `--sy-bg-surface` with a
  `--sy-border-subtle` edge, rather than unreadable.
- Under `prefers-contrast: more` all three classes are forced opaque with a
  `--sy-border-interactive` border, `.sy-refract` loses its spectral edge for a
  solid one, and `.sy-lumen` is hidden entirely. Translucency and hue-varying
  hairlines are the two places the system knowingly trades contrast for
  character, so they are the first to go.

### 10.3 Refraction, not glow

There is no glow language in SYLORA, and no `GLOW` token. A halo is invisible on
white, so emphasis on a bright ground comes from the other thing light does when
it meets a surface: it *separates*. A refraction edge is a hairline whose hue
travels along its length in the order light actually splits — cyan, indigo,
magenta — using `--sy-gradient-prism` as a `border-box` background.

At 1px it is nearly subliminal: the eye registers that an edge is *alive* before
it registers that it is coloured. It is the one visual device unique to SYLORA,
so it is rationed hard — brand surfaces, AI-authored content, and the single
most important action in a view. Nothing else. If everything refracts, nothing
is emphasised.

| Token | Weight | Spread | Alpha | Usage |
|---|---|---|---|---|
| `--sy-refract-hairline-*` | 1px | 0 | 0.9 | Brand surfaces, AI-authored cards |
| `--sy-refract-edge-*` | 1px | 10px | 0.55 | Focused brand controls, active states |
| `--sy-refract-bloom-*` | 1.5px | 24px | 0.42 | Live indicators, generating states |
| `--sy-refract-halo-*` | 2px | 48px | 0.3 | Hero brand mark, celebration moments |

`weight` is the border width and `spread` is the optional bloom *behind* the
edge, which only becomes visible in dark mode where a true glow is possible.

Three classes consume these:

| Class | What it does |
|---|---|
| `.sy-refract` | The spectral hairline border. Fill comes from `--refract-fill`, defaulting to `--sy-bg-surface`, so a refracting surface can still choose its own background. |
| `.sy-refract--bloom` | Adds `0 0 var(--sy-refract-bloom-spread)` of `--sy-aether-9` behind the edge. Perceptible in dark mode only. |
| `.sy-refract-rule` | The same hairline as a standalone 1px divider at `opacity: 0.75`, used to open a section belonging to the brand or the assistant. |

`.sy-refract` composes with elevation because the elevation *fills* are declared
inside `:where()`, which strips their specificity to zero. Without that, a
surface could be raised or refracting but not both, and the later stylesheet
would silently win.

### 10.4 The lumen field

`.sy-lumen` is the brand's ambient backdrop and the light theme's answer to a
dark theme's glow: rather than colour emitted *onto* a dark page, it is colour
caught *in* a bright one.

| Property | Value |
|---|---|
| Layers | Two pseudo-elements, `::before` and `::after` |
| Size | 92vmax circles, positioned off-frame at each corner |
| Colours | `--sy-aether-9` (top-inline-start) and `--sy-bloom-9` (bottom-inline-end), each as a `radial-gradient` fading to transparent at 64% |
| Opacity, light | 0.10 and 0.08 |
| Opacity, dark | 0.40 and 0.32 |
| Motion | `sy-lumen-a` / `sy-lumen-b`, alternating `ease-in-out`, `var(--sy-lumen-duration, 26s)` |
| Stacking | `position: absolute; inset: 0; pointer-events: none; z-index: 0` |

The values are deliberately extreme in one direction — enormous radius, tiny
opacity. A saturated wash on white reads as a stain; a 10% wash across 92vmax
reads as light in the room. Dark mode can afford four times the presence because
there is no white to stain. Blur is baked into the gradient stops rather than
applied as a filter, because filters on full-viewport elements are expensive.

It stops animating under `prefers-reduced-motion` and is removed entirely under
`prefers-contrast: more`. It is atmosphere — never place text directly on it
without a surface.

---

## 11. Page composition recipes

### 11.1 Standard content screen

The default. A stack of sections inside the responsive content column.

```tsx
<div className="sy-screen">
  <div className="sy-screen__inner">
    <PageHeader title="Analytics" subtitle="…" actions={…} tabs={…} />

    <ScreenSection title="This week" action={<Button variant="ghost" size="sm">See all</Button>}>
      <div className="sy-cols sy-cols--3 sy-enter">
        <Surface><Stat … /></Surface>
        …
      </div>
    </ScreenSection>

    <ScreenSection title="Recent">
      <div className="sy-stack sy-gap-2">
        <ListRow … />
      </div>
    </ScreenSection>
  </div>
</div>
```

- `PageHeader` (from `patterns/AppShell.tsx`) renders the `h1` and scrolls away
  with the content; the shell's top bar is chrome that persists.
- Each `ScreenSection` supplies its own 32px bottom rhythm — do not add margins.
- `.sy-cols--3` is two columns at 676/758 and three only at 908.

### 11.2 Two-pane tool screen

A working pane plus a properties pane. Used by the gift composer, the digital
product editor and the course detail view.

```tsx
<div className="sy-screen">
  <div className="sy-screen__inner">
    <ScreenSection title="Editing: …" eyebrow="Published · last edited 2 days ago">
      <div className="sy-cols sy-cols--sidebar">
        <div className="sy-stack sy-gap-4">{/* main pane */}</div>
        <Surface elevation="surface" padding="lg">{/* 300px properties pane */}</Surface>
      </div>
    </ScreenSection>
  </div>
</div>
```

- `.sy-cols--sidebar` is `1fr 300px` **only from 880**, so at 676 and 758 the
  panes stack. Put the pane the user needs first in DOM order first.
- Use `.sy-cols--sidebar-start` (250px + 1fr) when the secondary pane is
  navigation rather than properties.
- For a genuinely three-region tool (the live studio), a screen declares its own
  grid in its group stylesheet and its own thresholds against the real content
  widths.

### 11.3 Feed screen

One column, a sticky filter bar, heterogeneous items.

```tsx
<div className="sy-screen">
  <div className="sy-screen__inner sy-fdscreen">
    <div className="sy-fdscreen__bar">      {/* sticky, --sy-z-sticky */}
      <Tabs variant="pill" … />
      <Button variant="secondary" size="sm" iconEnd="chevronDown">Latest</Button>
    </div>

    <div className="sy-scroller">           {/* optional stories/creators rail */}
      <StreamCard size="sm" … />
    </div>

    <div className="sy-stack sy-gap-4 sy-enter">
      <PostCard post={…} />
      <Surface as="article">{/* a poll: a different shape in the same column */}</Surface>
      <PostCard post={…} />
    </div>
  </div>
</div>
```

- Keep the column single at every posture; a feed's value is its rhythm.
- A chronological feed must absorb items with completely different internal
  structure, so do not force every item through `PostCard`.
- Never insert new content above the scroll position — offer a "new posts" pill
  instead. Inserting content above the reading position moves what someone is
  reading.
- `.sy-scroller` bleeds past the inner padding; keep it a direct child of
  `.sy-screen__inner`.

### 11.4 Immersive screen

```tsx
// Registered with `immersive: true`, so AppShell renders only:
// <div className="sy-shell-frame sy-shell--immersive">…</div>

<div className="sy-screen sy-live-viewer">
  <div className="sy-live-viewer__stage">
    <Media seed="…" ratio="auto" radius="none" className="sy-live-viewer__video">
      <span className="sy-sr-only">Live broadcast video</span>
    </Media>

    <header className="sy-live-viewer__top">           {/* ≤12%, padding folds in --safe-top */}
      <div className="sy-live-viewer__identity sy-vellum">…</div>
      <div className="sy-live-viewer__status"><LiveBadge viewers="…" />…</div>
    </header>

    <footer className="sy-live-viewer__bottom">        {/* padding folds in --safe-bottom */}
      <div className="sy-live-viewer__controls sy-vellum">…</div>
      <div className="sy-gift-rail">…</div>
    </footer>
  </div>

  <section className="sy-live-chat">…</section>        {/* 38% of the frame on phones */}
</div>
```

- The stage is `position: relative` with `overflow: hidden`; every chrome layer
  is absolutely positioned inside it with a local `z-index` of 1 or 2.
- `data-theme="dark"` goes on the **stage**, not on the screen root: the video
  is the light source, and the chat rail beside it belongs to the room. The
  player, stories and shorts put it on the root instead, because they have no
  non-media region.
- Each strip folds the safe-area inset into its own padding — the stage never
  shrinks for the notch.
- Vellum is applied per chrome element, not to the stage.
- Give the media an `.sy-sr-only` description; `Media` has no accessible name.
- The screen owns its own exit control, because there is no shell chrome to
  provide one.

---

## 12. Checklist before a screen is finished

Every screen must be correct at all five content widths:

| Content width | Posture | What must be true |
|---|---|---|
| 393 | compact | Single column. Nothing clipped. Tap targets ≥ 44px. The bottom 84px+ is reserved for the floating tab bar. |
| 412 | compact | Same, 19px wider — nothing may be pinned to a fixed width. |
| 758 | medium | Two columns where they help. The icon rail is visible. |
| 676 | expanded | The tightest expanded case and the easiest to break: rail + content + context panel at 1280. Sidebar layouts are still single-column here. |
| 908 | expanded | Full layout. Three- and four-column grids and sidebars appear. Content still capped; do not let text run to 200 characters. |

Plus: no `@media` queries in screen stylesheets, no literal colours, sizes or
durations, no z-index outside the scale, no vellum over a flat background, no
border on an elevated surface in light theme, and no state carried by colour
alone. If the screen uses `.sy-refract`, it should be on exactly one element.
